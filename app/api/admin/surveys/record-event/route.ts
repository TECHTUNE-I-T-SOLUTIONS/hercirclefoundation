import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const client = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { event, form_id, session_key, payload } = body
    if (!event) return NextResponse.json({ error: 'missing event' }, { status: 400 })
    await client.from('survey_events').insert([{ event_type: event, form_id: form_id || null, session_key: session_key || null, payload: payload || null }])
    return NextResponse.json({ data: 'ok' })
  } catch (err: any) { return NextResponse.json({ error: err.message || String(err) }, { status: 500 }) }
}

