"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trash2, Crown, Search, ShieldCheck, Users2, Sparkles, Plus, Filter } from "lucide-react"

type AdminRow = {
  id: string
  email: string
  full_name?: string | null
  role?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type EditForm = {
  id: string
  full_name: string
  email: string
  role: "admin" | "super_admin"
}

export default function AdminManagementClient() {
  const { toast } = useToast()
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "admin" })
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "super_admin">("all")
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/management")
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to load admins")
      setAdmins(Array.isArray(j.data) ? j.data : [])
    } catch (e) {
      toast({ title: "Load failed", description: String(e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const createAdmin = async () => {
    if (!form.email || !form.full_name || !form.password) {
      toast({ title: "Missing details", description: "Full name, email, password, and role are required.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to create admin")
      toast({ title: "Admin created", description: `${form.full_name} is now a ${form.role}.` })
      setForm({ full_name: "", email: "", password: "", role: "admin" })
      await load()
    } catch (e) {
      toast({ title: "Create failed", description: String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const updateRole = async (id: string, role: "admin" | "super_admin") => {
    try {
      const res = await fetch("/api/admin/management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to update role")
      toast({ title: "Role updated", description: `Admin role changed to ${role}.` })
      await load()
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" })
    }
  }

  const saveEdit = async () => {
    if (!editForm) return
    try {
      const res = await fetch("/api/admin/management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editForm.id,
          role: editForm.role,
          full_name: editForm.full_name,
          email: editForm.email,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to update admin")
      toast({ title: "Admin updated" })
      setEditOpen(false)
      setEditForm(null)
      await load()
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" })
    }
  }

  const openEdit = (admin: AdminRow) => {
    setEditForm({
      id: admin.id,
      full_name: admin.full_name || "",
      email: admin.email || "",
      role: (admin.role === "super_admin" ? "super_admin" : "admin"),
    })
    setEditOpen(true)
  }

  const openDelete = (admin: AdminRow) => {
    setDeleteTarget(admin)
    setDeleteOpen(true)
  }

  const deleteAdmin = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/management?id=${deleteTarget.id}`, { method: "DELETE" })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to delete admin")
      toast({ title: "Admin deleted" })
      setDeleteOpen(false)
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" })
    }
  }

  const filteredAdmins = useMemo(() => {
    const q = query.trim().toLowerCase()
    return admins.filter((admin) => {
      const matchesRole = roleFilter === "all" ? true : admin.role === roleFilter
      const haystack = `${admin.full_name || ""} ${admin.email || ""} ${admin.role || ""}`.toLowerCase()
      const matchesQuery = q ? haystack.includes(q) : true
      return matchesRole && matchesQuery
    })
  }, [admins, query, roleFilter])

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700 ring-1 ring-rose-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Super Admin Console
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-primary md:text-4xl">Admin Management</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Create new admins, promote trusted team members, and review the full management roster from one secure place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 shadow-sm ring-1 ring-slate-200">
                <Users2 className="h-4 w-4 text-rose-600" />
                {admins.length} registered admins
              </span>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 shadow-sm ring-1 ring-slate-200">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Super-admin only
              </span>
            </div>
          </div>

          <Card className="border-slate-200/80 shadow-sm backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Create admin</CardTitle>
              <CardDescription>Invite a new management team member with a role-specific account.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(value) => setForm((p) => ({ ...p, role: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createAdmin} disabled={saving} className="w-full sm:w-auto sm:self-end">
                <Plus className="h-4 w-4 mr-2" />
                {saving ? "Creating..." : "Create admin"}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Registered Admins</CardTitle>
              <CardDescription>Search, filter, and update every admin and super admin in the system.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email"
                  className="pl-9"
                />
              </div>
              <div className="w-full sm:w-44">
                <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "all" | "admin" | "super_admin")}>
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="super_admin">Super admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {loading && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading admins...</CardContent>
              </Card>
            )}
            {!loading && filteredAdmins.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">No admins found.</CardContent>
              </Card>
            )}
            {filteredAdmins.map((admin) => (
              <Card key={admin.id} className="shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{admin.full_name || "—"}</p>
                      <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
                    </div>
                    <Badge
                      variant={admin.role === "super_admin" ? "default" : "secondary"}
                      className={admin.role === "super_admin" ? "bg-amber-100 text-amber-900 hover:bg-amber-100 shrink-0" : "shrink-0"}
                    >
                      {admin.role || "admin"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-muted-foreground">Joined</p>
                      <p className="font-medium">{admin.created_at ? new Date(admin.created_at).toLocaleString() : "—"}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-muted-foreground">Updated</p>
                      <p className="font-medium">{admin.updated_at ? new Date(admin.updated_at).toLocaleString() : "—"}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Select value={admin.role || "admin"} onValueChange={(value) => updateRole(admin.id, value as "admin" | "super_admin")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Change role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => openEdit(admin)}>Edit</Button>
                      <Button variant="destructive" onClick={() => openDelete(admin)}>Delete</Button>
                    </div>

                    <Button variant="outline" onClick={() => updateRole(admin.id, admin.role === "super_admin" ? "admin" : "super_admin")}>
                      <Crown className="h-4 w-4 mr-2" />
                      Toggle role
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="hidden md:table-row-group">
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading admins...</TableCell>
                </TableRow>
              )}
              {!loading && filteredAdmins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No admins found.</TableCell>
                </TableRow>
              )}
              {filteredAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.full_name || "—"}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={admin.role === "super_admin" ? "default" : "secondary"}
                      className={admin.role === "super_admin" ? "bg-amber-100 text-amber-900 hover:bg-amber-100" : ""}
                    >
                      {admin.role || "admin"}
                    </Badge>
                  </TableCell>
                  <TableCell>{admin.created_at ? new Date(admin.created_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>{admin.updated_at ? new Date(admin.updated_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Select value={admin.role || "admin"} onValueChange={(value) => updateRole(admin.id, value as "admin" | "super_admin")}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Change role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => openEdit(admin)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => updateRole(admin.id, admin.role === "super_admin" ? "admin" : "super_admin")}>
                        <Crown className="h-4 w-4 mr-1" />
                        Toggle
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDelete(admin)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit admin</DialogTitle>
            <DialogDescription>Update the admin’s name, email, or role.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={editForm?.full_name || ""}
                onChange={(e) => setEditForm((p) => (p ? { ...p, full_name: e.target.value } : p))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm?.email || ""}
                onChange={(e) => setEditForm((p) => (p ? { ...p, email: e.target.value } : p))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm?.role || "admin"}
                onValueChange={(value) => setEditForm((p) => (p ? { ...p, role: value as "admin" | "super_admin" } : p))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete admin?</DialogTitle>
            <DialogDescription>
              This will permanently remove {deleteTarget?.full_name || deleteTarget?.email || "this admin"} from the management team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteAdmin}>Delete admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
