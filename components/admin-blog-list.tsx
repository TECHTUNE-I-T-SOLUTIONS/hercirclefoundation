"use client"
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import RichTextEditor from '@/components/rich-text-editor'
import { useToast } from '@/hooks/use-toast'

type Blog = {
  id: string
  title: string
  slug?: string
  excerpt?: string
  content?: string
  cover_image?: string
  status?: string
  published_at?: string | null
  created_at?: string
}

export default function AdminBlogList() {
  const [items, setItems] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Blog | null>(null)
  const [form, setForm] = useState<any>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchList()

    const onCreated = (e: any) => {
      const b = e.detail
      if (b) setItems((s) => [b, ...s])
    }
    const onUpdated = (e: any) => {
      const b = e.detail
      if (b) setItems((s) => s.map((it) => (it.id === b.id ? b : it)))
    }
    window.addEventListener('hc:blog-created', onCreated as EventListener)
    window.addEventListener('hc:blog-updated', onUpdated as EventListener)
    return () => {
      window.removeEventListener('hc:blog-created', onCreated as EventListener)
      window.removeEventListener('hc:blog-updated', onUpdated as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchList() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blogs')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setItems(json.data || [])
    } catch (err) {
      console.error(err)
      toast({ title: 'Failed to load blogs', description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  function openEdit(b: Blog) {
    setEditing(b)
    setForm({ ...b })
  }

  async function saveEdit() {
    if (!editing) return
    try {
      const res = await fetch(`/api/admin/blogs/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'update failed')
      }
      const j = await res.json()
      const updated = j.data
      setItems((s) => s.map((it) => (it.id === updated.id ? updated : it)))
      toast({ title: 'Saved', description: 'Blog updated' })
      try { window.dispatchEvent(new CustomEvent('hc:blog-updated', { detail: updated })) } catch (e) {}
      setEditing(null)
      setForm({})
    } catch (err) {
      console.error('Save failed', err)
      toast({ title: 'Save failed', description: String(err) })
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Posts</h2>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.id} className="p-3 border rounded flex items-start justify-between">
              <div>
                <div className="font-medium">{b.title} <span className="text-xs text-muted-foreground">{b.status}</span></div>
                <div className="text-xs text-muted-foreground">{b.excerpt}</div>
                <div className="text-xs text-muted-foreground">{b.published_at ? new Date(b.published_at).toLocaleString() : ''}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 max-h-[70vh] overflow-auto">
              <div>
                <label className="block text-sm font-medium">Title</label>
                <input aria-label="Title" placeholder="Post title" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Slug</label>
                <input aria-label="Slug" placeholder="post-slug" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Excerpt</label>
                <textarea aria-label="Excerpt" placeholder="Short summary" value={form.excerpt || ''} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-1 textarea w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <RichTextEditor value={form.content || ''} onChange={(html) => setForm({ ...form, content: html })} />
              </div>
              <div>
                <label className="block text-sm font-medium">Cover image</label>
                <input aria-label="Cover image" placeholder="https://..." value={form.cover_image || ''} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} className="mt-1 input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Status</label>
                <select aria-label="Status" value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 select w-full">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="bg-primary" onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
