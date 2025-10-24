"use client"

import React from 'react'
import AdminReactionsClient from '@/components/admin-reactions-client'

export default function AdminBlogReactionsPage() {
  return (
    <>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Reactions (Admin)</h1>
          <AdminReactionsClient />
        </div>
      </div>
    </>
  )
}
