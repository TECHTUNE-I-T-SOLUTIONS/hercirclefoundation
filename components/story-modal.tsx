"use client"

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { FileUploadInput } from './file-upload-input'
import { useToast } from '@/hooks/use-toast'

interface StoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function StoryModal({ isOpen, onClose, onSaved }: StoryModalProps) {
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({ title: '', author_name: '', content: '', theme: '', status: 'pending', file_url: '' })

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) setForm({ title: '', author_name: '', content: '', theme: '', status: 'pending', file_url: '' })
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        toast({ title: 'Save failed', description: j?.error || 'Create failed' })
        setSaving(false)
        return
      }
      toast({ title: 'Saved', description: 'Story created' })
      onSaved && onSaved()
      onClose()
    } catch (err) {
      toast({ title: 'Save failed', description: String(err) })
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-3xl w-full mx-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Story</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Title" value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Author name" value={form.author_name} onChange={(e: any) => setForm({ ...form, author_name: e.target.value })} />
          <textarea placeholder="Content / body" value={form.content} onChange={(e: any) => setForm({ ...form, content: e.target.value })} className="textarea w-full" rows={8} />
          <Input placeholder="Theme (optional)" value={form.theme} onChange={(e: any) => setForm({ ...form, theme: e.target.value })} />

          <div className="flex gap-2 items-center">
            <select value={form.status} onChange={(e:any) => setForm({ ...form, status: e.target.value })} className="input">
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
            <Button type="submit" className="bg-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          </div>

          <div>
            <FileUploadInput label="Attachment (optional)" bucket="stories" accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*,application/msword,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onFileUrlChange={(url) => setForm({ ...form, file_url: url })} />
            {form.file_url && <div className="mt-2 text-sm text-muted-foreground">Attached: <a href={form.file_url} target="_blank" rel="noreferrer" className="text-primary underline">Open</a></div>}
          </div>
        </form>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}

