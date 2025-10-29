import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// helper: simple keyword -> tag map
const KEYWORD_TAGS: { [k: string]: string } = {
  iron: 'nutrition',
  'iron-rich': 'nutrition',
  hydrate: 'hydration',
  water: 'hydration',
  sleep: 'sleep',
  yoga: 'exercise',
  exercise: 'exercise',
  cramps: 'pain',
  migraine: 'pain',
  mood: 'mental',
  anxiety: 'mental',
  hygiene: 'hygiene',
  probiotic: 'gut',
  gut: 'gut',
  nutrition: 'nutrition',
  massage: 'self-care',
}

// Theme-aware gradient palettes (light and dark variants)
const GRADIENTS_LIGHT = [
  'linear-gradient(135deg,#ffd1e8 0%,#ff9fc3 100%)',
  'linear-gradient(135deg,#ffe9c6 0%,#ffb3a7 100%)',
  'linear-gradient(135deg,#e0f7fa 0%,#b3e5fc 100%)',
  'linear-gradient(135deg,#f3e8ff 0%,#d6bcff 100%)',
  'linear-gradient(135deg,#e8ffe5 0%,#b7ffdb 100%)',
  'linear-gradient(135deg,#fff4e6 0%,#ffd8a8 100%)',
  'linear-gradient(135deg,#fce7f3 0%,#f8d7ef 100%)',
  'linear-gradient(135deg,#e8f0ff 0%,#cfe0ff 100%)',
]
const GRADIENTS_DARK = [
  'linear-gradient(135deg,#7a3042 0%,#502232 100%)',
  'linear-gradient(135deg,#6b3e2b 0%,#3f2a20 100%)',
  'linear-gradient(135deg,#0b5260 0%,#063a45 100%)',
  'linear-gradient(135deg,#5d3b66 0%,#3b2947 100%)',
  'linear-gradient(135deg,#184f2f 0%,#0f3622 100%)',
  'linear-gradient(135deg,#6b4a2d 0%,#47321f 100%)',
  'linear-gradient(135deg,#6a3754 0%,#3e2639 100%)',
  'linear-gradient(135deg,#1d3b66 0%,#122744 100%)',
]

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const fileA = path.join(publicDir, 'health-tips.json')
    const fileB = path.join(publicDir, 'health-tips-2.json')

    const arr: any[] = []
    // read first file if exists
    try {
      const rawA = await fs.promises.readFile(fileA, 'utf8')
      const parsedA = JSON.parse(rawA)
      if (Array.isArray(parsedA)) arr.push(...parsedA)
    } catch (e) {
      // ignore missing or parse errors for first file
    }

    // read second file if exists
    try {
      const rawB = await fs.promises.readFile(fileB, 'utf8')
      const parsedB = JSON.parse(rawB)
      if (Array.isArray(parsedB)) arr.push(...parsedB)
    } catch (e) {
      // ignore
    }

    // dedupe by id while preserving order
    const seen = new Set()
    const merged: any[] = []
    for (const item of arr) {
      if (!item || !item.id) continue
      if (seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }

    // enrich: ensure tags array and gradientLight/gradientDark
    const enriched = merged.map((it, idx) => {
      const text = (it.title || '') + ' ' + (it.summary || '') + ' ' + (it.details || '')
      const found = new Set<string>()
      const low = text.toLowerCase()
      Object.keys(KEYWORD_TAGS).forEach((kw) => {
        if (low.includes(kw)) found.add(KEYWORD_TAGS[kw])
      })
      const tags = Array.from(found)
      const gradientLight = GRADIENTS_LIGHT[idx % GRADIENTS_LIGHT.length]
      const gradientDark = GRADIENTS_DARK[idx % GRADIENTS_DARK.length]
      // remove large image urls to reduce payload; keep if present but prefer gradients
      const { image, ...rest } = it
      return { ...rest, tags, gradientLight, gradientDark }
    })

    // write merged back to fileA (safe best-effort)
    try {
      await fs.promises.writeFile(fileA, JSON.stringify(enriched, null, 2), 'utf8')
    } catch (e) {
      // ignore write failures in environments that disallow writing
    }

    // attempt to remove fileB (best-effort)
    try {
      await fs.promises.unlink(fileB)
    } catch (e) {
      // ignore if cannot delete
    }

    return NextResponse.json(enriched, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: 'failed to load health tips' }, { status: 500 })
  }
}
