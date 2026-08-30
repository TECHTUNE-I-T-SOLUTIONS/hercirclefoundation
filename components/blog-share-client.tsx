"use client"
import React, { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

export default function BlogShareClient({ blogId }: { blogId: string }) {
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hc_user_name') || ''
      if (raw && !raw.startsWith('ip:') && !raw.startsWith('anonymous_')) {
        setName(raw)
      } else {
        setName('')
      }
    } catch {}
  }, [])

  async function fetchClientIp(): Promise<string | null> {
    try {
      const r = await fetch('https://api.ipify.org?format=json')
      if (!r.ok) return null
      const j = await r.json().catch(() => null)
      return j?.ip || null
    } catch (e) {
      return null
    }
  }

  async function share() {
    if (!platform) return toast({ title: 'Choose a platform', description: 'Select where you want to share the post.' })
    setLoading(true)
    try {
      // Open the platform share dialog first (synchronously where possible)
      // so the user can share while we record the share server-side.
      const shareUrl = (typeof window !== 'undefined' && window.location?.href) ? window.location.href : ''
      const shareTitle = (typeof document !== 'undefined' && document.title) ? document.title : ''

      try {
        if (platform === 'facebook') {
          const u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
          window.open(u, '_blank', 'noopener,noreferrer')
        } else if (platform === 'twitter') {
          const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`
          window.open(u, '_blank', 'noopener,noreferrer')
        } else if (platform === 'whatsapp') {
          const text = `${shareTitle} ${shareUrl}`.trim()
          const u = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
          window.open(u, '_blank', 'noopener,noreferrer')
        } else {
          // 'other' fallback: use Web Share API when available, otherwise open the URL
          if (navigator && (navigator as any).share) {
            try {
              await (navigator as any).share({ title: shareTitle, text: shareTitle, url: shareUrl })
            } catch (e) {
              // user may have cancelled or share failed — ignore here and continue
            }
          } else {
            window.open(shareUrl, '_blank', 'noopener,noreferrer')
          }
        }
      } catch (e) {
        // best-effort; proceed to record the share anyway
        console.warn('Share dialog failed to open', e)
      }

      // Persist/derive a user_name to send with the recorded share.
      const provided = (name || '').trim()
      let userNameToSend = undefined as string | undefined
      if (provided) {
        userNameToSend = provided
        try { localStorage.setItem('hc_user_name', provided) } catch {}
      } else {
        const existingFallback = (() => { try { return localStorage.getItem('hc_user_fallback') } catch { return null } })()
        if (existingFallback) {
          userNameToSend = existingFallback
        } else {
          const ip = await fetchClientIp()
          const fallback = ip ? `ip:${ip}` : `anonymous_${Date.now()}`
          try { localStorage.setItem('hc_user_fallback', fallback) } catch {}
          userNameToSend = fallback
        }
      }

      const res = await fetch(`/api/blogs/${blogId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, user_name: userNameToSend }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || `share failed (${res.status})`)
      }
      toast({ title: 'Thanks!', description: 'Thanks for sharing!' })
    } catch (err) {
      console.error(err)
      try { toast({ title: 'Share failed', description: String(err) }) } catch {}
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 p-3 border rounded">
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="input p-2" />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="select"
          aria-label="Platform to share to"
          title="Platform to share to"
        >
          <option value="">Share to…</option>
          <option value="facebook">Facebook</option>
          <option value="twitter">Twitter</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="other">Other</option>
        </select>
        <button onClick={share} disabled={loading} className="btn">
          {loading ? 'Sharing…' : 'Share'}
        </button>
      </div>
    </div>
  )
}
