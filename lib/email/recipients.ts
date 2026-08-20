// ---------------------------------------------------------------------------
// Audience helpers: resolve recipient email addresses for Email Studio sends
// and notifications. Reads directly via the service-role Supabase client.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js"
import type { SmtpAddress } from "./types"

export type AudienceKey = "all" | "volunteers" | "donors" | "partner_requests" | "contact_messages" | "admins"

export const AUDIENCE_META: Record<AudienceKey, { label: string; description: string }> = {
  all: { label: "Everyone", description: "Volunteers, donors, partners, and contacts" },
  volunteers: { label: "Volunteers", description: "Everyone who submitted a volunteer application" },
  donors: { label: "Donors", description: "Everyone who made a donation" },
  partner_requests: { label: "Partners", description: "Organizations & individuals who contacted us about partnerships" },
  contact_messages: { label: "Contact Subscribers", description: "People who used the contact form" },
  admins: { label: "Admin Team", description: "Registered platform administrators" },
}

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

interface Person {
  name?: string
  email?: string
}

function toAddresses(people: Person[]): SmtpAddress[] {
  const seen = new Set<string>()
  const out: SmtpAddress[] = []
  for (const p of people) {
    const email = (p.email || "").trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue
    if (seen.has(email)) continue
    seen.add(email)
    out.push({ name: p.name ? p.name.trim() : undefined, address: email })
  }
  return out
}

/** Resolve the email addresses for a given audience key (or a raw email list). */
export async function resolveAudience(key: AudienceKey | "custom", emails?: string[]): Promise<SmtpAddress[]> {
  const db = svc()
  if (!db) return []

  const fetchAll = async (table: string, nameCol: string, emailCol: string): Promise<Person[]> => {
    const { data, error } = await db.from(table).select(`${nameCol}, ${emailCol}`).limit(100000)
    if (error) return []
        return (data || []).map((r: Record<string, any>) => ({ name: r[nameCol], email: r[emailCol] }))
  }

  try {
    switch (key) {
      case "volunteers":
        return toAddresses(await fetchAll("volunteers", "full_name", "email"))
      case "donors":
        return toAddresses(await fetchAll("donors", "full_name", "email"))
      case "partner_requests":
        return toAddresses(await fetchAll("partner_requests", "name", "email"))
      case "contact_messages":
        return toAddresses(await fetchAll("contact_messages", "name", "email"))
      case "admins": {
                const { data } = await db.from("admin_users").select("full_name, email").limit(100000)
        return toAddresses((data || []).map((r: Record<string, any>) => ({ name: r.full_name, email: r.email })))
      }
      case "custom":
        return toAddresses((emails || []).map((e) => ({ email: e })))
      case "all": {
        const [v, d, p, c] = await Promise.all([
          fetchAll("volunteers", "full_name", "email"),
          fetchAll("donors", "full_name", "email"),
          fetchAll("partner_requests", "name", "email"),
          fetchAll("contact_messages", "name", "email"),
        ])
        return toAddresses([...v, ...d, ...p, ...c])
      }
      default:
        return []
    }
  } catch {
    return []
  }
}
