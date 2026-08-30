"use client"
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Calendar, User, Clock, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
      // Sort: featured posts first, then by date
      const sortedBlogs = (json?.data || []).sort((a: any, b: any) => {
        if (a.featured && !b.featured) return -1
        if (!a.featured && b.featured) return 1
        const dateA = new Date(a.published_at || 0).getTime()
        const dateB = new Date(b.published_at || 0).getTime()
        return dateB - dateA
      })
      setBlogs(sortedBlogs)
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Blog & Insights</h1>
        <p className="text-muted-foreground">Stay updated with articles, health tips, stories, and insights on menstrual health advocacy from HerCircle Foundation.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-semibold mb-2">No blog posts yet</h2>
            <p className="text-muted-foreground">Check back soon for insightful articles and stories from our community.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((b) => (
            <Link key={b.id} href={`/blog/${b.slug}`} className="group">
              <article className="h-full border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-card">
                {b.cover_image && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img 
                      src={b.cover_image} 
                      alt={b.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {b.featured && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                    {b.tags && b.tags.length > 0 && (
                      <div className="flex gap-1">
                        {b.tags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {b.title}
                  </h2>
                  
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {b.excerpt}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {b.published_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(b.published_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {b.author_name && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{b.author_name}</span>
                      </div>
                    )}
                    {b.reading_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{b.reading_time} min read</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
