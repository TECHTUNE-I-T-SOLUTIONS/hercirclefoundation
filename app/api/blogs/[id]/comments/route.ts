import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function GET(req: Request, ctx: any) {
  try {
    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const { id } = params || {}
    const { data, error } = await serverClient.from('blog_comments').select('*').eq('blog_id', id).order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(req: Request, ctx: any) {
  let params = ctx?.params
  if (params && typeof params.then === 'function') params = await params
  const { id } = params || {}
  try {
    // Accept anonymous comments: allow optional user_name in body. If a signed-in
    // user exists, prefer their display name if available.
    const body = await req.json()
    if (!body.content) return NextResponse.json({ error: 'missing content' }, { status: 400 })

    // determine user_name: prefer provided, then signed-in user, else null
    let user_name: string | null = null
    try {
      const authClient = await createServerHelper()
      const { data: ud, error: ue } = await authClient.auth.getUser()
      if (!ue && ud?.user) user_name = (ud.user.user_metadata && ud.user.user_metadata.full_name) || ud.user.email || ud.user.id
    } catch {}
    if (body.user_name) user_name = body.user_name

    const payload: any = {
      blog_id: id,
      user_name: user_name || null,
      parent_id: body.parent_id || null,
      content: body.content,
    }

    const { data, error } = await serverClient.from('blog_comments').insert([payload]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
