"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Handshake, CheckCircle, Building2, Users, Target } from "lucide-react"

export default function PartnerPage() {
  const [formData, setFormData] = useState({
    organizationName: "",
    contactPerson: "",
    email: "",
    phone: "",
    partnershipType: "distribution",
    message: "",
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/donors/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          message: `Partnership Inquiry - ${formData.organizationName}: ${formData.message}`,
        }),
      })

      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to submit request')

      setSubmitted(true)
      setFormData({
        organizationName: "",
        contactPerson: "",
        email: "",
        phone: "",
        partnershipType: "distribution",
        message: "",
      })

      setTimeout(() => setSubmitted(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const partnershipTypes = [
    {
      icon: Building2,
      title: "Corporate Partnership",
      description: "Partner with us as a corporate sponsor to support our mission",
    },
    {
      icon: Users,
      title: "Community Organization",
      description: "Collaborate with local organizations to expand our reach",
    },
    {
      icon: Target,
      title: "Distribution Partner",
      description: "Help us distribute sanitary pads to communities in need",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Partner With Us</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Together, we can create a greater impact. Join Her Circle Foundation in our mission to break period
              poverty and empower women.
            </p>
          </div>
        </section>

        {/* Partnership Types */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Ways to Partner</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {partnershipTypes.map((type, index) => {
                const Icon = type.icon
                return (
                  <Card
                    key={index}
                    className="hover:shadow-lg transition-all duration-300 hover:border-primary/50 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="pt-6">
                      <Icon className="h-8 w-8 text-primary mb-4" />
                      <h3 className="font-bold text-lg mb-2">{type.title}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="bg-card rounded-lg border border-border p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Handshake className="h-6 w-6 text-primary" />
                Get in Touch
              </h2>

              {submitted && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3 animate-slide-down">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Thank you for your interest!</h3>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      We'll review your partnership proposal and get back to you soon.
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
                <div>
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    placeholder="Your organization name"
                    value={formData.organizationName}
                    onChange={handleChange}
                    required
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      type="text"
                      placeholder="Your name"
                      value={formData.contactPerson}
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

                <div>
                  <Label htmlFor="partnershipType">Partnership Type *</Label>
                  <select
                    id="partnershipType"
                    name="partnershipType"
                    value={formData.partnershipType}
                    onChange={handleChange}
                    className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="corporate">Corporate Partnership</option>
                    <option value="community">Community Organization</option>
                    <option value="distribution">Distribution Partner</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="message">Partnership Proposal *</Label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Tell us about your partnership proposal..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={5}
                  />
                </div>

                <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                  {loading ? "Sending..." : "Submit Partnership Proposal"}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
