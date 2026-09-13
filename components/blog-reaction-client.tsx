"use client"
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Heart } from 'lucide-react'

export default function BlogReactionClient({ blogId }: { blogId: string }) {
  const [counts, setCounts] = useState<{ [k: string]: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [hasLiked, setHasLiked] = useState(false)
  const { toast } = useToast()

  async function fetchClientIp(): Promise<string | null> {
    try {
      // public IP lookup; fail silently if blocked
      const r = await fetch('https://api.ipify.org?format=json')
      if (!r.ok) return null
      const j = await r.json().catch(() => null)
      return j?.ip || null
    } catch (e) {
      return null
    }
  }

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    const fetchCounts = async () => {
      try {
        const res = await fetch(`/api/blogs/${blogId}/reactions`)
        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          console.error(`/api/blogs/${blogId}/reactions error`, res.status, txt)
          return
        }
        const json = await res.json().catch((e) => {
          console.error('Invalid JSON from reactions API', e)
          return { data: { grouped: {} } }
        })
        if (!mounted) return
        setCounts(json.data?.grouped || {})
      } catch (err) {
        console.error(err)
      }
    }

    fetchCounts()

    const channel = supabase.channel(`public:blog_reactions:blog_id=eq.${blogId}`)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'blog_reactions', filter: `blog_id=eq.${blogId}` }, () => {
      // refresh counts on any change
      fetchCounts()
    })
    try {
      channel.subscribe()
    } catch (e) {
      console.warn(`Realtime subscribe failed (reactions for ${blogId}):`, e)
    }

    return () => {
      mounted = false
      try { channel.unsubscribe() } catch (e) { console.warn(`Realtime unsubscribe failed (reactions for ${blogId}):`, e) }
    }
  }, [blogId])

  useEffect(() => {
    // Load only user-provided name into the input. Do NOT expose stored
    // fallback identifiers (like ip:...) in the UI. Fallbacks are stored
    // separately and used only for POST payloads when the user didn't enter a name.
    try {
      const raw = localStorage.getItem('hc_user_name')
      // If the stored value looks like a fallback (ip:... or anonymous_),
      // don't show it in the editable input — leave the input empty so the
      // user can provide their own display name. Only user-supplied names
      // should be shown here.
      if (raw && !raw.startsWith('ip:') && !raw.startsWith('anonymous_')) {
        setName(raw)
      } else {
        setName('')
      }
    } catch {}

    // Load like state for this blog
    try {
      const likedBlogs = JSON.parse(localStorage.getItem('hc_liked_blogs') || '[]')
      setHasLiked(likedBlogs.includes(blogId))
    } catch {}
  }, [blogId])

  async function react(type = 'like') {
    setLoading(true)
    try {
      // Toggle like state
      if (type === 'like' && hasLiked) {
        // Unlike - remove from localStorage
        try {
          const likedBlogs = JSON.parse(localStorage.getItem('hc_liked_blogs') || '[]')
          const updated = likedBlogs.filter((id: string) => id !== blogId)
          localStorage.setItem('hc_liked_blogs', JSON.stringify(updated))
          setHasLiked(false)
          toast({ title: 'Unliked', description: 'Your like has been removed.' })
        } catch {}
        setLoading(false)
        return
      }

      // Determine the user_name to send. If the user entered a name, use
      // and persist that under `hc_user_name`. If they did not, generate a
      // fallback (IP-prefixed or anonymous) and persist it under
      // `hc_user_fallback` so we never show IPs in the editable input.
      const provided = (name || '').trim()
      let userNameToSend = ''
      if (provided) {
        userNameToSend = provided
        try { localStorage.setItem('hc_user_name', provided) } catch {}
      } else {
        // Prefer any already-saved fallback to avoid calling the IP service
        // repeatedly. The fallback is never shown in the UI; it's only used
        // for anonymous posts.
        const existingFallback = (() => {
          try { return localStorage.getItem('hc_user_fallback') } catch { return null }
        })()
        if (existingFallback) {
          userNameToSend = existingFallback
        } else {
          const ip = await fetchClientIp()
          userNameToSend = ip ? `ip:${ip}` : `anonymous_${Date.now()}`
          try { localStorage.setItem('hc_user_fallback', userNameToSend) } catch {}
        }
      }

      const res = await fetch(`/api/blogs/${blogId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, user_name: userNameToSend }),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => null)
        const msg = txt || `Failed to send reaction (${res.status})`
        toast({ title: 'Reaction failed', description: msg })
        console.error('react error', res.status, txt)
        return
      }

      // Save like state to localStorage only after successful API call
      if (type === 'like') {
        try {
          const likedBlogs = JSON.parse(localStorage.getItem('hc_liked_blogs') || '[]')
          if (!likedBlogs.includes(blogId)) {
            likedBlogs.push(blogId)
            localStorage.setItem('hc_liked_blogs', JSON.stringify(likedBlogs))
            setHasLiked(true)
          }
        } catch {}
      }

      // optimistic feedback
      toast({ title: 'Thanks!', description: 'Your reaction was recorded.' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Reaction error', description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 flex items-center gap-3">
      <input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="input p-2" />
      <button 
        onClick={() => react('like')} 
        disabled={loading}
        className="btn bg-red-500 text-white hover:bg-red-600 p-2 rounded shadow flex items-center gap-2"
      >
        {hasLiked ? <Heart fill="currentColor" /> : <Heart />}
        Like
      </button>
      {counts && <div className="text-sm text-gray-500 dark:text-gray-400">{Object.values(counts).reduce((s, n) => s + n, 0)} reactions</div>}
    </div>
  )
}
