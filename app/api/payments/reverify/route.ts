import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { reverifyTransaction } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Re-verify transaction with Paystack
    const verificationResult = await reverifyTransaction(reference)

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

    // Update payment record with re-verification result
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
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      status: verificationResult.data.status,
      reference,
      payment: paymentData,
      verification_result: verificationResult.data,
    })
  } catch (err: any) {
    console.error('Payment re-verification failed', err)
    return NextResponse.json(
      { error: err.message || 'Failed to re-verify payment' },
      { status: 500 }
    )
  }
}
