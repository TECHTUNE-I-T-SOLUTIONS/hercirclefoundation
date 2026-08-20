import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import webpush from 'web-push'
import { sendAdminBroadcast } from '@/lib/email/notify-admins'

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

export async function POST(req: Request) {
  try {
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
    const title = body.title
    const slug = body.slug && String(body.slug).trim().length ? slugify(body.slug) : slugify(String(title || ''))
    const payload: any = {
      author_id: user.id,
      title: body.title,
      slug,
      excerpt: body.excerpt || null,
      content: body.content || null,
      cover_image: body.cover_image || null,
      status: body.status || 'draft',
      published_at: body.status === 'published' ? new Date().toISOString() : null,
    }

    const { data, error } = await serverClient.from('blogs').insert([payload]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // If the blog was published, try to send a web-push notification to subscribers.
    if (payload.status === 'published') {
      sendAdminBroadcast({
        eventType: 'blog',
        subject: 'New blog post published',
        title: 'New Blog Published',
        body: `A new blog post titled "${payload.title || 'Untitled'}" is now live on the platform.`,
        ctaLabel: 'View Blog',
        ctaHref: '/blog',
      }).catch(() => {})
      ;(async () => {
        try {
          const subject = process.env.VAPID_SUBJECT || ''
          const publicKey = process.env.VAPID_PUBLIC_KEY || ''
          const privateKey = process.env.VAPID_PRIVATE_KEY || ''
          if (!publicKey || !privateKey) {
            console.warn('VAPID keys not configured; skipping push send')
            return
          }
          webpush.setVapidDetails(subject, publicKey, privateKey)

          const supabase = await createServerHelper()
          const { data: subs, error: subsErr } = await supabase.from('push_subscriptions').select('*')
          if (subsErr || !subs || subs.length === 0) return

          const pushPayload = JSON.stringify({
            title: `New blog: ${data.title}`,
            body: data.excerpt || data.title,
            url: `/blog/${data.slug}`,
          })

          const results = await Promise.allSettled(
            (subs || []).map((s: any) => {
              const pushSubscription = {
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth },
              }
              return webpush.sendNotification(pushSubscription, pushPayload)
            }),
          )

          const toRemove: string[] = []
          results.forEach((r, idx) => {
            if (r.status === 'rejected') toRemove.push((subs || [])[idx]?.endpoint)
          })
          if (toRemove.length > 0) {
            await supabase.from('push_subscriptions').delete().in('endpoint', toRemove)
          }
        } catch (e) {
          // Don't block blog creation on push errors — log and continue.
          console.error('Failed to send push notifications for new blog', e)
        }
      })()
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    // authenticate admin similarly to POST
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

    const { data, error } = await serverClient.from('blogs').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
