import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function DELETE(req: Request, ctx: any) {
  try {
    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const id = params?.id

    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const { error } = await serverClient.from('volunteers').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
