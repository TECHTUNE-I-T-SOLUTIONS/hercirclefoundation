"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AdminBlogList from '@/components/admin-blog-list'
import { Plus } from 'lucide-react'

export default function AdminBlogsPage() {
  const router = useRouter()

  return (
    <>
      <div className="p-6">
        <div className="max-w-auto mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Admin - Blogs</h1>
            <Button onClick={() => router.push('/admin/blogs/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Blog
            </Button>
          </div>

          <div className="bg-white dark:bg-transparent border rounded-lg shadow p-6">
            <AdminBlogList />
          </div>
        </div>
      </div>
    </>
  )
}
