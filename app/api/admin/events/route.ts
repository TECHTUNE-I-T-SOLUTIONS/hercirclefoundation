import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import { notifyAdmins } from '@/lib/email/notify-admins'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(req: Request) {
  try {
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
      for (const [k, v] of form.entries()) {
        if (k.endsWith('[]')) {
          const key = k.replace('[]', '')
          body[key] = JSON.parse(String(v))
        } else {
          body[k] = v.toString()
        }
      }
    }
    
    console.log('Event creation payload:', body)

    const payload: any = {
      title: body.title,
      description: body.description || null,
      date: body.date && body.date.trim() !== '' ? body.date : null,
      location: body.location || null,
      image_url: body.image_url || null,
      event_type: body.event_type || 'workshop',
      status: body.status || 'draft',
      created_by: user.id,
    }

    const { data, error } = await serverClient.from('events').insert([payload]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ---- Automated email to admins (best-effort) ----
    if (data) {
      notifyAdmins('admin_event', {
        eventType: 'event',
        title: payload.title || '',
        description: payload.description || '',
        date: payload.date || '',
        location: payload.location || '',
      }).catch(() => {})
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function GET(_req: Request) {
  try {
    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const { data, error } = await serverClient.from('events').select('*').order('date', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
