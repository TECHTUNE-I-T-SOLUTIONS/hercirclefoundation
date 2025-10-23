"use client"

import { useEffect, useState } from "react"

export default function HelpModal() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const pages = [
    {
      title: 'Chrome / Edge',
      steps: [
        'Click the lock icon in the address bar.',
        'Click "Site settings".',
        'Find "Notifications" and choose "Allow".',
      ],
      img: '/help/chrome-hi.svg',
    },
    {
      title: 'Firefox',
      steps: [
        'Click the shield/lock icon in the address bar.',
        'Open Permissions → Notifications.',
        'Set to "Allow" for this site.',
      ],
      img: '/help/firefox-hi.svg',
    },
    {
      title: 'Safari (macOS)',
      steps: [
        'Safari → Settings for This Website.',
        'Find Notifications and set to "Allow".',
      ],
      img: '/help/safari-hi.svg',
    },
  ]

  useEffect(() => {
    const handler = (e: Event) => setOpen(true)
    window.addEventListener('openPushHelp', handler)
    return () => window.removeEventListener('openPushHelp', handler)
  }, [])

  if (!open) return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full p-4 md:p-6 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Enable Notifications</h2>
          <button onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>

        <p className="mb-2 text-sm">If notifications are blocked, follow the steps below for your browser. After enabling, return and click <strong>Try subscribe</strong> or reload.</p>

        {/* Desktop: grid */}
        {!isMobile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pages.map((p) => (
              <div key={p.title} className="p-3 border rounded flex flex-col">
                <h3 className="font-semibold">{p.title}</h3>
                <ol className="list-decimal ml-5 text-sm mb-3">
                  {p.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                <div className="mt-auto"><img src={p.img} alt={`${p.title} enable notifications`} className="w-full rounded" /></div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile: carousel with pagination */}
        {isMobile && (
          <div className="relative">
            <div className="p-3">
              <h3 className="font-semibold mb-2">{pages[index].title}</h3>
              <ol className="list-decimal ml-5 text-sm mb-3">
                {pages[index].steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <div className="mt-2 h-36 overflow-hidden rounded border">
                <img src={pages[index].img} alt={`${pages[index].title} enable notifications`} className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 gap-2">
              <button aria-label="Previous help page" className="px-3 py-1 rounded bg-white/80" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>Previous</button>
              <div className="text-sm">{index + 1} / {pages.length}</div>
              <button aria-label="Next help page" className="px-3 py-1 rounded bg-white/80" onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))} disabled={index === pages.length - 1}>Next</button>
            </div>
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button className="px-3 py-1 rounded border" onClick={() => setOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  )
}
