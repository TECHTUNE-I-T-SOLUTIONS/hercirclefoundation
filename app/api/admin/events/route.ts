import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(req: Request) {
  try {
    // Prefer cookie-aware server helper (reads Next.js cookies) so clients that use cookie sessions
    // don't need to send a bearer token. Fallback to Authorization header if no server cookie session.
    let user: any = null

    try {
      const authClient = await createServerHelper()
      const { data: userData, error: userErr } = await authClient.auth.getUser()
      if (!userErr && userData?.user) user = userData.user
    } catch (e) {
      // ignore - we'll fallback to header-based token below
    }

    // If no user from cookie, try Authorization header bearer token
    if (!user) {
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')
      if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 })

      // verify token -> user via auth endpoint
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) return NextResponse.json({ error: 'invalid token' }, { status: 401 })
      user = await resp.json()
    }

    // check admin
    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const form = await req.formData()
    const body: any = {}
    for (const [key, value] of form.entries()) {
      if (key.endsWith('[]')) {
        const cleanKey = key.replace(/\[\]$/,'')
        if (!body[cleanKey]) body[cleanKey] = []
        try {
          body[cleanKey].push(JSON.parse(value.toString()))
        } catch {
          body[cleanKey].push(value.toString())
        }
      } else {
        body[key] = value.toString()
      }
    }

    // coerce image_urls
    if (body.image_urls && !Array.isArray(body.image_urls)) {
      try { body.image_urls = JSON.parse(body.image_urls) } catch { body.image_urls = body.image_urls.split(',') }
    }

    // Build payload while staying resilient to different DB schemas.
    // Some environments may not have an `image_urls` column yet — use `image_url` (first image) instead.
    const firstImage = Array.isArray(body.image_urls) && body.image_urls.length ? body.image_urls[0] : (body.image_url || null)

    const payload: any = {
      title: body.title,
      description: body.description,
      date: body.date,
      location: body.location,
      image_url: firstImage,
      event_type: body.event_type || 'other',
      status: new Date(body.date) >= new Date() ? 'upcoming' : 'past',
    }

    const { data, error } = await serverClient.from('events').insert([payload]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
