import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getAdminRecord } from "@/lib/admin/permissions"
import AdminManagementClient from "@/components/admin-management-client"

export default async function AdminManagementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/admin/auth/login")

  const admin = await getAdminRecord(user.id)
  if (!admin) redirect("/admin/auth/login")
  if (admin.role !== "super_admin") redirect("/admin/dashboard")

  return <AdminManagementClient />
}

