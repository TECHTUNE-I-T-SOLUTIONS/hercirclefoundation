import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'
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

    const contentType = req.headers.get('content-type') || ''
    let body: any = {}
    if (contentType.includes('application/json')) body = await req.json()
    else {
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

    const allowed = ['title', 'description', 'date', 'location', 'image_url', 'event_type', 'status']
    const updatePayload: any = {}
    for (const k of Object.keys(body)) if (allowed.includes(k)) {
      if (k === 'date') {
        updatePayload[k] = body[k] && body[k].trim() !== '' ? body[k] : null
      } else {
        updatePayload[k] = body[k]
      }
    }

    if (Object.keys(updatePayload).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

    const { data, error } = await serverClient.from('events').update(updatePayload).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sendAdminBroadcast({
      eventType: 'event',
      subject: updatePayload.status === 'published' ? 'Event published' : 'Event updated',
      title: updatePayload.status === 'published' ? 'Event Published' : 'Event Updated',
      body: `"${data.title || 'An event'}" was updated on the platform.`,
      ctaLabel: 'Open Events',
      ctaHref: '/admin/events',
    }).catch(() => {})

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

    const { error } = await serverClient.from('events').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sendAdminBroadcast({
      eventType: 'event',
      subject: 'Event deleted',
      title: 'Event Deleted',
      body: 'An event was removed from the platform.',
      ctaLabel: 'Open Events',
      ctaHref: '/admin/events',
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

