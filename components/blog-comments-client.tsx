"use client"
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

type Comment = { id: string; parent_id?: string | null; content: string; user_name?: string | null; created_at: string }

export default function BlogCommentsClient({ blogId }: { blogId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [name, setName] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/blogs/${blogId}/comments`)
        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          console.error(`/api/blogs/${blogId}/comments error`, res.status, txt)
          return
        }
        const json = await res.json().catch((e) => {
          console.error('Invalid JSON from comments API', e)
          return { data: [] }
        })
  if (!mounted) return
  setComments(json?.data || [])
      } catch (err) {
        console.error(err)
      }
    }

    fetchComments()

    // Realtime subscription for new comments on this blog
    const channel = supabase.channel(`public:blog_comments:blog_id=eq.${blogId}`)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blog_comments', filter: `blog_id=eq.${blogId}` }, (payload) => {
      if (!mounted) return
      setComments((c) => [...c, payload.new as Comment])
    })
    try {
      channel.subscribe()
    } catch (e) {
      console.warn(`Realtime subscribe failed (comments for ${blogId}):`, e)
    }

    return () => {
      mounted = false
      try { channel.unsubscribe() } catch (e) { console.warn(`Realtime unsubscribe failed (comments for ${blogId}):`, e) }
    }
  }, [blogId])

  // load cached name from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hc_user_name') || ''
      // Don't load fallbacks (ip:... or anonymous_) into the editable input.
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

  async function submit() {
    if (!content.trim()) return
    setLoading(true)
    try {
      // Decide what user_name to send. If user provided a name, persist it
      // under `hc_user_name`. Otherwise use or create a fallback stored in
      // `hc_user_fallback`. Never show fallbacks in the editable input.
      const provided = (name || '').trim()
      let userNameToSend = undefined as string | undefined
      if (provided) {
        userNameToSend = provided
        try { localStorage.setItem('hc_user_name', provided) } catch {}
      } else {
        // Prefer existing fallback to avoid repeated IP calls
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

      const res = await fetch(`/api/blogs/${blogId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, user_name: userNameToSend }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || `submit failed (${res.status})`)
      }
      setContent('')
    } catch (err) {
      console.error(err)
      try { toast({ title: 'Failed to post comment', description: String(err) }) } catch {}
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-6 sm:mt-8">
      <h3 className="text-base sm:text-lg font-semibold">Comments</h3>
      <div className="mt-3 sm:mt-4 space-y-3">
        {(() => {
          // build tree
          const map: Record<string, Comment[]> = {}
          comments.forEach((r) => {
            const pid = r.parent_id ? String(r.parent_id) : 'root'
            map[pid] = map[pid] || []
            map[pid].push(r)
          })

          const renderNodes = (nodes: Comment[], level = 0) => {
            return nodes.map((n) => (
              <div key={n.id}>
                <div className="p-2 sm:p-3 border rounded" style={{ marginLeft: level > 0 ? `${Math.min(level * 8, 24)}px` : '0' }}>
                  <div className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                    {new Date(n.created_at).toLocaleString()} • <span className="font-medium">{(n.user_name && !n.user_name.startsWith('ip:') && !n.user_name.startsWith('anonymous_')) ? n.user_name : 'Anonymous'}</span>
                  </div>
                  <div className="mt-1 text-sm">{n.content}</div>
                  <div className="mt-2">
                    <button className="text-xs sm:text-sm text-blue-600" onClick={() => { setReplyingTo(n.id); setReplyContent('') }}>Reply</button>
                  </div>
                  {replyingTo === n.id && (
                    <div className="mt-3">
                      <textarea 
                        aria-label="Reply" 
                        value={replyContent} 
                        onChange={(e) => setReplyContent(e.target.value)} 
                        className="textarea w-full border rounded p-2 text-sm" 
                        rows={3} 
                      />
                      <div className="flex gap-2 mt-2">
                        <button 
                          disabled={replyLoading} 
                          onClick={async () => {
                            if (!replyContent.trim()) return
                            setReplyLoading(true)
                            try {
                              // Determine user_name similar to submit()
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

                              const res = await fetch(`/api/blogs/${blogId}/comments`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ content: replyContent, parent_id: n.id, user_name: userNameToSend }),
                              })
                              if (!res.ok) throw new Error('reply failed')
                              setReplyingTo(null)
                              setReplyContent('')
                            } catch (err) {
                              console.error(err)
                              try { toast({ title: 'Failed to post reply', description: String(err) }) } catch {}
                            } finally { setReplyLoading(false) }
                          }} 
                          className="btn text-sm whitespace-nowrap"
                        >
                          {replyLoading ? 'Replying…' : 'Reply'}
                        </button>
                        <button className="btn-ghost text-sm" onClick={() => setReplyingTo(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
                {(map[String(n.id)] || []).length > 0 && renderNodes(map[String(n.id)], level + 1)}
              </div>
            ))
          }

          return renderNodes(map['root'] || [])
        })()}
      </div>

      <div className="mt-4 space-y-2">
        <label className="sr-only">Comment</label>
        <textarea 
          aria-label="Comment" 
          value={content} 
          onChange={e => setContent(e.target.value)} 
          className="textarea w-full border rounded p-2 sm:p-3 focus:outline-red-500 text-sm" 
          placeholder="Leave a comment here" 
          rows={3} 
        />
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <input 
            placeholder="Name (optional)" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="input w-full sm:w-auto border rounded p-2 sm:p-3 focus:outline-red-500 text-sm" 
          />
          <div className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">(saved in this browser)</div>
        </div>
        <div>
          <button disabled={loading} onClick={submit} className="btn text-sm whitespace-nowrap">
            {loading ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
    </section>
  )
}
