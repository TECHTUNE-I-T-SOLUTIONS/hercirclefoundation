import { createClient } from "@supabase/supabase-js"

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

function svc() {
  if (!SUPA_URL || !SUPA_SERVICE) return null
  return createClient(SUPA_URL, SUPA_SERVICE)
}

export async function getAdminRecord(userId: string) {
  const db = svc()
  if (!db) return null
  const { data } = await db.from("admin_users").select("id, email, full_name, role, created_at, updated_at").eq("id", userId).limit(1)
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

export async function isSuperAdmin(userId: string) {
  const admin = await getAdminRecord(userId)
  return admin?.role === "super_admin"
}

