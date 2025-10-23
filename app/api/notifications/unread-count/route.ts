import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // ensure user is authenticated and an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ count: count ?? 0 })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
