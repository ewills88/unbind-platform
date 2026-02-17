import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  computeDashboardOverview,
  computeRevenueTrend,
  computeCaseAnalytics,
  computeAttorneyLeaderboard,
  computeKPIScorecard,
} from '@/lib/analytics/metricsService'

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

// GET /api/analytics/dashboard - Comprehensive analytics dashboard data
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
    const range = searchParams.get('range') || 'month'

    // Calculate date ranges
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date = now
    let prevPeriodStart: Date
    let prevPeriodEnd: Date

    if (range === 'year') {
      periodStart = new Date(now.getFullYear(), 0, 1)
      prevPeriodStart = new Date(now.getFullYear() - 1, 0, 1)
      prevPeriodEnd = new Date(now.getFullYear() - 1, 11, 31)
    } else if (range === 'quarter') {
      const q = Math.floor(now.getMonth() / 3)
      periodStart = new Date(now.getFullYear(), q * 3, 1)
      prevPeriodStart = new Date(now.getFullYear(), (q - 1) * 3, 1)
      prevPeriodEnd = new Date(now.getFullYear(), q * 3, 0)
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    }

    // Compute all dashboard data in parallel
    const [overview, revenueTrend, caseAnalytics, leaderboard] = await Promise.all([
      computeDashboardOverview(firmId, periodStart, periodEnd, prevPeriodStart, prevPeriodEnd),
      computeRevenueTrend(firmId, 12),
      computeCaseAnalytics(firmId),
      computeAttorneyLeaderboard(firmId, periodStart, periodEnd),
    ])

    // KPI scorecard depends on overview
    const kpiScorecard = await computeKPIScorecard(firmId, overview, null)

    // Fetch saved reports
    const { data: savedReports } = await supabase
      .from('report_configurations')
      .select('*')
      .eq('firm_id', firmId)
      .order('updated_at', { ascending: false })
      .limit(10)

    // Fetch recent snapshots
    const { data: recentSnapshots } = await supabase
      .from('report_snapshots')
      .select('id, snapshot_name, report_type, period_start, period_end, created_at')
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      overview,
      revenue_trend: revenueTrend,
      case_analytics: caseAnalytics,
      attorney_leaderboard: leaderboard,
      kpi_scorecard: kpiScorecard,
      saved_reports: savedReports || [],
      recent_snapshots: recentSnapshots || [],
    })
  } catch (error) {
    console.error('Analytics dashboard GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
