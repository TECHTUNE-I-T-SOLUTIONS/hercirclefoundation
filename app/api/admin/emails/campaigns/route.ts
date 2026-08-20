import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const helper = await createServerHelper()
    const { data: userData } = await helper.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    const svc = createServerClient(url, key)

    const { data, error } = await svc.from('email_campaigns').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const helper = await createServerHelper()
    const { data: userData } = await helper.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    const svc = createServerClient(url, key)

    const body = await req.json()
    const { id, name, subject, html_body, text_body, audience, recipient_emails, from_key, reply_to, status, scheduled_at } = body
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const payload = {
      name,
      subject: subject || '',
      html_body: html_body || '',
      text_body: text_body || null,
      audience: audience || 'custom',
      recipient_emails: recipient_emails || [],
      from_key: from_key || 'general',
      reply_to: reply_to || null,
      status: status || 'draft',
      scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
      created_by: userData.user.id,
    }

    // If updating an existing campaign by id, preserve created_by.
    const { data, error } = id
      ? await svc.from('email_campaigns').update(payload).eq('id', id).select().single()
      : await svc.from('email_campaigns').insert(payload).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const helper = await createServerHelper()
    const { data: userData } = await helper.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    const svc = createServerClient(url, key)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await svc.from('email_campaigns').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}