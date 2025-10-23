"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AdminSidebarNew } from "@/components/admin-sidebar-new"
import { Button } from "@/components/ui/button"

export default function PushSubscriptionsAdminPage() {
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // client-side auth guard
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/admin/auth/login')
        return
      }
      fetchList()
    })()
  }, [])

  async function fetchList() {
    setLoading(true)
    try {
      const res = await fetch('/api/push/subscriptions')
      if (res.ok) {
        const data = await res.json()
        setSubs(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this subscription?')) return
    try {
      const res = await fetch(`/api/push/subscriptions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSubs((s) => s.filter((x) => x.id !== id))
      } else {
        alert('Failed to delete')
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <AdminSidebarNew>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Push Subscriptions</h1>
        {loading && <p>Loading...</p>}
        <div className="space-y-3">
          {subs.map((s) => (
            <div key={s.id} className="p-3 rounded border flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">{s.endpoint}</div>
                <div className="text-xs text-muted-foreground">Created: {new Date(s.created_at).toLocaleString()}</div>
              </div>
              <div>
                <Button size="sm" variant="destructive" onClick={() => remove(s.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminSidebarNew>
  )
}
