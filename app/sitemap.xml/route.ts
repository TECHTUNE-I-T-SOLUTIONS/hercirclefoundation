import { createClient as createServerHelper } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerHelper()
  const { data } = await supabase.from('blogs').select('slug, updated_at, published_at').eq('status', 'published')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const urls = (data || []).map((b: any) => `  <url>\n    <loc>${baseUrl}/blog/${b.slug}</loc>\n    <lastmod>${(b.updated_at || b.published_at || new Date()).toISOString()}</lastmod>\n  </url>`)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
}
