import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import { AUDIENCE_META, resolveAudience, type AudienceKey } from '@/lib/email/recipients'

/**
 * GET ?audience=volunteers → preview of up to 20 matching recipients + total count.
 */
export async function GET(req: Request) {
  try {
    const helper = await createServerHelper()
    const { data: userData } = await helper.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const audience = (searchParams.get('audience') || 'all') as AudienceKey

    const emails = await resolveAudience(audience)
    return NextResponse.json({
      key: audience,
      meta: AUDIENCE_META[audience],
      total: emails.length,
      preview: emails.slice(0, 20),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}