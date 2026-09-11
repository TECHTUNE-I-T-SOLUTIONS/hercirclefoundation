"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

function VerifyPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference')
      
      if (!reference) {
        setStatus('failed')
        setMessage('No payment reference found')
        return
      }

      try {
        const response = await fetch(`/api/payments/verify?reference=${reference}`)
        const data = await response.json()

        if (data.ok && data.status === 'success') {
          setStatus('success')
          setMessage('Your payment was successful! Thank you for your donation.')
          
          // Redirect to donate page after 3 seconds
          setTimeout(() => {
            router.push('/donate')
          }, 3000)
        } else {
          setStatus('failed')
          setMessage('Payment verification failed. Please contact support if the issue persists.')
        }
      } catch (error) {
        console.error('Verification error:', error)
        setStatus('failed')
        setMessage('An error occurred during payment verification.')
      }
    }

    verifyPayment()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {status === 'loading' && (
                <>
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                  <h2 className="text-2xl font-bold">Verifying Payment</h2>
                  <p className="text-muted-foreground">Please wait while we verify your payment...</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle className="h-16 w-16 text-green-600" />
                  <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">Payment Successful!</h2>
                  <p className="text-muted-foreground">{message}</p>
                  <p className="text-sm text-muted-foreground">Redirecting to donation page...</p>
                </>
              )}

              {status === 'failed' && (
                <>
                  <XCircle className="h-16 w-16 text-red-600" />
                  <h2 className="text-2xl font-bold text-red-900 dark:text-red-100">Payment Failed</h2>
                  <p className="text-muted-foreground">{message}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}

export default function VerifyPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <h2 className="text-2xl font-bold">Loading...</h2>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    }>
      <VerifyPaymentContent />
    </Suspense>
  )
}
