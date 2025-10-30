import { NextResponse } from 'next/server'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const formId = url.searchParams.get('form_id')
    const range = url.searchParams.get('range') || '30' // days or 'all'
    if (!formId) return NextResponse.json({ error: 'missing form_id' }, { status: 400 })

    // auth: ensure requester is an admin
    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })
    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const supabase = await createServerHelper()

    // 1) total responses (use count via head:true)
    const { count, error: countErr } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId)

    if (countErr) return NextResponse.json({ error: countErr.message || String(countErr) }, { status: 500 })
    const total = count || 0

    // 2) timeseries: use range to limit rows fetched, aggregate by day on server
    let cutoff: string | undefined = undefined
    if (range !== 'all') {
      const days = parseInt(range, 10) || 30
      const d = new Date()
      d.setDate(d.getDate() - days)
      cutoff = d.toISOString()
    }

    // Use RPC for efficient timeseries if available
    let countsByDay: Record<string, number> = {}
    try {
      const daysParam = range === 'all' ? null : parseInt(range, 10)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('agg_survey_responses_timeseries', { p_form_id: formId, p_days: daysParam })
      if (rpcErr) throw rpcErr
      ;(rpcData || []).forEach((row: any) => {
        const day = row.day ? (new Date(row.day)).toISOString().slice(0,10) : String(row.day)
        countsByDay[day] = Number(row.cnt || 0)
      })
    } catch (e) {
      // RPC missing or failed — fallback to fetching rows and grouping in JS
      let respQuery = supabase.from('survey_responses').select('created_at').eq('form_id', formId).order('created_at', { ascending: true })
      if (cutoff) respQuery = respQuery.gte('created_at', cutoff)
      const { data: respRows, error: respErr } = await respQuery
      if (respErr) return NextResponse.json({ error: respErr.message || String(respErr) }, { status: 500 })
      ;(respRows || []).forEach((r: any) => {
        const d = r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : 'unknown'
        countsByDay[d] = (countsByDay[d] || 0) + 1
      })
    }

    // 3) question distributions: fetch questions and all answers, then compute counts server-side
    const { data: questions, error: qErr } = await supabase
      .from('survey_questions')
      .select('id, question_text, question_type, options')
      .eq('form_id', formId)
      .order('idx', { ascending: true })

    if (qErr) return NextResponse.json({ error: qErr.message || String(qErr) }, { status: 500 })

    const questionIds = (questions || []).map((q: any) => q.id)
    let answers: any[] = []
    if (questionIds.length > 0) {
      const { data: ansData, error: ansErr } = await supabase
        .from('survey_answers')
        .select('id, question_id, answer_text, answer_json')
        .in('question_id', questionIds)

      if (ansErr) return NextResponse.json({ error: ansErr.message || String(ansErr) }, { status: 500 })
      answers = ansData || []
    }

    const distributions: any[] = []
    for (const q of questions || []) {
      if (['radio', 'select', 'checkbox'].includes(q.question_type)) {
        // options may be stored as stringified JSON or JSON array
        let opts = q.options || []
        if (typeof opts === 'string') {
          try { opts = JSON.parse(opts) } catch { opts = [] }
        }
        const counts: Record<string, number> = {}
        const labelsMap: Record<string,string> = {}
        for (const opt of opts) {
          const val = opt.value === undefined || opt.value === null ? '__undefined__' : String(opt.value)
          counts[val] = 0
          labelsMap[val] = opt.label || val
        }
        // tally
        answers.forEach((a) => {
          if (a.question_id !== q.id) return
          const text = a.answer_text
          const j = a.answer_json
          // single or multiple
          if (text !== null && text !== undefined) {
            const key = (String(text) || '__undefined__')
            if (counts[key] !== undefined) counts[key] = (counts[key] || 0) + 1
            else counts[key] = (counts[key] || 0) + 1
          } else if (j !== null && j !== undefined) {
            try {
              const parsed = typeof j === 'string' ? JSON.parse(j) : j
              if (Array.isArray(parsed)) {
                parsed.forEach((item: any) => {
                  const key = item === null || item === undefined ? '__undefined__' : String(item)
                  if (counts[key] !== undefined) counts[key] = (counts[key] || 0) + 1
                  else counts[key] = (counts[key] || 0) + 1
                })
              } else {
                const key = String(parsed)
                if (counts[key] !== undefined) counts[key] = (counts[key] || 0) + 1
                else counts[key] = (counts[key] || 0) + 1
              }
            } catch (e) {
              const s = String(j)
              const key = s || '__undefined__'
              if (counts[key] !== undefined) counts[key] = (counts[key] || 0) + 1
              else counts[key] = (counts[key] || 0) + 1
            }
          }
        })
        // build options array with label + value
        const optionsOut = Object.keys(counts).map((k) => ({ value: k === '__undefined__' ? null : k, label: labelsMap[k] || (k === '__undefined__' ? 'Unknown' : k) }))
        distributions.push({ question_id: q.id, question_text: q.question_text, counts, options: optionsOut })
      }
    }

    // include export_url for convenience
    const exportUrl = `/api/admin/surveys/${formId}/export.csv`
    return NextResponse.json({ total, timeseries: countsByDay, distributions, exportUrl })
  } catch (err: any) {
    console.error('Analytics GET error', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
