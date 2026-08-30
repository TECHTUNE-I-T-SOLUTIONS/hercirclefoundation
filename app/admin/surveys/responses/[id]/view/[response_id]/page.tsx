import React from 'react'
import Link from 'next/link'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type Params = { params: Promise<{ id: string, response_id: string }> }

export default async function ResponseViewPage({ params }: Params) {
  const authClient = await createServerHelper()
  const { id, response_id } = await params

  const { data: { user }, error: userErr } = await authClient.auth.getUser()
  if (userErr || !user) return (
    <div className="p-6">Please sign in to view this page.</div>
  )

  const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
  if (!admins || admins.length === 0) return (
    <div className="p-6">Not authorized.</div>
  )

  // fetch response
  const { data: responses } = await serverClient.from('survey_responses').select('*').eq('id', response_id).limit(1)
  const response = Array.isArray(responses) && responses.length > 0 ? responses[0] : null
  if (!response) return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Response not found</h1>
      <Link href={`/admin/surveys/responses/${id}`} className="btn mt-4">Back</Link>
    </div>
  )

  // fetch answers
  const { data: answers } = await serverClient.from('survey_answers').select('id,question_id,answer_text,answer_json,created_at').eq('response_id', response_id).order('created_at', { ascending: true })
  const qids = (answers || []).map((a:any)=>a.question_id).filter(Boolean)
  let questions: any[] = []
  if (qids.length) {
    const { data: qdata } = await serverClient.from('survey_questions').select('id,question_text').in('id', qids)
    questions = qdata || []
  }

  const byQuestion: Record<string,string> = {}
  for (const q of questions) byQuestion[q.id] = q.question_text

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Response detail</h1>
          <div className="text-sm text-muted-foreground">Response ID: {response.id}</div>
          <div className="text-sm text-muted-foreground">Submitted: {response.created_at}</div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/surveys/responses/${id}`} className="btn">Back</Link>
          <Link href={`/api/admin/surveys/${id}/export.csv?response_id=${response_id}`} className="btn">Export row</Link>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Metadata</h2>
        <pre className="p-3 bg-gray-100 rounded">{JSON.stringify(response.metadata || {}, null, 2)}</pre>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Answers</h2>
        <div className="space-y-3">
          {(answers || []).map((a:any)=> (
            <div key={a.id} className="p-3 border rounded bg-white dark:bg-gray-900">
              <div className="font-medium">{byQuestion[a.question_id] || a.question_id}</div>
              <div className="text-sm mt-1">{a.answer_text ?? (a.answer_json ? JSON.stringify(a.answer_json) : '')}</div>
              <div className="text-xs text-muted-foreground mt-2">Answered at: {a.created_at}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

