import React from "react"
import Link from "next/link"
import { createClient } from '@/lib/supabase/server'

type SurveyForm = {
  id: string
  title: string
  description?: string | null
}

async function getSurveyForms(): Promise<SurveyForm[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("survey_forms").select("id,title,description").order("created_at", { ascending: false })
  if (error) {
    console.error("Error fetching survey forms:", error)
    return []
  }
  return (data as any) || []
}

export default async function ResponsesPage() {
  const forms = await getSurveyForms()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Survey Responses</h1>
        <Link href="/admin/surveys" className="btn">Back to surveys</Link>
      </div>

      {forms.length === 0 ? (
        <div className="text-muted">No survey forms found.</div>
      ) : (
        <div className="space-y-4">
          {forms.map((f) => (
            <div key={f.id} className="border rounded-md p-4 bg-white dark:bg-black">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{f.title}</h2>
                  {f.description ? <p className="text-sm text-black dark:text-white">{f.description}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/surveys/responses/${f.id}`} className="btn btn-primary">View</Link>
                  <Link href={`/api/admin/surveys/${f.id}/export.csv`} className="btn">Export CSV</Link>
                  <Link href={`/admin/surveys/analytics/${f.id}`} className="btn">Analytics</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
