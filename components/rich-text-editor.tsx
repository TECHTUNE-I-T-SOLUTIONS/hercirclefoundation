"use client"
import React, { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)

  // initialize editor content once on mount
  useEffect(() => {
    if (ref.current && value !== undefined && (ref.current.innerHTML === '' || ref.current.innerHTML !== value)) {
      ref.current.innerHTML = value || ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // sync external value changes only when editor is not focused to avoid caret jumps
  useEffect(() => {
    if (!ref.current) return
    try {
      if (document.activeElement === ref.current) return // user is editing — don't overwrite
    } catch (e) {
      // ignore
    }
    if (ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || ''
    }
  }, [value])

  const exec = (cmd: string, val?: string) => {
    if (cmd === 'insertUnorderedList') {
      toggleList()
      return
    }
    document.execCommand(cmd, false, val)
    onChange(ref.current?.innerHTML || '')
  }

  const toggleList = () => {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)

    // If selection is inside an existing UL, unwrap it
    const startContainer = range.startContainer as Node
    const ulAncestor = findAncestor(startContainer, 'UL') as HTMLElement | null
    if (ulAncestor) {
      // Replace UL with its LI children content separated by paragraphs
      const fragment = document.createDocumentFragment()
      Array.from(ulAncestor.children).forEach((li) => {
        const p = document.createElement('p')
        p.innerHTML = (li as HTMLElement).innerHTML
        fragment.appendChild(p)
      })
      ulAncestor.replaceWith(fragment)
      onChange(ref.current?.innerHTML || '')
      return
    }

    // Otherwise, wrap the selection in a UL>LI
    try {
      const docFrag = range.cloneContents()
      const ul = document.createElement('ul')
      const li = document.createElement('li')

      // If nothing selected (caret only), insert an empty li
      if (docFrag.childNodes.length === 0) {
        li.appendChild(document.createElement('br'))
        ul.appendChild(li)
        range.insertNode(ul)
        // place caret inside the new li
        const newRange = document.createRange()
        newRange.setStart(li, 0)
        newRange.collapse(true)
        sel.removeAllRanges()
        sel.addRange(newRange)
      } else {
        li.appendChild(docFrag)
        ul.appendChild(li)
        range.deleteContents()
        range.insertNode(ul)
        // restore selection to inside the ul
        sel.removeAllRanges()
        const newRange = document.createRange()
        newRange.selectNodeContents(li)
        newRange.collapse(false)
        sel.addRange(newRange)
      }
      onChange(ref.current?.innerHTML || '')
    } catch (e) {
      // fallback to execCommand for broad compatibility
      document.execCommand('insertUnorderedList', false)
      onChange(ref.current?.innerHTML || '')
    }
  }

  const findAncestor = (node: Node | null, tagName: string): HTMLElement | null => {
    let cur: Node | null = node
    while (cur && cur !== ref.current) {
      if ((cur as HTMLElement).tagName === tagName) return cur as HTMLElement
      cur = cur.parentNode
    }
    return null
  }

  const handleInput = () => {
    onChange(ref.current?.innerHTML || '')
  }

  const handleImage = async (file?: File) => {
    try {
      const f = file || (await pickFile())
      if (!f) return

      // upload using admin upload endpoint; include bearer token from session
      const supabase = createClient()
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token

      const form = new FormData()
      form.append('file', f)
      form.append('bucket', 'media')
      form.append('filename', `${Date.now()}-${f.name}`)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'upload failed')

      // insert image at caret wrapped in a resizable container
      const img = document.createElement('img')
      img.src = body.publicUrl
      img.alt = f.name
      img.style.width = '100%'
      img.style.height = 'auto'

      // Resizable wrapper (use inline styles so editor works without extra CSS files)
      const wrapper = document.createElement('div')
      wrapper.contentEditable = 'false'
      wrapper.className = 'resizable-image'
      wrapper.style.display = 'inline-block'
      wrapper.style.resize = 'both'
      wrapper.style.overflow = 'auto'
      wrapper.style.maxWidth = '100%'
      wrapper.style.border = '1px dashed transparent'
      wrapper.style.verticalAlign = 'middle'
      wrapper.appendChild(img)

      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) {
        ref.current?.appendChild(wrapper)
      } else {
        const range = sel.getRangeAt(0)
        range.deleteContents()
        range.insertNode(wrapper)
        range.collapse(false)
      }
      onChange(ref.current?.innerHTML || '')
    } catch (e) {
      console.error('Image upload failed', e)
      alert('Image upload failed')
    }
  }

  const pickFile = (): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = () => {
        const file = input.files?.[0] || null
        resolve(file)
      }
      input.click()
    })
  }

  return (
    <div className="rich-editor">
      <div className="toolbar mb-2 flex gap-2">
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}>Bold</Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}>Italic</Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')}>List</Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => handleImage()}>Image</Button>
      </div>
      <div
        ref={ref}
        onInput={handleInput}
        contentEditable
        suppressContentEditableWarning
        className="prose min-h-[200px] p-3 border rounded focus:outline-none focus:ring"
        style={{ direction: 'ltr', textAlign: 'left' }}
      />
    </div>
  )
}
