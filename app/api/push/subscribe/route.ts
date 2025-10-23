import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY || '', process.env.VAPID_PRIVATE_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, keys } = body
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

    // Prefer using the Supabase service role key for server-side inserts so we bypass RLS for system-level writes.
    let inserted: any = null
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const svc = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
        const { data, error } = await svc.from('push_subscriptions').insert([
          {
            endpoint,
            p256dh: keys?.p256dh || null,
            auth: keys?.auth || null,
          },
        ]).select().limit(1)

        if (error) {
          console.error('Service-role insert error', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        inserted = data && data[0]
      } catch (e) {
        console.error('Service-role client failed, falling back to server client', e)
      }
    }

    // Fallback to server client (uses anon key + cookies) if service role not available or failed
    if (!inserted) {
      const supabase = await createServerClient()
      const { data, error } = await supabase.from('push_subscriptions').insert([
        {
          endpoint,
          p256dh: keys?.p256dh || null,
          auth: keys?.auth || null,
        },
      ]).select().limit(1)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      inserted = data && data[0]
    }

    // Fire-and-forget welcome push: don't await network send so HTTP response is fast.
    // Only send welcome push when explicitly enabled via SEND_WELCOME_PUSH env var (set to '1' or 'true').
    const shouldSend = String(process.env.SEND_WELCOME_PUSH || '').toLowerCase() === '1' || String(process.env.SEND_WELCOME_PUSH || '').toLowerCase() === 'true'
    if (shouldSend) {
      ;(async () => {
        try {
          const payload = JSON.stringify({ title: 'Welcome', body: 'Thanks for subscribing to Her Circle updates!' })
          await webpush.sendNotification({ endpoint, keys }, payload)
        } catch (sendErr) {
          // Log but don't block
          console.warn('Welcome push failed', sendErr)
        }
      })()
    } else {
      // In dev, avoid network requests that may ETIMEDOUT; log a debug message instead.
      console.debug('SEND_WELCOME_PUSH not enabled; skipping welcome push send')
    }

    return NextResponse.json({ ok: true, inserted })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
