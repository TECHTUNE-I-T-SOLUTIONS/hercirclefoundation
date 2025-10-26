"use client"

import React, { useEffect, useState, useRef } from "react"
import { X, MessageCircle, ChevronsUp, Send, Settings } from "lucide-react"

type ChatMessage = { role: "user" | "assistant" | "system"; message: string }

declare global {
  interface Window {
    fetch: any
  }
}

export default function LunaChat() {
  const [visible, setVisible] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState(false)
  const [profile, setProfile] = useState<any>({ name: "", age_range: "", language: "en", email: "", country: "" })
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [apiDiagnostics, setApiDiagnostics] = useState<any | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bgGradient, setBgGradient] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // available lightweight gradient options
  const gradients: { id: string; css: string; label: string }[] = [
    { id: 'g1', css: 'linear-gradient(135deg,#FFDEE9 0%,#B5FFFC 100%)', label: 'Soft Pink → Aqua' },
    { id: 'g2', css: 'linear-gradient(135deg,#E0C3FC 0%,#8EC5FC 100%)', label: 'Lilac → Sky' },
    { id: 'g3', css: 'linear-gradient(135deg,#FDEB71 0%,#F8D800 100%)', label: 'Sunshine' },
    { id: 'g4', css: 'linear-gradient(135deg,#C9FFBF 0%,#FFAFBD 100%)', label: 'Mint → Rose' },
  ]

  // load saved gradient (localStorage)
  useEffect(() => {
    try {
      const v = localStorage.getItem('luna_bg_gradient')
      if (v) setBgGradient(v)
    } catch (e) {
      // ignore
    }
  }, [])

  function chooseGradient(css: string) {
    setBgGradient(css || null)
    try {
      if (!css) {
        localStorage.removeItem('luna_bg_gradient')
      } else {
        localStorage.setItem('luna_bg_gradient', css)
      }
    } catch (e) {}
  }

  // Hide on admin pages
  useEffect(() => {
    if (typeof window === "undefined") return
    const path = window.location.pathname
    if (path.startsWith("/admin")) {
      setVisible(false)
      return
    }
    setVisible(true)
  }, [])

  // initialize token from localStorage or request one
  useEffect(() => {
    const t = localStorage.getItem("luna_token")
    if (t) {
      setToken(t)
      // try to fetch profile
      fetch("/api/luna/init", { method: "POST", body: JSON.stringify({ token: t }), headers: { "Content-Type": "application/json" } })
        .then((r) => r.json())
        .then((j) => {
          if (j.user) {
            setProfile(j.user)
            setOnboarding(false)
            // load history if present
            if (Array.isArray(j.history) && j.history.length > 0) {
              const mapped = j.history.map((h: any) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', message: h.message }))
              setMessages(mapped)
            } else {
              // no history — show a warm intro
              const name = j.user?.name || 'friend'
              const warm = `Hi ${name}! It's so lovely to meet you — I'm Luna, your friendly companion. I'm here to listen and support you with period and wellbeing questions. How are you feeling today?`
              setMessages([{ role: 'assistant', message: warm }])
            }
          } else if (j.onboarding) {
            setOnboarding(true)
          }
        })
    } else {
      // get a token
      fetch("/api/luna/init", { method: "POST", headers: { "Content-Type": "application/json" } })
        .then((r) => r.json())
        .then((j) => {
          if (j.token) {
            localStorage.setItem("luna_token", j.token)
            setToken(j.token)
            setOnboarding(true)
          }
        })
    }
  }, [])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, recommendations])

  function openChat() {
    setCollapsed(false)
    setVisible(true)
    setTimeout(() => inputRef.current?.focus(), 200)
  }

  async function submitOnboarding(e?: React.FormEvent) {
    e?.preventDefault()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch("/api/luna/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...profile }),
      })
      const j = await res.json()
      if (j.user) {
        setProfile(j.user)
        setOnboarding(false)
        // warm intro after onboarding
        const name = j.user.name || 'friend'
        const warmIntro = `Hi ${name}! It's so lovely to meet you! Welcome to HerCircle — I'm Luna, and I'm here to chat about periods, wellbeing, and feeling good in your body. How are you doing today? Whether you have a question or just want to talk, I'm here for you.`
        setMessages((m) => [
          ...m,
          { role: "assistant", message: warmIntro },
        ])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // parse Gemini / API reply into plain text safely
  function parseReply(reply: any): string {
    if (!reply) return ''
    // already a string
    if (typeof reply === 'string') return reply
    // common Gemini shapes
    // 1) { candidates: [ { content: { parts: [{ text: '...' }] } } ] }
    try {
      if (reply.candidates && Array.isArray(reply.candidates) && reply.candidates[0]?.content?.parts) {
        const parts = reply.candidates[0].content.parts
        if (Array.isArray(parts)) return parts.map((p: any) => p.text || '').join('\n')
      }
      // 2) { output: { text: '...' } } or { outputs: [{ content: [{ text: '...' }] }] }
      if (reply.output && typeof reply.output.text === 'string') return reply.output.text
      if (reply.outputs && Array.isArray(reply.outputs) && reply.outputs[0]?.content) {
        // outputs[].content[].text
        const cont = reply.outputs[0].content
        if (Array.isArray(cont)) return cont.map((c: any) => c.text || '').join('\n')
      }
      // 3) { response: { text: '...' } }
      if (reply.response && typeof reply.response.text === 'string') return reply.response.text
      // 4) nested model libs e.g., { text: '...' }
      if (typeof reply.text === 'string') return reply.text
      // 5) if body-like stringified JSON exists in .body
      if (typeof reply.body === 'string') return reply.body
      // fallback to JSON string
      return JSON.stringify(reply)
    } catch (e) {
      try { return String(reply) } catch (ee) { return '' }
    }
  }

  async function sendMessage() {
    if (!input.trim() || !token) return
    const text = input.trim()
    setInput("")
    setMessages((m) => [...m, { role: "user", message: text }])
    setLoading(true)
    try {
      // show typing behavior immediately
      // send request
      const res = await fetch("/api/luna/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: text }),
      })

      const j = await res.json().catch(() => ({ error: 'Invalid response from server' }))

      if (!res.ok) {
        // show friendly assistant error message + server error detail if present
        const errText = j?.error || `Server error (${res.status})`
        if (j?.attempts) {
          console.error('Gemini attempts:', j.attempts)
          setApiDiagnostics(j.attempts)
        }
        setMessages((m) => [...m, { role: "assistant", message: `Sorry, Luna couldn't respond right now. ${errText}` }])
        setRecommendations([])
        return
      }

      let replyText = ''
      if (j.reply) {
        replyText = parseReply(j.reply)
      }

      if (replyText) {
        setMessages((m) => [...m, { role: "assistant", message: replyText }])
      } else {
        setMessages((m) => [...m, { role: "assistant", message: "Sorry, Luna didn't return a reply." }])
      }
      if (j.recommendations) setRecommendations(j.recommendations)
    } catch (err: any) {
      console.error(err)
      setMessages((m) => [...m, { role: "assistant", message: "Sorry, I couldn't reach Luna right now. Try again later." }])
    } finally {
      setLoading(false)
    }
  }

  // small inlined markdown renderer (supports bold **text**, italics *text*, links, lists, and line breaks)
  function mdToHtml(md: string) {
    if (!md) return ""
    // escape HTML
    const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    let out = escapeHtml(md)
    // code blocks (```)
    out = out.replace(/```([\s\S]*?)```/g, (m, code) => `<pre class="bg-gray-100 p-2 rounded text-xs overflow-auto">${escapeHtml(code)}</pre>`)
    // bold **text**
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // italics *text*
    out = out.replace(/\*(.*?)\*/g, '<em>$1</em>')
    // unordered lists (lines starting with - or *)
    out = out.replace(/(^|\n)([ \t]*)([-*])\s+(.*)/g, (m, br, indent, bullet, text) => `${br}${indent}<li>${text}</li>`)
    // wrap consecutive <li> into <ul>
    out = out.replace(/((?:\s*<li>[\s\S]*?<\/li>\s*)+)/g, (m) => `<ul class="ml-4 list-disc">${m}</ul>`)
    // links [text](url) — lightweight parser to avoid regex warnings
    const replaceLinks = (s: string) => {
      let res = ''
      let i = 0
      while (i < s.length) {
        const start = s.indexOf('[', i)
        if (start === -1) { res += s.slice(i); break }
        const mid = s.indexOf('](', start)
        if (mid === -1) { res += s.slice(i); break }
        const end = s.indexOf(')', mid + 2)
        if (end === -1) { res += s.slice(i); break }
        const text = s.slice(start + 1, mid)
        const url = s.slice(mid + 2, end)
        res += s.slice(i, start) + `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${escapeHtml(text)}</a>`
        i = end + 1
      }
      return res
    }
    out = replaceLinks(out)
    // convert double newlines to paragraph breaks
    out = out.replace(/\n{2,}/g, '</p><p>')
    // convert single newline to <br/>
    out = out.replace(/\n/g, '<br/>')
    return `<p>${out}</p>`
  }

  if (!visible) return null

  // apply header style (use selected gradient if present)
  const headerStyle: React.CSSProperties | undefined = bgGradient ? { backgroundImage: bgGradient, backgroundSize: 'cover' } : undefined
  // apply full panel background style when a gradient is chosen
  const panelStyle: React.CSSProperties | undefined = bgGradient ? { backgroundImage: bgGradient, backgroundSize: 'cover' } : undefined

  return (
    <div className="fixed right-4 bottom-6 z-50">
      {collapsed ? (
        <button
          onClick={() => openChat()}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-white shadow-lg hover:scale-[1.02] transition-transform"
          aria-label="Open Luna chat"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Luna</span>
        </button>
      ) : (
        <div className="w-[340px] sm:w-[420px] max-h-[70vh] border border-border rounded-lg shadow-xl overflow-hidden flex flex-col" style={panelStyle}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={headerStyle}>
             <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">L</div>
              <div>
                <div className="font-semibold">Luna</div>
                <div className="text-xs text-muted-foreground">Empathetic menstrual health companion</div>
              </div>
             </div>
             <div className="flex items-center gap-2">
               <button onClick={() => setSettingsOpen((s) => !s)} className="p-2 rounded-md hover:bg-secondary" aria-label="Settings">
                 <Settings className="h-4 w-4" />
               </button>
               <button onClick={() => { setCollapsed(true); setRecommendations([]) }} className="p-2 rounded-md hover:bg-secondary" aria-label="Minimize">
                 <ChevronsUp className="h-4 w-4" />
               </button>
               <button onClick={() => setVisible(false)} className="p-2 rounded-md hover:bg-secondary" aria-label="Close">
                 <X className="h-4 w-4" />
               </button>
             </div>
           </div>

           {/* Settings panel (simple inline panel) */}
           {settingsOpen && (
             <div className="px-4 py-3 border-b border-border bg-background">
               <div className="text-sm font-medium">Chat appearance</div>
               <div className="mt-2 text-xs text-muted-foreground">Choose a lightweight gradient background for the full chat panel. Saved to your browser only.</div>
               <div className="mt-3 flex gap-2">
                 {gradients.map((g) => (
                   <button key={g.id} onClick={() => chooseGradient(g.css)} className={`h-10 w-16 rounded-md border ${bgGradient === g.css ? 'ring-2 ring-primary' : 'border-border'}`} style={{ backgroundImage: g.css }} aria-label={g.label} title={g.label}></button>
                 ))}
                 <button onClick={() => { chooseGradient('') }} className="h-10 px-3 rounded-md border border-border text-xs">Reset</button>
               </div>
             </div>
           )}

           <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 && !onboarding && (
              <div className="text-sm text-muted-foreground">
                <p>Hi! I'm Luna — an educational AI. I can help with period questions, hygiene tips, and recommend articles.</p>
                <p className="mt-2 text-xs">Reminder: I'm not a medical professional. For health concerns, consult a doctor.</p>
              </div>
            )}

            {onboarding && (
              <form onSubmit={submitOnboarding} className="space-y-3">
                <div className="text-sm">Let's get to know you — this helps me personalize my replies.</div>
                <input placeholder="Preferred name" value={profile.name} onChange={(e) => setProfile((p: any) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                <input placeholder="Age range (e.g., 8-12, 13-16, 17+)" value={profile.age_range} onChange={(e) => setProfile((p: any) => ({ ...p, age_range: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                <input placeholder="Language (e.g., en, hi)" value={profile.language} onChange={(e) => setProfile((p: any) => ({ ...p, language: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                <input placeholder="Optional email" value={profile.email} onChange={(e) => setProfile((p: any) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex-1 bg-primary text-white px-3 py-2 rounded">Start Chat</button>
                  <button type="button" onClick={() => { setOnboarding(false); setMessages((m) => [...m, { role: "assistant", message: "No problem — you can chat anonymously." }]) }} className="px-3 py-2 border rounded">Skip</button>
                </div>
              </form>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg ${m.role === "assistant" ? "bg-white/20 text-foreground backdrop-blur-sm" : "bg-primary/90 text-white"}`}>
                  <div className="text-sm whitespace-pre-wrap">
                    {m.role === 'assistant' ? (
                      <div dangerouslySetInnerHTML={{ __html: mdToHtml(String(m.message)) }} />
                    ) : (
                      <div>{m.message}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[60%] px-3 py-2 rounded-lg bg-secondary/10 text-foreground backdrop-blur-sm">
                   <div className="text-sm flex items-center gap-2">
                     <svg className="w-4 h-4 animate-pulse" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="20" cy="12" r="2"/></svg>
                     <span>Luna is typing…</span>
                   </div>
                 </div>
               </div>
             )}

            {recommendations.length > 0 && (
              <div className="mt-2 p-3 border rounded bg-white/10">
                 <div className="text-sm font-semibold">🩷 You might like these reads:</div>
                 <ul className="mt-2 space-y-1 text-sm">
                   {recommendations.map((r, idx) => (
                     <li key={idx}>
                       <a href={r.url} className="text-primary hover:underline">{r.title}</a>
                     </li>
                   ))}
                 </ul>
               </div>
             )}

            {/* Diagnostics toggle when API attempts available */}
            {apiDiagnostics && (
              <div className="mt-2 p-2 border rounded bg-yellow-50 text-xs text-gray-800">
                <div className="flex items-center justify-between">
                  <div>⚠️ Gemini diagnostics available</div>
                  <button onClick={() => setApiDiagnostics(null)} className="text-sm underline">Dismiss</button>
                </div>
                <pre className="mt-2 max-h-40 overflow-auto text-[11px]">{JSON.stringify(apiDiagnostics, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }}} placeholder="Ask Luna something..." className="flex-1 px-3 py-2 border rounded" />
              <button onClick={sendMessage} disabled={loading} className="p-2 rounded bg-primary text-white" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
