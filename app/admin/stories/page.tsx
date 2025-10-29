"use client"

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileUploadInput } from '@/components/file-upload-input'
import StoryModal from '@/components/story-modal'
import AttachmentViewerModal from '@/components/attachment-viewer-modal'

export default function AdminStoriesPage() {
  const [approved, setApproved] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [loadingApproved, setLoadingApproved] = useState(false)
  const [loadingPending, setLoadingPending] = useState(false)
  const [tab, setTab] = useState<'pending' | 'approved'>('pending')
  const [form, setForm] = useState<any>({ title: '', content: '', author_name: '', file_url: '', status: 'draft', theme: '' })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchPending = useCallback(async () => {
    setLoadingPending(true)
    try {
      const res = await fetch('/api/admin/stories?status=pending')
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        toast({ title: 'Failed to load pending stories', description: j?.error || 'Failed to load' })
        return
      }
      const json = await res.json()
      setPending(Array.isArray(json?.data) ? json.data : [])
    } catch (err) {
      console.error(err)
      toast({ title: 'Failed to load pending stories', description: String(err) })
    } finally {
      setLoadingPending(false)
    }
  }, [toast])

  const fetchApproved = useCallback(async () => {
    setLoadingApproved(true)
    try {
      const res = await fetch('/api/admin/stories?status=approved')
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        toast({ title: 'Failed to load approved stories', description: j?.error || 'Failed to load' })
        return
      }
      const json = await res.json()
      setApproved(Array.isArray(json?.data) ? json.data : [])
    } catch (err) {
      console.error(err)
      toast({ title: 'Failed to load approved stories', description: String(err) })
    } finally {
      setLoadingApproved(false)
    }
  }, [toast])

  useEffect(() => { fetchPending(); fetchApproved() }, [fetchPending, fetchApproved])

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/admin/stories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        toast({ title: 'Approve failed', description: j?.error || 'approve failed' })
        return
      }
      toast({ title: 'Approved', description: 'Story approved' })
      await fetchPending(); await fetchApproved()
      setTab('approved')
    } catch (e) { toast({ title: 'Approve failed', description: String(e) }) }
  }

  async function handleReject(id: string) {
    try {
      const res = await fetch(`/api/admin/stories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected' }) })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        toast({ title: 'Reject failed', description: j?.error || 'reject failed' })
        return
      }
      toast({ title: 'Rejected', description: 'Story rejected' })
      await fetchPending(); await fetchApproved()
    } catch (e) { toast({ title: 'Reject failed', description: String(e) }) }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/stories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        toast({ title: 'Delete failed', description: j?.error || 'delete failed' })
        return
      }
      toast({ title: 'Deleted', description: 'Story deleted' })
      await fetchPending(); await fetchApproved()
    } catch (e) { toast({ title: 'Delete failed', description: String(e) }) }
  }

  async function handleSave() {
    try {
      const res = await fetch('/api/admin/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        toast({ title: 'Save failed', description: j?.error || 'create failed' })
        return
      }
      toast({ title: 'Saved', description: 'Story created' })
      setForm({ title: '', content: '', author_name: '', file_url: '', status: 'draft', theme: '' })
      await fetchPending(); await fetchApproved()
    } catch (e) { toast({ title: 'Save failed', description: String(e) }) }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Admin — Stories</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Pending: <span className="font-semibold">{pending.length}</span></div>
          <div className="text-sm text-muted-foreground">Approved: <span className="font-semibold">{approved.length}</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('pending')} className={`px-3 py-2 rounded-md ${tab === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-secondary'}`} aria-pressed={tab === 'pending'}>
            Unapproved ({pending.length})
          </button>
          <button onClick={() => setTab('approved')} className={`px-3 py-2 rounded-md ${tab === 'approved' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-secondary'}`} aria-pressed={tab === 'approved'}>
            Approved ({approved.length})
          </button>
        </div>

        {/* Create form (expanded) */}
        <div className="w-full sm:w-auto bg-white dark:bg-gray-900 rounded shadow p-3 sm:p-4 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium">Create new story</h3>
            <p className="text-sm text-muted-foreground">Use the button to open a full create modal.</p>
          </div>
          <div>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-primary">Create Story</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {tab === 'pending' ? (
            <div className="space-y-4">
              {loadingPending ? <div>Loading pending…</div> : pending.length === 0 ? <div className="text-muted-foreground">No pending stories</div> : (
                pending.map((s) => (
                  <div key={s.id} className="p-4 border rounded">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{s.title || s.excerpt || 'Untitled'}</h3>
                        <div className="text-xs text-muted-foreground">{s.author_name || 'Anonymous'} • {s.status}</div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-4">{s.excerpt || (s.content || '').slice(0, 300)}</p>
                        {/* Attachment preview */}
                        {s.file_url && (
                          <div className="mt-3">
                            {/(jpg|jpeg|png|gif|webp|avif)$/i.test(s.file_url) ? (
                              <img src={s.file_url} alt="attachment" className="max-h-40 rounded cursor-pointer" onClick={() => setViewingAttachment(s.file_url)} />
                            ) : (
                              <div className="flex items-center gap-2">
                                <button onClick={() => setViewingAttachment(s.file_url)} className="text-primary underline">Open attachment</button>
                                <button onClick={async () => { try { await navigator.clipboard.writeText(s.file_url); toast({ title: 'Copied', description: 'Attachment URL copied to clipboard' }) } catch(e){ toast({ title: 'Copy failed' }) } }} className="text-sm">Copy URL</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex gap-2 items-center">
                        <Button size="sm" onClick={() => handleApprove(s.id)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(s.id)}>Reject</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)}>Delete</Button>
                        <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(s.content || ''); toast({ title: 'Copied', description: 'Story content copied' }) } catch(e) { toast({ title: 'Copy failed' }) } }}>Copy text</Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {loadingApproved ? <div>Loading approved…</div> : approved.length === 0 ? <div className="text-muted-foreground">No approved stories</div> : (
                approved.map((s) => (
                  <div key={s.id} className="p-4 border rounded">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{s.title || s.excerpt || 'Untitled'}</h3>
                        <div className="text-xs text-muted-foreground">{s.author_name || 'Anonymous'} • {s.status}</div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-4">{s.excerpt || (s.content || '').slice(0, 300)}</p>
                        {s.file_url && (
                          <div className="mt-3">
                            {/(jpg|jpeg|png|gif|webp|avif)$/i.test(s.file_url) ? (
                              <img src={s.file_url} alt="attachment" className="max-h-40 rounded cursor-pointer" onClick={() => setViewingAttachment(s.file_url)} />
                            ) : (
                              <div className="flex items-center gap-2">
                                <button onClick={() => setViewingAttachment(s.file_url)} className="text-primary underline">Open attachment</button>
                                <button onClick={async () => { try { await navigator.clipboard.writeText(s.file_url); toast({ title: 'Copied', description: 'Attachment URL copied to clipboard' }) } catch(e){ toast({ title: 'Copy failed' }) } }} className="text-sm">Copy URL</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex gap-2 items-center">
                        <Button size="sm" onClick={() => handleDelete(s.id)}>Delete</Button>
                        <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(s.content || ''); toast({ title: 'Copied', description: 'Story content copied' }) } catch(e) { toast({ title: 'Copy failed' }) } }}>Copy text</Button>
                      </div>
                    </div>
                  </div>
                ))
               )}
             </div>
          )}
        </div>

        {/* Right column — optional details / stats */}
        <aside className="bg-white dark:bg-gray-900 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="text-sm text-muted-foreground mb-4">Use the list to review and moderate user-submitted stories.</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-sm">Pending</span><span className="font-semibold">{pending.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm">Approved</span><span className="font-semibold">{approved.length}</span></div>
          </div>
        </aside>
      </div>

      <StoryModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSaved={() => { fetchPending(); fetchApproved() }} />
      <AttachmentViewerModal isOpen={!!viewingAttachment} url={viewingAttachment || undefined} onClose={() => setViewingAttachment(null)} />
    </div>
  )
}
