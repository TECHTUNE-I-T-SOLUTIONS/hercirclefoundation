import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function PATCH(req: Request, ctx: any) {
  try {
    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const id = params?.id

    // Prefer cookie-aware server helper (reads Next.js cookies); fallback to Authorization bearer token.
    let user: any = null
    try {
      const authClient = await createServerHelper()
      const { data: userData, error: userErr } = await authClient.auth.getUser()
      if (!userErr && userData?.user) user = userData.user
    } catch (e) {
      // ignore and fallback to header
    }

    if (!user) {
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')
      if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 })

      const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) return NextResponse.json({ error: 'invalid token' }, { status: 401 })
      user = await resp.json()
    }

    // check admin_users table for this user
    const { data: admins } = await serverClient
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .limit(1)

    if (!admins || admins.length === 0) {
      return NextResponse.json({ error: 'not admin' }, { status: 403 })
    }

    const form = await req.formData()
    const body: any = {}
    for (const [key, value] of form.entries()) {
      // handle image array fields: image_urls[] or images[]
      if (key.endsWith('[]')) {
        const cleanKey = key.replace(/\[\]$/,'')
        if (!body[cleanKey]) body[cleanKey] = []
        body[cleanKey].push(value.toString())
      } else {
        body[key] = value.toString()
      }
    }

    // Prepare update payload: only include allowed fields
    const allowed = ['title', 'description', 'starts_at', 'ends_at', 'location', 'image_urls', 'image_url']
    const updatePayload: any = {}
    for (const k of Object.keys(body)) {
      if (allowed.includes(k)) {
        // coerce image_urls to array
        if (k === 'image_urls') {
          try {
            const parsed = JSON.parse(body[k])
            updatePayload[k] = Array.isArray(parsed) ? parsed : [parsed]
          } catch {
            // if it's a comma-separated list
            updatePayload[k] = body[k].split(',').map((s: string) => s.trim()).filter(Boolean)
          }
        } else {
          updatePayload[k] = body[k]
        }
      }
    }

    // If client sent image_urls but DB does not have that column, prefer setting image_url (first image)
    if (updatePayload.image_urls && Array.isArray(updatePayload.image_urls)) {
      updatePayload.image_url = updatePayload.image_urls.length ? updatePayload.image_urls[0] : null
      delete updatePayload.image_urls
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
    }

    const { data, error } = await serverClient
      .from('events')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
