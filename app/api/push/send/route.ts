import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import webpush from 'web-push'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, body: message, url } = body
    if (!title || !message) return NextResponse.json({ error: 'Missing title/body' }, { status: 400 })

    // Set VAPID details at request-time so build/CI doesn't need these env vars at module-eval time
    const subject = process.env.VAPID_SUBJECT || ''
    const publicKey = process.env.VAPID_PUBLIC_KEY || ''
    const privateKey = process.env.VAPID_PRIVATE_KEY || ''
    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const supabase = await createServerClient()
    const { data: subs, error } = await supabase.from('push_subscriptions').select('*')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const payload = JSON.stringify({ title, body: message, url })

    const results = await Promise.allSettled(
      (subs || []).map((s: any) => {
        const pushSubscription = {
          endpoint: s.endpoint,
          keys: {
            p256dh: s.p256dh,
            auth: s.auth,
          },
        }
        return webpush.sendNotification(pushSubscription, payload)
      }),
    )

    // Optionally remove invalid subscriptions
    const toRemove: string[] = []
    results.forEach((r, idx) => {
      if (r.status === 'rejected') {
        // collect endpoint to remove
        toRemove.push((subs || [])[idx]?.endpoint)
      }
    })

    if (toRemove.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', toRemove)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
