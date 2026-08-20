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

    const { searchParams } = new URL(req.url)
    const from = Number(searchParams.get('from') || 0)
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500)

    const { data, count, error } = await svc
      .from('email_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [], total: count || 0 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}