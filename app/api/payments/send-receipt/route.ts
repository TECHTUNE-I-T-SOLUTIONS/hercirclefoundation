import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendToPerson } from '@/lib/email/notify-admins'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference, email, full_name, amount, donation_type } = body

    if (!reference || !email) {
      return NextResponse.json({ error: 'Missing reference or email' }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Get payment details from database
    const { data: paymentData, error: paymentError } = await svc
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single()

    if (paymentError) {
      console.error('Error fetching payment data:', paymentError)
      // Continue with provided data if database fetch fails
    }

    // Use database data if available, otherwise use provided data
    const donorName = paymentData?.customer_name || full_name
    const donorEmail = paymentData?.customer_email || email
    const donationAmount = paymentData?.amount || amount
    const donationType = paymentData?.metadata?.donation_type || donation_type || 'one-time'
    const paymentDate = paymentData?.paid_at 
      ? new Date(paymentData.paid_at).toLocaleDateString()
      : new Date().toLocaleDateString()

    // Send thank you email with payment details
    await sendToPerson({
      template: 'donation_thankyou',
      to: { address: donorEmail, name: donorName },
      fromKey: 'donations',
      data: { 
        firstName: donorName, 
        amount: String(donationAmount),
        reference: reference,
        paymentMethod: 'Paystack Card',
        donationType: donationType,
        donationDate: paymentDate,
      },
    })

    return NextResponse.json({ ok: true, message: 'Receipt sent successfully' })
  } catch (err: any) {
    console.error('Failed to send receipt:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to send receipt' },
      { status: 500 }
    )
  }
}
