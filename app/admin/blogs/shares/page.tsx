"use client"

import React from 'react'
import AdminSharesClient from '@/components/admin-shares-client'

export default function AdminBlogSharesPage() {
  return (
    <>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Shares (Admin)</h1>
          <AdminSharesClient />
        </div>
      </div>
    </>
  )
}
