"use client"

import { useEffect, useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Send, Save, Eye, Pencil, Trash2, Mail, RefreshCw, LayoutTemplate,
} from "lucide-react"

interface TemplateItem {
  key: string
  name: string
  category: string
  built_in?: boolean
  premium?: boolean
  subject?: string
  from_key?: string
  html_body?: string
  saved?: boolean
}

interface Campaign {
  id: string
  name: string
  subject: string
  html_body: string
  audience: string
  status: string
  from_key?: string
  recipient_count?: number
  success_count?: number
  fail_count?: number
  created_at: string
  sent_at?: string
}

interface Log {
  id: string
  subject: string
  to_emails: string[]
  from_address: string
  status: string
  category: string
  error?: string
  created_at: string
}

const AUDIENCES = [
  { key: "all", label: "Everyone (volunteers + donors + partners + contacts)" },
  { key: "volunteers", label: "Volunteers" },
  { key: "donors", label: "Donors" },
  { key: "partner_requests", label: "Partners" },
  { key: "contact_messages", label: "Contact Subscribers" },
  { key: "admins", label: "Admin Team" },
  { key: "custom", label: "Custom email list (enter below)" },
]

const MAILBOXES = [
  { key: "general", label: "General" },
  { key: "hello", label: "Hello" },
  { key: "support", label: "Support" },
  { key: "finance", label: "Finance" },
  { key: "careers", label: "Careers" },
  { key: "media", label: "Media & Press" },
  { key: "donations", label: "Donations" },
  { key: "programs", label: "Programs" },
  { key: "partnerships", label: "Partnerships" },
  { key: "contact", label: "Contact" },
]

export default function EmailStudio() {
  const { toast } = useToast()
  const [tab, setTab] = useState("compose")

  // Compose state
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("") // inner body (no shell)
  const [fromKey, setFromKey] = useState("general")
  const [audience, setAudience] = useState("all")
  const [customEmails, setCustomEmails] = useState("")
  const [campaignName, setCampaignName] = useState("")
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [audienceTotal, setAudienceTotal] = useState<number | null>(null)
  const [audiencePreview, setAudiencePreview] = useState<string[]>([])

  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, cRes, lRes] = await Promise.all([
        fetch("/api/admin/emails/templates"),
        fetch("/api/admin/emails/campaigns"),
        fetch("/api/admin/emails/logs?limit=50"),
      ])
      const t = await tRes.json()
      const c = await cRes.json()
      const l = await lRes.json()
      if (tRes.ok && Array.isArray(t.data)) setTemplates(t.data)
      if (cRes.ok && Array.isArray(c.data)) setCampaigns(c.data)
      if (lRes.ok && Array.isArray(l.data)) setLogs(l.data)
    } catch (e) {
      console.error("Failed to load studio data", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const loadAudience = useCallback(async (key: string) => {
    if (key === "custom") {
      setAudienceTotal(null)
      setAudiencePreview([])
      return
    }
    try {
      const res = await fetch(`/api/admin/emails/audiences?audience=${key}`)
      const j = await res.json()
      if (res.ok) {
        setAudienceTotal(j.total ?? null)
        setAudiencePreview(j.preview?.map((p: { address: string }) => p.address) || [])
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadAudience(audience)
  }, [audience, loadAudience])
const loadTemplate = (tpl: TemplateItem) => {
    setSubject(tpl.subject || "")
    if (tpl.html_body) {
      setContent(tpl.html_body)
    } else {
      // Built-in template: use a starter body referencing the template.
      setContent(`<h2 style="color:#c2185b;font-family:Arial,sans-serif;">${tpl.name}</h2><p>Replace with your message…</p>`)
    }
    setFromKey(tpl.from_key || "general")
    setCampaignName(`Campaign — ${tpl.name}`)
    if (tpl.category === "Admin Alerts") setAudience("admins")
    setTab("compose")
    toast({ title: "Template loaded", description: tpl.name })
  }

  const saveDraft = async () => {
    if (!campaignName.trim()) {
      toast({ title: "Give the campaign a name first", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/emails/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCampaignId || undefined,
          name: campaignName,
          subject,
          html_body: content,
          audience,
          recipient_emails: audience === "custom" ? customEmails.split(",").map((e) => e.trim()).filter(Boolean) : [],
          from_key: fromKey,
          status: "draft",
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to save draft")
      toast({ title: "Draft saved" })
      await loadAll()
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const sendNow = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({ title: "Subject and body are required", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: editingCampaignId || undefined,
          subject,
          html: content,
          audience,
          custom: audience === "custom" ? customEmails.split(",").map((e) => e.trim()).filter(Boolean) : undefined,
          fromKey,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to send")
      toast({
        title: "Email sent",
        description: `Delivered to ${j.sent} recipient(s), ${j.failed} failed`,
      })
      await loadAll()
    } catch (e) {
      toast({ title: "Send failed", description: String(e), variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

    const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/admin/emails/campaigns?id=${id}`, { method: "DELETE" })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to delete")
      toast({ title: "Campaign deleted" })
      await loadAll()
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" })
    }
  }

    const startFromCampaign = (c: Campaign) => {
    setEditingCampaignId(c.id)
    setCampaignName(c.name)
    setSubject(c.subject)
    setContent(c.html_body)
    setAudience(c.audience)
    setFromKey(c.from_key || "general")
    setTab("compose")
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-pink-600" />
            Email Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Compose, template, send, and track emails to your community.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

                {/* COMPOSE */}
        <TabsContent value="compose" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingCampaignId ? "Edit Campaign" : "New Campaign"}
                {campaignName && !editingCampaignId ? ` — ${campaignName}` : ""}
              </CardTitle>
              <CardDescription>
                Body content is the inner HTML placed inside the shared email layout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Campaign name</Label>
                  <Input
                    placeholder="e.g. Monthly Newsletter"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>From mailbox</Label>
                  <select
                    className="w-full"
                    value={fromKey}
                    onChange={(e) => setFromKey(e.target.value)}
                  >
                    {MAILBOXES.map((m) => (
                      <option key={m.key} value={m.key} className="bg-muted">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Subject line</Label>
                  <Input
                    placeholder="What's this email about?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Audience</Label>
                  <select
                    className="w-full"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a.key} value={a.key}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Recipient count estimate</Label>
                  <div className="text-sm text-muted-foreground mt-2">
                    {audience === "custom" ? "Enter emails below" : audienceTotal !== null ? `${audienceTotal} recipients` : "—"}
                  </div>
                </div>
              </div>

              {audience === "custom" && (
                <div>
                  <Label>Custom email addresses (comma separated)</Label>
                  <Textarea
                    placeholder="a@example.com, b@example.com"
                    rows={3}
                    value={customEmails}
                    onChange={(e) => setCustomEmails(e.target.value)}
                  />
                </div>
              )}
                            <div>
                <div className="flex items-center justify-between">
                  <Label>Body (HTML)</Label>
                  <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)}>
                    <Eye className="h-4 w-4 mr-2" />
                    {preview ? "Hide preview" : "Live preview"}
                  </Button>
                </div>
                <Textarea
                  placeholder="<h1>Hi community</h1><p>…</p>"
                  rows={preview ? 6 : 14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                {preview && (
                  <div className="mt-3 border rounded-md p-3 bg-white text-black max-h-72 overflow-auto">
                    <iframe
                      title="email-preview"
                      className="w-full h-60 border-none"
                      srcDoc={`<html><body style="font-family:Arial,sans-serif;color:#222;padding:24px;">${content || "<p>(empty)</p>"}</body></html>`}
                    />
                  </div>
                )}
              </div>

              {audience !== "custom" && audiencePreview.length > 0 && (
                <div>
                  <Label>Sample recipients</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {audiencePreview.map((e, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <footer className="px-6 py-4 border-t flex items-center justify-between">
              <Button variant="outline" onClick={saveDraft} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving…" : editingCampaignId ? "Update draft" : "Save draft"}
              </Button>
              <Button onClick={sendNow} disabled={sending} className="bg-pink-600 hover:bg-pink-700">
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending…" : "Send now"}
              </Button>
            </footer>
          </Card>
        </TabsContent>

        {/* TEMPLATES */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-pink-600" />
                Templates
              </CardTitle>
              <CardDescription>
                Click "Load into composer" to fill the editor above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground">No templates found.</p>
                )}
                {templates.map((t) => (
                  <Card key={t.key} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <CardDescription>{t.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <Badge variant="outline" className="text-xs">
                        {t.from_key || "general"} mailbox
                      </Badge>
                      {t.subject && <p className="mt-2 text-sm line-clamp-2">Subject: {t.subject}</p>}
                    </CardContent>
                    <footer className="px-6 py-3 border-t">
                      <Button size="sm" className="w-full" onClick={() => loadTemplate(t)}>
                        Load into composer
                      </Button>
                    </footer>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
                {/* CAMPAIGNS */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved campaigns</CardTitle>
              <CardDescription>Drafts, scheduled, and sent campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No campaigns yet.</TableCell></TableRow>
                  )}
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="capitalize">{c.audience}</TableCell>
                      <TableCell>
                        <Badge
                          variant={c.status === "sent" ? "default" : "secondary"}
                          className={c.status === "sent" ? "bg-green-100 text-green-800" : ""}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => startFromCampaign(c)} title="Edit / reuse">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCampaign(c.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery log</CardTitle>
              <CardDescription>Recent send attempts and outcomes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No log entries yet.</TableCell></TableRow>
                  )}
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.subject}</TableCell>
                      <TableCell className="text-sm">
                        {Array.isArray(l.to_emails) ? `${l.to_emails.length} recipient(s)` : l.to_emails}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={l.status === "sent" ? "default" : "destructive"}
                          className={l.status === "sent" ? "bg-green-100 text-green-800" : ""}
                        >
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-red-600">{l.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}