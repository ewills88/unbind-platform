import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/client/progress - Get progress for the client's case
export async function GET(_request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!caseData) {
      return NextResponse.json(null)
    }

    // Get progress
    const { data: progress, error: progressError } = await supabase
      .from('client_progress')
      .select('*')
      .eq('case_id', caseData.id)
      .single()

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError)
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }

    return NextResponse.json(progress || null)
  } catch (error) {
    console.error('Client progress GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
