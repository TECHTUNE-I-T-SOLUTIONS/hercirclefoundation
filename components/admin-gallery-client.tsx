"use client"

import type React from "react"

import { AdminSidebarNew } from "@/components/admin-sidebar-new"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Trash2, Plus, ImageIcon } from "lucide-react"
import { FileUploadInput } from "@/components/file-upload-input"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'

interface GalleryItem {
  id: string
  title: string
  description: string
  media_url?: string
  media_urls?: string[]
  media_type?: string
  category: string
  created_at: string
}

type Props = {
  createAction?: (payload: any) => Promise<any>
  updateAction?: (id: string, payload: any) => Promise<any>
  deleteAction?: (id: string) => Promise<any>
}

export default function AdminGalleryClient({ createAction, updateAction, deleteAction }: Props) {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    media_url: "",
    media_type: "image/jpeg",
    category: "workshops",
  })
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>(null)

  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("gallery").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error("Error fetching gallery:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setAuthError(null)
    try {
      // use server-side create to avoid RLS
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // determine whether to create one record or multiple (one per uploaded URL)
      const urlsToCreate = uploadedUrls.length > 0 ? uploadedUrls : (formData.media_url ? [formData.media_url] : [])

      if (urlsToCreate.length === 0) {
        setCreateError('Please upload a file or provide an external URL')
        return
      }

      // Send a single POST with media_urls array to create one gallery record with multiple media
      const payload: any = {
        title: formData.title,
        description: formData.description,
        media_type: formData.media_type,
        category: formData.category,
      }

      if (uploadedUrls.length > 0) payload.media_urls = uploadedUrls
      else if (formData.media_url) payload.media_url = formData.media_url

      if (createAction) {
        await createAction(payload)
      } else {
        const res = await fetch('/api/admin/gallery', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        })

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          if (res.status === 401) {
            setAuthError(err?.error || 'Session expired or sign-in required. Please sign in again.')
            return
          }
          throw new Error(err?.error || 'create failed')
        }
      }

      // success for all created items
      setFormData({
        title: "",
        description: "",
        media_url: "",
        media_type: "image/jpeg",
        category: "workshops",
      })
      setUploadedUrls([])
      setShowForm(false)
      fetchGallery()

      // send push notifications to subscribers
      try {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Gallery Item: ' + formData.title,
            body: formData.description || 'A new gallery item has been added',
            url: '/gallery',
          }),
        })
      } catch (e) {
        console.error('Push send failed', e)
      }
    } catch (error) {
      console.error("Error creating gallery item:", error)
      setCreateError(error instanceof Error ? error.message : String(error))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const supabase = createClient()
      // call server route that verifies session from cookies
      if (deleteAction) {
        await deleteAction(id)
      } else {
        const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.error || 'delete failed')
        }
      }
      setItems(items.filter((i) => i.id !== id))
    } catch (error) {
      console.error("Error deleting gallery item:", error)
    }
  }

  return (
    <AdminSidebarNew>
  <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Gallery</h1>
            <p className="text-muted-foreground">Manage photos and videos</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Media
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 animate-slide-down">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    aria-label="Gallery description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background"
                    rows={3}
                  />
                </div>

                <div>
                  <FileUploadInput
                    label="Media File"
                    onFileUrlChange={(url) => {
                      // called for each uploaded file; accumulate into uploadedUrls
                      setUploadedUrls((s) => [...s, url])
                      // also set single media_url for compatibility
                      setFormData((f) => ({ ...f, media_url: url }))
                    }}
                    bucket="gallery"
                    accept="image/*,video/*"
                    multiple={true}
                  />

                  {uploadedUrls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {uploadedUrls.map((u, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-700 border border-green-200 rounded">
                          <div className="truncate text-sm">{u}</div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => window.open(u, '_blank')}>View</Button>
                            <Button size="sm" variant="outline" onClick={() => setUploadedUrls((s) => s.filter((_, idx) => idx !== i))}>Remove</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="media_type">Media Type</Label>
                    <select
                      id="media_type"
                      aria-label="Media type"
                      value={formData.media_type}
                      onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
                      className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="image/jpeg">Image (JPEG)</option>
                      <option value="image/png">Image (PNG)</option>
                      <option value="video/mp4">Video (MP4)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    aria-label="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="workshops">Workshops</option>
                    <option value="distributions">Distributions</option>
                    <option value="awareness">Awareness</option>
                    <option value="community">Community</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    Add to Gallery
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
                {authError && (
                  <div className="mt-2">
                    <p className="text-sm text-destructive">{authError}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => {
                        // redirect to admin login
                        window.location.href = '/admin/auth/login'
                      }}>Sign in</Button>
                      <Button size="sm" variant="outline" onClick={() => setAuthError(null)}>Dismiss</Button>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading gallery...</p>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No gallery items yet. Add one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, index) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-md transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {(() => {
                  const primary = (item.media_urls && item.media_urls.length > 0) ? item.media_urls[0] : item.media_url
                  const isImage = primary && /\.(jpg|jpeg|png|gif|webp)$/i.test(primary)
                  const isVideo = primary && /\.(mp4|webm|ogg)$/i.test(primary)
                  return (
                    <>
                      <div className="relative h-48 bg-secondary overflow-hidden">
                        {isImage ? (
                          <img
                            src={primary || "/placeholder.svg"}
                            alt={item.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : isVideo ? (
                          <video src={primary} controls className="w-full h-full object-cover max-h-[48vh]" />
                        ) : /drive.google.com/.test(primary || '') ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <iframe
                              title={item.title || 'External media'}
                              src={(primary || '').replace(/\/view\?.*$/, "/preview")}
                              className="w-full max-h-[48vh]"
                              allowFullScreen
                            />
                            <div className="absolute top-2 right-2">
                              <Button size="sm" variant="ghost" onClick={() => window.open(primary, '_blank')}>Open</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* small thumbnail strip for quick preview in list */}
                      <div className="p-3">
                        {(item.media_urls && item.media_urls.length > 1) ? (
                          <div className="flex gap-2">
                            {item.media_urls!.slice(0, 3).map((u, idx) => (
                              <img key={idx} src={u} alt={item.title} className="h-20 w-1/3 object-cover rounded" />
                            ))}
                          </div>
                        ) : isImage ? (
                          <img src={primary || '/placeholder.svg'} alt={item.title} className="h-20 w-full object-cover rounded" />
                        ) : null}
                      </div>
                    </>
                  )
                })()}
                <CardContent className="pt-4">
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                  )}
                    <div className="flex items-center justify-between">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{item.category}</span>
                    <div className="flex gap-2">
                      <Button onClick={() => {
                        setEditingId(item.id)
                        setEditForm({
                          title: item.title,
                          description: item.description,
                          media_url: item.media_url,
                          media_urls: (item as any).media_urls && Array.isArray((item as any).media_urls) ? (item as any).media_urls : (item.media_url ? [item.media_url] : []),
                          media_type: item.media_type,
                          category: item.category,
                        })
                      }} variant="ghost" size="sm">Edit</Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
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
      </div>
      <Dialog open={Boolean(editingId)} onOpenChange={(open) => { if (!open) { setEditingId(null); setEditForm(null) } }}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-3xl p-4 sm:p-6">
          {/* make modal content scrollable to avoid overflow */}
          <div className="max-h-[80vh] overflow-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Edit Gallery Item</DialogTitle>
              <DialogDescription className="text-muted-foreground">Update media and details</DialogDescription>
            </div>
            <DialogClose aria-label="Close edit dialog" className="rounded-md p-2 hover:bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </DialogClose>
          </div>

          {editingId && editForm && (
            <div className="space-y-4 mt-4">
              <Input aria-label="Edit title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              <textarea aria-label="Edit description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full p-2 border rounded" />
              <div>
                <Label>Media</Label>
                <div className="space-y-2 mt-2">
                  {(editForm.media_urls || []).map((u: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-green-50 border rounded">
                      <div className="truncate pr-2">{u}</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => window.open(u, '_blank')}>View</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditForm((f: any) => ({ ...f, media_urls: (f.media_urls || []).filter((_: any, idx: number) => idx !== i) }))}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <FileUploadInput label="Add Media" bucket="gallery" accept="image/*,video/*" multiple={true} onFileUrlChange={(url) => setEditForm((f: any) => ({ ...f, media_urls: [...(f.media_urls || []), url] }))} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-4">
                <Button onClick={async () => {
                  try {
                    const payload: any = {
                      title: editForm.title,
                      description: editForm.description,
                      media_type: editForm.media_type,
                      category: editForm.category,
                    }

                    if (editForm.media_urls && editForm.media_urls.length > 0) payload.media_urls = editForm.media_urls
                    else if (editForm.media_url) payload.media_url = editForm.media_url

                    if (updateAction && editingId) {
                      await updateAction(editingId, payload)
                    } else {
                      const res = await fetch(`/api/admin/gallery/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
                      if (!res.ok) {
                        const err = await res.json().catch(() => null)
                        if (res.status === 401) {
                          console.error('Auth error saving edit', err)
                          setAuthError(err?.error || 'Session expired or sign-in required. Please sign in again.')
                          return
                        }
                        throw new Error(err?.error || 'update failed')
                      }
                    }
                    setEditingId(null)
                    setEditForm(null)
                    fetchGallery()
                  } catch (err) { console.error('Save failed', err) }
                }} className="bg-primary">Save</Button>
                <Button variant="outline" onClick={() => { setEditingId(null); setEditForm(null) }}>Cancel</Button>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
      
    </AdminSidebarNew>
  )
}
