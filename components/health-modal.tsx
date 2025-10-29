"use client"

import React, { useEffect, useState, useRef } from 'react'

type Tip = {
  id: string
  title: string
  summary?: string
  details?: string
  image?: string
  tags?: string[]
  gradientLight?: string
  gradientDark?: string
}

export default function HealthModal() {
  const [tips, setTips] = useState<Tip[]>([])
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)
  const timerRef = useRef<number | null>(null)
  const previousBodyOverflow = useRef<string | null>(null)
  const previousScrollBehavior = useRef<string | null>(null)

  // rotation speed configurable in ms (defaults to 12000)
  const [rotationMs, setRotationMs] = useState<number>(() => {
    try {
      const s = localStorage.getItem('health-modal-rotation')
      return s ? Number(s) : 12000
    } catch (e) { return 12000 }
  })

  // theme detection
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (document.documentElement.classList.contains('dark')) return true
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true
      }
    } catch (e) {}
    return false
  })

  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    const handler = (e: any) => setIsDark(Boolean(e.matches))
    try {
      if (mq && mq.addEventListener) mq.addEventListener('change', handler)
      else if (mq && mq.addListener) mq.addListener(handler)
    } catch (e) {}
    return () => {
      try {
        if (mq && mq.removeEventListener) mq.removeEventListener('change', handler)
        else if (mq && mq.removeListener) mq.removeListener(handler)
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    const loadTips = async () => {
      try {
        const dismissed = localStorage.getItem('health-modal-dismissed')
        const today = new Date().toISOString().slice(0, 10)
        if (dismissed === today) return
      } catch (e) {}

      // Try server API
      try {
        const apiRes = await fetch('/api/health-tips')
        if (apiRes.ok) {
          const json = await apiRes.json()
          if (Array.isArray(json) && json.length > 0) {
            setTips(json)
            setVisible(true)
            return
          }
        }
      } catch (e) {
        // fallback
      }

      // fallback to public files
      try {
        const [r1, r2] = await Promise.allSettled([fetch('/health-tips.json'), fetch('/health-tips-2.json')])
        const tipsArr: Tip[] = []
        for (const res of [r1, r2]) {
          if (res.status === 'fulfilled') {
            try {
              const json = await res.value.json()
              if (Array.isArray(json)) tipsArr.push(...json)
            } catch (e) {}
          }
        }
        if (tipsArr.length > 0) {
          setTips(tipsArr)
          setVisible(true)
        }
      } catch (e) {}
    }

    loadTips()
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [])

  // lock scroll + blur when modal visible
  useEffect(() => {
    if (visible) {
      try {
        previousBodyOverflow.current = document.body.style.overflow || ''
        previousScrollBehavior.current = document.documentElement.style.scrollBehavior || ''
        document.body.style.overflow = 'hidden'
        document.documentElement.style.scrollBehavior = 'smooth'
      } catch (e) {}
    } else {
      try {
        if (previousBodyOverflow.current !== null) document.body.style.overflow = previousBodyOverflow.current
        if (previousScrollBehavior.current !== null) document.documentElement.style.scrollBehavior = previousScrollBehavior.current
      } catch (e) {}
    }
  }, [visible])

  useEffect(() => {
    if (visible && tips.length > 1) {
      timerRef.current = window.setInterval(() => {
        setIndex((i) => (i + 1) % tips.length)
      }, rotationMs) as unknown as number
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [visible, tips, rotationMs])

  const close = (dismissForDay = false) => {
    if (dismissForDay) {
      try { const today = new Date().toISOString().slice(0, 10); localStorage.setItem('health-modal-dismissed', today) } catch(e){}
    }
    setVisible(false)
  }

  if (!visible || tips.length === 0) return null
  const tip = tips[index]

  // choose gradient by theme, fallback to a simple gradient if missing
  const gradient = isDark ? (tip.gradientDark || tip.gradientLight || 'linear-gradient(135deg,#222,#444)') : (tip.gradientLight || tip.gradientDark || 'linear-gradient(135deg,#fff,#eee)')

  // content panel background to ensure readability over gradient
  const contentBg = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)'

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => close(false)} />
      </div>

      <div aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden transform transition-all duration-500 modal-animate" style={{ backgroundImage: gradient, backgroundSize: 'cover' }}>

          {/* subtle SVG overlay/pattern for visual variety */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)" />
            <g fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1">
              <circle cx="10%" cy="20%" r="120" />
              <circle cx="80%" cy="80%" r="160" />
            </g>
          </svg>

          <div className="relative md:flex h-full">
            <div className="w-full h-auto md:h-auto md:w-1/1 flex items-stretch">
              <div className="flex-1 p-6 overflow-auto" style={{ background: 'transparent' }}>
                <div className="rounded-md p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="pr-4">
                      <h3 className="text-2xl md:text-xl font-semibold text-gray-200 dark:text-gray-100">{tip.title}</h3>
                      {tip.summary ? <p className="mt-1 text-lg text-gray-200 dark:text-gray-300">{tip.summary}</p> : null}
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <button onClick={() => setIndex((index - 1 + tips.length) % tips.length)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Previous tip">‹</button>
                      <button onClick={() => setIndex((index + 1) % tips.length)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Next tip">›</button>
                      <button onClick={() => close(false)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">✕</button>
                    </div>
                  </div>

                  <div className="mt-3 text-lg font-bold text-gray-200 dark:text-gray-300 leading-relaxed max-h-[48vh] md:max-h-[56vh] overflow-auto">
                    {tip.details || tip.summary}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    {/*<div className="text-xs text-gray-200">{index + 1} / {tips.length}</div>*/}
                    <div className="flex items-center space-x-2">
                      <button onClick={() => { close(false) }} className="px-3 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-800 hover:brightness-95">Close</button>
                      <button onClick={() => close(true)} className="px-3 py-1 text-sm rounded-md bg-pink-600 text-white hover:brightness-95">Don't show again today</button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {tips.map((t, idx) => (
                        <button key={t.id} onClick={() => setIndex(idx)} className={`w-2 h-2 rounded-full ${idx === index ? 'bg-pink-600' : 'bg-gray-300 dark:bg-gray-700'}`} aria-label={`Go to tip ${idx + 1}`} />
                      ))}
                    </div>
                  </div>

                  {/* rotation setting only (tags preference removed) */}
                  <div className="mt-4 border-t pt-3 flex items-center gap-3">
                    <label className="text-md text-gray-200 dark:text-gray-100">Rotation speed:</label>
                    <select value={String(rotationMs)} onChange={(e) => { const v = Number(e.target.value); setRotationMs(v); try { localStorage.setItem('health-modal-rotation', String(v)) } catch (e) {} }} className="text-sm p-1 border rounded-md bg-gray-300 dark:bg-gray-800">
                      <option value="8000">Fast</option>
                      <option value="12000">Normal</option>
                      <option value="20000">Slow</option>
                    </select>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .modal-animate { animation: modalIn 420ms cubic-bezier(.2,.9,.2,1); }
          @keyframes modalIn { 0% { opacity: 0; transform: translateY(20px) scale(.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
          @media (max-width: 640px) { .modal-animate { max-height: 92vh; border-radius: 12px; } }
        `}</style>
      </div>
    </>
  )
}
