import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAdmins, sendToPerson } from '@/lib/email/notify-admins'

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  const svc = createClient(url, key)

  const body = await req.json().catch(() => ({}))
  const { full_name, email, phone, skills, availability, motivation } = body

  if (!full_name || !email) {
    return NextResponse.json({ error: 'full_name and email required' }, { status: 400 })
  }

  const { data, error } = await svc.from('volunteers').insert([{ full_name, email, phone, skills, availability, motivation }]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ---- Automated emails (best-effort, non-blocking) ----
  notifyAdmins('admin_volunteer', {
    eventType: 'volunteer',
    name: full_name,
    email,
    skills: skills || '',
    availability: availability || '',
  }).catch(() => {})

  if (email) {
    sendToPerson({
      template: 'volunteer_confirmation',
      to: { address: email, name: full_name },
      fromKey: 'careers',
      data: { firstName: full_name, referenceNumber: data ? String(data.id).slice(0, 8) : '' },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, data })
}