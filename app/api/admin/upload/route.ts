import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createServerHelper } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(req: Request) {
  try {
    // Auth check
    const authClient = await createServerHelper()
    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (!admins || admins.length === 0) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    // Accept form-data with fields: file (File), bucket (string), filename (string, optional)
    // accept any content type; we'll use file.type if provided
    const form = await req.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

    const file = form.get('file') as any
    const bucketField = form.get('bucket') as any
    const filenameField = form.get('filename') as any

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })

    const bucket = typeof bucketField === 'string' && bucketField ? bucketField : 'stories'
    // default filename: provided, or file.name, or timestamp
    const filename = typeof filenameField === 'string' && filenameField ? filenameField : (file?.name || `upload-${Date.now()}`)

    // ensure bucket exists (create if missing)
    try {
      // try create; if it already exists, Supabase will return an error we can ignore
      await serverClient.storage.createBucket(bucket, { public: true })
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (!/already exists/i.test(msg) && !/duplicate/i.test(msg)) {
        // ignore only the duplicate/bucket exists errors
        console.warn('createBucket warning:', msg)
      }
    }

    // Read file as Buffer
    let arrayBuffer: ArrayBuffer
    try {
      arrayBuffer = await file.arrayBuffer()
    } catch (e) {
      return NextResponse.json({ error: 'Failed to read file content' }, { status: 400 })
    }

    const buffer = Buffer.from(arrayBuffer)

    // sanitize filename: remove directory traversal
    const path = filename.replace(/[\\\/]/g, '_')

    // Upload
    const contentTypeHeader = file.type || undefined

    const uploadRes = await serverClient.storage.from(bucket).upload(path, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: contentTypeHeader,
    })

    if (uploadRes.error) {
      console.error('Upload error:', uploadRes.error)
      return NextResponse.json({ error: uploadRes.error.message || uploadRes.error }, { status: 500 })
    }

    const { data: publicUrlData } = serverClient.storage.from(bucket).getPublicUrl(path)
    const publicUrl = publicUrlData?.publicUrl || null

    return NextResponse.json({ publicUrl, path })
  } catch (err: any) {
    console.error('Upload API error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
