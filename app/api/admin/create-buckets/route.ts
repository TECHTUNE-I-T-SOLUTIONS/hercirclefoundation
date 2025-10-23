import { NextResponse } from 'next/server'

type BucketResult = {
  name: string
  status: number
  ok: boolean
  body: any
}

export async function POST() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env' }, { status: 500 })
  }

  const buckets = ['media', 'events', 'gallery']
  const results: BucketResult[] = []

  for (const name of buckets) {
    try {
      const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ name, public: true }),
      })

      let body: any = null
      try {
        body = await res.json()
      } catch (e) {
        body = await res.text()
      }

      results.push({ name, status: res.status, ok: res.ok, body })
    } catch (err) {
      results.push({ name, status: 0, ok: false, body: String(err) })
    }
  }

  return NextResponse.json({ results })
}
