"use client"

import React, { useEffect, useState } from 'react'

export default function StoryReactions({ storyId }: { storyId: string }) {
  const [reactions, setReactions] = useState<Record<string, number>>({})

  useEffect(() => {
    let mounted = true
    fetch(`/api/stories/${storyId}/reactions`).then((r) => r.json()).then((j) => {
      if (!mounted) return
      const map: Record<string, number> = {}
      ;(j.data || []).forEach((r2: any) => { map[r2.type] = r2.count })
      setReactions(map)
    }).catch(() => {})
    return () => { mounted = false }
  }, [storyId])

  const react = async (type: string) => {
    setReactions((s) => ({ ...s, [type]: (s[type] || 0) + 1 }))
    try {
      await fetch(`/api/stories/${storyId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
    } catch (e) {
      setReactions((s) => ({ ...s, [type]: Math.max(0, (s[type] || 1) - 1) }))
    }
  }

  return (
    <div className="mt-6 flex items-center gap-3">
      <button onClick={() => react('like')} className="px-3 py-2 rounded-md bg-secondary">❤️ {reactions['like'] || 0}</button>
      <button onClick={() => react('love')} className="px-3 py-2 rounded-md bg-secondary">🌟 {reactions['love'] || 0}</button>
      <button onClick={() => react('support')} className="px-3 py-2 rounded-md bg-secondary">🤝 {reactions['support'] || 0}</button>
    </div>
  )
}

