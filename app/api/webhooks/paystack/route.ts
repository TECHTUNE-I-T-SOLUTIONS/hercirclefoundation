import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateWebhookSignature, isSuccessfulPaymentEvent, isFailedPaymentEvent } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature validation
    const rawBody = await request.text()
    
    // Get Paystack signature from headers
    const signature = request.headers.get('x-paystack-signature')
    
    if (!signature) {
      console.error('Missing Paystack signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // Validate webhook signature
    if (!validateWebhookSignature(rawBody, signature)) {
      console.error('Invalid Paystack signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse the webhook event
    const event = JSON.parse(rawBody)
    console.log('Paystack webhook received:', event.event)

    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Handle successful payment
    if (isSuccessfulPaymentEvent(event)) {
      const { reference, amount, customer, paid_at, id: transaction_id } = event.data

      // Update payment record
      const { error: updateError } = await svc
        .from('payments')
        .update({
          status: 'success',
          verification_status: 'verified',
          paystack_transaction_id: String(transaction_id),
          paid_at: paid_at ? new Date(paid_at) : new Date(),
          verified_at: new Date(),
          webhook_data: event,
          paystack_response: event.data,
          customer_email: customer.email,
          customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
          updated_at: new Date(),
        })
        .eq('reference', reference)

      if (updateError) {
        console.error('Error updating payment record:', updateError)
      } else {
        console.log(`Payment ${reference} verified successfully`)
      }

      // Import notification functions (non-blocking)
      try {
        const { notifyAdmins } = await import('@/lib/email/notify-admins')
        
        // Get payment details for notification
        const { data: paymentData } = await svc
          .from('payments')
          .select('*, donors(*)')
          .eq('reference', reference)
          .single()

        if (paymentData) {
          const donorName = paymentData.customer_name || paymentData.metadata?.full_name || 'Donor'
          const donorEmail = paymentData.customer_email || customer.email
          const donationAmount = paymentData.amount || amount / 100
          const donationType = paymentData.metadata?.donation_type || 'one-time'
          const message = paymentData.metadata?.message || ''

          // Notify admins of the successful payment
          notifyAdmins('admin_donation', {
            eventType: 'donation',
            name: donorName,
            email: donorEmail,
            amount: String(donationAmount),
            type: donationType,
            message,
          }).catch((err: any) => console.error('Admin notification failed:', err))

          // Note: Donor email is sent immediately after payment completion in the frontend
          // Webhook only handles verification and admin notifications
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError)
        // Don't fail the webhook if email fails
      }
    }

    // Handle failed payment
    if (isFailedPaymentEvent(event)) {
      const { reference, id: transaction_id } = event.data

      const { error: updateError } = await svc
        .from('payments')
        .update({
          status: 'failed',
          verification_status: 'failed',
          paystack_transaction_id: String(transaction_id),
          webhook_data: event,
          paystack_response: event.data,
          updated_at: new Date(),
        })
        .eq('reference', reference)

      if (updateError) {
        console.error('Error updating failed payment record:', updateError)
      } else {
        console.log(`Payment ${reference} marked as failed`)
      }
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook processing failed', err)
    return NextResponse.json(
      { error: err.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
