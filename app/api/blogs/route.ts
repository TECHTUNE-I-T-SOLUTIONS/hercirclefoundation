import { NextResponse } from 'next/server'
import { createClient as createServerHelper } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createServerHelper()
    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    let query = supabase.from('blogs').select('*')
    if (status) query = query.eq('status', status)
    
    // Order by published_at (newest first), featured posts will be handled in UI
    // @ts-ignore - Supabase client typing in this project
    const { data, error } = await query.order('published_at', { ascending: false, nullsFirst: false })
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
