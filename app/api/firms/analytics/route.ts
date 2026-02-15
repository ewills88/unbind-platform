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

    const periodStartStr = periodStart.toISOString()
    const prevPeriodStartStr = prevPeriodStart.toISOString()
    const prevPeriodEndStr = prevPeriodEnd.toISOString()

    // Get current period invoices
    const { data: currentInvoices } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, status, case_id')
      .in('case_id', (await supabase
        .from('cases')
        .select('id')
        .eq('firm_id', firmId)
      ).data?.map(c => c.id) || [])
      .gte('created_at', periodStartStr)

    // Get previous period invoices for comparison
    const { data: prevInvoices } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid')
      .in('case_id', (await supabase
        .from('cases')
        .select('id')
        .eq('firm_id', firmId)
      ).data?.map(c => c.id) || [])
      .gte('created_at', prevPeriodStartStr)
      .lte('created_at', prevPeriodEndStr)

    const currentRevenue = (currentInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const prevRevenue = (prevInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const currentCollected = (currentInvoices || []).reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
    const prevCollected = (prevInvoices || []).reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)

    const revenueChange = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0
    const collectionRate = currentRevenue > 0 ? Math.round((currentCollected / currentRevenue) * 100) : 0
    const prevCollectionRate = prevRevenue > 0 ? Math.round((prevCollected / prevRevenue) * 100) : 0

    // Active cases count
    const { count: activeCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('status', 'active')

    const { count: prevActiveCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('status', 'active')

    // Revenue history (last 12 months)
    const revenueHistory = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      const { data: monthInvoices } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid')
        .in('case_id', (await supabase
          .from('cases')
          .select('id')
          .eq('firm_id', firmId)
        ).data?.map(c => c.id) || [])
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      revenueHistory.push({
        month: monthLabel,
        revenue: (monthInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
        collected: (monthInvoices || []).reduce((sum, inv) => sum + (inv.amount_paid || 0), 0),
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
