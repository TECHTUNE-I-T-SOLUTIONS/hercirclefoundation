import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function checkAdmin() {
  const authClient = await createServerHelper()
  const { data: { user }, error: userErr } = await authClient.auth.getUser()
  if (userErr || !user) throw new Error('invalid token')
  const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
  if (!admins || admins.length === 0) throw new Error('not admin')
  return user
}

export async function GET(req: Request) {
  try {
    await checkAdmin()
    const url = new URL(req.url)
    const formId = url.searchParams.get('form_id') || undefined
    let query = serverClient.from('survey_questions').select('*')
    if (formId) query = query.eq('form_id', formId)
    const { data, error } = await query.order('idx', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) { return NextResponse.json({ error: err.message || String(err) }, { status: 403 }) }
}

export async function POST(req: Request) {
  try {
    await checkAdmin()
    const body = await req.json().catch(() => ({}))
    // ensure options & conditional saved as JSONB
    if (body.options && typeof body.options !== 'string') body.options = JSON.stringify(body.options)
    if (body.conditional && typeof body.conditional !== 'string') body.conditional = JSON.stringify(body.conditional)
    const { data, error } = await serverClient.from('survey_questions').insert([body]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) { return NextResponse.json({ error: err.message || String(err) }, { status: 403 }) }
}

export async function PATCH(req: Request) {
  try {
    await checkAdmin()
    const body = await req.json().catch(() => ({}))
    const { id } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    if (body.options && typeof body.options !== 'string') body.options = JSON.stringify(body.options)
    if (body.conditional && typeof body.conditional !== 'string') body.conditional = JSON.stringify(body.conditional)
    const { data, error } = await serverClient.from('survey_questions').update(body).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) { return NextResponse.json({ error: err.message || String(err) }, { status: 403 }) }
}

export async function DELETE(req: Request) {
  try {
    await checkAdmin()
    const body = await req.json().catch(() => ({}))
    const { id, form_id } = body
    if (!id && !form_id) return NextResponse.json({ error: 'missing id or form_id' }, { status: 400 })
    let result
    if (id) result = await serverClient.from('survey_questions').delete().eq('id', id)
    else result = await serverClient.from('survey_questions').delete().eq('form_id', form_id)
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json({ data: 'deleted' })
  } catch (err: any) { return NextResponse.json({ error: err.message || String(err) }, { status: 403 }) }
}
