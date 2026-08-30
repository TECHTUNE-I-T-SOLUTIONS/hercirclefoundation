import { NextResponse } from "next/server"
import { createClient as createServerSupabase } from "@/lib/supabase/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_PROJECT_NUMBER = process.env.GEMINI_PROJECT_NUMBER

// Fallback models in order of preference
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite', 
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
]

// Default model: prefer gemini-2.5-flash (flash/free tier). Override with env var if needed
const GEMINI_MODEL = process.env.GEMINI_MODEL || GEMINI_MODELS[0]

async function tryPost(url: string, body: any, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
  const text = await res.text().catch(() => "")
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch (e) { json = text }
  return { ok: res.ok, status: res.status, text, json }
}

async function callGemini(prompt: string) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key not configured (GEMINI_API_KEY)")

  // Try each model in the fallback list
  for (const model of GEMINI_MODELS) {
    try {
      const result = await tryModelWithEndpoints(model, prompt)
      if (result) return result
    } catch (error) {
      console.error(`Failed with model ${model}:`, error)
      continue
    }
  }

  throw new Error("All Gemini models failed")
}

async function tryModelWithEndpoints(model: string, prompt: string) {
  // Try endpoints in an order that matches the dashboard example first (v1beta generateContent)
  const endpoints = [
    // project-scoped v1beta (some setups require project resource path)
    ...(GEMINI_PROJECT_NUMBER ? [
      `https://generativelanguage.googleapis.com/v1beta/projects/${encodeURIComponent(GEMINI_PROJECT_NUMBER)}/locations/global/models/${encodeURIComponent(model)}:generateContent`,
      `https://generativelanguage.googleapis.com/v1/projects/${encodeURIComponent(GEMINI_PROJECT_NUMBER)}/locations/global/models/${encodeURIComponent(model)}:generateContent`,
    ] : []),
    // v1beta generateContent (dashboard curl uses this)
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`,
    // fallbacks: older shapes
    ...(GEMINI_PROJECT_NUMBER ? [
      `https://generativelanguage.googleapis.com/v1/projects/${encodeURIComponent(GEMINI_PROJECT_NUMBER)}/locations/global/models/${encodeURIComponent(model)}:generateText`,
      `https://generativelanguage.googleapis.com/v1beta/projects/${encodeURIComponent(GEMINI_PROJECT_NUMBER)}/locations/global/models/${encodeURIComponent(model)}:generateText`,
    ] : []),
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateText`,
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateMessage`,
    `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(model)}:generateText`,
    `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(model)}:generateMessage`,
  ]

  // Body matching the dashboard "generateContent" shape — minimal payload (don't send temperature/maxOutputTokens here)
  const bodyGenerateContent = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  }

  // Older shapes we still attempt
  const bodyText = {
    prompt: { text: prompt },
    temperature: 0.6,
    maxOutputTokens: 512,
  }

  const bodyMessage = {
    messages: [{ content: prompt, role: "user" }],
    temperature: 0.6,
    maxOutputTokens: 512,
  }

  // also try Authorization: Bearer header or X-goog-api-key header as fallback
  const attempts: any[] = []
  for (const url of endpoints) {
    // try generateText-like body first
    try {
      // Special-case generateContent endpoints first
      if (url.includes(":generateContent")) {
        // try with query key
        const r = await tryPost(url + `?key=${encodeURIComponent(GEMINI_API_KEY)}`, bodyGenerateContent)
        attempts.push({ url: url + `?key=...`, body: 'generateContent', status: r.status, ok: r.ok, text: r.text, json: r.json })
        if (r.ok) return extractReplyFromGeminiResponse(r.json)

        // try with X-goog-api-key header (dashboard style)
        const r2 = await tryPost(url, bodyGenerateContent, { 'X-goog-api-key': GEMINI_API_KEY })
        attempts.push({ url, body: 'generateContent_x_goog_api_key', status: r2.status, ok: r2.ok, text: r2.text, json: r2.json })
        if (r2.ok) return extractReplyFromGeminiResponse(r2.json)

        // try with Authorization header
        const r3 = await tryPost(url, bodyGenerateContent, { Authorization: `Bearer ${GEMINI_API_KEY}` })
        attempts.push({ url, body: 'generateContent_bearer', status: r3.status, ok: r3.ok, text: r3.text, json: r3.json })
        if (r3.ok) return extractReplyFromGeminiResponse(r3.json)
      }

      // non-generateContent endpoints (generateText/generateMessage)
      const r1 = await tryPost(url + `?key=${encodeURIComponent(GEMINI_API_KEY)}`, bodyText)
      attempts.push({ url: url + `?key=...`, body: 'text', status: r1.status, ok: r1.ok, text: r1.text, json: r1.json })
      if (r1.ok) return extractReplyFromGeminiResponse(r1.json)

      const r2 = await tryPost(url + `?key=${encodeURIComponent(GEMINI_API_KEY)}`, bodyMessage)
      attempts.push({ url: url + `?key=...`, body: 'message', status: r2.status, ok: r2.ok, text: r2.text, json: r2.json })
      if (r2.ok) return extractReplyFromGeminiResponse(r2.json)

      // Try with Authorization Bearer
      const bearer = { Authorization: `Bearer ${GEMINI_API_KEY}` }
      const r3 = await tryPost(url, bodyText, bearer)
      attempts.push({ url, body: 'text_bearer', status: r3.status, ok: r3.ok, text: r3.text, json: r3.json })
      if (r3.ok) return extractReplyFromGeminiResponse(r3.json)

      const r4 = await tryPost(url, bodyMessage, bearer)
      attempts.push({ url, body: 'message_bearer', status: r4.status, ok: r4.ok, text: r4.text, json: r4.json })
      if (r4.ok) return extractReplyFromGeminiResponse(r4.json)

    } catch (e: any) {
      attempts.push({ url, error: String(e) })
      continue
    }
  }

  // if we reach here, no success for this model
  const err = new Error(`Gemini API error: no successful response from any endpoint for model ${model}`) as any
  err.attempts = attempts
  throw err
}

function extractReplyFromGeminiResponse(json: any) {
  if (!json) return ""

  // Helper to extract text from content parts array or string
  const extractFromParts = (parts: any): string => {
    if (!parts) return ""
    if (typeof parts === 'string') return parts
    if (Array.isArray(parts)) {
      return parts.map((p) => {
        if (!p) return ''
        if (typeof p === 'string') return p
        if (typeof p.text === 'string') return p.text
        if (typeof p.output_text === 'string') return p.output_text
        // some parts might have nested 'content' or 'parts'
        if (Array.isArray(p.parts)) return extractFromParts(p.parts)
        return ''
      }).filter(Boolean).join('\n')
    }
    // object with .text or .output_text
    if (typeof parts.text === 'string') return parts.text
    if (typeof parts.output_text === 'string') return parts.output_text
    if (Array.isArray(parts.parts)) return extractFromParts(parts.parts)
    return ''
  }

  // 1) candidates array
  if (Array.isArray(json?.candidates) && json.candidates.length > 0) {
    for (const cand of json.candidates) {
      if (!cand) continue
      // cand.content can be array, object with parts, or string
      const content = cand.content ?? cand.output ?? cand
      // If content is an object with parts
      if (content && typeof content === 'object') {
        // common: { parts: [{ text: '...' }], role: 'model' }
        if (Array.isArray(content.parts) && content.parts.length > 0) {
          const txt = extractFromParts(content.parts)
          if (txt) return txt
        }
        // sometimes content itself is array
        if (Array.isArray(content)) {
          const txt = extractFromParts(content)
          if (txt) return txt
        }
        // fallback to string fields
        if (typeof content.text === 'string') return content.text
        if (typeof content.output_text === 'string') return content.output_text
      }
      // if candidate has 'output' string
      if (typeof cand.output === 'string') return cand.output
      // if candidate.content is string
      if (typeof cand.content === 'string') return cand.content
    }
  }

  // 2) v1beta generateContent top-level 'candidates' handled above; check for 'output' array
  if (Array.isArray(json?.output) && json.output.length > 0) {
    const maybe = json.output[0]
    if (typeof maybe === 'string') return maybe
    if (typeof maybe?.content === 'string') return maybe.content
    if (Array.isArray(maybe?.content)) return extractFromParts(maybe.content)
  }

  // 3) older shapes
  if (typeof json?.text === 'string') return json.text

  // 4) safety: check nested fields like response, message, candidates[0].content.parts..
  try {
    // try deep path candidates[0].content.parts[0].text
    const deep = json?.candidates?.[0]?.content?.parts
    if (deep) {
      const d = extractFromParts(deep)
      if (d) return d
    }
  } catch {}

  // fallback: serialize minimal useful info but prefer a human-readable fallback
  try {
    if (typeof json === 'object') {
      // try to find any text fields
      const s = JSON.stringify(json)
      // Collapse into a short preview so we don't send huge JSON back
      return s.slice(0, 200)
    }
    return String(json)
  } catch (e) {
    return String(json)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { token, message } = body || {}
    if (!token || !message) return NextResponse.json({ error: "token and message required" }, { status: 400 })

    const supabase = await createServerSupabase()

    // fetch user
    const { data: user, error: userError } = await supabase.from("ai_users").select("*").eq("user_token", token).single()
    if (userError || !user) return NextResponse.json({ error: "user not found" }, { status: 404 })

    // build a warm, empathetic system prompt for Luna
    const persona = `You are Luna Circle (Luna) — an empathetic, warm, and supportive menstrual health companion for girls and young women. Speak kindly, simply, and always address the user by their preferred name when available. Use short, reassuring sentences and avoid clinical or judgmental language.`

    const context = `The user's profile: name=${user.name || 'friend'}, age_range=${user.age_range || 'unknown'}, language=${user.language || 'en'}, country=${user.country || 'unknown'}. Keep replies age-appropriate, culturally sensitive, and supportive.`

    const safety = `You are educational only and not a medical professional. When appropriate, include a gentle reminder that the user should consult a doctor for medical concerns. Do not provide medical diagnosis.`

    const prompt = `${persona}\n\n${context}\n\n${safety}\n\nRespond to the user's message below in a warm, friendly tone (2-6 short paragraphs). Use the user's name when possible. If the user appears to ask about a topic covered in HerCircle blogs, after your reply include a short section titled "You might like these reads:" and list up to 3 blog titles (do not invent blog titles — only list existing HerCircle posts). Keep the recommendation list brief.

User message:\n"""\n${message}\n"""`

    // call Gemini
    let reply = ""
    try {
      reply = await callGemini(prompt)
    } catch (gemErr: any) {
      console.error("Gemini call failed:", gemErr)
      // sanitize attempts for client response (redact API key if present)
      const sanitize = (v: any) => {
        if (!v) return v
        try {
          const s = JSON.stringify(v)
          const redacted = s.replace(new RegExp(GEMINI_API_KEY || "", "g"), "[REDACTED]")
          // limit size
          return JSON.parse(redacted)
        } catch (e) {
          return String(v).replace(new RegExp(GEMINI_API_KEY || "", "g"), "[REDACTED]")
        }
      }
      const attempts = gemErr?.attempts ? gemErr.attempts.map((a: any) => ({ url: a.url, body: a.body, status: a.status, ok: a.ok, text: typeof a.text === 'string' ? a.text.slice(0, 1000).replace(new RegExp(GEMINI_API_KEY || "", "g"), '[REDACTED]') : a.text, json: sanitize(a.json) })) : undefined
      return NextResponse.json({ error: String(gemErr.message || gemErr), attempts }, { status: 500 })
    }

    // Extract keywords for blog search (simple heuristic)
    const keywords = message
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 5)

    let recommendations: any[] = []
    if (keywords.length) {
      try {
        // try RPC that uses tags overlap and full-text search
        const { data: rpcBlogs, error: rpcError } = await supabase.rpc('search_blogs', { keywords })
        if (!rpcError && rpcBlogs && Array.isArray(rpcBlogs) && rpcBlogs.length > 0) {
          // Normalize RPC results and ensure the referenced blogs actually exist in `blogs` table
          const ids = rpcBlogs.filter((b: any) => b?.id).map((b: any) => b.id)
          if (ids.length > 0) {
            const { data: existing, error: existErr } = await supabase.from('blogs').select('id, title, slug').in('id', ids)
            if (!existErr && existing) {
              const byId = new Map((existing || []).map((r: any) => [String(r.id), r]))
              recommendations = rpcBlogs
                .map((b: any) => ({ id: b.id, title: b.title || (b as any).name || '', slug: byId.get(String(b.id))?.slug }))
                .filter((b: any) => b.slug)
                .map((b: any) => ({ title: b.title, url: `/blog/${b.slug}`, tags: b.tags || [] }))
            }
          } else {
            // RPC returned items without ids — try to match by slug parsed from url or by title
            const cleaned: any[] = []
            for (const rb of rpcBlogs) {
              if (rb.url) {
                const m = String(rb.url).match(/\/blog\/(.+)$/)
                if (m) {
                  const slug = m[1]
                  const { data: blog, error: be } = await supabase.from('blogs').select('slug,title').eq('slug', slug).limit(1).maybeSingle()
                  if (blog) cleaned.push({ title: blog.title, url: `/blog/${blog.slug}`, tags: rb.tags || [] })
                }
              }
            }
            recommendations = cleaned
          }
        } else {
          // fallback to ilike-based search (safe default for older schemas)
          const orClause = keywords.map((k: string) => `content.ilike.%${k}%`).join(",")
          const { data: blogs, error: blogError } = await supabase
            .from("blogs")
            .select("title, slug, excerpt")
            .or(orClause)
            .limit(3)
            .order("created_at", { ascending: false })

          if (!blogError && blogs) recommendations = blogs.map((b: any) => ({ title: b.title, url: `/blog/${b.slug}`, tags: [] }))
        }
      } catch (e) {
        // fallback: nothing
        console.warn("Blog recommendation RPC failed", e)
      }
    }

    // save chat history
    try {
      await supabase.from("ai_chat_history").insert([
        { user_id: user.id, role: "user", message, ip_address: req.headers.get("x-forwarded-for") || null },
        { user_id: user.id, role: "assistant", message: reply, ip_address: req.headers.get("x-forwarded-for") || null },
      ])
    } catch (e) {
      // non-fatal
      console.warn("Failed to save chat history", e)
    }

    return NextResponse.json({ reply, recommendations })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
