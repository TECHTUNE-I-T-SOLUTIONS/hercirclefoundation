"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Eye, Pencil, Trash2 } from 'lucide-react'

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
  author_name?: string | null
  featured?: boolean
  tags?: string[]
}

export default function AdminBlogList() {
  const router = useRouter()
  const [items, setItems] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchList()
  }, [])

  async function fetchList() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blogs')
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        toast({ title: 'Failed to load blogs', description: j?.error || 'Failed to load' })
        return
      }
      const json = await res.json()
      setItems(json.data || [])
    } catch (err) {
      console.error(err)
      toast({ title: 'Failed to load blogs', description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => setSelectedIds((s) => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))

  const confirmDelete = async (id?: string) => {
    const target = id || deleteTargetId
    if (!target) return
    setShowDeleteConfirm(false)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`/api/admin/blogs/${target}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        toast({ title: 'Delete failed', description: j?.error || 'delete failed' })
        return
      }
      setItems((s) => s.filter(b => b.id !== target))
      setSelectedIds((s) => s.filter(x => x !== target))
      toast({ title: 'Deleted', description: 'Blog removed' })
    } catch (err) {
      console.error('Delete failed', err)
      toast({ title: 'Delete failed', description: String(err) })
    }
  }

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return
    setShowDeleteConfirm(false)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const results = await Promise.all(selectedIds.map(id => fetch(`/api/admin/blogs/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })))
      const failed: string[] = []
      for (let i = 0; i < results.length; i++) {
        if (!results[i].ok) {
          try { const j = await results[i].json(); failed.push(selectedIds[i] + ':' + (j?.error || results[i].statusText)) } catch(e) { failed.push(selectedIds[i]) }
        }
      }
      if (failed.length > 0) toast({ title: 'Some deletions failed', description: failed.join('; ') })
      setItems((s) => s.filter(b => !selectedIds.includes(b.id)))
      setSelectedIds([])
      toast({ title: 'Deleted', description: 'Selected blogs removed' })
    } catch (err) {
      console.error('Bulk delete error', err)
      toast({ title: 'Bulk delete failed', description: String(err) })
    }
  }

  return (
    <div className="mt-6 sm:mt-8">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Posts</h2>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No blog posts yet. Create your first blog post!</p>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex justify-end gap-2">
            {selectedIds.length > 0 && (
              <Button className="bg-destructive text-white text-sm" onClick={() => setShowDeleteConfirm(true)}>
                Delete selected ({selectedIds.length})
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {items.map((b) => (
              <div key={b.id} className="p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 w-full">
                    <input 
                      type="checkbox" 
                      className="mt-1 flex-shrink-0" 
                      checked={selectedIds.includes(b.id)} 
                      onChange={() => toggleSelect(b.id)} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                        <span className="font-medium text-sm sm:text-base truncate">{b.title}</span>
                        {b.featured && <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded flex-shrink-0">Featured</span>}
                        <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                          b.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{b.excerpt}</p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                        <span className="flex-shrink-0">{b.published_at ? new Date(b.published_at).toLocaleDateString() : 'Not published'}</span>
                        {b.author_name && <span className="flex-shrink-0">By: {b.author_name}</span>}
                        {b.tags && b.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {b.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-muted rounded text-xs">
                                {tag}
                              </span>
                            ))}
                            {b.tags.length > 2 && <span className="text-xs">+{b.tags.length - 2}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-row">
                    {b.status === 'published' && (
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/blog/${b.slug}`)} className="flex-shrink-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/blogs/${b.id}/edit`)} className="flex-shrink-0">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive flex-shrink-0" onClick={() => { setDeleteTargetId(b.id); setShowDeleteConfirm(true) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showDeleteConfirm} onOpenChange={(open) => setShowDeleteConfirm(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm delete</DialogTitle>
          </DialogHeader>
          <div className="py-2">Are you sure you want to delete the selected item(s)? This action cannot be undone.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button className="bg-destructive text-white" onClick={() => { if (selectedIds.length > 0) bulkDelete(); else confirmDelete(deleteTargetId || undefined) }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
