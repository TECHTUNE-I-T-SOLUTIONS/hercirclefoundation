import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(req: Request) {
  try {
    // Use the project's server helper which reads cookies via next/headers
    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    // verify admin
    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })
    // Accept JSON or form-data
    let body: any = {}
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const form = await req.formData()
      for (const [key, value] of form.entries()) {
        if (body[key]) {
          if (Array.isArray(body[key])) body[key].push(value.toString())
          else body[key] = [body[key], value.toString()]
        } else {
          body[key] = value.toString()
        }
      }
    }

    const mediaUrls = Array.isArray(body.media_urls)
      ? body.media_urls
      : body.media_urls
      ? (function () {
          try { return JSON.parse(body.media_urls) } catch { return [body.media_urls] }
        })()
      : body.media_url
      ? [body.media_url]
      : []

    const payload: any = {
      title: body.title,
      description: body.description,
      media_type: body.media_type,
      category: body.category,
    }
    if (mediaUrls.length > 0) {
      payload.media_urls = mediaUrls
      // keep legacy non-null column in sync for compatibility
      payload.media_url = mediaUrls[0]
    } else if (body.media_url) payload.media_url = body.media_url

    const { data, error } = await serverClient.from('gallery').insert([payload]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
