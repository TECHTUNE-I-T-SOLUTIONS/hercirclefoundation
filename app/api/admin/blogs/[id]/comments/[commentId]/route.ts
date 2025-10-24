import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function DELETE(req: Request, ctx: any) {
  try {
    let user: any = null
    try {
      const authClient = await createServerHelper()
      const { data: ud, error: ue } = await authClient.auth.getUser()
      if (!ue && ud?.user) user = ud.user
    } catch {}

    if (!user) {
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')
      if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 })
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}` } })
      if (!resp.ok) return NextResponse.json({ error: 'invalid token' }, { status: 401 })
      user = await resp.json()
    }

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const { id, commentId } = params || {}
    const { data, error } = await serverClient.from('blog_comments').delete().eq('id', commentId).eq('blog_id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
