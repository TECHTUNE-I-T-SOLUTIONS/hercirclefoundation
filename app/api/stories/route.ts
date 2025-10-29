import { NextResponse } from 'next/server'
import { createClient as createServerHelper } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createServerHelper()
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const id = url.searchParams.get('id')

    if (id) {
      const { data, error } = await supabase.from('stories').select('id, title, excerpt, content, file_url, author_name, theme_id, created_at').eq('id', id).eq('status', 'approved').limit(1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data: data || [] })
    }

    const { data, error } = await supabase.from('stories').select('id, title, excerpt, content, file_url, author_name, theme_id, created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(limit)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { author_name, author_email, title, content, excerpt, file_url, theme_id, ip_address } = body || {}
    if (!content && !file_url) return NextResponse.json({ error: 'content or file required' }, { status: 400 })

    const supabase = await createServerHelper()
    const payload: any = {
      author_name: author_name || null,
      author_email: author_email || null,
      title: title || null,
      content: content || null,
      excerpt: excerpt || (content ? (String(content).slice(0, 200)) : null),
      file_url: file_url || null,
      theme_id: theme_id || null,
      ip_address: ip_address || null,
      status: 'pending',
    }

    const { data, error } = await supabase.from('stories').insert([payload]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
