import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import webpush from 'web-push'
import { sendAdminBroadcast } from '@/lib/email/notify-admins'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function PATCH(req: Request, ctx: any) {
  try {
    let params = ctx?.params
    if (params && typeof params.then === 'function') params = await params
    const id = params?.id

    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const allowed = ['title','content','excerpt','status','theme_id','file_url']
    const payload: any = {}
    for (const k of Object.keys(body)) if (allowed.includes(k)) payload[k] = body[k]

    if (Object.keys(payload).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

    if (payload.status === 'approved') {
      payload.approved_at = new Date().toISOString()
      payload.approved_by = user.id
    }

    const { data, error } = await serverClient.from('stories').update(payload).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If this update approved the story, send push notifications asynchronously.
    if (payload.status === 'approved') {
      sendAdminBroadcast({
        eventType: 'story',
        subject: 'Story approved',
        title: 'Story Approved',
        body: `"${data.title || 'A story'}" has been approved and is now live.`,
        ctaLabel: 'Open Stories',
        ctaHref: '/admin/stories',
      }).catch(() => {})
      ;(async () => {
        try {
          const subject = process.env.VAPID_SUBJECT || ''
          const publicKey = process.env.VAPID_PUBLIC_KEY || ''
          const privateKey = process.env.VAPID_PRIVATE_KEY || ''
          if (!publicKey || !privateKey) {
            console.warn('VAPID keys not configured; skipping push send for story approval')
            return
          }
          webpush.setVapidDetails(subject, publicKey, privateKey)

          const supabase = await createServerHelper()
          const { data: subs, error: subsErr } = await supabase.from('push_subscriptions').select('*')
          if (subsErr || !subs || subs.length === 0) return

          const pushPayload = JSON.stringify({
            title: `New story: ${data.title || 'Community story'}`,
            body: (data.excerpt || data.title || '').slice(0, 120),
            url: `/stories/${data.id}`,
          })

          const results = await Promise.allSettled(
            (subs || []).map((s: any) => {
              const pushSubscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
              return webpush.sendNotification(pushSubscription, pushPayload)
            }),
          )

          const toRemove: string[] = []
          results.forEach((r, idx) => { if (r.status === 'rejected') toRemove.push((subs || [])[idx]?.endpoint) })
          if (toRemove.length > 0) {
            await supabase.from('push_subscriptions').delete().in('endpoint', toRemove)
          }
        } catch (e) {
          console.error('Failed to send push notifications for story approval', e)
        }
      })()
    }
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

    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const { error } = await serverClient.from('stories').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sendAdminBroadcast({
      eventType: 'story',
      subject: 'Story deleted',
      title: 'Story Deleted',
      body: 'A story was removed from the platform.',
      ctaLabel: 'Open Stories',
      ctaHref: '/admin/stories',
    }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
