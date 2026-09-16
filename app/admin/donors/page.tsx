"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Mail, Phone, Trash2, Download, RefreshCw, CreditCard, CheckCircle, XCircle, Clock } from "lucide-react"
import { CountUpNumber } from "@/components/count-up-number"

interface Donor {
  id: string
  full_name: string
  email: string
  phone: string
  donation_amount: number
  donation_type: string
  message: string
  created_at: string
}

interface Payment {
  id: string
  reference: string
  amount: number
  status: string
  verification_status: string
  customer_email: string
  customer_name: string
  paid_at: string | null
  verified_at: string | null
  created_at: string
}

export default function DonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [reverifying, setReverifying] = useState(false)
  const { toast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        
        const [donorsResult, paymentsResult] = await Promise.all([
          supabase.from("donors").select("*").order("created_at", { ascending: false }),
          supabase.from("payments").select("*").order("created_at", { ascending: false })
        ])

        if (donorsResult.error) throw donorsResult.error
        if (paymentsResult.error) throw paymentsResult.error

        setDonors(donorsResult.data || [])
        setPayments(paymentsResult.data || [])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDelete = (id: string) => {
    setSelectedId(id)
    setShowConfirm(true)
  }

  const confirmDelete = async () => {
    const id = selectedId
    if (!id) return
    setShowConfirm(false)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`/api/admin/donors/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        toast({ title: 'Delete failed', description: err?.error || 'delete failed' })
        return
      }
      setDonors((prev) => prev.filter((d) => d.id !== id))
      toast({ title: 'Deleted', description: 'Donor removed' })
    } catch (error) {
      console.error("Error deleting donor:", error)
      toast({ title: 'Delete failed', description: String(error) })
    } finally {
      setSelectedId(null)
    }
  }

  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Phone", "Amount", "Type", "Message", "Date"],
      ...donors.map((d) => [
        d.full_name,
        d.email,
        d.phone,
        d.donation_amount,
        d.donation_type,
        d.message,
        new Date(d.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "donors.csv"
    a.click()
  }

  const handleReverifyPayment = async (reference: string) => {
    try {
      setReverifying(true)
      const res = await fetch('/api/payments/reverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to re-verify payment')

      // Refresh payments
      const supabase = createClient()
      const { data: updatedPayments } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
      
      if (updatedPayments) {
        setPayments(updatedPayments)
      }

      toast({ 
        title: 'Payment Re-verified', 
        description: `Payment ${reference} status: ${data.status}` 
      })
    } catch (error) {
      console.error("Error re-verifying payment:", error)
      toast({ 
        title: 'Re-verification Failed', 
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setReverifying(false)
    }
  }

  const handleReverifyAll = async () => {
    try {
      setReverifying(true)
      const res = await fetch('/api/payments/reverify-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to re-verify payments')

      // Refresh payments
      const supabase = createClient()
      const { data: updatedPayments } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
      
      if (updatedPayments) {
        setPayments(updatedPayments)
      }

      toast({ 
        title: 'Bulk Re-verification Complete', 
        description: `Processed ${data.summary.total} payments: ${data.summary.success} successful, ${data.summary.failure} failed` 
      })
    } catch (error) {
      console.error("Error re-verifying payments:", error)
      toast({ 
        title: 'Bulk Re-verification Failed', 
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setReverifying(false)
    }
  }

  const getPaymentStatusIcon = (status: string, verificationStatus: string) => {
    if (status === 'success' && verificationStatus === 'verified') {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else if (status === 'failed' || verificationStatus === 'failed') {
      return <XCircle className="h-4 w-4 text-red-600" />
    } else {
      return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const totalDonations = donors.reduce((sum, d) => sum + (d.donation_amount || 0), 0)

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Donations & Payments</h1>
            <p className="text-muted-foreground">Manage donor information and payment verification</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleReverifyAll} 
              variant="outline" 
              size="sm"
              disabled={reverifying || payments.length === 0}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${reverifying ? 'animate-spin' : ''}`} />
              Re-verify All
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="animate-slide-up">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Donors</p>
              <p className="text-2xl font-bold">{donors.length}</p>
            </CardContent>
          </Card>
          <Card className="animate-slide-up" style={{ animationDelay: "50ms" }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Donations</p>
              <p className="text-2xl font-bold">
                ₦<CountUpNumber value={totalDonations} duration={2000} />
              </p>
            </CardContent>
          </Card>
          <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Average Donation</p>
              <p className="text-2xl font-bold">
                ₦
                <CountUpNumber
                  value={donors.length > 0 ? Math.round(totalDonations / donors.length) : 0}
                  duration={2000}
                />
              </p>
            </CardContent>
          </Card>
          <Card className="animate-slide-up" style={{ animationDelay: "150ms" }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Payment Transactions</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading donors...</p>
            </CardContent>
          </Card>
        ) : donors.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No donors yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {donors.map((donor, index) => (
              <Card
                key={donor.id}
                className="hover:shadow-md transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{donor.full_name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${donor.email}`} className="hover:text-primary">
                            {donor.email}
                          </a>
                        </div>
                        {donor.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${donor.phone}`} className="hover:text-primary">
                              {donor.phone}
                            </a>
                          </div>
                        )}
                        <div className="font-semibold text-primary">
                          ₦{donor.donation_amount?.toLocaleString()} ({donor.donation_type})
                        </div>
                      </div>
                      {donor.message && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-muted-foreground">Message</p>
                          <p className="text-sm">{donor.message}</p>
                        </div>
                      )}
                      <p className="mt-3 text-xs text-muted-foreground">
                        Donated: {new Date(donor.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleDelete(donor.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Payments Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Payment Transactions
          </h2>
          
          {payments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">No payment transactions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <Card
                  key={payment.id}
                  className="hover:shadow-md transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getPaymentStatusIcon(payment.status, payment.verification_status)}
                          <h3 className="font-bold text-lg">{payment.reference}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-semibold">₦{payment.amount?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Customer</p>
                            <p className="font-semibold">{payment.customer_name || payment.customer_email}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <p className="font-semibold capitalize">{payment.status}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Verification</p>
                            <p className="font-semibold capitalize">{payment.verification_status}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs text-muted-foreground">
                          <div>
                            <p>Created: {new Date(payment.created_at).toLocaleString()}</p>
                          </div>
                          {payment.paid_at && (
                            <div>
                              <p>Paid: {new Date(payment.paid_at).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReverifyPayment(payment.reference)}
                          variant="outline"
                          size="sm"
                          disabled={reverifying}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${reverifying ? 'animate-spin' : ''}`} />
                          Re-verify
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Dialog open={showConfirm} onOpenChange={(open) => setShowConfirm(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm delete</DialogTitle>
          </DialogHeader>
          <div className="py-2">Are you sure you want to delete this donor?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button className="bg-destructive text-white" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
