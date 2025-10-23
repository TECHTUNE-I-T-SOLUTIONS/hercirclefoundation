import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    // verify user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // check admin_users table. If RLS or cookie session prevents the check, fall back to a service-role query.
    const { data: admins } = await supabase.from('admin_users').select('id').eq('id', user.id).limit(1)
    let isAdmin = !!(admins && admins.length > 0)
    if (!isAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
        const { data: svcAdmins } = await svc.from('admin_users').select('id').eq('id', user.id).limit(1)
        isAdmin = !!(svcAdmins && svcAdmins.length > 0)
      } catch (e) {
        console.warn('Service-role admin check failed', e)
      }
    }

    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') || '0')
    const limit = Number(url.searchParams.get('limit') || '20')
    const from = page * limit
    const to = from + limit - 1

    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).range(from, to)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
