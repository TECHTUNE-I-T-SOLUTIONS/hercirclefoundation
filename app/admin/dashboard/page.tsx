"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Users, Heart, Calendar, ImageIcon, FileText, Bell } from "lucide-react"

interface Stats {
  volunteers: number
  donors: number
  events: number
  gallery: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ volunteers: 0, donors: 0, events: 0, gallery: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient()

        const [volunteersRes, donorsRes, eventsRes, galleryRes] = await Promise.all([
          supabase.from("volunteers").select("id", { count: "exact", head: true }),
          supabase.from("donors").select("id", { count: "exact", head: true }),
          supabase.from("events").select("id", { count: "exact", head: true }),
          supabase.from("gallery").select("id", { count: "exact", head: true }),
        ])

        setStats({
          volunteers: volunteersRes.count || 0,
          donors: donorsRes.count || 0,
          events: eventsRes.count || 0,
          gallery: galleryRes.count || 0,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { icon: Users, label: "Volunteers", value: stats.volunteers, href: "/admin/volunteers" },
    { icon: Heart, label: "Donors", value: stats.donors, href: "/admin/donors" },
    { icon: Calendar, label: "Events", value: stats.events, href: "/admin/events" },
    { icon: ImageIcon, label: "Gallery Items", value: stats.gallery, href: "/admin/gallery" },
  ]

  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the HerCircle Foundation admin panel</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(stat.href)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {stat.label}
                    <Icon className="h-5 w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? "..." : stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total records</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Welcome Section */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Quick access to admin functions</CardDescription>
          </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/admin/volunteers')}
                  onKeyDown={(e) => e.key === 'Enter' && router.push('/admin/volunteers')}
                  className="p-6 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold mb-2">Manage Volunteers</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">View and manage volunteer applications</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/admin/donors')}
                  onKeyDown={(e) => e.key === 'Enter' && router.push('/admin/donors')}
                  className="p-6 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold mb-2">Manage Donors</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Track and manage donor information</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/admin/events')}
                  onKeyDown={(e) => e.key === 'Enter' && router.push('/admin/events')}
                  className="p-6 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold mb-2">Create Events</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Add and manage upcoming events</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/admin/gallery')}
                  onKeyDown={(e) => e.key === 'Enter' && router.push('/admin/gallery')}
                  className="p-6 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold mb-2">Upload Gallery</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Manage photos and videos</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/admin/blogs')}
                  onKeyDown={(e) => e.key === 'Enter' && router.push('/admin/blogs')}
                  className="p-6 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold mb-2">Create Blog</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Write and publish blog posts</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/admin/partner-requests')}
                  onKeyDown={(e) => e.key === 'Enter' && router.push('/admin/partner-requests')}
                  className="p-6 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold mb-2">Partner Requests</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Review partnership inquiries</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/admin/notifications')}
                  onKeyDown={(e) => e.key === 'Enter' && router.push('/admin/notifications')}
                  className="p-6 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold mb-2">Notifications</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">View recent system notifications</p>
                </div>
              </div>
            </CardContent>
        </Card>
      </div>
    </>
  )
}
