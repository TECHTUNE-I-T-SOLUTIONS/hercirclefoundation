// ---------------------------------------------------------------------------
// HerCircle Foundation – Email Studio constants & runtime configuration
// ---------------------------------------------------------------------------

export const EMAIL_BRAND = {
  name: "HerCircle Foundation",
  shortName: "HerCircle",
  logoUrl: "https://hercirclefoundation.app/logo.png",
  website: "https://hercirclefoundation.app",
  phone: "+234 810 625 5776",
  address: "Lagos, Nigeria",
  social: {
    instagram: "https://instagram.com/hercirclefoundation",
    facebook: "https://facebook.com/hercirclefoundation",
    twitter: "https://twitter.com/HercircleF",
  },
}

// Public website links used across email header/footer and templates.
export const PUBLIC_LINKS = [
  { label: "Home", href: "https://hercirclefoundation.app/" },
  { label: "About", href: "https://hercirclefoundation.app/about" },
  { label: "Gallery", href: "https://hercirclefoundation.app/gallery" },
  { label: "Partner", href: "https://hercirclefoundation.app/partner" },
  { label: "Blog", href: "https://hercirclefoundation.app/blog" },
  { label: "Stories", href: "https://hercirclefoundation.app/stories" },
  { label: "Events", href: "https://hercirclefoundation.app/events" },
  { label: "Donate", href: "https://hercirclefoundation.app/donate" },
  { label: "Volunteer", href: "https://hercirclefoundation.app/volunteer" },
  { label: "Contact", href: "https://hercirclefoundation.app/contact" },
]

// Departmental "from" addresses used across the platform. The studio lets an
// admin pick the appropriate mailbox so replies route to the right team.
export const DEPARTMENT_MAILBOXES: Record<string, { label: string; email: string }> = {
  general: { label: "General / Info", email: "info@hercirclefoundation.app" },
  hello: { label: "General / Hello", email: "hello@hercirclefoundation.app" },
  support: { label: "Support", email: "support@hercirclefoundation.app" },
  finance: { label: "Finance", email: "finance@hercirclefoundation.app" },
  careers: { label: "Careers", email: "careers@hercirclefoundation.app" },
  media: { label: "Media & Press", email: "media@hercirclefoundation.app" },
  donations: { label: "Donations", email: "donations@hercirclefoundation.app" },
  programs: { label: "Programs", email: "programs@hercirclefoundation.app" },
  partnerships: { label: "Partnerships", email: "partnerships@hercirclefoundation.app" },
  contact: { label: "Contact", email: "contact@hercirclefoundation.app" },
}

// Builds the SMTP config used by the self-contained SMTP client. All values
// fall back to Zoho defaults so the app works once env is set.
export function getSmtpConfig() {
  const host = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com"
  const port = Number(process.env.ZOHO_SMTP_PORT || 587)
  return {
    host,
    port,
    secure: (process.env.ZOHO_SMTP_SECURE || "false").toLowerCase() === "true",
    user: process.env.ZOHO_SMTP_USER || "",
    pass: process.env.ZOHO_SMTP_APP_PASSWORD || process.env.APP_PASSWORD || "",
    fromName: process.env.ZOHO_SMTP_FROM_NAME || "HerCircle Foundation",
    from: process.env.ZOHO_SMTP_FROM || "info@hercirclefoundation.app",
    replyTo: process.env.ZOHO_SMTP_REPLY_TO || "info@hercirclefoundation.app",
  }
}

// Fallback list of admin email addresses notified of new activity. Normally
// read from the `admin_users` table at send time; this is the safety net.
export function getAdminNotificationEmails(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAILS || ""
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
}

export function smtpIsConfigured() {
  const cfg = getSmtpConfig()
  return Boolean(cfg.host && cfg.user && cfg.pass)
}
