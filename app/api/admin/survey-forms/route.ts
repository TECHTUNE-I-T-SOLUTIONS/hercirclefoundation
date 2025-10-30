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
    const { data, error } = await serverClient.from('survey_forms').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) { return NextResponse.json({ error: err.message || String(err) }, { status: 403 }) }
}

export async function POST(req: Request) {
  try {
    await checkAdmin()
    const body = await req.json().catch(() => ({}))
    const payload = { title: body.title || 'Untitled', description: body.description || '', is_active: !!body.is_active }
    const { data, error } = await serverClient.from('survey_forms').insert([payload]).select().single()
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
    const { data, error } = await serverClient.from('survey_forms').update(body).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) { return NextResponse.json({ error: err.message || String(err) }, { status: 403 }) }
}

export async function DELETE(req: Request) {
  try {
    await checkAdmin()
    const body = await req.json().catch(() => ({}))
    const { id } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    const { error } = await serverClient.from('survey_forms').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: 'deleted' })
  } catch (err: any) { return NextResponse.json({ error: err.message || String(err) }, { status: 403 }) }
}

