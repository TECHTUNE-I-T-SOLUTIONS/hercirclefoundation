import { NextResponse } from "next/server"
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // `params` can sometimes be a Promise in some Next.js contexts — unwrap safely
  const resolvedParams = await Promise.resolve(params as any)
  const { id } = resolvedParams
  const supabase = await createClient()

  // allow optional filtering by response_id via query param
  const url = new URL(req.url)
  const responseId = url.searchParams.get('response_id') || undefined

  // Fetch responses with joined answers (survey_answers)
  // select actual response columns present in the schema
  let query = supabase
    .from("survey_responses")
    .select(`id, created_at, user_id, ip_address, user_agent, metadata, survey_answers(id, question_id, answer_text, answer_json)`)
    .order("created_at", { ascending: true })

  if (responseId) {
    query = query.eq('id', responseId)
  } else {
    query = query.eq('form_id', id)
  }

  const { data, error } = await query

  if (error) {
    console.error("Export CSV error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type RespRow = {
    id: string
    user_id?: string | null
    ip_address?: string | null
    user_agent?: string | null
    metadata?: any
    created_at?: string | null
    survey_answers?: { id: string; question_id: string; answer_text?: string | null; answer_json?: any }[]
  }

  // Build CSV: flatten answers into JSON string per response
  const headers = ["response_id", "user_id", "ip_address", "user_agent", "created_at", "answers_json"]

  const rows = (data || []).map((r: RespRow) => {
    const answersArr = (r.survey_answers || []).map((a) => {
      const body = (a.answer_text !== null && a.answer_text !== undefined) ? a.answer_text : a.answer_json
      return { question_id: a.question_id, body }
    })

    const answersJson = JSON.stringify(answersArr)
    const escaped = answersJson.replace(/"/g, '""')
    return [r.id, r.user_id ?? "", r.ip_address ?? "", (r.user_agent ?? "").replace(/\r?\n/g, ' '), r.created_at ?? "", `"${escaped}"`]
  })

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="survey_${id}_responses.csv"`,
    },
  })
}
