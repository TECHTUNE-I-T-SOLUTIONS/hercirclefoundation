"use client"

import type React from "react"

// Admin layout provides wrapper; pages should not re-render the admin sidebar
import { Dialog as AdminDialog, DialogContent as AdminDialogContent, DialogTitle as AdminDialogTitle, DialogFooter as AdminDialogFooter, DialogHeader as AdminDialogHeader } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Trash2, Plus, X } from "lucide-react"
import { FileUploadInput } from "@/components/file-upload-input"

interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
  image_urls?: string[]
  // legacy single-image field (some rows may still have this)
  image_url?: string
  event_type: string
  status: string
  created_at: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<any>({
    title: "",
    description: "",
    date: "",
    location: "",
    image_urls: [] as string[],
    event_type: "workshop",
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const { toast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true })

      if (error) {
        console.error('Error fetching events:', error)
        toast({ title: 'Failed to load events', description: String(error) })
        return
      }
      setEvents(data || [])
    } catch (error) {
      console.error("Error fetching events:", error)
      toast({ title: 'Failed to load events', description: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Use server-side create endpoint to avoid RLS issues
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const form = new FormData()
      form.append('title', formData.title)
      form.append('description', formData.description)
      form.append('date', formData.date)
      form.append('location', formData.location)
      form.append('event_type', formData.event_type)
      form.append('image_urls', JSON.stringify(formData.image_urls || []))

      const res = await fetch('/api/admin/events', {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        toast({ title: 'Create failed', description: err?.error || 'create failed' })
        return
      }

      setFormData({
        title: "",
        description: "",
        date: "",
        location: "",
        image_urls: [],
        event_type: "workshop",
      })
      setShowForm(false)
      fetchEvents()
      // send push notifications to subscribers
      try {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Event: ' + formData.title,
            body: formData.description || 'A new event was created',
            url: '/events',
          }),
        })
      } catch (e) {
        console.error('Push send failed', e)
      }
    } catch (error) {
      console.error("Error creating event:", error)
    }
  }

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
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        toast({ title: 'Delete failed', description: err?.error || 'delete failed' })
        return
      }
      setEvents((prev) => prev.filter((e) => e.id !== id))
      toast({ title: 'Deleted', description: 'Event removed' })
    } catch (error) {
      console.error("Error deleting event:", error)
      toast({ title: 'Delete failed', description: String(error) })
    } finally {
      setSelectedId(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setShowBulkConfirm(false)
    try {
      // call delete endpoint for each id; include session token so server auth works
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const results = await Promise.all(selectedIds.map((id) => fetch(`/api/admin/events/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })))
      const failed = [] as string[]
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        if (!r.ok) {
          try { const j = await r.json(); failed.push(selectedIds[i] + ': ' + (j?.error || r.statusText)) } catch (e) { failed.push(selectedIds[i]) }
        }
      }
      if (failed.length > 0) {
        toast({ title: 'Some deletions failed', description: failed.join('; ') })
      }
      setEvents((prev) => prev.filter((e) => !selectedIds.includes(e.id)))
      setSelectedIds([])
      toast({ title: 'Deleted', description: 'Selected events removed' })
    } catch (error) {
      console.error('Bulk delete failed', error)
      toast({ title: 'Bulk delete failed', description: String(error) })
    }
  }

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground">Manage upcoming and past events</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 animate-slide-down">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="event_type">Event Type</Label>
                    <select
                      id="event_type"
                      aria-label="Event Type"
                      value={formData.event_type}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                      className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="workshop">Workshop</option>
                      <option value="awareness">Awareness Campaign</option>
                      <option value="distribution">Distribution</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    aria-label="Event Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date & Time</Label>
                    <Input
                      id="date"
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>Event Images</Label>
                  <div className="space-y-2 mt-2">
                    {(formData.image_urls || []).map((url: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <img src={url} alt={`event-${i}`} className="h-12 w-12 object-cover rounded" />
                        <Input
                          value={url}
                          onChange={(e) => {
                            const next = [...formData.image_urls]
                            next[i] = e.target.value
                            setFormData({ ...formData, image_urls: next })
                          }}
                        />
                        <Button
                          variant="ghost"
                          onClick={() => setFormData({ ...formData, image_urls: (formData.image_urls || []).filter((_: any, idx: number) => idx !== i) })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <FileUploadInput
                      label="Add Image"
                      onFileUrlChange={(url) => setFormData({ ...formData, image_urls: [...(formData.image_urls || []), url] })}
                      bucket="events"
                      accept="image/*"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    Create Event
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading events...</p>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No events yet. Create one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2 mb-2">
              {selectedIds.length > 0 && (
                <Button onClick={() => setShowBulkConfirm(true)} className="bg-destructive text-white">Delete selected ({selectedIds.length})</Button>
              )}
            </div>
            {events.map((event, index) => (
              <Card
                key={event.id}
                className="hover:shadow-md transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {(() => {
                        const imgs: string[] = event.image_urls && event.image_urls.length > 0
                          ? event.image_urls
                          : event.image_url
                            ? [event.image_url]
                            : []
                        if (imgs.length === 0) return null
                        return (
                          <div className="flex gap-2 mb-3">
                            {imgs.slice(0, 3).map((img, i) => (
                              <img key={i} src={img} alt={`event-thumb-${i}`} className="h-20 w-28 object-cover rounded" />
                            ))}
                          </div>
                        )
                      })()}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{event.title}</h3>
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{event.event_type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Date</p>
                          <p>{new Date(event.date).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Location</p>
                          <p>{event.location}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          // convert event.date to datetime-local format (YYYY-MM-DDTHH:MM)
                          const dt = event.date ? new Date(event.date) : null
                          const pad = (n: number) => String(n).padStart(2, '0')
                          const toLocalDatetime = (d: Date) => {
                            const year = d.getFullYear()
                            const month = pad(d.getMonth() + 1)
                            const day = pad(d.getDate())
                            const hours = pad(d.getHours())
                            const minutes = pad(d.getMinutes())
                            return `${year}-${month}-${day}T${hours}:${minutes}`
                          }

                          setEditingId(event.id)
                          setEditForm({
                            title: event.title,
                            description: event.description,
                            date: dt ? toLocalDatetime(dt) : '',
                            location: event.location,
                            image_urls: event.image_urls && event.image_urls.length > 0
                              ? [...event.image_urls]
                              : event.image_url
                                ? [event.image_url]
                                : [],
                            event_type: event.event_type,
                          })
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        Edit
                      </Button>

                      <Button
                        onClick={() => handleDelete(event.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <Dialog open={Boolean(editingId)} onOpenChange={(open) => { if (!open) { setEditingId(null); setEditForm(null) } }}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-3xl p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Edit Event</DialogTitle>
              <DialogDescription className="text-muted-foreground">Modify event details and images</DialogDescription>
            </div>
            <DialogClose aria-label="Close edit dialog" className="rounded-md p-2 hover:bg-muted">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          {editingId && editForm && (
            <div className="space-y-4 mt-4">
              <label className="sr-only">Title</label>
              <Input aria-label="Edit title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />

              <label className="sr-only">Description</label>
              <textarea aria-label="Edit description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full p-2 border rounded" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input aria-label="Edit date" type="datetime-local" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                <Input aria-label="Edit location" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </div>

              <div className="flex flex-wrap gap-2">
                {(editForm.image_urls || []).map((u: string, idx: number) => (
                  <div key={idx} className="relative">
                    <img src={u} alt={`edit-image-${idx}`} className="h-20 w-28 object-cover rounded" />
                    <button
                      type="button"
                      aria-label={`Remove image ${idx + 1}`}
                      className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow"
                      onClick={() => setEditForm({ ...editForm, image_urls: (editForm.image_urls || []).filter((_: any, i: number) => i !== idx) })}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>

              <FileUploadInput label="Add Image" bucket="events" accept="image/*" onFileUrlChange={(url) => setEditForm({ ...editForm, image_urls: [...(editForm.image_urls || []), url] })} />

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-4">
                <Button onClick={async () => {
                  try {
                    const supabase = createClient()
                    const { data: { session } } = await supabase.auth.getSession()
                    const token = session?.access_token
                    const form = new FormData()
                    for (const k of Object.keys(editForm)) {
                      const val = editForm[k]
                      if (Array.isArray(val)) form.append(`${k}[]`, JSON.stringify(val))
                      else form.append(k, val)
                    }
                    const res = await fetch(`/api/admin/events/${editingId}`, {
                      method: 'PATCH',
                      body: form,
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    })
                    if (!res.ok) {
                      const err = await res.json().catch(() => null)
                      toast({ title: 'Update failed', description: err?.error || 'update failed' })
                      return
                    }
                    setEditingId(null)
                    setEditForm(null)
                    fetchEvents()
                  } catch (err) {
                    console.error('Edit save failed', err)
                  }
                }} className="bg-primary">Save</Button>
                <Button variant="outline" onClick={() => { setEditingId(null); setEditForm(null) }}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
      <AdminDialog open={showConfirm} onOpenChange={(open) => setShowConfirm(open)}>
        <AdminDialogContent>
          <AdminDialogHeader>
            <AdminDialogTitle>Confirm delete</AdminDialogTitle>
          </AdminDialogHeader>
          <div className="py-2">Are you sure you want to delete this event?</div>
          <AdminDialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button className="bg-destructive text-white" onClick={confirmDelete}>Delete</Button>
          </AdminDialogFooter>
        </AdminDialogContent>
      </AdminDialog>
      <AdminDialog open={showBulkConfirm} onOpenChange={(open) => setShowBulkConfirm(open)}>
        <AdminDialogContent>
          <AdminDialogHeader>
            <AdminDialogTitle>Confirm delete</AdminDialogTitle>
          </AdminDialogHeader>
          <div className="py-2">Are you sure you want to delete the selected events? This action cannot be undone.</div>
          <AdminDialogFooter>
            <Button variant="outline" onClick={() => setShowBulkConfirm(false)}>Cancel</Button>
            <Button className="bg-destructive text-white" onClick={confirmBulkDelete}>Delete selected ({selectedIds.length})</Button>
          </AdminDialogFooter>
        </AdminDialogContent>
      </AdminDialog>
    </>
  )
}
