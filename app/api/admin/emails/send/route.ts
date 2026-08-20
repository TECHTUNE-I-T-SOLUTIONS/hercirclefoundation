import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import { resolveAudience, type AudienceKey } from '@/lib/email/recipients'
import { sendEmail, fromMailbox } from '@/lib/email/service'

export const runtime = 'nodejs'

export interface SendPayload {
  campaignId?: string
  templateKey?: string
  subject: string
  html: string
  audience?: string
  custom?: string[] // custom email list
  fromKey?: string
  replyTo?: string
  recipientsPreview?: boolean
}

// Replace `{{firstName}}` merge tokens with per-recipient values.
function mergeMail(raw: string, firstName?: string): string {
  return raw.split('{{firstName}}').join(firstName || 'there')
}

/**
 * POST → resolve the audience, render + send the email to each recipient,
 *        and (optionally) finalize the campaign + update per-recipient status.
 */
export async function POST(req: Request) {
  try {
    const helper = await createServerHelper()
    const { data: userData } = await helper.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Admin check
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    const svc = createServerClient(url, key)

    const { data: admins } = await svc.from('admin_users').select('id').eq('id', userData.user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = (await req.json()) as SendPayload
    if (!body.subject || !body.html) {
      return NextResponse.json({ error: 'subject and html are required' }, { status: 400 })
    }

    // Resolve recipients.
    let recipients: { address: string; name?: string }[]
    if (body.audience && body.audience !== 'custom') {
      recipients = await resolveAudience(body.audience as AudienceKey)
    } else {
      recipients = (body.custom || []).map((e: string) => ({ address: e }))
    }

    const emails = recipients.map((r) => r.address).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    if (emails.length === 0 && !body.recipientsPreview) {
      return NextResponse.json({ error: 'No valid recipients for this audience' }, { status: 400 })
    }

    console.info('[admin-emails/send] starting', {
      campaignId: body.campaignId || null,
      audience: body.audience || 'custom',
      recipients: emails.length,
      fromKey: body.fromKey || 'general',
    })

    // Send (deduplicated), tracking success/failure per recipient.
    const seen = new Set<string>()
    let ok = 0
    let failed = 0
    const failures: { address: string; error: string }[] = []

    for (const email of emails) {
      if (seen.has(email)) continue
      seen.add(email)
      const recipient = recipients.find((r) => r.address === email)
                  // Personalize merge fields per recipient.
      const html = mergeMail(body.html, recipient?.name || undefined)
      const res = await sendEmail({
        to: [{ address: email, name: recipient?.name }],
        from: fromMailbox(body.fromKey || 'general'),
        replyTo: body.replyTo || undefined,
        subject: body.subject,
        html,
        category: 'campaign',
        campaignId: body.campaignId,
      })
      if (res.ok) ok++
      else {
        failed++
        failures.push({ address: email, error: res.error || 'Unknown' })
        console.error('[admin-emails/send] recipient failed', {
          campaignId: body.campaignId || null,
          email,
          error: res.error || 'Unknown',
        })
      }
    }

    // Update campaign totals + per-recipient table if a campaign id was given.
    if (body.campaignId) {
      await svc
        .from('email_campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString(), recipient_count: seen.size, success_count: ok, fail_count: failed })
        .eq('id', body.campaignId)

      const rows = [...seen].map((e) => {
        const f = failures.find((x) => x.address === e)
        const rcpt = recipients.find((r) => r.address === e)
        return {
          campaign_id: body.campaignId,
          email: e,
          name: rcpt?.name || null,
          status: f ? 'failed' : 'sent',
          error: f ? f.error : null,
        }
      })
      await svc.from('email_campaign_recipients').insert(rows)
    }

    console.info('[admin-emails/send] finished', {
      campaignId: body.campaignId || null,
      total: seen.size,
      sent: ok,
      failed,
    })
    return NextResponse.json({ ok: true, sent: ok, failed, total: seen.size, failures })
  } catch (err) {
    console.error('[admin-emails/send] fatal error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
