import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyTransaction } from '@/lib/paystack'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference parameter' }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Verify transaction with Paystack
    const verificationResult = await verifyTransaction(reference)

    console.log('Paystack verification result for reference:', reference, verificationResult.data)

    const { data: paymentData, error: fetchError } = await svc
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single()

    if (fetchError) {
      console.error('Error fetching payment record:', fetchError)
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // Update payment record with verification result
    const updateData: any = {
      paystack_response: verificationResult.data,
      paystack_transaction_id: String(verificationResult.data.id),
      updated_at: new Date(),
    }

    if (verificationResult.data.status === 'success') {
      updateData.status = 'success'
      updateData.verification_status = 'verified'
      updateData.paid_at = verificationResult.data.paid_at ? new Date(verificationResult.data.paid_at) : new Date()
      updateData.verified_at = new Date()
      updateData.customer_email = verificationResult.data.customer.email
      updateData.customer_name = `${verificationResult.data.customer.first_name} ${verificationResult.data.customer.last_name}`.trim()
    } else if (verificationResult.data.status === 'abandoned') {
      // Abandoned means the transaction was initiated but not completed
      // Keep it as pending for potential re-verification later
      updateData.status = 'abandoned'
      updateData.verification_status = 'pending'
    } else {
      updateData.status = verificationResult.data.status
      updateData.verification_status = 'failed'
    }

    const { error: updateError } = await svc
      .from('payments')
      .update(updateData)
      .eq('reference', reference)

    if (updateError) {
      console.error('Error updating payment record:', updateError)
    }

    // Send email notifications for successful payments (non-blocking)
    if (verificationResult.data.status === 'success') {
      try {
        const { notifyAdmins } = await import('@/lib/email/notify-admins')
        
        const donorName = paymentData.metadata?.full_name || paymentData.customer_name || verificationResult.data.customer.email || 'Donor'
        const donorEmail = paymentData.customer_email || verificationResult.data.customer.email
        const donationAmount = paymentData.amount || verificationResult.data.amount / 100
        const donationType = paymentData.metadata?.donation_type || 'one-time'
        const message = paymentData.metadata?.message || ''

        // Notify admins
        notifyAdmins('admin_donation', {
          eventType: 'donation',
          name: donorName,
          email: donorEmail,
          amount: String(donationAmount),
          type: donationType,
          message,
        }).catch((err: any) => console.error('Admin notification failed:', err))

        // Send donor receipt email
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/send-receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference,
            email: donorEmail,
            full_name: donorName,
            amount: String(donationAmount),
            donation_type: donationType,
          }),
        }).catch((emailError) => {
          console.error('Failed to send receipt email:', emailError)
        })
      } catch (emailError) {
        console.error('Email notification error:', emailError)
      }
    }

    return NextResponse.json({
      ok: true,
      status: verificationResult.data.status,
      reference,
      payment: paymentData,
    })
  } catch (err: any) {
    console.error('Payment verification failed', err)
    return NextResponse.json(
      { error: err.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
