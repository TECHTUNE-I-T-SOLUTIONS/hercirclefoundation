"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
// import { useCallback } from "react"

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const limit = 20

  // keep a ref for current filter so subscription handlers see latest value
  const filterRef = useRef(filter)
  const routerRef = useRef(router)
  useEffect(() => { routerRef.current = router }, [router])
  useEffect(() => {
    filterRef.current = filter
  }, [filter])

  // fetchPage: stable identity (no deps) — we use filterRef and routerRef to read current values
  const fetchPage = useCallback(async (p: number) => {
    setLoading(true)
    try {
      // Server-side filtering was unreliable; fetch the page and filter client-side.
      const q = `?page=${p}&limit=${limit}`
      const res = await fetch(`/api/admin/notifications/list${q}`)
      if (res.status === 401 || res.status === 403) {
        routerRef.current.replace('/admin/auth/login')
        return
      }
      const raw = await res.json()

      // Track whether the server returned a full page (so we know if more pages exist)
      setHasMore(Array.isArray(raw) && raw.length === limit)

      const applyFilterToList = (list: any[], f: typeof filter) => {
        if (!Array.isArray(list)) return []
        if (f === 'all') return list
        if (f === 'unread') return list.filter((n) => !n.is_read)
        return list.filter((n) => n.is_read)
      }

      const filtered = applyFilterToList(raw || [], filterRef.current)

      // Deduplicate by id when merging pages or when replacing
      const dedupeById = (arr: any[]) => {
        const seen = new Set<string>()
        const out: any[] = []
        for (const it of arr) {
          if (!it || !it.id) continue
          if (!seen.has(it.id)) {
            seen.add(it.id)
            out.push(it)
          }
        }
        return out
      }

      if (p === 0) setNotifications(dedupeById(filtered))
      else setNotifications((prev) => dedupeById([...prev, ...(filtered || [])]))

      // Only advance the page counter if we actually received a page of results
      if (p === 0 || (Array.isArray(raw) && raw.length > 0)) {
        setPage(p)
      }
    } catch (err) {
      console.error('Error fetching notifications via admin API', err)
      setLoading(false)
      return
    }
    setLoading(false)
  }, [])

  // When filter changes, reset selection and fetch first page
  useEffect(() => {
    setSelected({})
    fetchPage(0)
  }, [filter, fetchPage])

  // Subscribe to realtime notifications once on mount. Handlers use filterRef
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        routerRef.current.replace('/admin/auth/login')
        return
      }

      const channel = supabase
        .channel('public:notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          if (!mounted) return
          const n = payload.new
          const f = filterRef.current
          if (f === 'all' || (f === 'unread' && !n.is_read) || (f === 'read' && n.is_read)) {
            setNotifications((prev) => {
              // Prevent duplicates if the same notification already exists
              if (prev.some((x) => x.id === n.id)) return prev
              return [n, ...prev]
            })
          }
        })
        .subscribe()

      return () => {
        mounted = false
        try { supabase.removeChannel(channel) } catch {}
      }
    })()
  }, [])

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
    if (!hasMore) return
    fetchPage(page + 1)
  }

  return (
    <>
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
          <Button onClick={prevPage} disabled={page === 0 || loading}>Prev</Button>
          <div className="text-sm text-muted-foreground">Page {page + 1}</div>
          <Button onClick={nextPage} disabled={!hasMore || loading}>{loading ? "Loading..." : (hasMore ? "Next" : "No more")}</Button>
        </div>
      </div>
    </>
  )
}
