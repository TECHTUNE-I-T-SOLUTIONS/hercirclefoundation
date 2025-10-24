import { NextResponse } from 'next/server'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(req: Request, ctx: any) {
  let params = ctx?.params
  if (params && typeof params.then === 'function') params = await params
  const { id } = params || {}
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE) return NextResponse.json({ error: 'Missing env' }, { status: 500 })

  const server = await createServerHelper()
  const { data: userData } = await server.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // verify admin
  let adminRow = null
  try {
    const adminRes = await server.from('admin_users').select('id').eq('id', user.id).limit(1).single()
    adminRow = (adminRes as any).data
  } catch (e) { adminRow = null }
  if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const serverSupabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { error } = await serverSupabase.from('partner_requests').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, ctx: any) {
  let params = ctx?.params
  if (params && typeof params.then === 'function') params = await params
  const { id } = params || {}
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE) return NextResponse.json({ error: 'Missing env' }, { status: 500 })

  const server = await createServerHelper()
  const { data: userData } = await server.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let adminRow = null
  try {
    const adminRes = await server.from('admin_users').select('id').eq('id', user.id).limit(1).single()
    adminRow = (adminRes as any).data
  } catch (e) { adminRow = null }
  if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { status } = body
  const serverSupabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data, error } = await serverSupabase.from('partner_requests').update({ status }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
