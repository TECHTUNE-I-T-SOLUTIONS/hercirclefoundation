import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { form_id, session_key, answers, metadata, opted_in } = body

    if (!form_id || !Array.isArray(answers)) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

    // Insert response + answers in a transaction-like flow
    // Supabase JS doesn't support explicit transactions for Postgres on server side easily here,
    // so we'll attempt best-effort and roll back partial inserts if needed.

    // create response row
    const { data: resp, error: respErr } = await supabase
      .from('survey_responses')
      .insert([{ form_id, metadata: metadata || null }])
      .select('id')
      .single()

    if (respErr || !resp) {
      console.error('Failed to create survey_response', respErr)
      return NextResponse.json({ error: respErr?.message || 'failed to create response' }, { status: 500 })
    }

    const responseId = resp.id

    // insert answers
    const answerRows = answers.map((a: any) => {
      const row: any = { response_id: responseId, question_id: a.question_id }
      if (typeof a.answer === 'string') row.answer_text = a.answer
      else row.answer_json = a.answer
      return row
    })

    const { error: ansErr } = await supabase.from('survey_answers').insert(answerRows)
    if (ansErr) {
      console.error('Failed to insert survey_answers', ansErr)
      // attempt to cleanup response
      await supabase.from('survey_responses').delete().eq('id', responseId)
      return NextResponse.json({ error: ansErr.message }, { status: 500 })
    }

    // upsert session row
    if (session_key) {
      try {
        await supabase.from('survey_sessions').upsert([
          { form_id, session_key, opted_in: !!opted_in, declined: false, last_shown_at: new Date().toISOString() }
        ], { onConflict: 'form_id,session_key' })
      } catch (e) { /* ignore */ }
    }

    // insert survey_events for analytics
    try {
      await supabase.from('survey_events').insert([{ event_type: 'response_submitted', form_id, session_key: session_key || null, payload: { response_id: responseId } }])
    } catch (e) {}

    return NextResponse.json({ data: { id: responseId } }, { status: 201 })
  } catch (err: any) {
    console.error('Survey POST error', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
