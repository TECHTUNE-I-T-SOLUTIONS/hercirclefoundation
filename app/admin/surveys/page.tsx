// filepath: c:\Codes\her-circle\app\admin\surveys\page.tsx
// Explanation: Provide a proper default export Server Component for the admin surveys index page.
import Link from 'next/link'
import React from 'react'

export const dynamic = 'force-dynamic'

export default async function AdminSurveysIndex() {
  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Surveys (Admin)</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/surveys/forms" className="p-4 border rounded hover:shadow-sm">
          <h2 className="font-semibold">Forms</h2>
          <p className="text-sm text-muted-foreground">Create, edit and reorder survey forms and questions.</p>
        </Link>

        <Link href="/admin/surveys/events" className="p-4 border rounded hover:shadow-sm">
          <h2 className="font-semibold">Events</h2>
          <p className="text-sm text-muted-foreground">View survey events, submissions and realtime activity.</p>
        </Link>

        <Link href="/admin/surveys/analytics" className="p-4 border rounded hover:shadow-sm">
          <h2 className="font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Charts, funnels and export CSV options for survey performance.</p>
        </Link>

        <Link href="/admin/surveys/responses" className="p-4 border rounded hover:shadow-sm">
          <h2 className="font-semibold">Responses</h2>
          <p className="text-sm text-muted-foreground">Browse submitted survey responses and export CSV.</p>
        </Link>
      </div>
    </div>
  )
}

