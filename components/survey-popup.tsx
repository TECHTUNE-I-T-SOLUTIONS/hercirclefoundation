"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { createClient } from '@/lib/supabase/client'

function safeParseJsonField(val: any) {
  if (!val) return null
  if (typeof val === 'object') return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return null }
  }
  return null
}

function evaluateCondition(cond: any, answers: Record<string, any>) {
  if (!cond) return true
  // cond: { depends_on: question_id, value: 'x' }
  try {
    const val = answers[cond.depends_on]
    if (Array.isArray(val)) return val.includes(cond.value)
    return val === cond.value
  } catch { return true }
}

export default function SurveyPopup() {
  const [visible, setVisible] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const modalOpenRef = useRef(modalOpen)
  const [loading, setLoading] = useState(false)
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [form, setForm] = useState<any | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [index, setIndex] = useState(0)
  const [orderedQs, setOrderedQs] = useState<any[]>([])
  const orderedQsLenRef = useRef(0)
  const mounted = useRef(false)
  const modalRef = useRef<HTMLDivElement | null>(null)

  // keep refs in sync with state so keyboard effect can use stable deps
  useEffect(() => { modalOpenRef.current = modalOpen }, [modalOpen])
  useEffect(() => { orderedQsLenRef.current = orderedQs.length }, [orderedQs])

  useEffect(() => {
    mounted.current = true
    let key = localStorage.getItem('survey_session_key')
    if (!key) {
      key = 'sess_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem('survey_session_key', key)
    }
    setSessionKey(key)

    const declined = localStorage.getItem('survey_declined')
    if (declined === 'true') return

    const seen = localStorage.getItem('survey_seen')
    const showDelay = seen ? 180000 : 3000
    const t = setTimeout(async () => {
      // ensure there's an active form before showing
      try {
        const supabase = createClient()
        const res = await supabase.from('survey_forms').select('id').eq('is_active', true).limit(1)
        const data = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null
        if (data && mounted.current) {
          setVisible(true)
          localStorage.setItem('survey_seen', 'true')
          // analytics: record that we showed the prompt
          fetch('/api/admin/surveys/record-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'shown', session_key: key, form_id: data.id || null }) }).catch(() => {})
        }
      } catch (e) { console.error('Survey form check failed', e) }
    }, showDelay)

    return () => { mounted.current = false; clearTimeout(t) }
  }, [])

  const openModal = async () => {
    setModalOpen(true)
    // analytics: record started
    try { await fetch('/api/admin/surveys/record-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'started', session_key: sessionKey, form_id: form?.id || null }) }) } catch(e) {}
    try {
      const supabase = createClient()
      const { data: formData } = await supabase.from('survey_forms').select('*').eq('is_active', true).limit(1).single()
      if (formData) {
        const { data: qs } = await supabase.from('survey_questions').select('*').eq('form_id', formData.id).order('idx', { ascending: true })
        const questions = (qs || []).map((q: any) => ({ ...q, options: safeParseJsonField(q.options) || [], conditional: safeParseJsonField(q.conditional) || null }))
        setForm({ ...formData, questions })
        setOrderedQs(questions.filter((q: any) => evaluateCondition(q.conditional, {})))
        setIndex(0)
      } else {
        setForm(null)
      }
    } catch (e) { console.error('Failed to load survey form', e) }
  }

  // navigation + keyboard - use stable dependency array and refs inside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!modalOpenRef.current) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        setIndex((i) => Math.min(i + 1, Math.max(0, orderedQsLenRef.current - 1)))
      }
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const next = useCallback(() => {
    if (!orderedQs || orderedQs.length === 0) return
    if (index < orderedQs.length - 1) setIndex((i) => i + 1)
  }, [orderedQs, index])
  const prev = useCallback(() => { if (index > 0) setIndex((i) => i - 1) }, [index])

  const handleChange = (qid: string, value: any) => {
    setAnswers((s) => ({ ...s, [qid]: value }))
    // recompute ordering based on conditional branching
    if (!form) return
    const allQs = form.questions
    const visibleQs = allQs.filter((q: any) => evaluateCondition(q.conditional, { ...answers, [qid]: value }))
    setOrderedQs(visibleQs)
  }

  const handleSubmit = async () => {
    if (!form) return
    setLoading(true)
    try {
      const payload = {
        form_id: form.id,
        session_key: sessionKey,
        answers: Object.keys(answers).map((k) => ({ question_id: k, answer: answers[k] })),
        metadata: { referrer: document.referrer, page: window.location.pathname },
        opted_in: true
      }
      const res = await fetch('/api/surveys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        console.error('Submit failed', await res.text())
        return
      }
      localStorage.setItem('survey_completed', 'true')
      setModalOpen(false)
      setVisible(false)
      // analytics ping
      await fetch('/api/admin/surveys/record-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'completed', form_id: form.id, session_key: sessionKey }) }).catch(() => {})
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  // focus trap and body scroll lock when modalOpen
  useEffect(() => {
    if (modalOpen) {
      const el = modalRef.current
      // lock scroll
      try { document.body.style.overflow = 'hidden' } catch {}
      // focus first focusable
      setTimeout(() => {
        try {
          const focusable = el?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")
          if (focusable && focusable.length) focusable[0].focus()
        } catch (e) {}
      }, 50)

      const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return
        try {
          const focusable = Array.from(el?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") || [])
          if (focusable.length === 0) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus() }
          } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus() }
          }
        } catch (err) {}
      }
      document.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('keydown', onKey)
        try { document.body.style.overflow = '' } catch {}
      }
    }
  }, [modalOpen])

  if (!visible && !modalOpen) return null

  const current = orderedQs[index]
  const progress = orderedQs.length ? Math.round(((index + 1) / orderedQs.length) * 100) : 0

  return (
    <>
      {visible && !modalOpen && (
        <div className="fixed right-4 bottom-6 z-50 max-w-sm w-full sm:w-80 bg-white dark:bg-gray-900 border shadow-lg rounded-lg p-3 break-words">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <img src="/logo.png" alt="survey" className="h-10 w-10 rounded" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Share your thoughts on menstrual health?</div>
              <div className="text-sm text-muted-foreground max-h-16 overflow-auto">A quick, private 10-question interview that adapts to your answers. Help us improve services.</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={openModal} className="bg-primary">Take the survey</Button>
                <Button variant="outline" onClick={() => { localStorage.setItem('survey_seen', 'true'); setVisible(false) }}>Maybe later</Button>
                <Button variant="ghost" onClick={() => { localStorage.setItem('survey_declined', 'true'); setVisible(false) }}>No thanks</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={form?.title || 'Survey dialog'}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full p-4 sm:p-6 overflow-auto max-h-[90vh] md:max-h-[80vh]" tabIndex={-1} ref={modalRef}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{form?.title || 'Survey'}</h2>
                <p className="text-sm text-muted-foreground">{form?.description}</p>
              </div>
              <div>
                <button onClick={() => setModalOpen(false)} className="text-sm text-muted-foreground">Close</button>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded overflow-hidden">
                <div className="h-2 bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="mt-4">
              {current ? (
                <div className="space-y-3">
                  <div className="font-medium">{current.question_text}</div>
                  {current.question_type === 'textarea' ? (
                    <Textarea value={answers[current.id] || ''} onChange={(e: any) => handleChange(current.id, e.target.value)} />
                  ) : current.question_type === 'number' ? (
                    <Input type="number" value={answers[current.id] || ''} onChange={(e: any) => handleChange(current.id, e.target.value)} />
                  ) : current.question_type === 'radio' && current.options ? (
                    current.options.map((opt: any) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <input type="radio" name={`q_${current.id}`} onChange={() => handleChange(current.id, opt.value)} checked={answers[current.id] === opt.value} />
                        <span>{opt.label || opt.value}</span>
                      </div>
                    ))
                  ) : current.question_type === 'checkbox' && current.options ? (
                    current.options.map((opt: any) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <input type="checkbox" name={`q_${current.id}`} onChange={(e) => {
                          const prev = answers[current.id] || []
                          if (e.target.checked) handleChange(current.id, [...prev, opt.value])
                          else handleChange(current.id, prev.filter((v: any) => v !== opt.value))
                        }} checked={(answers[current.id] || []).includes(opt.value)} />
                        <span>{opt.label || opt.value}</span>
                      </div>
                    ))
                  ) : (
                    <Input value={answers[current.id] || ''} onChange={(e: any) => handleChange(current.id, e.target.value)} />
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">Question {index + 1} of {orderedQs.length}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={prev} disabled={index === 0}>Back</Button>
                      {index < orderedQs.length - 1 ? (
                        <Button onClick={next}>Next</Button>
                      ) : (
                        <Button className="bg-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">No questions available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
