import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET /api/firms/analytics - Get firm metrics dashboard data
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
    const timeRange = searchParams.get('range') || 'month'

    // Calculate date ranges
    const now = new Date()
    let periodStart: Date
    let prevPeriodStart: Date
    let prevPeriodEnd: Date

    if (timeRange === 'year') {
      periodStart = new Date(now.getFullYear(), 0, 1)
      prevPeriodStart = new Date(now.getFullYear() - 1, 0, 1)
      prevPeriodEnd = new Date(now.getFullYear() - 1, 11, 31)
    } else if (timeRange === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3)
      periodStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
      prevPeriodStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1)
      prevPeriodEnd = new Date(now.getFullYear(), currentQuarter * 3, 0)
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    }

    const _periodStartStr = periodStart.toISOString()
    const _prevPeriodStartStr = prevPeriodStart.toISOString()
    const _prevPeriodEndStr = prevPeriodEnd.toISOString()

    // Fetch firm case IDs ONCE
    const { data: firmCases } = await supabase
      .from('cases')
      .select('id')
      .eq('firm_id', firmId)

    const caseIds = (firmCases || []).map(c => c.id)

    if (caseIds.length === 0) {
      // No cases, return empty metrics
      const { count: activeCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmId)
        .eq('status', 'active')

      return NextResponse.json({
        metrics: {
          total_revenue: 0,
          revenue_change_percent: 0,
          revenue_trend: 'flat',
          active_cases: activeCases || 0,
          cases_change_percent: 0,
          collection_rate: 0,
          collection_change_percent: 0,
          client_satisfaction_score: 0,
          satisfaction_change: 0,
          revenue_history: [],
        }
      })
    }

    // Fetch ALL invoices for firm cases in one query (covers both periods + history)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, status, case_id, created_at')
      .in('case_id', caseIds)
      .gte('created_at', twelveMonthsAgo.toISOString())

    // Filter invoices in memory for each period
    const currentInvoices = (allInvoices || []).filter(
      inv => new Date(inv.created_at) >= periodStart
    )
    const prevInvoices = (allInvoices || []).filter(
      inv => new Date(inv.created_at) >= prevPeriodStart && new Date(inv.created_at) <= prevPeriodEnd
    )

    const currentRevenue = currentInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const prevRevenue = prevInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const currentCollected = currentInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
    const prevCollected = prevInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)

    const revenueChange = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0
    const collectionRate = currentRevenue > 0 ? Math.round((currentCollected / currentRevenue) * 100) : 0
    const prevCollectionRate = prevRevenue > 0 ? Math.round((prevCollected / prevRevenue) * 100) : 0

    // Active cases count
    const { count: activeCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('status', 'active')

    // Revenue history (last 12 months) - computed from allInvoices in memory
    const revenueHistory = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      const monthInvoices = (allInvoices || []).filter(inv => {
        const d = new Date(inv.created_at)
        return d >= monthStart && d <= monthEnd
      })

      revenueHistory.push({
        month: monthLabel,
        revenue: monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
        collected: monthInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0),
      })
    }

    const metrics = {
      total_revenue: currentRevenue,
      revenue_change_percent: revenueChange,
      revenue_trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'flat',
      active_cases: activeCases || 0,
      cases_change_percent: 0,
      collection_rate: collectionRate,
      collection_change_percent: collectionRate - prevCollectionRate,
      client_satisfaction_score: 4.5,
      satisfaction_change: 0,
      revenue_history: revenueHistory,
    }

    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('Firm analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
