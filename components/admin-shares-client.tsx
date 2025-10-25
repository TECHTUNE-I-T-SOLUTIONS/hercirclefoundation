"use client"
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type Share = { id: string; blog_id: string; user_name?: string | null; platform: string; created_at: string }

export default function AdminSharesClient() {
  const supabase = useMemo(() => createClient(), [])
  const [shares, setShares] = useState<Share[]>([])
  const [blogTitles, setBlogTitles] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase.from('blog_shares').select('id, blog_id, user_name, platform, created_at')
      if (search) {
        if (/^\d+$/.test(search)) {
          q = q.or(`blog_id.eq.${search},user_name.eq.${search}`)
        } else {
          q = q.ilike('platform', `%${search}%`)
        }
      }
      const from = page * limit
      const to = from + limit - 1
      const { data, error } = await q.order('created_at', { ascending: false }).range(from, to)
      if (error) throw error
      const rows = (data || []) as Share[]
      setShares(rows)
      try {
        const ids = Array.from(new Set(rows.map((r) => String(r.blog_id))))
        if (ids.length > 0) {
          const { data: blogs } = await supabase.from('blogs').select('id, title').in('id', ids)
          const map: Record<string, string> = {}
          ;(blogs || []).forEach((b: any) => { map[String(b.id)] = b.title })
          setBlogTitles(map)
        }
      } catch (e) { console.warn('failed to fetch blog titles', e) }
    } catch (err) {
      console.error('fetch shares', err)
      toast({ title: 'Failed to load shares', description: String(err) })
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const ch = supabase.channel('public:blog_shares')
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blog_shares' }, (payload) => {
      setShares((prev) => [payload.new as Share, ...prev].slice(0, limit))
    })
    ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blog_shares' }, (payload) => {
      setShares((prev) => prev.filter((s) => String(s.id) !== String((payload.old as any)?.id)))
    })
    ch.subscribe()
    return () => { try { ch.unsubscribe() } catch {} }
  }, [limit, supabase])

  const handleDelete = async (s: Share) => {
    const prev = shares
    setShares((cur) => cur.filter((x) => x.id !== s.id))
    try {
      const res = await fetch(`/api/admin/blogs/${s.blog_id}/shares/${s.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
    } catch (err) {
      toast({ title: 'Delete failed', description: 'Reverting changes' })
      setShares(prev)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <input placeholder="Search by blog id, user id or platform" value={search} onChange={(e) => setSearch(e.target.value)} className="input" />
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
          {shares.length === 0 && !loading && <div className="text-gray-900 dark:text-gray-100">No shares</div>}
          {shares.map((s) => (
            <div key={s.id} className="p-3 border rounded flex justify-between items-start">
              <div>
                <div className="text-sm text-gray-900 dark:text-gray-100">{new Date(s.created_at).toLocaleString()}</div>
                <div className="mt-2">Platform: {s.platform}</div>
                <div
                  className="text-xs text-gray-900 dark:text-gray-100 mt-2"
                  onMouseEnter={async () => {
                    const id = String(s.blog_id)
                    if (blogTitles[id]) return
                    try {
                      const { data: blog, error } = await supabase.from('blogs').select('title').eq('id', s.blog_id).single()
                      if (error) throw error
                      if (blog?.title) setBlogTitles((prev) => ({ ...prev, [id]: blog.title }))
                    } catch (e) {
                      console.warn('failed to fetch blog title', e)
                    }
                  }}
                >
                  Blog: {blogTitles[String(s.blog_id)] ?? <span className="text-gray-500">(fetching title on hover) {String(s.blog_id)}</span>} • User: {s.user_name || 'Anonymous'}
                </div>
              </div>
              <div>
                <Button variant="ghost" onClick={() => handleDelete(s)}>Delete</Button>
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
