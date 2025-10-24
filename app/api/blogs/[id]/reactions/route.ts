import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(req: Request, ctx: any) {
  try {
  let params = ctx?.params
  if (params && typeof params.then === 'function') params = await params
  const { id } = params || {}
    // Allow anonymous reactions: accept optional user_name in body.
    const body = await req.json()
    const type = body.type || 'like'

    const user_name = body.user_name || null

    // Insert reaction. For public (unauthenticated) reactions we don't enforce uniqueness.
    const payload: any = {
      blog_id: id,
      type,
      user_name: user_name,
    }

    const { data, error } = await serverClient.from('blog_reactions').insert([payload]).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function GET(req: Request, ctx: any) {
  try {
    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const { id } = params || {}
    // fetch all reactions for the blog and aggregate counts by type server-side
    const { data, error } = await serverClient.from('blog_reactions').select('type').eq('blog_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const grouped: Record<string, number> = {}
    for (const r of (data || []) as any[]) {
      const t = (r as any).type || 'like'
      grouped[t] = (grouped[t] || 0) + 1
    }

    const total = Object.values(grouped).reduce((s: number, n: number) => s + n, 0)
    return NextResponse.json({ data: { grouped, total } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
