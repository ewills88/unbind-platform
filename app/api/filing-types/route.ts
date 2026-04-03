import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/filing-types - List filing types by state and optionally category
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stateCode = searchParams.get('state_code') || 'CA'
    const category = searchParams.get('category')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('filing_types')
      .select('*')
      .eq('state_code', stateCode)
      .eq('is_active', true)
      .order('display_order')

    if (category) query = query.eq('category', category)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Filing types GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
