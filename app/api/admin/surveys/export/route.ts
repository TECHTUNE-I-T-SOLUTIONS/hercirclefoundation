import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import dns from 'dns'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function checkHostReachable(urlStr: string) {
  try {
    const u = new URL(urlStr)
    const host = u.hostname
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('dns lookup timeout')), 3000)
      dns.lookup(host, (err, address) => {
        clearTimeout(timer)
        if (err) return reject(err)
        resolve(address)
      })
    })
  } catch (e) {
    throw e
  }
}

export async function GET(req: Request) {
  try {
    // quick check: ensure Supabase host resolves to a DNS entry so we fail fast with a clear message
    try {
      await checkHostReachable(SUPABASE_URL)
    } catch (e: any) {
      console.error('Supabase host resolution failed', e)
      return NextResponse.json({ error: `Cannot resolve Supabase host: ${String(e.message || e)}` }, { status: 502 })
    }

    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const url = new URL(req.url)
    const formId = url.searchParams.get('form_id') || undefined
    const chunk = Math.min(2000, Math.max(100, parseInt(url.searchParams.get('chunk') || '1000')))

    const headerRow = ['response_id', 'form_id', 'user_id', 'created_at', 'question_id', 'answer_text', 'answer_json']

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode(headerRow.join(',') + '\n'))
        let offset = 0
        while (true) {
          const from = offset
          const to = offset + chunk - 1
          try {
            let query = serverClient.from('survey_responses').select('*, survey_answers(*)').order('created_at', { ascending: false }).range(from, to)
            if (formId) query = query.eq('form_id', formId)
            // @ts-ignore
            const { data, error } = await query
            if (error) {
              controller.error(error)
              break
            }
            if (!data || data.length === 0) break
            for (const r of data) {
              const answers = r.survey_answers || []
              if (answers.length === 0) {
                controller.enqueue(new TextEncoder().encode([r.id, r.form_id, r.user_id || '', r.created_at || '', '', '', ''].join(',') + '\n'))
              } else {
                for (const a of answers) {
                  const line = [r.id, r.form_id, r.user_id || '', r.created_at || '', a.question_id, '"' + (a.answer_text || '').replace(/"/g, '""') + '"', JSON.stringify(a.answer_json || '')].join(',') + '\n'
                  controller.enqueue(new TextEncoder().encode(line))
                }
              }
            }
            offset += data.length
            // stop if less than chunk (no more rows)
            if (data.length < chunk) break
          } catch (e: any) {
            console.error('Error querying supabase during export', e)
            controller.error(e)
            break
          }
        }
        controller.close()
      }
    })

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="survey_export.csv"` } })
  } catch (err: any) {
    const msg = err?.message || String(err)
    console.error('Export route failed', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
