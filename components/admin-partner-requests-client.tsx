"use client"
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

type Request = { id: string; name: string; email: string; organization?: string; message?: string; status?: string; created_at: string }

export default function AdminPartnerRequestsClient() {
  const supabase = createClient()
  const [items, setItems] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState<string[]>([])
  const { toast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/partner-requests')
      const json = await res.json()
      setItems(json.data || [])
    } catch (err) {
      console.error(err)
      toast({ title: 'Failed to load partner requests', description: String(err) })
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchData()
    const ch = supabase.channel('public:partner_requests')
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'partner_requests' }, () => fetchData())
    ch.subscribe()
    return () => { try { ch.unsubscribe() } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = (id: string) => {
    setSelectedId(id)
    setShowConfirm(true)
  }

  const confirmDelete = async () => {
    const id = selectedId
    if (!id) return
    setShowConfirm(false)
    setProcessingIds((p) => [...p, id])
    try {
      const res = await fetch(`/api/admin/partner-requests/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      // optimistic remove
      setItems((prev) => prev.filter((it) => it.id !== id))
      // refresh in background
      fetchData()
      toast({ title: 'Deleted', description: 'Partner request removed' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Delete failed', description: String(err) })
    } finally {
      setProcessingIds((p) => p.filter((x) => x !== id))
      setSelectedId(null)
    }
  }

  const handleUpdate = async (id: string, status: string) => {
    setProcessingIds((p) => [...p, id])
    try {
      const res = await fetch(`/api/admin/partner-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error('Update failed')
      // Optimistically update local state so UI reflects the change immediately
      setItems((prev) => prev.map((it) => it.id === id ? { ...it, status } : it))
      // re-fetch to stay in sync
      fetchData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Update failed', description: String(err) })
    } finally {
      setProcessingIds((p) => p.filter((x) => x !== id))
    }
  }

  return (
    <>
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Partnership Requests</h1>
        {loading && <div>Loading…</div>}
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="p-3 border rounded">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-semibold">{it.name} — {it.email}</div>
                  <div className="text-xs text-black dark:text-white">{it.organization}</div>
                  <div className="mt-2">{it.message}</div>
                  <div className="text-xs text-black dark:text-white mt-2">{new Date(it.created_at).toLocaleString()}</div>
                </div>
                <div className="flex flex-col gap-2">
                  { (it.status === 'accepted' || it.status === 'rejected') ? (
                    <div className="text-sm font-medium">{it.status.charAt(0).toUpperCase() + it.status.slice(1)}</div>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => handleUpdate(it.id, 'accepted')} disabled={processingIds.includes(it.id)}>Accept</Button>
                      <Button variant="ghost" onClick={() => handleUpdate(it.id, 'rejected')} disabled={processingIds.includes(it.id)}>Reject</Button>
                    </>
                  )}
                  <Button variant="destructive" onClick={() => handleDelete(it.id)} disabled={processingIds.includes(it.id)}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
  </div>
  <Dialog open={showConfirm} onOpenChange={(open) => setShowConfirm(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm delete</DialogTitle>
        </DialogHeader>
        <div className="py-2">Are you sure you want to delete this partner request?</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button className="bg-destructive text-white" onClick={confirmDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
