import React from 'react'
import { AdminSidebarNew } from '@/components/admin-sidebar-new'

export const metadata = {
  title: 'Admin',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSidebarNew>{children}</AdminSidebarNew>
    </>
  )
}
