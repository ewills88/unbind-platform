import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/states - List all state requirements
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stateCode = searchParams.get('state_code')

    let query = supabase
      .from('state_requirements')
      .select('*')
      .eq('is_active', true)
      .order('state_name', { ascending: true })

    if (stateCode) {
      query = query.eq('state_code', stateCode)
    }

    const { data: states, error } = await query

    if (error) {
      console.error('Error fetching state requirements:', error)
      return NextResponse.json({ error: 'Failed to fetch state requirements' }, { status: 500 })
    }

    return NextResponse.json({ states })
  } catch (error) {
    console.error('States GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
