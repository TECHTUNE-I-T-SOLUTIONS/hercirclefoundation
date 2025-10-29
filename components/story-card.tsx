"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

export default function StoryCard({ story }: any) {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let mounted = true
    if (!story?.id) return
    fetch(`/api/stories/${story.id}/reactions`)
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return
        const map: Record<string, number> = {}
        ;(j.data || []).forEach((row: any) => { map[row.type] = row.count })
        setCounts(map)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [story?.id])

  const react = async (type: string) => {
    if (!story?.id) return
    // optimistic update
    setCounts((s) => ({ ...s, [type]: (s[type] || 0) + 1 }))
    try {
      await fetch(`/api/stories/${story.id}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
    } catch (e) {
      // revert on error
      setCounts((s) => ({ ...s, [type]: Math.max(0, (s[type] || 1) - 1) }))
    }
  }

  return (
    <article className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg transition">
      <h3 className="text-lg font-semibold mb-2">{story.title || (story.excerpt ? story.excerpt.slice(0, 60) : 'Untitled')}</h3>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{story.excerpt || (story.content ? story.content.slice(0, 200) : '')}</p>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{story.author_name || 'Anonymous'}</div>
        <Link href={`/stories/${story.id}`} className="text-primary text-sm font-medium">Read</Link>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button aria-label="Like" title="Like" onClick={() => react('like')} className="px-2 py-1 rounded-md hover:bg-secondary">
          ❤️ <span className="ml-1 text-sm">{counts['like'] || 0}</span>
        </button>
        <button aria-label="Love" title="Love" onClick={() => react('love')} className="px-2 py-1 rounded-md hover:bg-secondary">
          🌟 <span className="ml-1 text-sm">{counts['love'] || 0}</span>
        </button>
        <button aria-label="Support" title="Support" onClick={() => react('support')} className="px-2 py-1 rounded-md hover:bg-secondary">
          🤝 <span className="ml-1 text-sm">{counts['support'] || 0}</span>
        </button>
      </div>
    </article>
  )
}
