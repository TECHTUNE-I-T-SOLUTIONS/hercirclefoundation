import { NextResponse } from 'next/server'

// Simple server-side proxy for fetching remote media. Only allow a small whitelist
// of hosts to avoid open proxy abuse. Returns the proxied response with same
// content-type so the browser can play media from our origin.

const ALLOWED_HOSTS = [
  'drive.google.com',
  'drive.usercontent.google.com',
  'docs.google.com',
  'youtube.googleapis.com',
  // allow Supabase public storage (any project subdomain)
  // we'll accept any host that ends with `supabase.co`
]

export async function GET(request: Request) {
  const reqUrl = new URL(request.url)
  const url = reqUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  const probe = reqUrl.searchParams.get('probe') === '1'

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (e) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  // allow hosts in the ALLOWED_HOSTS list, or any supabase.co storage host
  const allowed = ALLOWED_HOSTS.includes(parsed.hostname) || parsed.hostname.endsWith('.supabase.co')
  if (!allowed) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 })
  }

  // Fetch the remote resource server-side. We stream the response back.
  try {
    const defaultHeaders: Record<string, string> = {
      // present a realistic browser UA to reduce blocking
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // many hosts check for an Accept header
      'accept': '*/*',
    }

    const doFetch = async () => fetch(parsed.toString(), {
      credentials: 'omit',
      redirect: 'follow',
      headers: defaultHeaders,
    })

    let res = await doFetch()

    // Retry once with a Referer for supabase hosts which sometimes block requests without it
    if (res.status === 403 && parsed.hostname.endsWith('.supabase.co')) {
      const retryHeaders = { ...defaultHeaders, referer: `https://${parsed.hostname}/` }
      res = await fetch(parsed.toString(), { credentials: 'omit', redirect: 'follow', headers: retryHeaders })
    }

    // If this is a probe request, return a small JSON payload describing the remote status and content-type.
    if (probe) {
      const status = res.status
      const contentType = res.headers.get('content-type') || null
      return NextResponse.json({ status, contentType }, { status: 200 })
    }

    // If the remote returns a non-ok status, forward that status to the client
    const status = res.status
    const contentType = res.headers.get('content-type') || 'application/octet-stream'

    const body = await res.arrayBuffer()

    return new NextResponse(Buffer.from(body), {
      status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'fetch error' }, { status: 502 })
  }
}
