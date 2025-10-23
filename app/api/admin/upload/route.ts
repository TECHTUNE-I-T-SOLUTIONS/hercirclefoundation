import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
  }

  // Expect Authorization: Bearer <access_token>
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s*/i, '')

  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
  }

  const serverSupabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Verify token -> get user
  const { data: userData, error: userErr } = await serverSupabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const user = userData.user

  // Confirm user is an admin in admin_users
  const { data: adminRow, error: adminErr } = await serverSupabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .limit(1)
    .single()

  if (adminErr || !adminRow) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse multipart body
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const bucket = (formData.get('bucket') as string) || 'media'
  const filename = (formData.get('filename') as string) || `upload-${Date.now()}`

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  try {
    // upload using service role
    const arrayBuffer = await file.arrayBuffer()
    const res = await serverSupabase.storage.from(bucket).upload(filename, new Uint8Array(arrayBuffer), {
      cacheControl: '3600',
      upsert: false,
    })

    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    const { data: pub } = serverSupabase.storage.from(bucket).getPublicUrl(filename)

    return NextResponse.json({ publicUrl: pub.publicUrl, data: res.data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
