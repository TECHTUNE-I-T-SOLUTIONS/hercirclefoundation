"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export default function PushSubscriptionsAdminPage() {
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
  }, [router])

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

  function remove(id: string) {
    setSelectedId(id)
    setShowConfirm(true)
  }

  async function confirmRemove() {
    const id = selectedId
    if (!id) return
    setShowConfirm(false)
    try {
      const res = await fetch(`/api/push/subscriptions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSubs((s) => s.filter((x) => x.id !== id))
        toast({ title: 'Deleted', description: 'Subscription removed' })
      } else {
        toast({ title: 'Delete failed', description: 'Failed to delete subscription' })
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Delete failed', description: String(err) })
    }
    setSelectedId(null)
  }

  return (
    <>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Push Subscriptions</h1>
        {loading && <p>Loading...</p>}

        <div className="space-y-3">
          {subs.map((s) => (
            <div
              key={s.id}
              className="p-3 rounded border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium break-words whitespace-normal">{s.endpoint}</div>
                <div className="text-xs text-muted-foreground">Created: {new Date(s.created_at).toLocaleString()}</div>
              </div>

              <div className="shrink-0">
                <Button size="sm" variant="destructive" onClick={() => remove(s.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
  </div>
      <Dialog open={showConfirm} onOpenChange={(open) => setShowConfirm(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm delete</DialogTitle>
        </DialogHeader>
        <div className="py-2">Delete this subscription?</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button className="bg-destructive text-white" onClick={confirmRemove}>Delete</Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  )
}
