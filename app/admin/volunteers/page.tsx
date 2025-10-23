"use client"

import { AdminSidebarNew } from "@/components/admin-sidebar-new"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Mail, Phone, Trash2, Download } from "lucide-react"

interface Volunteer {
  id: string
  full_name: string
  email: string
  phone: string
  skills: string
  availability: string
  motivation: string
  created_at: string
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("volunteers").select("*").order("created_at", { ascending: false })

        if (error) throw error
        setVolunteers(data || [])
      } catch (error) {
        console.error("Error fetching volunteers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVolunteers()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this volunteer?")) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from("volunteers").delete().eq("id", id)

      if (error) throw error
      setVolunteers(volunteers.filter((v) => v.id !== id))
    } catch (error) {
      console.error("Error deleting volunteer:", error)
    }
  }

  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Phone", "Skills", "Availability", "Motivation", "Date"],
      ...volunteers.map((v) => [
        v.full_name,
        v.email,
        v.phone,
        v.skills,
        v.availability,
        v.motivation,
        new Date(v.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "volunteers.csv"
    a.click()
  }

  return (
    <AdminSidebarNew>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Volunteers</h1>
            <p className="text-muted-foreground">Manage volunteer applications</p>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading volunteers...</p>
            </CardContent>
          </Card>
        ) : volunteers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No volunteers yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {volunteers.map((volunteer, index) => (
              <Card
                key={volunteer.id}
                className="hover:shadow-md transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{volunteer.full_name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${volunteer.email}`} className="hover:text-primary">
                            {volunteer.email}
                          </a>
                        </div>
                        {volunteer.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${volunteer.phone}`} className="hover:text-primary">
                              {volunteer.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      {volunteer.skills && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-muted-foreground">Skills</p>
                          <p className="text-sm">{volunteer.skills}</p>
                        </div>
                      )}
                      {volunteer.motivation && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-muted-foreground">Motivation</p>
                          <p className="text-sm">{volunteer.motivation}</p>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Availability: {volunteer.availability}</span>
                        <span>Applied: {new Date(volunteer.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDelete(volunteer.id)}
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
    </AdminSidebarNew>
  )
}
