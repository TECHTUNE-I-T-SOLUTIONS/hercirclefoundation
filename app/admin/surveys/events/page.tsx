"use client"

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow, format } from 'date-fns'

export default function AdminSurveyEventsPage(){
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/surveys/events')
      if (!res.ok) { toast({ title: 'Failed to load events' }); return }
      const json = await res.json()
      const rows = (json.data || []).map((ev:any)=>{
        // normalize created_at
        let createdAt = ev.created_at
        try { createdAt = new Date(ev.created_at).toISOString() } catch(e) {}
        // parse payload safely
        let payload = ev.payload
        try {
          if (typeof payload === 'string' && payload.length > 0) payload = JSON.parse(payload)
        } catch(e){ /* keep original */ }
        return { ...ev, created_at: createdAt, payload }
      })
      setEvents(rows)
    } catch (e) { toast({ title: 'Failed to load events', description: String(e) }) } finally { setLoading(false) }
  }, [toast])

  useEffect(()=>{ fetchEvents() }, [fetchEvents])

  const grouped = useMemo(()=> events.reduce((acc:any, ev:any)=>{
    acc[ev.event_type] = acc[ev.event_type] || 0
    acc[ev.event_type]++
    return acc
  }, {}), [events])

  const renderPayload = (payload:any) => {
    if (payload == null) return <span className="text-muted-foreground">—</span>
    if (typeof payload === 'string') return <pre className="text-sm whitespace-pre-wrap">{payload}</pre>
    // object
    if (payload.response_id) {
      return (
        <div className="flex items-center gap-2">
          <a className="text-primary underline" href={`/admin/surveys/responses/${payload.form_id || ''}/view/${payload.response_id}`}>Response {payload.response_id}</a>
          <button className="text-sm text-muted-foreground" onClick={()=>{ navigator.clipboard?.writeText(payload.response_id); toast({ title: 'Copied response id' }) }}>Copy</button>
        </div>
      )
    }
    // fallback: pretty JSON
    return <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Survey Events</h1>
        <div>
          <Button onClick={fetchEvents} disabled={loading}>{loading? 'Refreshing...' : 'Refresh'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Object.keys(grouped).length === 0 && <div className="p-4 border rounded col-span-3">No events yet</div>}
        {Object.keys(grouped).map(k=> (
          <div key={k} className="p-4 border rounded flex flex-col">
            <div className="text-sm text-muted-foreground capitalize">{k.replaceAll('_',' ')}</div>
            <div className="text-2xl font-semibold">{grouped[k]}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Recent events</h2>
        <div className="space-y-2">
          {events.slice(0,50).map(ev=> (
            <div key={ev.id} className="p-3 border rounded bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{ev.created_at ? `${format(new Date(ev.created_at), 'yyyy-MM-dd HH:mm:ss')} · ${formatDistanceToNow(new Date(ev.created_at))} ago` : 'unknown'}</div>
                  <div className="font-medium mt-1">{ev.event_type.replaceAll('_',' ')}</div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{ev.form_id ? `form: ${ev.form_id}` : ''}</div>
                </div>
              </div>

              <div className="mt-2 text-sm">
                {renderPayload(ev.payload)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
