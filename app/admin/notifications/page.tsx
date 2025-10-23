"use client"

import { useEffect, useState } from "react"
import { AdminSidebarNew } from "@/components/admin-sidebar-new"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCallback } from "react"

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const limit = 20

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true)
    // fetch via server API that enforces admin access
    try {
      const q = `?page=${p}&limit=${limit}&filter=${filter}`
      const res = await fetch(`/api/admin/notifications/list${q}`)
      if (res.status === 401 || res.status === 403) {
        router.replace('/admin/auth/login')
        return
      }
      const data = await res.json()
      if (p === 0) setNotifications(data || [])
      else setNotifications((prev) => [...prev, ...(data || [])])
    } catch (err) {
      console.error('Error fetching notifications via admin API', err)
      setLoading(false)
      return
    }

    setPage(p)
    setLoading(false)
  }, [])

  useEffect(() => {
    // refetch when filter changes
    setSelected({})
    fetchPage(0)
    // only subscribe to realtime if admin session is valid
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/admin/auth/login')
        return
      }

      // optionally check admin role via admin_users table (server-side is stronger)
      const channel = supabase
        .channel("public:notifications")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
          const n = payload.new
          if (filter === "all" || (filter === "unread" && !n.is_read) || (filter === "read" && n.is_read)) {
            setNotifications((prev) => [n, ...prev])
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    })()
  }, [fetchPage])

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch (err) {
      console.error(err)
    }
  }

  const markSelectedAsRead = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k])
    if (ids.length === 0) return
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)))
      setSelected({})
    } catch (err) {
      console.error(err)
    }
  }

  const markAllVisibleAsRead = async () => {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (ids.length === 0) return
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setSelected({})
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }))
  }

  const prevPage = () => {
    if (page === 0) return
    fetchPage(page - 1)
  }

  const nextPage = () => {
    fetchPage(page + 1)
  }

  return (
    <AdminSidebarNew>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Notifications</h1>
        {loading && <p>Loading...</p>}

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter:</label>
            <select aria-label="Filter notifications" value={filter} onChange={(e) => setFilter(e.target.value as any)} className="p-2 rounded border">
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={markSelectedAsRead}>Mark selected as read</Button>
            <Button size="sm" onClick={markAllVisibleAsRead}>Mark all visible as read</Button>
          </div>
        </div>

        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className={`p-4 rounded border flex items-start justify-between ${n.is_read ? "bg-background" : "bg-primary/10 border-primary/20"}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={!!selected[n.id]} onChange={() => toggleSelect(n.id)} aria-label={`Select notification ${n.title}`} />
                <div>
                  <h3 className="font-semibold">{n.title}</h3>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="ml-4">
                {!n.is_read && <Button size="sm" onClick={() => markRead(n.id)}>Mark read</Button>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <Button onClick={prevPage} disabled={page === 0}>Prev</Button>
          <div className="text-sm text-muted-foreground">Page {page + 1}</div>
          <Button onClick={nextPage}>{loading ? "Loading..." : "Next"}</Button>
        </div>
      </div>
    </AdminSidebarNew>
  )
}
