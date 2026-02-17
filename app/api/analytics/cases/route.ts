import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  getCaseLifecycleAnalysis,
  getCaseOutcomesAnalysis,
  getWorkloadAnalysis,
} from '@/lib/analytics/caseAnalytics'

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

// GET /api/analytics/cases?type=lifecycle|outcomes|workload
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
    const type = searchParams.get('type') || 'lifecycle'

    // Parse date filters
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const caseType = searchParams.get('case_type') || undefined

    const filters: { dateRange?: { start: Date; end: Date }; caseType?: string } = {}
    if (startDate && endDate) {
      filters.dateRange = { start: new Date(startDate), end: new Date(endDate) }
    }
    if (caseType) filters.caseType = caseType

    let data
    switch (type) {
      case 'lifecycle':
        data = await getCaseLifecycleAnalysis(firmId, filters)
        break
      case 'outcomes':
        data = await getCaseOutcomesAnalysis(firmId, filters)
        break
      case 'workload':
        data = await getWorkloadAnalysis(firmId)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    return NextResponse.json({ type, data })
  } catch (error) {
    console.error('Case analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
