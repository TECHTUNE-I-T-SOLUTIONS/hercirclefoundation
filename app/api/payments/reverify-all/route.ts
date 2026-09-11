import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { reverifyTransaction } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Fetch all pending or failed payments
    const { data: payments, error: fetchError } = await svc
      .from('payments')
      .select('*')
      .or('verification_status.eq.pending,verification_status.eq.failed')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching payments:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No payments to re-verify',
        results: [],
      })
    }

    const results = []
    let successCount = 0
    let failureCount = 0

    // Re-verify each payment
    for (const payment of payments) {
      try {
        const verificationResult = await reverifyTransaction(payment.reference)

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
        } else {
          updateData.status = verificationResult.data.status
          updateData.verification_status = 'failed'
        }

        const { error: updateError } = await svc
          .from('payments')
          .update(updateData)
          .eq('reference', payment.reference)

        if (updateError) {
          console.error(`Error updating payment ${payment.reference}:`, updateError)
          results.push({
            reference: payment.reference,
            success: false,
            error: updateError.message,
          })
          failureCount++
        } else {
          results.push({
            reference: payment.reference,
            success: true,
            status: verificationResult.data.status,
          })
          successCount++
        }
      } catch (err: any) {
        console.error(`Error re-verifying payment ${payment.reference}:`, err)
        results.push({
          reference: payment.reference,
          success: false,
          error: err.message,
        })
        failureCount++
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Re-verified ${payments.length} payments`,
      summary: {
        total: payments.length,
        success: successCount,
        failure: failureCount,
      },
      results,
    })
  } catch (err: any) {
    console.error('Bulk re-verification failed', err)
    return NextResponse.json(
      { error: err.message || 'Failed to re-verify payments' },
      { status: 500 }
    )
  }
}
