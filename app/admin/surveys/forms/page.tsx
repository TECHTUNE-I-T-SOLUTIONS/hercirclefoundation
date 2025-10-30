"use client"

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

function emptyQuestion() {
  return {
    id: null,
    idx: 0,
    question_text: '',
    question_type: 'text',
    options: [],
    conditional: null,
  }
}

function DeleteConfirmModal({ open, onConfirm, onCancel, title }: { open: boolean, onConfirm: () => void, onCancel: () => void, title?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold">Confirm delete</h3>
        <p className="text-sm text-muted-foreground mt-2">Are you sure you want to delete {title || 'this item'}? This action cannot be undone.</p>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminSurveyFormsPage() {
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingForm, setEditingForm] = useState<any | null>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const dragIndexRef = useRef<number | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    // define fetch inside effect to satisfy lint rule
    const fetchForms = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/survey-forms')
        if (!res.ok) { toast({ title: 'Failed to load forms' }); return }
        const json = await res.json()
        setForms(json.data || [])
      } catch (e) { toast({ title: 'Failed to load forms', description: String(e) }) } finally { setLoading(false) }
    }
    fetchForms()
  }, [toast])

  const createForm = async () => {
    if (!newTitle.trim()) { toast({ title: 'Please provide a title' }); return }
    try {
      const res = await fetch('/api/admin/survey-forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, description: newDescription || '', is_active: true }) })
      if (!res.ok) { const j = await res.json().catch(() => null); toast({ title: 'Create failed', description: j?.error || 'failed' }); return }
      toast({ title: 'Created' })
      setNewTitle('')
      setNewDescription('')
      setShowCreateModal(false)
      // refresh list
      const r2 = await fetch('/api/admin/survey-forms')
      if (r2.ok) { const j = await r2.json(); setForms(j.data || []) }
    } catch (e) { toast({ title: 'Create failed', description: String(e) }) }
  }

  const selectForm = async (form: any) => {
    setEditingForm(form)
    setSelectedQuestionIndex(null)
    try {
      const res = await fetch(`/api/admin/survey-questions?form_id=${form.id}`)
      if (!res.ok) { toast({ title: 'Failed to load questions' }); return }
      const json = await res.json()
      const qs = (json.data || []).map((q:any)=>({
        ...q,
        // safe-parse: options may be JSON string (old) or already JSON object (jsonb)
        options: (typeof q.options === 'string' ? (()=>{ try { return JSON.parse(q.options) } catch { return [] } })() : (q.options || [])),
        conditional: (typeof q.conditional === 'string' ? (()=>{ try { return JSON.parse(q.conditional) } catch { return null } })() : (q.conditional || null)),
      }))
      // ensure sorting by idx
      qs.sort((a:any,b:any)=> (a.idx||0)-(b.idx||0))
      setQuestions(qs)

      // setup realtime subscription for this form's questions
      try {
        const channel = supabase.channel(`public:survey_questions:form=${form.id}`)
        // mark payload param unused as _payload
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'survey_questions', filter: `form_id=eq.${form.id}` }, _payload => {
          // simple strategy: re-fetch questions on any change
          (async ()=>{
            const r = await fetch(`/api/admin/survey-questions?form_id=${form.id}`)
            if (r.ok) {
              const j = await r.json()
              const qq = (j.data || []).map((q:any)=>({ ...q, options: (typeof q.options === 'string' ? (()=>{ try { return JSON.parse(q.options) } catch{return []}})() : (q.options||[])), conditional: (typeof q.conditional === 'string' ? (()=>{ try{return JSON.parse(q.conditional)}catch{return null}})() : (q.conditional||null)) }))
              qq.sort((a:any,b:any)=> (a.idx||0)-(b.idx||0))
              setQuestions(qq)
            }
          })()
        })
        channel.subscribe()
      } catch (e) { /* ignore realtime errors */ }

    } catch (e) { toast({ title: 'Failed to load questions', description: String(e) }) }
  }

  const addQuestion = () => {
    const q = emptyQuestion()
    q.idx = questions.length + 1
    setQuestions((s) => [...s, q])
    setSelectedQuestionIndex(questions.length)
  }

  const updateQuestion = (i:number, patch:any) => {
    setQuestions((s)=>{
      const copy = [...s]
      copy[i] = { ...copy[i], ...patch }
      return copy
    })
  }

  const removeQuestion = (i:number) => {
    const q = questions[i]
    if (q?.id) {
      // show confirmation
      setDeleteIndex(i)
      setShowDeleteModal(true)
      return
    }
    const copy = questions.filter((_,idx)=> idx!==i).map((qq, idx)=> ({...qq, idx: idx+1}))
    setQuestions(copy)
    setSelectedQuestionIndex(null)
  }

  const confirmDelete = async () => {
    if (deleteIndex == null) return
    const q = questions[deleteIndex]
    if (q?.id) {
      const res = await fetch('/api/admin/survey-questions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: q.id }) })
      if (!res.ok) toast({ title: 'Delete failed' })
    }
    const copy = questions.filter((_,idx)=> idx!==deleteIndex).map((qq, idx)=> ({...qq, idx: idx+1}))
    setQuestions(copy)
    setSelectedQuestionIndex(null)
    setShowDeleteModal(false)
    setDeleteIndex(null)
  }

  // Drag and drop handlers
  const onDragStart = (e: React.DragEvent, i:number) => { dragIndexRef.current = i; e.dataTransfer.effectAllowed = 'move' }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const onDrop = (e: React.DragEvent, i:number) => {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from == null) return
    const copy = [...questions]
    const [moved] = copy.splice(from, 1)
    copy.splice(i, 0, moved)
    setQuestions(copy.map((q, idx)=> ({ ...q, idx: idx+1 })))
    dragIndexRef.current = null
    setSelectedQuestionIndex(i)
  }

  // Live preview renderer
  function QuestionPreview({ q }: { q: any | null }) {
    if (!q) return <div className="text-muted-foreground">Select a question to preview</div>
    return (
      <div className="p-3 border rounded bg-surface">
        <div className="font-medium mb-2">Preview</div>
        <div className="mb-2">{q.question_text}</div>
        {q.question_type === 'textarea' ? <Textarea value="" readOnly /> : q.question_type === 'number' ? <Input type="number" readOnly /> : q.question_type === 'radio' && q.options ? (
          q.options.map((opt:any)=> (
            <div key={opt.value} className="flex items-center gap-2"><input type="radio" disabled /> <span>{opt.label}</span></div>
          ))
        ) : q.question_type === 'checkbox' && q.options ? (
          q.options.map((opt:any)=> (
            <div key={opt.value} className="flex items-center gap-2"><input type="checkbox" disabled /> <span>{opt.label}</span></div>
          ))
        ) : <Input readOnly />}
      </div>
    )
  }

  const moveUp = (i:number) => {
    if (i === 0) return
    const copy = [...questions]
    const temp = copy[i-1]
    copy[i-1] = copy[i]
    copy[i] = temp
    setQuestions(copy.map((q, idx) => ({ ...q, idx: idx + 1 })))
    setSelectedQuestionIndex(i - 1)
  }

  const moveDown = (i:number) => {
    if (i === questions.length - 1) return
    const copy = [...questions]
    const temp = copy[i+1]
    copy[i+1] = copy[i]
    copy[i] = temp
    setQuestions(copy.map((q, idx) => ({ ...q, idx: idx + 1 })))
    setSelectedQuestionIndex(i + 1)
  }

  const saveAll = async () => {
    if (!editingForm) return
    try {
      for (let i = 0; i < questions.length; i++) {
        if (!questions[i].question_text || !questions[i].question_text.trim()) { toast({ title: 'Each question must have text' }); return }
        const q = { ...questions[i], form_id: editingForm.id, idx: i + 1 }
        const payload: any = {
          id: q.id,
          form_id: q.form_id,
          idx: q.idx,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          conditional: q.conditional,
        }
        if (q.id) {
          await fetch('/api/admin/survey-questions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        } else {
          await fetch('/api/admin/survey-questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        }
      }
      toast({ title: 'Saved' })
      // refresh forms list and return to list view
      try {
        const r = await fetch('/api/admin/survey-forms')
        if (r.ok) {
          const j = await r.json()
          setForms(j.data || [])
        }
      } catch (e) {
        // ignore refresh error
      }
      setEditingForm(null)
      setSelectedQuestionIndex(null)
    } catch (e) {
      toast({ title: 'Save failed', description: String(e) })
    }
  }

  const exportForm = (formId: string) => {
    // simply open the streaming export in a new tab
    const url = `/api/admin/surveys/export?form_id=${formId}`
    window.open(url, '_blank')
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Survey Forms</h1>
        <div className="flex items-center gap-2">
          <Button onClick={()=>setShowCreateModal(true)}>Create Form</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div>
          <div className="space-y-2">
            {forms.map(f => (
              <div key={f.id} className="p-3 border rounded flex items-center justify-between">
                <div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-sm text-muted-foreground">{f.description}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={()=>selectForm(f)}>Edit</Button>
                  <Button variant="outline" onClick={()=>exportForm(f.id)}>Export</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {editingForm ? (
            <div className="p-3 border rounded">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold mb-1">Editing: {editingForm.title}</h2>
                  <div className="text-sm text-muted-foreground">Manage questions below. Use Save to persist changes.</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addQuestion}>Add question</Button>
                  <Button onClick={saveAll}>Save all</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-2">
                  <div className="font-medium">Question list</div>
                  {questions.length===0 && <div className="text-muted-foreground">No questions yet</div>}
                  <div className="space-y-2">
                    {questions.map((q, i)=> (
                      <div key={i} draggable onDragStart={(e)=>onDragStart(e,i)} onDragOver={onDragOver} onDrop={(e)=>onDrop(e,i)} className={`p-2 border rounded cursor-pointer ${selectedQuestionIndex===i? 'bg-gray-100 dark:bg-gray-800':''}`} onClick={()=>setSelectedQuestionIndex(i)}>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium truncate">{q.question_text || 'Untitled question'}</div>
                          <div className="flex gap-1">
                            <button aria-label="Move up" onClick={(e)=>{e.stopPropagation(); moveUp(i)}} className="px-2">↑</button>
                            <button aria-label="Move down" onClick={(e)=>{e.stopPropagation(); moveDown(i)}} className="px-2">↓</button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{q.question_type}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div>
                    {selectedQuestionIndex===null ? (
                      <div className="text-muted-foreground">Select a question to edit or click Add question.</div>
                    ) : (
                      <div className="p-3 border rounded">
                        <div className="mb-2 text-sm text-muted-foreground">Edit question</div>
                        <div className="grid grid-cols-1 gap-2">
                          <Input value={questions[selectedQuestionIndex].question_text} onChange={(e:any)=> updateQuestion(selectedQuestionIndex, { question_text: e.target.value })} placeholder="Question text" />

                          <label className="text-sm">Type</label>
                          <select value={questions[selectedQuestionIndex].question_type} onChange={(e:any)=> updateQuestion(selectedQuestionIndex, { question_type: e.target.value })} className="w-full p-2 border rounded">
                            <option value="text">Text</option>
                            <option value="textarea">Textarea</option>
                            <option value="number">Number</option>
                            <option value="radio">Radio</option>
                            <option value="checkbox">Checkbox</option>
                          </select>

                          <div>
                            <label className="text-sm">Options (for radio/checkbox) — add one per line</label>
                            <Textarea value={(questions[selectedQuestionIndex].options || []).map((o:any)=> o.label || o.value).join('\n')} onChange={(e:any)=>{
                              const lines = e.target.value.split('\n').map((l:any)=> l.trim()).filter(Boolean)
                              const opts = lines.map((l:any)=> ({ value: l.toLowerCase().replace(/[^a-z0-9]+/g,'_'), label: l }))
                              updateQuestion(selectedQuestionIndex, { options: opts })
                            }} className="h-40" />
                          </div>

                          <div>
                            <label className="text-sm">Conditional (show this question only if another question has a specific value)</label>
                            <div className="flex gap-2 items-center">
                              <select value={questions[selectedQuestionIndex].conditional?.depends_on || ''} onChange={(e:any)=> updateQuestion(selectedQuestionIndex, { conditional: e.target.value ? { depends_on: e.target.value, value: questions[selectedQuestionIndex].conditional?.value || '' } : null })} className="p-2 border rounded">
                                <option value="">No condition</option>
                                {questions.map((qq:any, idx:number)=> (
                                  <option key={idx} value={qq.id || `new_${idx}`}>{qq.question_text || `Question ${idx+1}`}</option>
                                ))}
                              </select>
                              <Input placeholder="Value to match" value={questions[selectedQuestionIndex].conditional?.value || ''} onChange={(e:any)=> updateQuestion(selectedQuestionIndex, { conditional: questions[selectedQuestionIndex].conditional ? { ...questions[selectedQuestionIndex].conditional, value: e.target.value } : { depends_on: '', value: e.target.value } })} />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <Button variant="destructive" onClick={()=> removeQuestion(selectedQuestionIndex)}>Delete</Button>
                            <Button onClick={()=> { setSelectedQuestionIndex(null); toast({ title: 'Changes staged — click Save all to persist' }) }}>Done</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <QuestionPreview q={selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : null} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 border rounded text-muted-foreground">Select a form to edit its questions</div>
          )}
        </div>
      </div>

      {/* Create Form modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setShowCreateModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Create Survey Form</h3>
            <Input placeholder="Title" value={newTitle} onChange={(e:any)=>setNewTitle(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={newDescription} onChange={(e:any)=>setNewDescription(e.target.value)} className="mt-2" />
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={()=>setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={createForm}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteConfirmModal open={showDeleteModal} onConfirm={confirmDelete} onCancel={() => { setShowDeleteModal(false); setDeleteIndex(null) }} title={questions[deleteIndex || 0]?.question_text} />
      )}
    </div>
  )
}
