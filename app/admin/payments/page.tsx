"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Mail, Phone, RefreshCw, Download, CheckCircle, XCircle, Clock, Search } from "lucide-react"
import { CountUpNumber } from "@/components/count-up-number"
import { Input } from "@/components/ui/input"

interface Payment {
  id: string
  reference: string
  amount: number
  status: string
  verification_status: string
  customer_email: string
  customer_name: string
  customer_phone: string
  paid_at: string | null
  verified_at: string | null
  created_at: string
  currency: string
  paystack_transaction_id: string | null
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [reverifying, setReverifying] = useState(false)
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false })

        if (error) throw error
        setPayments(data || [])
        setFilteredPayments(data || [])
      } catch (error) {
        console.error("Error fetching payments:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [])

  useEffect(() => {
    // Filter payments based on search term
    if (searchTerm) {
      const filtered = payments.filter(payment =>
        payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredPayments(filtered)
    } else {
      setFilteredPayments(payments)
    }
  }, [searchTerm, payments])

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
        setFilteredPayments(updatedPayments)
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
        setFilteredPayments(updatedPayments)
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

  const handleExport = () => {
    const csv = [
      ["Reference", "Amount", "Currency", "Status", "Verification", "Customer Name", "Customer Email", "Customer Phone", "Transaction ID", "Paid At", "Created At"],
      ...filteredPayments.map((p) => [
        p.reference,
        p.amount,
        p.currency,
        p.status,
        p.verification_status,
        p.customer_name,
        p.customer_email,
        p.customer_phone,
        p.paystack_transaction_id,
        p.paid_at,
        p.created_at,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "payments.csv"
    a.click()
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

  const getStatusColor = (status: string, verificationStatus: string) => {
    if (status === 'success' && verificationStatus === 'verified') {
      return 'text-green-600'
    } else if (status === 'failed' || verificationStatus === 'failed') {
      return 'text-red-600'
    } else {
      return 'text-yellow-600'
    }
  }

  const totalPayments = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const successfulPayments = filteredPayments.filter(p => p.status === 'success' && p.verification_status === 'verified').length
  const pendingPayments = filteredPayments.filter(p => p.verification_status === 'pending').length

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Payments</h1>
            <p className="text-muted-foreground">Manage payment transactions and verification</p>
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

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by reference, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="animate-slide-up">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{filteredPayments.length}</p>
            </CardContent>
          </Card>
          <Card className="animate-slide-up" style={{ animationDelay: "50ms" }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">
                ₦<CountUpNumber value={totalPayments} duration={2000} />
              </p>
            </CardContent>
          </Card>
          <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600">{successfulPayments}</p>
            </CardContent>
          </Card>
          <Card className="animate-slide-up" style={{ animationDelay: "150ms" }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingPayments}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading payments...</p>
            </CardContent>
          </Card>
        ) : filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No payment transactions yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment, index) => (
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
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(payment.status, payment.verification_status)} bg-opacity-10`}>
                          {payment.verification_status}
                        </span>
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
                      {payment.customer_email && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${payment.customer_email}`} className="hover:text-primary">
                            {payment.customer_email}
                          </a>
                        </div>
                      )}
                      {payment.customer_phone && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${payment.customer_phone}`} className="hover:text-primary">
                            {payment.customer_phone}
                          </a>
                        </div>
                      )}
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
    </>
  )
}
