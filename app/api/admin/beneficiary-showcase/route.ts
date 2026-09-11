import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await svc
      .from('beneficiary_showcase')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching beneficiary showcase items:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    console.error('Failed to fetch beneficiary showcase items:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch beneficiary showcase items' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, link, image_url, image_type, is_active, display_order, metadata } = body

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 })
    }
    if (!image_url || typeof image_url !== 'string') {
      return NextResponse.json({ error: 'Missing image_url' }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const insertObj: any = {
      name,
      image_url,
      image_type: image_type || 'upload',
      is_active: is_active !== undefined ? is_active : true,
      display_order: display_order || 0,
    }

    if (description) insertObj.description = description
    if (link) insertObj.link = link
    if (metadata) insertObj.metadata = metadata

    const { data, error } = await svc
      .from('beneficiary_showcase')
      .insert([insertObj])
      .select()
      .limit(1)

    if (error) {
      console.error('Error creating beneficiary showcase item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data && data[0] })
  } catch (err: any) {
    console.error('Failed to create beneficiary showcase item:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create beneficiary showcase item' },
      { status: 500 }
    )
  }
}
