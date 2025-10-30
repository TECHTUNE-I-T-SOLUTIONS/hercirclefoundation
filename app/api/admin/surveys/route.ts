import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function GET(req: Request) {
  try {
    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const url = new URL(req.url)
    const formId = url.searchParams.get('form_id') || undefined
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = Math.min(1000, Math.max(10, parseInt(url.searchParams.get('page_size') || '50')))
    const q = url.searchParams.get('q') || undefined

    // build query
    // select explicit columns to avoid accidentally referencing non-existent columns
    let query = serverClient.from('survey_responses').select(
      `id, created_at, form_id, user_id, ip_address, user_agent, metadata, survey_answers(id, question_id, answer_text, answer_json), survey_forms(title)`,
      { count: 'exact' }
    )
    if (formId) query = query.eq('form_id', formId)
    if (q) query = query.ilike('metadata', `%${q}%`)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // @ts-ignore
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, count, page, pageSize })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const { response_id } = body
    if (!response_id) return NextResponse.json({ error: 'missing response_id' }, { status: 400 })

    const { error } = await serverClient.from('survey_responses').delete().eq('id', response_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: 'deleted' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
