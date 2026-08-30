import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(req: Request) {
  try {
    const { blogId } = await req.json()
    
    if (!blogId) {
      return NextResponse.json({ error: 'blogId is required' }, { status: 400 })
    }

    // Mark suggestions as used for this blog
    const { error } = await supabase
      .from('ai_blog_suggestions')
      .update({ 
        used_at: new Date().toISOString(),
        is_applied: true 
      })
      .eq('blog_id', blogId)
      .is('is_applied', false)

    if (error) {
      console.error('Failed to mark suggestions as used:', error)
      return NextResponse.json({ error: 'Failed to mark suggestions as used' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Mark suggestions as used error:', error)
    return NextResponse.json({ error: error.message || 'Failed to mark suggestions as used' }, { status: 500 })
  }
}
