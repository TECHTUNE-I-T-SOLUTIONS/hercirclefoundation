import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, full_name } = body
    if (!full_name) return NextResponse.json({ error: 'Missing full_name' }, { status: 400 })

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Service role or URL missing')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)

    let idToUse = userId
    if (!idToUse && email) {
      // attempt to find the user by email in auth.users
      try {
        const { data: users, error: uErr } = await svc.from('auth.users').select('id').eq('email', email).limit(1)
        if (uErr) console.warn('auth.users lookup error', uErr)
        if (users && users.length > 0) idToUse = (users as any)[0].id
      } catch (e) {
        console.warn('auth.users query failed', e)
      }
    }

    if (!idToUse) return NextResponse.json({ error: 'Could not determine user id' }, { status: 400 })

    let emailToUse = email
    if (!emailToUse) {
      try {
        const { data: users, error: uErr } = await svc.from('auth.users').select('email').eq('id', idToUse).limit(1)
        if (uErr) console.warn('auth.users lookup error', uErr)
        if (users && users.length > 0) emailToUse = (users as any)[0].email
      } catch (e) {
        console.warn('auth.users query failed', e)
      }
    }

    if (!emailToUse) return NextResponse.json({ error: 'Could not determine user email' }, { status: 400 })

    // insert into admin_users; ignore conflict
    const { data, error } = await svc.from('admin_users').upsert({ id: idToUse, email: emailToUse, full_name }, { onConflict: 'id' }).select().limit(1)
    if (error) {
      console.error('Failed to upsert admin_users', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, admin: data && data[0] })
  } catch (err: any) {
    console.error('register-admin error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
