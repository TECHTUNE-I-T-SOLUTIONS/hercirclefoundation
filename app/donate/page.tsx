"use client"

import type React from "react"

// import { Header } from "@/components/header"
// import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useState, useRef, useEffect } from "react"
import confetti from 'canvas-confetti'
import { Heart, CheckCircle, Gift, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { CountUpNumber } from "@/components/count-up-number"

export default function DonatePage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    donationAmount: "",
    donationType: "one-time",
    message: "",
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showThanks, setShowThanks] = useState(false)

  useEffect(() => {
    // Check if user was redirected back with success
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      setSubmitted(true)
      setShowThanks(true)
      runConfetti()
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        donationAmount: "",
        donationType: "one-time",
        message: "",
      })
      setTimeout(() => setShowThanks(false), 4000)
      setTimeout(() => setSubmitted(false), 5000)
      // Clean up URL
      window.history.replaceState({}, '', '/donate')
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted', formData)
    console.log('Is mobile:', isMobile)
    
    // For mobile, skip dialog and go directly to payment
    if (isMobile) {
      console.log('Mobile detected, skipping dialog')
      await confirmAndSubmit()
    } else {
      // show confirmation modal instead of immediate submit
      setError(null)
      setShowConfirm(true)
      console.log('Dialog should show now', showConfirm)
    }
  }

  const [showConfirm, setShowConfirm] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const confettiRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      setIsMobile(/android|ipad|iphone|ipod/i.test(userAgent) || window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const confirmAndSubmit = async () => {
    if (!isMobile) {
      setShowConfirm(false)
    }
    setLoading(true)
    setError(null)

    try {
      console.log('Submitting payment with data:', formData)
      
      // Initialize Paystack payment
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          donation_amount: Number.parseFloat(formData.donationAmount),
          donation_type: formData.donationType,
          message: formData.message,
        }),
      })

      console.log('Payment API response status:', res.status)
      const payload = await res.json()
      console.log('Payment API response:', payload)
      
      if (!res.ok) throw new Error(payload?.error || 'Failed to initialize payment')

      // Stop loading here - Paystack will handle the rest
      setLoading(false)

      console.log('Redirecting to:', payload.authorization_url)
      // Redirect to Paystack checkout page
      window.location.href = payload.authorization_url
    } catch (err) {
      console.error('Payment error:', err)
      setError(err instanceof Error ? err.message : "An error occurred")
      setLoading(false)
    }
  }

  const runConfetti = () => {
    try {
      // small bursts
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
      setTimeout(() => confetti({ particleCount: 40, spread: 100, origin: { y: 0.6 } }), 250)
      setTimeout(() => confetti({ particleCount: 20, spread: 140, origin: { y: 0.6 } }), 500)
    } catch (e) {
      // ignore
    }
  }

  const impactExamples = [
    { amount: 1000, description: "Provides 1 month of sanitary supplies (10 pads) for a school girl" },
    { amount: 2500, description: "Provides 2 months of sanitary supplies (25 pads) for a woman" },
    { amount: 8000, description: "Provides a day supply for 50 girls" },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* <Header /> */}

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Make a Donation</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Your donation directly supports our mission to provide free sanitary pads and menstrual health education
              to young women in need.
            </p>
          </div>
        </section>

        {/* Form Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Form */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg border border-border p-8">
                  {submitted && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3 animate-slide-down">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-green-900 dark:text-green-100">
                          Thank you for your donation!
                        </h3>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          Your generosity will help us continue our mission. We'll send you a receipt shortly.
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="Your full name"
                          value={formData.fullName}
                          onChange={handleChange}
                          required
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+234 XXX XXX XXXX"
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="donationAmount">Donation Amount (₦) *</Label>
                        <Input
                          id="donationAmount"
                          name="donationAmount"
                          type="number"
                          placeholder="1000"
                          value={formData.donationAmount}
                          onChange={handleChange}
                          required
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="donationType">Donation Type *</Label>
                        <select
                          aria-label="Donation Type"
                          id="donationType"
                          name="donationType"
                          value={formData.donationType}
                          onChange={handleChange}
                          className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="one-time">One-time</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="annual">Annual</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="message">Message (Optional)</Label>
                      <textarea
                        id="message"
                        name="message"
                        placeholder="Share why this cause is important to you..."
                        value={formData.message}
                        onChange={handleChange}
                        className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        rows={4}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : "Complete Donation"}
                    </Button>

                    {/* Confirmation Dialog */}
                    {showConfirm && (
                      <Dialog open onOpenChange={(open) => setShowConfirm(open)}>
                        <DialogContent className={isMobile ? "max-w-[95vw] mx-auto" : ""}>
                          <DialogHeader>
                            <DialogTitle>Confirm Card Payment</DialogTitle>
                            <DialogDescription>
                              Review your donation details before proceeding to secure payment
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-2">
                            <div className="space-y-3">
                              <p className="font-medium">Payment Summary:</p>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <p className="text-muted-foreground">Amount:</p>
                                  <p className="font-semibold">₦{Number.parseFloat(formData.donationAmount).toLocaleString()}</p>
                                </div>
                                <div className="flex justify-between">
                                  <p className="text-muted-foreground">Name:</p>
                                  <p className="font-semibold">{formData.fullName}</p>
                                </div>
                                <div className="flex justify-between">
                                  <p className="text-muted-foreground">Email:</p>
                                  <p className="font-semibold">{formData.email}</p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-4">
                                You will be redirected to Paystack's secure payment page to complete your donation.
                              </p>
                            </div>
                          </div>
                          <DialogFooter className={isMobile ? "flex-col gap-2" : ""}>
                            <Button variant="outline" onClick={() => setShowConfirm(false)} className={isMobile ? "w-full" : ""}>Cancel</Button>
                            <Button onClick={confirmAndSubmit} disabled={loading} className={isMobile ? "w-full" : ""}>
                              {loading ? "Processing..." : 'Proceed to Payment'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Thank you overlay + confetti canvas */}
                    {showThanks && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                        <div className="bg-white/90 dark:bg-black/80 rounded-lg p-6 pointer-events-auto">
                          <h2 className="text-xl font-bold">Thank you!</h2>
                          <p className="text-sm text-muted-foreground">We appreciate your support.</p>
                        </div>
                        <canvas ref={confettiRef} className="absolute inset-0 w-full h-full" />
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                      Thanks to your generosity, we are able to continue providing essential menstrual health resources to those in need.
                    </p>
                  </form>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-white/10 dark:bg-background rounded-lg p-6 border border-primary/20 dark:border-white">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-black dark:text-white">
                    <Gift className="h-5 w-5 text-black dark:text-white" />
                    Your Impact
                  </h3>
                  <div className="space-y-4">
                    {impactExamples.map((example, index) => (
                      <div key={index} className="pb-4 border-b border-primary/20 last:border-0 last:pb-0 dark:text-white">
                        <p className="font-semibold text-black dark:text-white">
                          ₦<CountUpNumber value={example.amount} duration={1500} />
                        </p>
                        <p className="text-sm text-black dark:text-white">{example.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* <Footer /> */}
    </div>
  )
}
