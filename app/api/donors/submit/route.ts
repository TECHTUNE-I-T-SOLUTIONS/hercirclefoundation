import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAdmins, sendToPerson } from '@/lib/email/notify-admins'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name, email, phone, donation_amount, donation_type, message } = body

    if (!full_name || typeof full_name !== 'string') {
      return NextResponse.json({ error: 'Missing full_name' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const insertObj: any = {
      full_name,
      email: email || null,
      phone: phone || null,
      donation_amount: donation_amount ?? null,
      donation_type: donation_type || 'one-time',
      message: message || null,
    }

    const { data, error } = await svc.from('donors').insert([insertObj]).select().limit(1)

    if (error) {
      console.error('Service-role donors insert error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ---- Automated emails (best-effort, non-blocking) ----
    if (data && data[0]) {
      const donorId = data[0].id
      const bankReference = `BANK-${donorId.toString().substring(0, 8).toUpperCase()}`

      // Notify admins of the new donation.
      notifyAdmins('admin_donation', {
        eventType: 'donation',
        name: full_name,
        email: email || '',
        amount: donation_amount != null ? String(donation_amount) : '0',
        type: donation_type || 'one-time',
        message: message || '',
      }).catch(() => {})

      // Send gratitude email to the donor with enhanced details.
      if (email) {
        sendToPerson({
          template: 'donation_thankyou',
          to: { address: email, name: full_name },
          fromKey: 'donations',
          data: { 
            firstName: full_name, 
            amount: donation_amount != null ? String(donation_amount) : '',
            reference: bankReference,
            paymentMethod: 'Bank Transfer',
            donationType: donation_type || 'one-time',
            donationDate: new Date().toLocaleDateString(),
          },
        }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true, inserted: data && data[0] })
  } catch (err: any) {
    console.error('Donor submit failed', err)
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
