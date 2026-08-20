import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAdmins, sendToPerson } from '@/lib/email/notify-admins'

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  const svc = createClient(url, key)

  const body = await req.json().catch(() => ({}))
  const { name, email, subject, message } = body
  if (!name || !email) return NextResponse.json({ error: 'name and email required' }, { status: 400 })

  const { error } = await svc.from('contact_messages').insert([{ name, email, subject, message }])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ---- Automated emails (best-effort, non-blocking) ----
  notifyAdmins('admin_contact', {
    eventType: 'contact',
    name,
    email,
    subject: subject || '',
    message: message || '',
  }).catch(() => {})

  if (email) {
    sendToPerson({
      template: 'contact_confirmation',
      to: { address: email, name },
      fromKey: 'contact',
      data: { firstName: name },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}