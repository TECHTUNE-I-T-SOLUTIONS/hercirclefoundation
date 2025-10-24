"use client"

import React from 'react'
import AdminCommentsClient from '@/components/admin-comments-client'

export default function AdminBlogCommentsPage() {
  return (
    <>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Comments (Admin)</h1>
          <AdminCommentsClient />
        </div>
      </div>
    </>
  )
}
