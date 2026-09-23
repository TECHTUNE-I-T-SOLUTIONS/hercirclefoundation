"use client"

import { useEffect, useState } from 'react'
// import { Header } from '@/components/header'
// import { Footer } from '@/components/footer'
import StoryCard from '@/components/story-card'
import { FileUploadInput } from '@/components/file-upload-input'

export default function StoriesPage() {
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ author_name: '', author_email: '', title: '', content: '', file_url: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/stories?limit=6')
      .then((r) => r.json())
      .then((j) => setStories(j.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        setMessage(j?.error || 'Submission failed')
        return
      }
      setForm({ author_name: '', author_email: '', title: '', content: '', file_url: '' })
      setMessage('Thanks — your story was submitted and will appear after admin approval.')
    } catch (e) {
      setMessage('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* <Header /> */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Stories</h1>
        <p className="text-muted-foreground mb-6">Read real stories from our community or share your own.</p>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="md:col-span-2">
            {loading ? (
              <div>Loading…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stories.map((s) => (
                  <StoryCard key={s.id} story={s} />
                ))}
              </div>
            )}
          </div>

          <aside>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-3">Share your story</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input placeholder="Your name (optional)" value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="input w-full p-1 rounded" />
                <input placeholder="Email (optional)" value={form.author_email} onChange={(e) => setForm({ ...form, author_email: e.target.value })} className="input w-full p-1 rounded" />
                <input placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input w-full p-1 rounded" />
                <textarea placeholder="Write your story" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="textarea w-full p-1 rounded" rows={6} />
                <FileUploadInput label="Attachment (optional)" bucket="stories" accept="image/*,application/pdf" onFileUrlChange={(url) => setForm({ ...form, file_url: url })} />
                <button disabled={submitting} className="btn bg-primary w-full p-1 rounded">{submitting ? 'Submitting...' : 'Submit story'}</button>
                {message && <div className="text-sm mt-2">{message}</div>}
              </form>
            </div>
          </aside>
        </section>
      </main>
      {/* <Footer /> */}
    </div>
  )
}
