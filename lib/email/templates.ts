// ---------------------------------------------------------------------------
// Email templates for every platform case. Each returns the responsive shell
// (header + footer) with its own subject line. The catalog powers the Studio.
// ---------------------------------------------------------------------------
import { renderShell } from "./email-layout"
import { h1, p, button, divider, heroBanner, statChips, escapeHtml } from "./content-blocks"
import { EMAIL_BRAND } from "./constants"

export type TemplateKey =
  | "welcome"
  | "newsletter"
  | "event_invite"
  | "volunteer_confirmation"
  | "donation_thankyou"
  | "partner_confirmation"
  | "contact_confirmation"
  | "admin_donation"
  | "admin_volunteer"
  | "admin_partner"
  | "admin_contact"
  | "admin_event"
  | "admin_blog"
  | "story_approved"
  | "custom"

export interface TemplateMeta {
  key: TemplateKey
  label: string
  category: "Welcome" | "Marketing" | "Transactional" | "Admin Alerts" | "Premium"
  builtIn: boolean
  defaultSubject: string
  fromKey?: string
}

export const TEMPLATE_CATALOG: TemplateMeta[] = [
  { key: "welcome", label: "Welcome to HerCircle", category: "Premium", builtIn: true, defaultSubject: "Welcome to HerCircle Foundation 🌸", fromKey: "hello" },
  { key: "newsletter", label: "Monthly Newsletter", category: "Marketing", builtIn: true, defaultSubject: "HerCircle Monthly Update", fromKey: "info" },
  { key: "event_invite", label: "Event Invitation", category: "Marketing", builtIn: true, defaultSubject: "Join us — HerCircle Event", fromKey: "programs" },
  { key: "volunteer_confirmation", label: "Volunteer Confirmation", category: "Transactional", builtIn: true, defaultSubject: "We received your volunteer application", fromKey: "careers" },
  { key: "donation_thankyou", label: "Donation Thank You", category: "Transactional", builtIn: true, defaultSubject: "Thank you for your generous donation", fromKey: "donations" },
  { key: "partner_confirmation", label: "Partnership Confirmation", category: "Transactional", builtIn: true, defaultSubject: "Partnership request received", fromKey: "partnerships" },
  { key: "contact_confirmation", label: "Contact Confirmation", category: "Transactional", builtIn: true, defaultSubject: "We received your message", fromKey: "contact" },
  { key: "admin_donation", label: "Admin Alert · New Donation", category: "Admin Alerts", builtIn: true, defaultSubject: "New donation received", fromKey: "donations" },
  { key: "admin_volunteer", label: "Admin Alert · New Volunteer", category: "Admin Alerts", builtIn: true, defaultSubject: "New volunteer application", fromKey: "careers" },
  { key: "admin_partner", label: "Admin Alert · New Partner", category: "Admin Alerts", builtIn: true, defaultSubject: "New partnership request", fromKey: "partnerships" },
  { key: "admin_contact", label: "Admin Alert · New Contact", category: "Admin Alerts", builtIn: true, defaultSubject: "New contact message", fromKey: "contact" },
  { key: "admin_event", label: "Admin Alert · New Event", category: "Admin Alerts", builtIn: true, defaultSubject: "A new event was created", fromKey: "programs" },
  { key: "admin_blog", label: "Admin Alert · New Blog", category: "Admin Alerts", builtIn: true, defaultSubject: "A new blog post was published", fromKey: "media" },
  { key: "story_approved", label: "Story Approved", category: "Transactional", builtIn: true, defaultSubject: "Your story is live on HerCircle", fromKey: "media" },
  { key: "custom", label: "Blank / Custom", category: "Premium", builtIn: true, defaultSubject: "HerCircle Foundation", fromKey: "info" },
]

export interface TemplateData {
  firstName?: string
  receiverEmail?: string
  [key: string]: unknown
}

// Personalisation helpers shared across templates.
function greeting(data: TemplateData): string {
  const name = data.firstName || "there"
  return `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 14px;">Hello ${escapeHtml(name)},</p>`
}

function signoff(): string {
  return `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#6b7280;margin:18px 0 0;">With gratitude,<br/><strong>${EMAIL_BRAND.name} Team</strong></p>`
}

function render(content: string, subject: string): { subject: string; html: string } {
  return { subject, html: renderShell(content) }
}

export function mergeTemplate(raw: string, data: TemplateData): string {
  let out = raw
  out = out.split("{{firstName}}").join(data.firstName ? escapeHtml(data.firstName) : "there")
  return out
}

// ---------------------------------------------------------------------------
// Built-in renderers: transaction-facing + admin alerts + marketing.
// ---------------------------------------------------------------------------
const RENDERS: Record<TemplateKey, (d: TemplateData) => { subject: string; html: string }> = {
  welcome: (d) => {
    const subject = "Welcome to HerCircle Foundation 🌸"
    const content = `${heroBanner("Welcome to HerCircle", "Thanks for joining our community")}
      ${greeting(d)}
      ${p("HerCircle Foundation is on a mission to break period poverty and empower young women through menstrual health education and access to safe sanitary products. We are so glad you are part of it.")}
      ${h1("Ways to get involved")}
      ${button("/volunteer", "Become a Volunteer")}
      ${button("/donate", "Make a Donation")}
      ${button("/partner", "Partner With Us")}
      ${divider()}
      ${p("Follow our journey and read real stories from the women and girls we empower every day.", "#6b7280", 13)}
      ${signoff()}`
    return render(content, subject)
  },

  newsletter: (d) => {
    const subject = `${EMAIL_BRAND.name} Update · ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
    const content = `${heroBanner("HerCircle Monthly Update", "News, stories & ways to get involved")}
      ${greeting(d)}
      ${p("Welcome to our monthly round-up. Here is what we have been up to and how you can make a difference.")}
      ${h1("Impact at a glance")}
      ${statChips([
        { label: "Packs Distributed", value: "1,240+" },
        { label: "Girls Reached", value: "3,100+" },
        { label: "Volunteers", value: "180+" },
      ])}
      ${divider()}
      ${h1("Upcoming events")}
      ${p("Join us at our next workshop and community outreach. Spaces are limited, so reserve early.")}
      ${button("/events", "View Upcoming Events")}
      ${button("/blog", "Read Our Blog")}
      ${signoff()}`
    return render(content, subject)
  },

  event_invite: (d) => {
    const subject = `${String(d.title || "You are invited")} — HerCircle Event`
    const chips: { label: string; value: string }[] = []
    if (d.date) chips.push({ label: "Date", value: String(d.date) })
    if (d.location) chips.push({ label: "Location", value: String(d.location) })
    const content = `${heroBanner(escapeHtml(String(d.title || "You are invited!")), d.subtitle ? String(d.subtitle) : undefined)}
      ${greeting(d)}
      ${p(escapeHtml(String(d.description || "Join us for an inspiring event as we continue to break period poverty together.")))}
      ${chips.length ? statChips(chips) : ""}
      ${button("/events", "RSVP / Learn More")}
      ${signoff()}`
    return render(content, subject)
  },

  volunteer_confirmation: (d) => {
    const subject = "We received your volunteer application 🌱"
    const content = `${heroBanner("Thank you for volunteering!", "Your application is with our team")}
      ${greeting(d)}
      ${p("Thank you for offering your time and skills to HerCircle Foundation. Your application has been received and our team is reviewing it.")}
      ${p("Expect to hear back from us within a few business days. In the meantime, explore our work and read stories from volunteers who came before you.")}
      ${button("/stories", "Read Volunteer Stories")}
      ${divider()}
      ${p(`Reference: ${escapeHtml(String(d.referenceNumber || "—"))}`, "#6b7280", 12)}`
    return render(content, subject)
  },

  donation_thankyou: (d) => {
    const subject = "Thank you for your generous donation 💜"
    const amount = d.amount ? String(d.amount) : "Thank you"
    const reference = d.reference ? String(d.reference) : "N/A"
    const paymentMethod = d.paymentMethod ? String(d.paymentMethod) : "Bank Transfer"
    const donationType = d.donationType ? String(d.donationType) : "One-time"
    const donationDate = d.donationDate ? String(d.donationDate) : new Date().toLocaleDateString()
    
    const content = `${heroBanner("Thank You!", "Your support makes real change possible")}
      ${greeting(d)}
      ${p("On behalf of everyone at HerCircle Foundation, thank you for your generous donation. Your kindness funds sanitary products, education materials, and empowerment programmes for girls who need them most.")}
      ${h1("Donation Details")}
      ${statChips([
        { label: "Amount", value: `₦${escapeHtml(amount)}`, accent: true },
        { label: "Type", value: escapeHtml(donationType) },
        { label: "Payment Method", value: escapeHtml(paymentMethod) },
        { label: "Date", value: escapeHtml(donationDate) },
      ])}
      ${divider()}
      ${p(`Transaction Reference: <strong>${escapeHtml(reference)}</strong>`, "#6b7280", 13)}
      ${p("Please keep this receipt for your records. If you have any questions about your donation, feel free to reach out to us.", "#6b7280", 13)}
      ${button("/", "Visit Our Website")}
      ${signoff()}`
    return render(content, subject)
  },

  partner_confirmation: (d) => {
    const subject = "Partnership request received 🤝"
    const content = `${heroBanner("Partnership Application", "We appreciate your interest")}
      ${greeting(d)}
      ${p("Thank you for reaching out to partner with us. Your request has been received and our partnerships team will be in touch to discuss next steps.")}
      ${button("/partner", "Learn About Partnerships")}
      ${signoff()}`
    return render(content, subject)
  },

  contact_confirmation: (d) => {
    const subject = "We received your message 💬"
    const content = `${heroBanner("Message received", "We will get back to you soon")}
      ${greeting(d)}
      ${p("Thank you for getting in touch with HerCircle Foundation. A member of our team will respond, typically within 1–2 business days.")}
      ${button("/", "Explore HerCircle")}
      ${signoff()}`
    return render(content, subject)
  },

  admin_donation: (d) => {
    const subject = "New donation received"
    const content = `${heroBanner("New Donation", `From ${escapeHtml(String(d.name || "a donor"))}`)}
      ${h1("Donation details")}
      ${statChips([
        { label: "Donor", value: escapeHtml(String(d.name || "—")) },
        { label: "Amount", value: "₦" + escapeHtml(String(d.amount || "0")), accent: true },
        { label: "Type", value: escapeHtml(String(d.type || "one-time")) },
      ])}
      ${d.message ? p("Message: " + escapeHtml(String(d.message))) : ""}
      ${button("/admin/donors", "View in Admin")}
      ${signoff()}`
    return render(content, subject)
  },

  admin_volunteer: (d) => {
    const subject = "New volunteer application"
    const content = `${heroBanner("New Volunteer Application", escapeHtml(String(d.name || "")))}
      ${h1("Applicant details")}
      ${statChips([
        { label: "Name", value: escapeHtml(String(d.name || "—")) },
        { label: "Skills", value: escapeHtml(String(d.skills || "—")) },
      ])}
      ${p("Email: " + escapeHtml(String(d.email || "—")))}
      ${button("/admin/volunteers", "View in Admin")}
      ${signoff()}`
    return render(content, subject)
  },

  admin_partner: (d) => {
    const subject = "New partnership request"
    const content = `${heroBanner("New Partnership Request", escapeHtml(String(d.organization || d.name || "")))}
      ${p(`Contact person: ${escapeHtml(String(d.name || "—"))} · ${escapeHtml(String(d.email || "—"))}`)}
      ${d.message ? p("Message: " + escapeHtml(String(d.message))) : ""}
      ${button("/admin/partner-requests", "Review Request")}
      ${signoff()}`
    return render(content, subject)
  },

  admin_contact: (d) => {
    const subject = "New contact message"
    const content = `${heroBanner("New Contact Message", escapeHtml(String(d.subject || "")))}
      ${p(`From: ${escapeHtml(String(d.name || "—"))} · ${escapeHtml(String(d.email || "—"))}`)}
      ${p(escapeHtml(String(d.message || "")))}
      ${button("/admin/dashboard", "Open Admin")}
      ${signoff()}`
    return render(content, subject)
  },

  admin_event: (d) => {
    const subject = "A new event was created"
    const content = `${heroBanner("New Event Created", escapeHtml(String(d.title || "")))}
      ${d.description ? p(escapeHtml(String(d.description))) : ""}
      ${d.date ? p("Date: " + escapeHtml(String(d.date))) : ""}
      ${d.location ? p("Location: " + escapeHtml(String(d.location))) : ""}
      ${button("/admin/events", "Manage Events")}
      ${signoff()}`
    return render(content, subject)
  },

  admin_blog: (d) => {
    const subject = "A new blog post was published"
    const content = `${heroBanner("New Blog Published", escapeHtml(String(d.title || "")))}
      ${p("A new post is now live on the HerCircle blog.")}
      ${button("/blog", "View Blog")}
      ${signoff()}`
    return render(content, subject)
  },

  story_approved: (d) => {
    const subject = "Your story is live on HerCircle"
    const content = `${heroBanner("Your story is live!", "Thank you for sharing")}
      ${greeting(d)}
      ${p("Your story has been approved and is now live on the HerCircle website for our community to read and be inspired by.")}
      ${button("/stories", "Read Your Story")}
      ${signoff()}`
    return render(content, subject)
  },

  custom: (d) => {
    const subject = String(d.subject || "HerCircle Foundation")
    const content = `${h1(escapeHtml(String(d.title || "HerCircle Foundation")))}
      ${p(String(d.body || "Add your message here."))}
      ${signoff()}`
    return render(content, subject)
  },
}

export const TEMPLATES: Record<TemplateKey, (d: TemplateData) => { subject: string; html: string }> = RENDERS

export function renderTemplate(key: TemplateKey, data: TemplateData) {
  return (TEMPLATES[key] || TEMPLATES.custom)(data)
}

// For the Studio: inject a subject override into a rendered result.
export function withSubject<T extends { subject: string }>(r: T, subject: string): T {
  return { ...r, subject }
}