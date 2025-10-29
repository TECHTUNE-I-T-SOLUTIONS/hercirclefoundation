"use client"

import React, { useEffect, useState, useRef } from 'react'
import StoryCard from './story-card'

export default function StoriesPreview({ limit = 8 }: { limit?: number }) {
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let mounted = true
    fetch(`/api/stories?limit=${limit}`)
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return
        // de-duplicate by id (just in case)
        const list = Array.isArray(j.data) ? j.data : []
        const seen = new Set()
        const dedup: any[] = []
        for (const s of list) {
          if (!s || !s.id) continue
          if (seen.has(s.id)) continue
          seen.add(s.id)
          dedup.push(s)
        }
        setStories(dedup)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [limit])

  // simple auto-scroll marquee
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let raf: number | null = null
    let speed = 0.35 // pixels per frame approx
    let pos = 0
    const step = () => {
      pos += speed
      // when we have duplicated content we stop at half scrollWidth; otherwise loop inside full width
      const wrapAt = stories.length > 1 ? el.scrollWidth / 2 : el.scrollWidth
      if (wrapAt > 0 && pos >= wrapAt) pos = 0
      el.scrollLeft = Math.round(pos)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => { if (raf) cancelAnimationFrame(raf) }
  }, [stories])

  if (loading) return <div className="py-8">Loading stories…</div>
  if (!stories || stories.length === 0) return null

  // duplicate items to create seamless marquee effect only when more than one item
  const items = stories.length > 1 ? [...stories, ...stories] : [...stories]

  return (
    <section className="py-12 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6">Community Stories</h2>
        <div
          ref={containerRef}
          className="overflow-hidden whitespace-nowrap py-4 -mx-4"
          onMouseEnter={() => { /* pause by setting speed to 0 via CSS/JS if desired */ }}
          onMouseLeave={() => { /* resume */ }}
        >
          <div className="inline-flex gap-6 items-stretch" style={{ willChange: 'transform' }}>
            {items.map((s, idx) => (
              <div key={`${s.id}-${idx}`} className="inline-block w-[320px] flex-shrink-0">
                <StoryCard story={s} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
