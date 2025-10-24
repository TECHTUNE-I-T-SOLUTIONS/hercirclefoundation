"use client"
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type Comment = { id: string; blog_id: string; parent_id?: string | null; user_name?: string | null; content: string; created_at: string }

export default function AdminCommentsClient() {
  const supabase = useMemo(() => createClient(), [])
  const [comments, setComments] = useState<Comment[]>([])
  const [blogTitles, setBlogTitles] = useState<Record<string, string>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<any>(null)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
  let q = supabase.from('blog_comments').select('id, blog_id, parent_id, user_name, content, created_at')
      if (search) {
        if (/^\d+$/.test(search)) {
          q = q.or(`blog_id.eq.${search},user_name.eq.${search}`)
        } else {
          q = q.ilike('content', `%${search}%`)
        }
      }
      const from = page * limit
      const to = from + limit - 1
      const { data, error } = await q.order('created_at', { ascending: false }).range(from, to)
      if (error) throw error
      const rows = (data || []) as Comment[]
      setComments(rows)

      // fetch blog titles for the shown rows
      try {
        const ids = Array.from(new Set(rows.map((r) => String(r.blog_id))))
        if (ids.length > 0) {
          const { data: blogs } = await supabase.from('blogs').select('id, title').in('id', ids)
          const map: Record<string, string> = {}
          ;(blogs || []).forEach((b: any) => { map[String(b.id)] = b.title })
          setBlogTitles(map)
        }
      } catch (e) {
        console.warn('failed to fetch blog titles', e)
      }
    } catch (err) {
      console.error('fetch comments', err)
      toast({ title: 'Failed to load comments', description: String(err) })
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const ch = supabase.channel('public:blog_comments')
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blog_comments' }, (payload) => {
      setComments((prev) => [payload.new as Comment, ...prev].slice(0, limit))
      // refresh title for the blog id if missing
      try {
        const id = (payload.new as any)?.blog_id
        if (id && !blogTitles[String(id)]) {
          supabase.from('blogs').select('id,title').eq('id', id).then(({ data }) => {
            if (data && data[0]) setBlogTitles((m) => ({ ...m, [String(id)]: data[0].title }))
          }).catch(() => {})
        }
      } catch {}
    })
    ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blog_comments' }, (payload) => {
      setComments((prev) => prev.filter((c) => String(c.id) !== String((payload.old as any)?.id)))
    })
    ch.subscribe()
    channelRef.current = ch
    return () => { try { ch.unsubscribe() } catch {} }
  }, [limit, supabase])

  const handleDelete = async (c: Comment) => {
    const prev = comments
    setComments((cur) => cur.filter((x) => x.id !== c.id))
    try {
      const res = await fetch(`/api/admin/blogs/${c.blog_id}/comments/${c.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
    } catch (err) {
      toast({ title: 'Delete failed', description: 'Reverting changes' })
      setComments(prev)
    }
  }

  const handleReply = async (comment: Comment) => {
    if (!replyContent.trim()) return
    setReplyLoading(true)
    try {
      // Post reply to public comments endpoint. Server will use the admin session
      // (cookie) to attribute the reply to the admin if available.
      const res = await fetch(`/api/blogs/${comment.blog_id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, parent_id: comment.id }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || `reply failed (${res.status})`)
      }
      setReplyingTo(null)
      setReplyContent('')
      toast({ title: 'Reply posted', description: 'Your reply was recorded.' })
      // refresh list to show reply
      await fetchData()
    } catch (err) {
      console.error('reply failed', err)
      toast({ title: 'Reply failed', description: String(err) })
    } finally {
      setReplyLoading(false)
    }
  }

  // Render comments as a tree: top-level comments (parent_id null) and replies
  const buildTree = (rows: Comment[]) => {
    const map: Record<string, Comment[]> = {}
    rows.forEach((r) => {
      const pid = r.parent_id ? String(r.parent_id) : 'root'
      map[pid] = map[pid] || []
      map[pid].push(r)
    })
    return map
  }

  const tree = buildTree(comments)

  const renderNode = (node: Comment, level = 0) => (
    <div key={node.id} className="p-3 border rounded flex justify-between items-start" style={{ marginLeft: level * 20 }}>
      <div>
        <div className="text-sm text-gray-900 dark:text-gray-100">{new Date(node.created_at).toLocaleString()}</div>
        <div className="mt-2">{node.content}</div>
        {(() => {
            const key = String(node.blog_id)
            const title = blogTitles[key]
            if (title) {
                return <div>
                  <div className="text-xs text-gray-900 dark:text-gray-100 mt-2">Blog: {title} • User: {node.user_name || 'Anonymous'}</div>
                  {replyingTo === node.id && (
                    <div className="mt-2">
                      <textarea aria-label="Admin reply" value={replyContent} onChange={(e) => setReplyContent(e.target.value)} className="textarea w-full border rounded p-2" rows={3} />
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button disabled={replyLoading} onClick={() => handleReply(node)}>{replyLoading ? 'Replying…' : 'Post Reply'}</Button>
                        <Button variant="ghost" onClick={() => { setReplyingTo(null); setReplyContent('') }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
            }

            // defer fetch to after render to avoid doing work during render
            setTimeout(() => {
                // double-check still missing (avoid duplicate fetches)
                if (blogTitles[key]) return
                supabase
                    .from('blogs')
                    .select('title')
                    .eq('id', node.blog_id)
                    .limit(1)
                    .maybeSingle()
                    .then(({ data }) => {
                        const t = data?.title || String(node.blog_id)
                        setBlogTitles((m) => ({ ...m, [key]: t }))
                    })
                    .catch(() => {
                        setBlogTitles((m) => ({ ...m, [key]: String(node.blog_id) }))
                    })
            }, 0)

      return <div className="text-xs text-gray-900 dark:text-gray-100 mt-2">Blog: Loading… • User: {node.user_name || 'Anonymous'}</div>
        })()}
      </div>
      <div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="ghost" onClick={() => handleDelete(node)}>Delete</Button>
          <Button variant="ghost" onClick={() => { setReplyingTo(node.id); setReplyContent('') }}>Reply</Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <input placeholder="Search by blog id, user id or text" value={search} onChange={(e) => setSearch(e.target.value)} className="input" />
          <Button onClick={() => { setPage(0); fetchData() }}>Search</Button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm">Rows</label>
            <select aria-label="rows-per-page" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(0) }} className="select">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {loading && <div>Loading…</div>}
          {comments.length === 0 && !loading && <div className="text-gray-900 dark:text-gray-100">No comments</div>}
          {(() => {
            const roots = tree['root'] || []
            const renderNodes = (nodes: Comment[], level = 0): React.ReactNode => {
              return nodes.map((n) => (
                <div key={n.id}>
                  {renderNode(n, level)}
                  {(tree[String(n.id)] || []).length > 0 && renderNodes(tree[String(n.id)], level + 1)}
                </div>
              ))
            }
            return renderNodes(roots, 0)
          })()}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</Button>
          <div>Page {page + 1}</div>
          <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  )
}
