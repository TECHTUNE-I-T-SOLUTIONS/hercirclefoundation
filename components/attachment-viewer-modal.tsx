"use client"

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

interface AttachmentViewerProps {
  isOpen: boolean
  url?: string | null
  onClose: () => void
}

export default function AttachmentViewerModal({ isOpen, url, onClose }: AttachmentViewerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null
  if (!url) return null

  const isImage = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)
  const isPdf = /\.pdf$/i.test(url)
  const isText = /\.(txt|md|csv)$/i.test(url)
  const isDocx = /\.(docx|doc|xlsx|xls|pptx|ppt)$/i.test(url)

  // For Office documents (docx, xlsx, pptx) use Microsoft's Office online viewer
  // It embeds the document in an iframe: https://view.officeapps.live.com/op/view.aspx?src=<URL>
  const officeViewerUrl = isDocx ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}` : null

  const content = isImage ? (
    <img src={url} alt="attachment" className="max-w-full max-h-[70vh] rounded" />
  ) : isPdf ? (
    <object data={url} type="application/pdf" width="100%" height="600">Your browser does not support PDFs. <a href={url}>Download</a></object>
  ) : isText ? (
    // plain text files: show in an iframe or pre; using iframe keeps origin handling simpler
    <iframe src={url} className="w-full h-[60vh] border rounded" title="text-attachment" />
  ) : officeViewerUrl ? (
    <iframe src={officeViewerUrl} className="w-full h-[80vh] border rounded" title="office-attachment" />
  ) : (
    <div className="p-4">
      <p className="mb-2">Can't preview this file type. You can download it:</p>
      <a href={url} download className="text-primary underline">Download attachment</a>
    </div>
  )

  const modal = (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-4xl w-full mx-4 p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Attachment</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground">✕</button>
        </div>
        <div className="flex justify-center">{content}</div>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}
