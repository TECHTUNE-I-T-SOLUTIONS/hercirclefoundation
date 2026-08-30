import React from 'react'
import Link from 'next/link'
import { createClient as createServerHelper } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export default async function ResponseListPage({ params }: Params) {
  const supabase = await createServerHelper()
  const { id } = await params

  // fetch form
  const { data: forms } = await supabase.from('survey_forms').select('id,title').eq('id', id).limit(1)
  const form = Array.isArray(forms) && forms.length > 0 ? forms[0] : null
  if (!form) return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Form not found</h1>
      <p className="text-sm text-muted-foreground">The requested survey form was not found.</p>
      <Link href="/admin/surveys" className="btn mt-4">Back</Link>
    </div>
  )

  // fetch responses (include answers array so we can show counts)
  const { data: responses } = await supabase
    .from('survey_responses')
    .select('id,created_at,metadata, survey_answers(id)')
    .eq('form_id', id)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Responses — {form.title}</h1>
          <p className="text-sm text-muted-foreground">Showing latest {responses?.length ?? 0} responses</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/surveys" className="btn">Back</Link>
          <Link href={`/api/admin/surveys/${id}/export.csv`} className="btn">Export CSV</Link>
        </div>
      </div>

      <div className="space-y-4">
        {(!responses || responses.length === 0) ? (
          <div className="text-muted-foreground">No responses yet.</div>
        ) : (
          <div className="grid gap-3">
            {responses.map((r:any) => (
              <div key={r.id} className="p-4 border rounded bg-white dark:bg-gray-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">Response {r.id}</div>
                    <div className="text-sm text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString() : ''} — {r.survey_answers ? r.survey_answers.length : 0} answer(s)</div>
                    {r.metadata && Object.keys(r.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <strong>Metadata:</strong>
                        <div className="mt-1 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">{JSON.stringify(r.metadata, null, 2)}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <Link href={`/admin/surveys/responses/${id}/view/${r.id}`} className="btn">View</Link>
                    <Link href={`/api/admin/surveys/${id}/export.csv?response_id=${r.id}`} className="btn">Export row</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
