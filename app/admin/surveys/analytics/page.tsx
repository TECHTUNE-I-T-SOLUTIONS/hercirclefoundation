// filepath: c:\Codes\her-circle\app\admin\surveys\analytics\page.tsx
import React from 'react'
import AdminSurveyAnalyticsClient from '@/components/admin-survey-analytics'
import { createClient as createServerHelper } from '@/lib/supabase/server'

export default async function AdminSurveysAnalytics({ searchParams }: { searchParams?: { form_id?: string } }) {
  const supabase = await createServerHelper()
  const { data: forms } = await supabase.from('survey_forms').select('id,title').order('created_at', { ascending: false })
  const selectedForm = searchParams?.form_id || (forms && forms[0] ? forms[0].id : '')

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Survey Analytics</h1>
      <p className="text-muted-foreground">Visual analytics and export tools for survey responses.</p>

      <div className="mt-4 mb-6">
        <label className="block text-sm font-medium mb-2">Select form</label>
        <form action="" method="get">
          <select name="form_id" defaultValue={selectedForm} className="border rounded-md p-2">
            {forms?.map((f: any) => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
          <button type="submit" className="ml-2 px-3 py-2 bg-primary text-white rounded-md">Load</button>
        </form>
      </div>

      {/* client charts */}
      <div>
        <AdminSurveyAnalyticsClient formId={selectedForm} />
      </div>
    </div>
  )
}
