'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const reference = params.get('reference') || params.get('trxref')
  const [state, setState] = useState<'verifying' | 'success' | 'failed'>('verifying')
  const [message, setMessage] = useState('Confirming your payment…')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!reference) {
      setState('failed')
      setMessage('No payment reference was provided.')
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/payments/verify?reference=${reference}`)
        const data = await res.json()
        
        if (data.status === 'success') {
          setState('success')
          setMessage('Payment confirmed! Thank you for your donation.')
          setTimeout(() => {
            router.push('/donate?success=true')
          }, 2000)
        } else {
          setState('failed')
          setMessage(`Payment was ${data.status || 'not completed'}. You can try again.`)
        }
      } catch (err) {
        setState('failed')
        setMessage(err instanceof Error ? err.message : 'We could not verify your payment.')
      }
    })()
  }, [reference, router])

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex justify-center">
          {state === 'verifying' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
          {state === 'success' && <CheckCircle2 className="h-12 w-12 text-emerald-500" />}
          {state === 'failed' && <XCircle className="h-12 w-12 text-red-500" />}
        </div>
        <h1 className="mt-6 font-serif text-2xl">
          {state === 'verifying' ? 'One moment…' : state === 'success' ? 'Thank You!' : 'Payment Incomplete'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        {state === 'failed' && (
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/donate" className="h-11 rounded-full bg-primary text-sm font-medium leading-[2.75rem] text-primary-foreground text-center">
              Try Again
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>}>
      <CallbackInner />
    </Suspense>
  )
}
