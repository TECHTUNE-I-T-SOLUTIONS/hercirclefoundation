// ---------------------------------------------------------------------------
// Automated notifications: send admin alerts to every registered admin.
// Super admins and admins are treated as one management team for alerts.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js"
import { sendEmail, fromMailbox } from "./service"
import { renderTemplate, type TemplateKey } from "./templates"
import { renderShell } from "./email-layout"
import { p, h1, button, divider } from "./content-blocks"
import { getAdminNotificationEmails } from "./constants"

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function getAlertRecipients(_eventType: string): Promise<string[]> {
  const envEmails = getAdminNotificationEmails()
  if (envEmails.length > 0) return envEmails

  const db = svc()
  if (!db) return []

  const { data } = await db.from("admin_users").select("email")
  return (data || [])
    .map((a: { email?: string }) => a.email as string)
    .filter((e: string) => Boolean(e))
}

export async function notifyAdmins(event: TemplateKey, data: Record<string, unknown>): Promise<boolean> {
  const recipients = await getAlertRecipients(String(data.eventType || "general"))
  if (recipients.length === 0) return false

  const { subject, html } = renderTemplate(event, data)
  const res = await sendEmail({
    to: recipients.map((e) => ({ address: e })),
    from: fromMailbox((data.fromKey as string) || "info"),
    subject,
    html,
    category: "admin_alert",
  })
  return res.ok
}

export async function sendToPerson(opts: {
  template: TemplateKey
  to: { address: string; name?: string }
  fromKey?: string
  subject?: string
  data: Record<string, unknown>
}): Promise<boolean> {
  const { subject, html } = renderTemplate(opts.template, {
    ...opts.data,
    firstName: (opts.data.firstName as string | undefined) || opts.to.name,
  })
  const res = await sendEmail({
    to: [opts.to],
    from: fromMailbox(opts.fromKey || "info"),
    subject: opts.subject || subject,
    html,
    category: "transactional",
  })
  return res.ok
}

export async function sendAdminBroadcast(opts: {
  subject: string
  title: string
  body: string
  ctaLabel?: string
  ctaHref?: string
  eventType?: string
}): Promise<boolean> {
  const recipients = await getAlertRecipients(opts.eventType || "general")
  if (recipients.length === 0) return false

  const html = renderShell(`
    ${h1(opts.title)}
    ${p(opts.body)}
    ${opts.ctaLabel && opts.ctaHref ? button(opts.ctaHref, opts.ctaLabel) : ""}
    ${divider()}
    ${p("This message was sent to the full HerCircle management team.", "#6b7280", 12)}
  `)

  const res = await sendEmail({
    to: recipients.map((e) => ({ address: e })),
    from: fromMailbox("info"),
    subject: opts.subject,
    html,
    category: "admin_alert",
  })
  return res.ok
}
