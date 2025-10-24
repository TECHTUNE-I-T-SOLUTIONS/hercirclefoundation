import React from 'react'

export const metadata = {
  title: 'Admin - Auth',
}

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  // Keep the auth pages minimal — no admin sidebar or header/footer hiding.
  return <>{children}</>
}
