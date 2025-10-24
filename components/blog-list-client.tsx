"use client"
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function BlogListClient() {
  const supabase = createClient()
  const [blogs, setBlogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchBlogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/blogs?status=published')
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('/api/blogs error', res.status, txt)
        return
      }
      const json = await res.json().catch((e) => {
        console.error('Invalid JSON from /api/blogs', e)
        return { data: [] }
      })
      setBlogs(json?.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlogs()
    const ch = supabase.channel('public:blogs')
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'blogs' }, (payload) => {
      // simple strategy: refetch on any change
      fetchBlogs()
    })
    try {
      ch.subscribe()
    } catch (e) {
      console.warn('Realtime subscribe failed (blogs):', e)
    }

    return () => {
      try { ch.unsubscribe() } catch (e) { console.warn('Realtime unsubscribe failed (blogs):', e) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      {loading && <div>Loading…</div>}
      <ul className="space-y-4">
        {blogs.map((b) => (
          <li key={b.id} className="p-4 border rounded">
            <Link href={`/blog/${b.slug}`} className="text-xl font-semibold">
              {b.title}
            </Link>
            <p className="text-sm text-black dark:text-white mt-2">{b.excerpt}</p>
            <div className="text-xs text-gray-900 dark:text-gray-400 mt-2">{b.published_at ? new Date(b.published_at).toLocaleString() : ''}</div>
          </li>
        ))}
      </ul>
    </main>
  )
}
