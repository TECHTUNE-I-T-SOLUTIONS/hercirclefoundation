import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, link, image_url, image_type, is_active, display_order, metadata } = body

    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const updateObj: any = {
      updated_at: new Date(),
    }

    if (name !== undefined) updateObj.name = name
    if (description !== undefined) updateObj.description = description
    if (link !== undefined) updateObj.link = link
    if (image_url !== undefined) updateObj.image_url = image_url
    if (image_type !== undefined) updateObj.image_type = image_type
    if (is_active !== undefined) updateObj.is_active = is_active
    if (display_order !== undefined) updateObj.display_order = display_order
    if (metadata !== undefined) updateObj.metadata = metadata

    const { data, error } = await svc
      .from('beneficiary_showcase')
      .update(updateObj)
      .eq('id', id)
      .select()
      .limit(1)

    if (error) {
      console.error('Error updating beneficiary showcase item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Beneficiary showcase item not found' }, { status: 404 })
    }

    return NextResponse.json({ data: data[0] })
  } catch (err: any) {
    console.error('Failed to update beneficiary showcase item:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to update beneficiary showcase item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { error } = await svc
      .from('beneficiary_showcase')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting beneficiary showcase item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Failed to delete beneficiary showcase item:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to delete beneficiary showcase item' },
      { status: 500 }
    )
  }
}
