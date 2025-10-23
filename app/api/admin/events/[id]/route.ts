import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

  // verify bearer token and admin status
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 })

  // Simple pattern: fetch the user via the auth endpoint using the provided token
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) return NextResponse.json({ error: 'invalid token' }, { status: 401 })
    const user = await resp.json()

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
    const allowed = ['title', 'description', 'starts_at', 'ends_at', 'location', 'image_urls']
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
