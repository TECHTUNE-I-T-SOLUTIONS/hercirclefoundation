"use client"
import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type Reaction = {
  id: string
  blog_id: string
  user_name?: string | null
  type: string
  created_at: string
}

export default function AdminReactionsClient() {
  const supabase = createClient()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [blogTitles, setBlogTitles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(25)
  const channelRef = useRef<any>(null)
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      let q = supabase.from('blog_reactions').select('id, blog_id, user_name, type, created_at')
      if (search) {
        // if numeric, try to match blog_id or user_id, otherwise search type
        if (/^\d+$/.test(search)) {
          q = q.or(`blog_id.eq.${search},user_name.eq.${search}`)
        } else {
          q = q.ilike('type', `%${search}%`)
        }
      }
      const from = page * limit
      const to = from + limit - 1
      const { data, error } = await q.order('created_at', { ascending: false }).range(from, to)
      if (error) throw error
      const rows = (data || []) as Reaction[]
      setReactions(rows)
      try {
        const ids = Array.from(new Set(rows.map((r) => String(r.blog_id))))
        if (ids.length > 0) {
          const { data: blogs } = await supabase.from('blogs').select('id, title').in('id', ids)
          const map: Record<string, string> = {}
          (blogs || []).forEach((b: any) => { map[String(b.id)] = b.title })
          setBlogTitles(map)
        }
      } catch (e) { console.warn('failed to fetch blog titles', e) }
    } catch (err) {
      console.error('fetch reactions', err)
      toast({ title: 'Failed to load reactions', description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit])

  useEffect(() => {
    // setup realtime subscription
    const ch = supabase.channel('public:blog_reactions')
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blog_reactions' }, (payload) => {
      setReactions((prev) => [payload.new as Reaction, ...prev].slice(0, limit))
    })
    ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blog_reactions' }, (payload) => {
      setReactions((prev) => prev.filter((r) => String(r.id) !== String((payload.old as any)?.id)))
    })
    ch.subscribe()
    channelRef.current = ch
    return () => {
      try {
        ch.unsubscribe()
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  const handleDelete = async (r: Reaction) => {
    const prev = reactions
    // optimistic update
    setReactions((cur) => cur.filter((x) => x.id !== r.id))
    try {
      const res = await fetch(`/api/admin/blogs/${r.blog_id}/reactions/${r.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.text().catch(() => null)
        throw new Error(err || 'delete failed')
      }
    } catch (err) {
      toast({ title: 'Delete failed', description: 'Reverting changes' })
      setReactions(prev)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <input placeholder="Search by blog id, user id or type" value={search} onChange={(e) => setSearch(e.target.value)} className="input" />
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
          {reactions.length === 0 && !loading && <div className="text-gray-900 dark:text-gray-100">No reactions</div>}
          {reactions.map((r) => (
            <div key={r.id} className="p-3 border rounded flex justify-between items-start">
              <div>
                <div className="text-sm text-gray-900 dark:text-gray-100">{new Date(r.created_at).toLocaleString()}</div>
                <div className="mt-2">Type: {r.type}</div>
                {(() => {
                    function BlogInfo({ reaction }: { reaction: Reaction }) {
                        const [title, setTitle] = useState<string | null>(() => blogTitles[String(reaction.blog_id)] || null)
                        useEffect(() => {
                            if (title) return
                            let mounted = true
                            const sup = createClient()
                            ;(async () => {
                                try {
                                    const { data, error } = await sup.from('blogs').select('title').eq('id', reaction.blog_id).maybeSingle()
                                    if (!mounted) return
                                    if (error) {
                                        console.warn('fetch blog title', error)
                                        setTitle(String(reaction.blog_id))
                                        return
                                    }
                                    setTitle((data as any)?.title ?? String(reaction.blog_id))
                                } catch (e) {
                                    if (!mounted) return
                                    console.warn('fetch blog title', e)
                                    setTitle(String(reaction.blog_id))
                                }
                            })()
                            return () => { mounted = false }
                            // eslint-disable-next-line react-hooks/exhaustive-deps
                        }, [reaction.blog_id])
                        return (
                            <div className="text-xs text-gray-900 dark:text-gray-100 mt-2">
                                Blog: {title ?? 'Loading…'} • User: {reaction.user_name || 'Anonymous'}
                            </div>
                        )
                    }
                    return <BlogInfo reaction={r} />
                })()}
              </div>
              <div>
                <Button variant="ghost" onClick={() => handleDelete(r)}>Delete</Button>
              </div>
            </div>
          ))}
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
