import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAdmins, sendToPerson } from '@/lib/email/notify-admins'

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const { name, email, organization, message } = body
  if (!name || !email) return NextResponse.json({ error: 'name and email required' }, { status: 400 })

  const serverSupabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  try {
    const { data, error } = await serverSupabase.from('partner_requests').insert([{ name, email, organization, message }]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ---- Automated emails (best-effort, non-blocking) ----
    notifyAdmins('admin_partner', {
      eventType: 'partner',
      name,
      email,
      organization: organization || '',
      message: message || '',
    }).catch(() => {})

    if (email) {
      sendToPerson({
        template: 'partner_confirmation',
        to: { address: email, name },
        fromKey: 'partnerships',
        data: { firstName: name, organization: organization || '' },
      }).catch(() => {})
    }

    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
