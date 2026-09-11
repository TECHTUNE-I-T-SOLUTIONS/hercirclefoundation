import { NextResponse } from 'next/server'
import { createClient as createServerHelper } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerHelper()

    const { data, error } = await supabase
      .from('beneficiary_showcase')
      .select('*')
      .eq('is_active', true)
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
