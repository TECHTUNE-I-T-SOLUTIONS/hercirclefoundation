import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@supabase/supabase-js"
import { createClient as createServerHelper } from "@/lib/supabase/server"
import { isSuperAdmin } from "@/lib/admin/permissions"
import { sendEmail, fromMailbox } from "@/lib/email/service"
import { renderShell } from "@/lib/email/email-layout"

export async function GET() {
  const helper = await createServerHelper()
  const { data: userData } = await helper.auth.getUser()
  if (!userData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await isSuperAdmin(userData.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const svc = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await svc.from("admin_users").select("id, email, full_name, role, created_at, updated_at").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

export async function POST(req: Request) {
  const helper = await createServerHelper()
  const { data: userData } = await helper.auth.getUser()
  if (!userData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await isSuperAdmin(userData.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { email, full_name, password, role } = body as { email?: string; full_name?: string; password?: string; role?: "admin" | "super_admin" }
  if (!email || !full_name || !password) return NextResponse.json({ error: "email, full_name and password are required" }, { status: 400 })
  if (role !== "admin" && role !== "super_admin") return NextResponse.json({ error: "role must be admin or super_admin" }, { status: 400 })

  const svc = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
  if (!created.user?.id) return NextResponse.json({ error: "Could not create auth user" }, { status: 500 })

  const { error: upsertErr } = await svc.from("admin_users").upsert({
    id: created.user.id,
    email,
    full_name,
    role,
  })
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  const permissions =
    role === "super_admin"
      ? "You can manage admins, super admins, and the full platform."
      : "You can manage the platform content, review submissions, handle events, donors, volunteers, partner requests, notifications, stories, blogs, gallery, surveys, and Email Studio access as assigned by the team."

  await sendEmail({
    to: [{ address: email, name: full_name }],
    from: fromMailbox("hello"),
    subject: "Welcome to HerCircle Management",
    html: renderShell(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.3;color:#1f2937;margin:0 0 12px;">Welcome to HerCircle Management</h1>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 14px;">Hi ${full_name},</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;margin:0 0 14px;">Your admin account has been created successfully.</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;margin:0 0 14px;">${permissions}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
              <tr>
                <td style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;background:#fff;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Role assigned</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#c2185b;margin:0;">${role.replace("_", " ")}</p>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;margin:0;">If you need anything, please contact support at <a href="mailto:support@hercirclefoundation.app" style="color:#c2185b;text-decoration:none;">support@hercirclefoundation.app</a>.</p>
          </td>
        </tr>
      </table>
    `),
    category: "transactional",
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const helper = await createServerHelper()
  const { data: userData } = await helper.auth.getUser()
  if (!userData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await isSuperAdmin(userData.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { id, role, full_name, email } = body as { id?: string; role?: "admin" | "super_admin"; full_name?: string; email?: string }
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  if (role && role !== "admin" && role !== "super_admin") return NextResponse.json({ error: "role must be admin or super_admin" }, { status: 400 })

  const svc = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const payload: Record<string, string> = {}
  if (role) payload.role = role
  if (typeof full_name === "string") payload.full_name = full_name
  if (typeof email === "string") payload.email = email
  const { error } = await svc.from("admin_users").update(payload).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const helper = await createServerHelper()
  const { data: userData } = await helper.auth.getUser()
  if (!userData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await isSuperAdmin(userData.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const svc = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error: authDeleteErr } = await svc.auth.admin.deleteUser(id)
  if (authDeleteErr) return NextResponse.json({ error: authDeleteErr.message }, { status: 500 })

  const { error } = await svc.from("admin_users").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
