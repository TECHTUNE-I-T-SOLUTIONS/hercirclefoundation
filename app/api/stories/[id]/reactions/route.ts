import { NextResponse } from 'next/server'
import { createClient as createServerHelper } from '@/lib/supabase/server'

export async function GET(req: Request, ctx: any) {
  try {
    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const storyId = params?.id
    if (!storyId) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const supabase = await createServerHelper()

    // Try an RPC first (if you have one); otherwise fallback to fetching rows and aggregating here.
    let data: any = null
    let error: any = null
    try {
      const rpcRes = await supabase.rpc('aggregate_story_reactions', { s_id: storyId })
      data = rpcRes.data
      error = rpcRes.error
    } catch (rpcErr) {
      // ignore rpc failure and fall through to fallback
    }

    if (!data) {
      const q = await supabase.from('story_reactions').select('type').eq('story_id', storyId)
      data = q.data
      error = q.error
    }

    if (error) return NextResponse.json({ error: error.message || String(error) }, { status: 500 })

    // Normalize to aggregated counts: [{ type, count }]
    const counts: Record<string, number> = {}
    if (Array.isArray(data)) {
      for (const row of data) {
        if (!row) continue
        const t = String(row.type || row?.reaction_type || '')
        if (!t) continue
        // If row has a numeric count field (from RPC), use it; otherwise increment by 1
        const c = typeof row.count === 'number' ? Number(row.count) : 1
        counts[t] = (counts[t] || 0) + c
      }
    }

    const out = Object.entries(counts).map(([type, count]) => ({ type, count }))
    return NextResponse.json({ data: out })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(req: Request, ctx: any) {
  try {
    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const storyId = params?.id
    if (!storyId) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const { type, user_id, ip_address } = body || {}
    if (!type) return NextResponse.json({ error: 'missing type' }, { status: 400 })

    const supabase = await createServerHelper()
    const payload = { story_id: storyId, type: type, user_id: user_id || null, ip_address: ip_address || null }
    const { data, error } = await supabase.from('story_reactions').insert([payload]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
