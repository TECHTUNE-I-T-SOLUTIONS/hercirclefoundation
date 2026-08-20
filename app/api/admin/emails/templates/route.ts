import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import { TEMPLATE_CATALOG } from '@/lib/email/templates'

/**
 * GET  → list all templates (built-in library merged with saved custom ones).
 * POST → persist a custom/user-defined template.
 */
export async function GET(req: Request) {
  try {
    const helper = await createServerHelper()
    const { data: userData } = await helper.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    const svc = createServerClient(url, key)

    const { data: custom, error } = await svc.from('email_templates').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Merge built-in catalog with saved overrides (saved wins by key).
    const library = TEMPLATE_CATALOG.map((t) => ({
      key: t.key,
      name: t.label,
      category: t.category,
      built_in: t.builtIn,
      premium: t.category === 'Premium',
      subject: t.defaultSubject,
      from_key: t.fromKey || 'info',
      html_body: '',
    }))

    const merged = [...library]
    for (const saved of custom || []) {
      const idx = merged.findIndex((m) => m.key === saved.key)
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...saved, html_body: saved.html_body || merged[idx].html_body }
      } else {
        merged.unshift(saved)
      }
    }

    return NextResponse.json({ data: merged })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const helper = await createServerHelper()
    const { data: userData } = await helper.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    const svc = createServerClient(url, key)

    const body = await req.json()
    const { key: tKey, name, category, subject, html_body, text_body, from_key } = body
    if (!tKey || !name) return NextResponse.json({ error: 'key and name required' }, { status: 400 })

    const payload = {
      key: tKey,
      name,
      category: category || 'marketing',
      subject: subject || '',
      html_body: html_body || '',
      text_body: text_body || null,
      from_key: from_key || 'info',
      created_by: userData.user.id,
    }

    // Upsert on key.
    const { data, error } = await svc.from('email_templates').upsert(payload, { onConflict: 'key' }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}