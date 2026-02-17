import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  getAttorneyPerformance,
  getTeamPerformance,
  getProductivityTrends,
} from '@/lib/analytics/attorneyAnalytics'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } }
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

// GET /api/analytics/attorneys?type=performance|team|trends&attorney_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const firmId = profile.current_firm_id
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'team'
    const attorneyId = searchParams.get('attorney_id') || undefined

    // Parse date filters
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const months = parseInt(searchParams.get('months') || '6', 10)

    const dateRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined

    let data
    switch (type) {
      case 'performance':
        if (!attorneyId) {
          return NextResponse.json({ error: 'attorney_id required for performance report' }, { status: 400 })
        }
        data = await getAttorneyPerformance(firmId, attorneyId, dateRange)
        break
      case 'team':
        data = await getTeamPerformance(firmId, dateRange)
        break
      case 'trends':
        data = await getProductivityTrends(firmId, attorneyId, months)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    return NextResponse.json({ type, data })
  } catch (error) {
    console.error('Attorney analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
