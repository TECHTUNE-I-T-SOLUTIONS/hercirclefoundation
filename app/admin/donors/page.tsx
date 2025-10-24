"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Mail, Phone, Trash2, Download } from "lucide-react"
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

export default function DonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchDonors = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("donors").select("*").order("created_at", { ascending: false })

        if (error) throw error
        setDonors(data || [])
      } catch (error) {
        console.error("Error fetching donors:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDonors()
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
      const { error } = await supabase.from("donors").delete().eq("id", id)

      if (error) throw error
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

  const totalDonations = donors.reduce((sum, d) => sum + (d.donation_amount || 0), 0)

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Donors</h1>
            <p className="text-muted-foreground">Manage donor information</p>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
