import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function slugify(s: string) {
  return s
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function PATCH(req: Request, ctx: any) {
  try {
    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const id = params?.id

    // auth (cookie-aware then bearer)
    let user: any = null
    try {
      const authClient = await createServerHelper()
      const { data: userData, error: userErr } = await authClient.auth.getUser()
      if (!userErr && userData?.user) user = userData.user
    } catch (e) {}

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

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const body = await req.json()
    const allowed = ['title', 'slug', 'excerpt', 'content', 'cover_image', 'coverImage', 'status', 'author_name', 'authorName', 'featured', 'tags', 'seo_title', 'seoTitle', 'seo_description', 'seoDescription', 'schema_type', 'schemaType', 'reading_time']
    const updatePayload: any = {}
    for (const k of Object.keys(body)) {
      if (allowed.includes(k)) {
        // Map camelCase to snake_case for database
        const dbKey = k === 'coverImage' ? 'cover_image' :
                      k === 'authorName' ? 'author_name' :
                      k === 'seoTitle' ? 'seo_title' :
                      k === 'seoDescription' ? 'seo_description' :
                      k === 'schemaType' ? 'schema_type' :
                      k === 'readingTime' ? 'reading_time' : k
        updatePayload[dbKey] = body[k]
      }
    }

    // handle slug generation
    if (updatePayload.slug && String(updatePayload.slug).trim().length) {
      updatePayload.slug = slugify(updatePayload.slug)
    }

    // If client sets status to published, ensure published_at is set if not already
    if (updatePayload.status === 'published') {
      // fetch current row to check published_at
      const { data: existing } = await serverClient.from('blogs').select('published_at').eq('id', id).single()
      if (existing && !existing.published_at) {
        updatePayload.published_at = new Date().toISOString()
      }
    }
    
    // Update reading time if content changed
    if (updatePayload.content) {
      const words = updatePayload.content.split(/\s+/).filter(word => word.length > 0).length
      updatePayload.reading_time = Math.ceil(words / 200)
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
    }

    const { data, error } = await serverClient.from('blogs').update(updatePayload).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request, ctx: any) {
  try {
    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const id = params?.id

    // authenticate (cookie-aware then bearer)
    let user: any = null
    try {
      const authClient = await createServerHelper()
      const { data: userData, error: userErr } = await authClient.auth.getUser()
      if (!userErr && userData?.user) user = userData.user
    } catch (e) {}

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

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const { error } = await serverClient.from('blogs').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
