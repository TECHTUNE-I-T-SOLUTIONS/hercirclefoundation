"use client"
import React, { useState } from 'react'
// Admin layout provides the sidebar/header. Do not wrap pages here.
import { useToast } from '@/hooks/use-toast'
import RichTextEditor from '@/components/rich-text-editor'
import AdminBlogList from '@/components/admin-blog-list'
import { FileUploadInput } from '@/components/file-upload-input'

export default function AdminBlogsPage() {
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', cover_image: '', status: 'draft', author_name: '' })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'POST',
        body: JSON.stringify(form),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'create failed')
      }
      const data = await res.json()
      // notify other admin pages and show a toast instead of alert()
      try {
        window.dispatchEvent(new CustomEvent('hc:blog-created', { detail: data?.data }))
      } catch (e) {
        // ignore if window events are not available for some reason
      }

      toast({ title: 'Blog created', description: `ID: ${data?.data?.id || 'ok'}` })
      setForm({ title: '', slug: '', excerpt: '', content: '', cover_image: '', status: 'draft', author_name: '' })
    } catch (err: any) {
      toast({ title: 'Error creating blog', description: String(err?.message || err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="p-6">
        <div className="max-w-auto mx-auto">
          <h1 className="text-2xl font-bold mb-4">Admin - Blogs</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-auto">
            {/* Form column */}
            <div className="lg:col-span-1 bg-white dark:bg-transparent rounded-lg shadow p-6 w-full border">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Title</label>
                    <input aria-label="Title" placeholder="Post title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1 input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Slug (optional)</label>
                    <input aria-label="Slug" placeholder="post-slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="mt-1 input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Author Name (optional)</label>
                    <input aria-label="Author Name" placeholder="Author name if different from admin" value={form.author_name} onChange={e => setForm({ ...form, author_name: e.target.value })} className="mt-1 input w-full" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium">Excerpt</label>
                  <textarea aria-label="Excerpt" placeholder="Short summary" value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} className="mt-1 textarea w-full" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <RichTextEditor value={form.content} onChange={(html) => setForm({ ...form, content: html })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FileUploadInput label="Cover image" bucket="media" onFileUrlChange={(url) => setForm({ ...form, cover_image: url })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Status</label>
                    <select aria-label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-1 select w-full">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div>
                  <button disabled={loading} className="btn bg-red-700 text-white dark:bg-gray-600 dark:text-white rounded-lg shadow p-6 hover:bg-red-900 hover:dark:bg-gray-700 w-full">
                    {loading ? 'Saving...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>

            {/* List column */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-transparent border rounded-lg shadow p-6">
                <AdminBlogList />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
