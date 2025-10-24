import React from 'react'
import { AdminSidebarNew } from '@/components/admin-sidebar-new'

export const metadata = {
  title: 'Admin',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide the global header/footer rendered by the root layout so admin
          pages only show the admin header/sidebar. Using an inline style here
          keeps the change local and avoids touching the global layout logic. */}
      <style dangerouslySetInnerHTML={{ __html: '.site-header, .site-footer { display: none !important; }' }} />

      <AdminSidebarNew>{children}</AdminSidebarNew>
    </>
  )
}
