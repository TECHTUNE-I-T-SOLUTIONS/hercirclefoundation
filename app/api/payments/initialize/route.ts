import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { initializePayment, generatePaymentReference } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name, email, phone, donation_amount, donation_type, message } = body

    // Validate required fields
    if (!full_name || typeof full_name !== 'string') {
      return NextResponse.json({ error: 'Missing full_name' }, { status: 400 })
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }
    if (!donation_amount || typeof donation_amount !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid donation_amount' }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Generate unique payment reference
    const reference = generatePaymentReference()

    // Convert amount to kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(donation_amount * 100)

    // Initialize Paystack transaction
    const paystackResponse = await initializePayment({
      email,
      amount: amountInKobo,
      reference,
      metadata: {
        custom_fields: [
          {
            display_name: 'Full Name',
            variable_name: 'full_name',
            value: full_name,
          },
          {
            display_name: 'Donation Type',
            variable_name: 'donation_type',
            value: donation_type || 'one-time',
          },
        ],
        full_name,
        phone: phone || null,
        donation_type: donation_type || 'one-time',
        message: message || null,
      },
    })

    // Create donor record
    const insertObj: any = {
      full_name,
      email,
      phone: phone || null,
      donation_amount,
      donation_type: donation_type || 'one-time',
      message: message || null,
    }

    const { data: donorData, error: donorError } = await svc
      .from('donors')
      .insert([insertObj])
      .select()
      .limit(1)

    if (donorError) {
      console.error('Service-role donors insert error', donorError)
      return NextResponse.json({ error: donorError.message }, { status: 500 })
    }

    // Create payment record
    const donorId = donorData && donorData[0] ? donorData[0].id : null

    const { error: paymentError } = await svc.from('payments').insert([
      {
        reference,
        amount: donation_amount,
        currency: 'NGN',
        status: 'pending',
        verification_status: 'pending',
        customer_email: email,
        customer_name: full_name,
        customer_phone: phone || null,
        metadata: {
          full_name,
          phone: phone || null,
          donation_type: donation_type || 'one-time',
          message: message || null,
        },
        paystack_response: paystackResponse.data,
        donor_id: donorId,
      },
    ])

    if (paymentError) {
      console.error('Payment record creation error', paymentError)
      // Don't fail the request if payment record creation fails, but log it
    }

    return NextResponse.json({
      ok: true,
      authorization_url: paystackResponse.data.authorization_url,
      reference,
      access_code: paystackResponse.data.access_code,
      donor_id: donorId,
    })
  } catch (err: any) {
    console.error('Payment initialization failed', err)
    return NextResponse.json(
      { error: err.message || 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
