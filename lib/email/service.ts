// ---------------------------------------------------------------------------
// High-level email service built on the self-contained SMTP client.
// Reads config from env, sends, and best-effort logs to the `email_logs`
// table so the Email Studio and admin dashboard can track delivery.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import { getSmtpConfig } from "./constants"
import type { SmtpAddress } from "./types"

export function fromMailbox(key: string, fallbackEmail?: string): SmtpAddress {
  const map: Record<string, { label: string; email: string }> = {
    general: { label: "HerCircle Foundation", email: "info@hercirclefoundation.app" },
    hello: { label: "HerCircle Foundation", email: "hello@hercirclefoundation.app" },
    support: { label: "HerCircle Support", email: "support@hercirclefoundation.app" },
    finance: { label: "HerCircle Finance", email: "finance@hercirclefoundation.app" },
    careers: { label: "HerCircle Careers", email: "careers@hercirclefoundation.app" },
    media: { label: "HerCircle Media", email: "media@hercirclefoundation.app" },
    donations: { label: "HerCircle Donations", email: "donations@hercirclefoundation.app" },
    programs: { label: "HerCircle Programs", email: "programs@hercirclefoundation.app" },
    partnerships: { label: "HerCircle Partnerships", email: "partnerships@hercirclefoundation.app" },
    contact: { label: "HerCircle Contact", email: "contact@hercirclefoundation.app" },
    info: { label: "HerCircle", email: "info@hercirclefoundation.app" },
  }
  const entry = map[key] || map.general
  return {
    name: entry.label,
    address: fallbackEmail || entry.email,
  }
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

let _svc: ReturnType<typeof createClient> | null = null
function svc() {
  if (!SUPA_URL || !SUPA_SERVICE) return null
  if (!_svc) _svc = createClient(SUPA_URL, SUPA_SERVICE)
  return _svc
}

/**
 * Send a templated email via Zoho SMTP. Falls back to configured env defaults.
 * Never throws on logging failures — delivery result is always returned.
 */
export async function sendEmail(args: {
  to: SmtpAddress[]
  cc?: string[]
  bcc?: string[]
  from?: SmtpAddress
  replyTo?: string
  subject: string
  text?: string
  html?: string
  category?: string
  campaignId?: string
  templateId?: string
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const cfg = getSmtpConfig()
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, error: "Zoho SMTP is not configured. Add ZOHO_* to .env.local." }
  }

  const from = args.from || { name: cfg.fromName, address: cfg.from }
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    connectionTimeout: Number(process.env.SMTP_CONNECT_TIMEOUT_MS || 5000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 5000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 5000),
  })

  const messageId = `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}@hercirclefoundation.app`
  try {
    await transport.sendMail({
      from: { name: from.name || cfg.fromName, address: from.address || cfg.from },
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      replyTo: args.replyTo || cfg.replyTo,
      subject: args.subject,
      text: args.text,
      html: args.html,
      messageId,
    })
    await logEmail({
      to: args.to.map((t) => t.address),
      from: from.address,
      subject: args.subject,
      status: "sent",
      messageId,
      category: args.category,
      campaignId: args.campaignId,
      templateId: args.templateId,
    }).catch(() => {})
    return { ok: true, messageId }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[email/send] failed', {
      subject: args.subject,
      from: from.address,
      recipients: args.to.map((t) => t.address),
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      error,
    })
    await logEmail({
      to: args.to.map((t) => t.address),
      from: from.address,
      subject: args.subject,
      status: "failed",
      error,
      messageId,
      category: args.category,
      campaignId: args.campaignId,
      templateId: args.templateId,
    }).catch(() => {})
    return { ok: false, error }
  }
}

// Small helper to normalise callsites that use `subject` directly.
async function logEmail(payload: {
  to: string[]
  from: string
  subject: string
  status: string
  error?: string
  messageId?: string
  category?: string
  campaignId?: string
  templateId?: string
}) {
  const db = svc()
  if (!db) return
  const row = {
    to: payload.to,
    from_address: payload.from,
    subject: payload.subject,
    status: payload.status,
    error: payload.error || null,
    message_id: payload.messageId || null,
    category: payload.category || null,
    campaign_id: payload.campaignId || null,
    template_id: payload.templateId || null,
  }
  const { error } = await db.from("email_logs").insert([row as never])
  if (error) {
    console.error('[email/log] insert failed', {
      subject: payload.subject,
      status: payload.status,
      error: error.message,
    })
  }
}
