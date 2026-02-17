// Session 19 CP1: Comprehensive Metrics Calculation Service
// Server-side metrics computation for the analytics dashboard

import { createClient } from '@supabase/supabase-js'
import {
  type DashboardOverview,
  type RevenueTrendPoint,
  type CaseAnalyticsData,
  type AttorneyLeaderboardEntry,
  type KPIScorecard,
  type MetricKey,
  type TrendDirection,
  METRIC_KEY_INFO,
  getKPIStatus,
  calculateChangePercent,
  getTrendDirection,
} from '@/types/reporting'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// Dashboard Overview Metrics
// ============================================================

export async function computeDashboardOverview(
  firmId: string,
  periodStart: Date,
  periodEnd: Date,
  prevPeriodStart: Date,
  prevPeriodEnd: Date
): Promise<DashboardOverview> {
  const supabase = getServiceClient()

  // Get firm case IDs
  const { data: firmCases } = await supabase
    .from('cases')
    .select('id, status, case_stage, created_at, closed_at')
    .eq('firm_id', firmId)

  const caseIds = (firmCases || []).map(c => c.id)

  if (caseIds.length === 0) {
    return getEmptyOverview()
  }

  // Batch fetch invoices covering both periods
  const { data: allInvoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, balance_due, status, case_id, created_at')
    .in('case_id', caseIds)
    .gte('created_at', prevPeriodStart.toISOString())

  // Batch fetch time entries covering both periods
  const { data: allTimeEntries } = await supabase
    .from('time_entries')
    .select('duration_minutes, billable, amount, attorney_id, entry_date')
    .in('case_id', caseIds)
    .gte('entry_date', prevPeriodStart.toISOString())

  // Filter invoices by period
  const currentInvoices = (allInvoices || []).filter(
    inv => new Date(inv.created_at) >= periodStart && new Date(inv.created_at) <= periodEnd
  )
  const prevInvoices = (allInvoices || []).filter(
    inv => new Date(inv.created_at) >= prevPeriodStart && new Date(inv.created_at) <= prevPeriodEnd
  )

  // Revenue metrics
  const totalRevenue = currentInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const prevRevenue = prevInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const totalCollected = currentInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0)
  const prevCollected = prevInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0)

  // Outstanding AR (all time)
  const outstandingAR = (allInvoices || [])
    .filter(i => i.balance_due > 0 && i.status !== 'void' && i.status !== 'draft')
    .reduce((s, i) => s + (i.balance_due || 0), 0)
  const prevOutstandingAR = prevInvoices
    .filter(i => i.balance_due > 0 && i.status !== 'void' && i.status !== 'draft')
    .reduce((s, i) => s + (i.balance_due || 0), 0)

  // Case metrics
  const activeCases = (firmCases || []).filter(c => c.status === 'active').length
  const newCasesPeriod = (firmCases || []).filter(c =>
    new Date(c.created_at) >= periodStart && new Date(c.created_at) <= periodEnd
  ).length
  const closedCasesPeriod = (firmCases || []).filter(c =>
    c.closed_at && new Date(c.closed_at) >= periodStart && new Date(c.closed_at) <= periodEnd
  ).length
  const prevActiveCases = (firmCases || []).filter(c =>
    new Date(c.created_at) <= prevPeriodEnd && (!c.closed_at || new Date(c.closed_at) > prevPeriodEnd)
  ).length

  // Time entry metrics
  const currentTimeEntries = (allTimeEntries || []).filter(
    t => new Date(t.entry_date) >= periodStart && new Date(t.entry_date) <= periodEnd
  )
  const prevTimeEntries = (allTimeEntries || []).filter(
    t => new Date(t.entry_date) >= prevPeriodStart && new Date(t.entry_date) <= prevPeriodEnd
  )

  const billableHours = currentTimeEntries
    .filter(t => t.billable)
    .reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)
  const prevBillableHours = prevTimeEntries
    .filter(t => t.billable)
    .reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)

  const totalHours = currentTimeEntries.reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)
  const prevTotalHours = prevTimeEntries.reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)

  const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0
  const prevUtilizationRate = prevTotalHours > 0 ? (prevBillableHours / prevTotalHours) * 100 : 0

  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0
  const prevCollectionRate = prevRevenue > 0 ? (prevCollected / prevRevenue) * 100 : 0

  const avgCaseValue = activeCases > 0 ? totalRevenue / activeCases : 0
  const prevAvgCaseValue = prevActiveCases > 0 ? prevRevenue / prevActiveCases : 0

  const revenueChange = calculateChangePercent(totalRevenue, prevRevenue)

  return {
    total_revenue: round2(totalRevenue),
    revenue_change: revenueChange,
    revenue_trend: getTrendDirection(revenueChange),
    total_collected: round2(totalCollected),
    collected_change: calculateChangePercent(totalCollected, prevCollected),
    outstanding_ar: round2(outstandingAR),
    ar_change: calculateChangePercent(outstandingAR, prevOutstandingAR),
    active_cases: activeCases,
    cases_change: calculateChangePercent(activeCases, prevActiveCases),
    new_cases_period: newCasesPeriod,
    closed_cases_period: closedCasesPeriod,
    billable_hours: round1(billableHours),
    hours_change: calculateChangePercent(billableHours, prevBillableHours),
    utilization_rate: round1(utilizationRate),
    utilization_change: round1(utilizationRate - prevUtilizationRate),
    collection_rate: round1(collectionRate),
    collection_change: round1(collectionRate - prevCollectionRate),
    avg_case_value: round2(avgCaseValue),
    avg_case_change: calculateChangePercent(avgCaseValue, prevAvgCaseValue),
  }
}

// ============================================================
// Revenue Trend (monthly points for charts)
// ============================================================

export async function computeRevenueTrend(
  firmId: string,
  months: number = 12
): Promise<RevenueTrendPoint[]> {
  const supabase = getServiceClient()
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

  // Get firm case IDs
  const { data: firmCases } = await supabase
    .from('cases')
    .select('id')
    .eq('firm_id', firmId)

  const caseIds = (firmCases || []).map(c => c.id)
  if (caseIds.length === 0) return []

  // Fetch all invoices in range
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, created_at')
    .in('case_id', caseIds)
    .gte('created_at', startDate.toISOString())

  // Get KPI targets for revenue
  const { data: targets } = await supabase
    .from('kpi_targets')
    .select('target_value')
    .eq('firm_id', firmId)
    .eq('metric_key', 'revenue_monthly')
    .eq('is_active', true)
    .limit(1)

  const monthlyTarget = targets?.[0]?.target_value || null

  // Build monthly data points
  const points: RevenueTrendPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const label = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

    const monthInvoices = (invoices || []).filter(inv => {
      const d = new Date(inv.created_at)
      return d >= monthStart && d <= monthEnd
    })

    points.push({
      date: monthStart.toISOString().split('T')[0],
      label,
      revenue: round2(monthInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)),
      collected: round2(monthInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0)),
      target: monthlyTarget ? Number(monthlyTarget) : null,
    })
  }

  return points
}

// ============================================================
// Case Analytics
// ============================================================

export async function computeCaseAnalytics(firmId: string): Promise<CaseAnalyticsData> {
  const supabase = getServiceClient()

  const { data: cases } = await supabase
    .from('cases')
    .select('id, status, case_stage, case_type, created_at, closed_at')
    .eq('firm_id', firmId)

  if (!cases || cases.length === 0) {
    return {
      by_stage: [],
      by_type: [],
      avg_duration_days: 0,
      open_rate: 0,
      close_rate: 0,
      aging: [],
    }
  }

  const activeCases = cases.filter(c => c.status === 'active')
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // By stage
  const stageCounts: Record<string, number> = {}
  for (const c of activeCases) {
    const stage = c.case_stage || 'active'
    stageCounts[stage] = (stageCounts[stage] || 0) + 1
  }

  const stageLabels: Record<string, string> = {
    initial_filing: 'Initial Filing',
    discovery: 'Discovery',
    negotiation: 'Negotiation',
    mediation: 'Mediation',
    settlement: 'Settlement',
    trial: 'Trial',
    active: 'Active',
    closed: 'Closed',
  }

  // Get revenue by stage
  const caseIds = cases.map(c => c.id)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('case_id, total_amount')
    .in('case_id', caseIds)

  const revenueByCase: Record<string, number> = {}
  for (const inv of invoices || []) {
    revenueByCase[inv.case_id] = (revenueByCase[inv.case_id] || 0) + (inv.total_amount || 0)
  }

  const byStage = Object.entries(stageCounts).map(([stage, count]) => {
    const stageCases = activeCases.filter(c => (c.case_stage || 'active') === stage)
    const value = stageCases.reduce((s, c) => s + (revenueByCase[c.id] || 0), 0)
    return {
      stage,
      label: stageLabels[stage] || stage,
      count,
      value: round2(value),
    }
  }).sort((a, b) => b.count - a.count)

  // By type
  const typeCounts: Record<string, number> = {}
  for (const c of cases) {
    const type = c.case_type || 'divorce'
    typeCounts[type] = (typeCounts[type] || 0) + 1
  }

  const typeLabels: Record<string, string> = {
    divorce: 'Divorce',
    dissolution: 'Dissolution',
    legal_separation: 'Legal Separation',
    annulment: 'Annulment',
    custody: 'Custody',
    support: 'Support Modification',
    other: 'Other',
  }

  const byType = Object.entries(typeCounts).map(([type, count]) => ({
    type,
    label: typeLabels[type] || type,
    count,
  })).sort((a, b) => b.count - a.count)

  // Average duration
  const closedCases = cases.filter(c => c.closed_at)
  let avgDuration = 0
  if (closedCases.length > 0) {
    const totalDays = closedCases.reduce((s, c) => {
      const created = new Date(c.created_at)
      const closed = new Date(c.closed_at)
      return s + Math.round((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    }, 0)
    avgDuration = Math.round(totalDays / closedCases.length)
  }

  // Open/close rates (this month)
  const newThisMonth = cases.filter(c => new Date(c.created_at) >= monthStart).length
  const closedThisMonth = cases.filter(c => c.closed_at && new Date(c.closed_at) >= monthStart).length

  // Case aging (how old are active cases)
  const agingBuckets = [
    { bucket: '< 30 days', count: 0 },
    { bucket: '30-90 days', count: 0 },
    { bucket: '90-180 days', count: 0 },
    { bucket: '180-365 days', count: 0 },
    { bucket: '> 1 year', count: 0 },
  ]

  for (const c of activeCases) {
    const ageDays = Math.round((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
    if (ageDays < 30) agingBuckets[0].count++
    else if (ageDays < 90) agingBuckets[1].count++
    else if (ageDays < 180) agingBuckets[2].count++
    else if (ageDays < 365) agingBuckets[3].count++
    else agingBuckets[4].count++
  }

  return {
    by_stage: byStage,
    by_type: byType,
    avg_duration_days: avgDuration,
    open_rate: newThisMonth,
    close_rate: closedThisMonth,
    aging: agingBuckets,
  }
}

// ============================================================
// Attorney Leaderboard
// ============================================================

export async function computeAttorneyLeaderboard(
  firmId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<AttorneyLeaderboardEntry[]> {
  const supabase = getServiceClient()

  // Get firm attorneys
  const { data: members } = await supabase
    .from('firm_members')
    .select('user_id')
    .eq('firm_id', firmId)
    .eq('status', 'active')
    .in('role', ['owner', 'senior_attorney', 'attorney'])

  if (!members || members.length === 0) return []

  const memberIds = members.map(m => m.user_id)

  // Batch fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', memberIds)

  const profileMap: Record<string, { full_name: string; email: string }> = {}
  for (const p of profiles || []) {
    profileMap[p.id] = { full_name: p.full_name || p.email, email: p.email }
  }

  // Batch fetch cases
  const { data: allCases } = await supabase
    .from('cases')
    .select('id, attorney_id, status')
    .in('attorney_id', memberIds)

  // Batch fetch time entries in period
  const { data: allTimeEntries } = await supabase
    .from('time_entries')
    .select('duration_minutes, billable, amount, attorney_id')
    .in('attorney_id', memberIds)
    .eq('billable', true)
    .gte('entry_date', periodStart.toISOString())
    .lte('entry_date', periodEnd.toISOString())

  // Batch fetch invoices for collection rate
  const allCaseIds = (allCases || []).map(c => c.id)
  const { data: allInvoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, case_id')
    .in('case_id', allCaseIds.length > 0 ? allCaseIds : ['__none__'])
    .gte('created_at', periodStart.toISOString())

  const entries: AttorneyLeaderboardEntry[] = []

  for (const memberId of memberIds) {
    const prof = profileMap[memberId]
    const name = prof?.full_name || 'Unknown'
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

    const memberCases = (allCases || []).filter(c => c.attorney_id === memberId)
    const activeCases = memberCases.filter(c => c.status === 'active').length
    const memberCaseIds = memberCases.map(c => c.id)

    const memberTimeEntries = (allTimeEntries || []).filter(t => t.attorney_id === memberId)
    const billableHours = memberTimeEntries.reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)
    const revenue = memberTimeEntries.reduce((s, t) => s + (t.amount || 0), 0)

    const memberInvoices = (allInvoices || []).filter(i => memberCaseIds.includes(i.case_id))
    const totalBilled = memberInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
    const totalPaid = memberInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0)
    const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0

    const targetHours = 160
    const utilizationRate = targetHours > 0 ? Math.min((billableHours / targetHours) * 100, 100) : 0
    const avgCaseValue = activeCases > 0 ? revenue / activeCases : 0

    entries.push({
      user_id: memberId,
      full_name: name,
      initials,
      rank: 0,
      revenue: round2(revenue),
      billable_hours: round1(billableHours),
      utilization_rate: round1(utilizationRate),
      active_cases: activeCases,
      collection_rate: round1(collectionRate),
      avg_case_value: round2(avgCaseValue),
    })
  }

  // Sort by revenue and assign ranks
  entries.sort((a, b) => b.revenue - a.revenue)
  entries.forEach((e, i) => { e.rank = i + 1 })

  return entries
}

// ============================================================
// KPI Scorecard
// ============================================================

export async function computeKPIScorecard(
  firmId: string,
  overview: DashboardOverview,
  prevOverview: DashboardOverview | null
): Promise<KPIScorecard[]> {
  const supabase = getServiceClient()

  // Fetch KPI targets for this firm
  const { data: targets } = await supabase
    .from('kpi_targets')
    .select('*')
    .eq('firm_id', firmId)
    .eq('is_active', true)

  const targetMap: Record<string, { target_value: number; warning_threshold: number | null }> = {}
  for (const t of targets || []) {
    targetMap[t.metric_key] = {
      target_value: Number(t.target_value),
      warning_threshold: t.warning_threshold ? Number(t.warning_threshold) : null,
    }
  }

  // Build scorecard for each metric
  const metricKeys: MetricKey[] = [
    'revenue_monthly',
    'billable_hours_monthly',
    'collection_rate',
    'cases_opened_monthly',
    'cases_closed_monthly',
    'utilization_rate',
  ]

  const scorecard: KPIScorecard[] = []

  for (const key of metricKeys) {
    const info = METRIC_KEY_INFO[key]
    const target = targetMap[key]
    const targetValue = target?.target_value ?? info.defaultTarget
    const warningThreshold = target?.warning_threshold ?? null

    let currentValue = 0
    let changePercent = 0
    let trend: TrendDirection = 'flat'

    switch (key) {
      case 'revenue_monthly':
        currentValue = overview.total_revenue
        changePercent = overview.revenue_change
        trend = overview.revenue_trend
        break
      case 'billable_hours_monthly':
        currentValue = overview.billable_hours
        changePercent = overview.hours_change
        trend = getTrendDirection(changePercent)
        break
      case 'collection_rate':
        currentValue = overview.collection_rate
        changePercent = overview.collection_change
        trend = getTrendDirection(changePercent)
        break
      case 'cases_opened_monthly':
        currentValue = overview.new_cases_period
        changePercent = prevOverview
          ? calculateChangePercent(overview.new_cases_period, prevOverview.new_cases_period)
          : 0
        trend = getTrendDirection(changePercent)
        break
      case 'cases_closed_monthly':
        currentValue = overview.closed_cases_period
        changePercent = prevOverview
          ? calculateChangePercent(overview.closed_cases_period, prevOverview.closed_cases_period)
          : 0
        trend = getTrendDirection(changePercent)
        break
      case 'utilization_rate':
        currentValue = overview.utilization_rate
        changePercent = overview.utilization_change
        trend = getTrendDirection(changePercent)
        break
    }

    scorecard.push({
      metric_key: key,
      label: info.label,
      current_value: currentValue,
      target_value: targetValue,
      warning_threshold: warningThreshold,
      status: getKPIStatus(currentValue, targetValue, warningThreshold),
      trend,
      change_percent: changePercent,
      format: info.format,
    })
  }

  return scorecard
}

// ============================================================
// Report Generation
// ============================================================

export async function generateReport(
  firmId: string,
  reportType: string,
  startDate: Date,
  endDate: Date,
  options: {
    attorneys?: string[]
    caseTypes?: string[]
    groupBy?: string
  } = {}
): Promise<{
  summary: Record<string, unknown>
  data: { label: string; group_key: string | null; metrics: Record<string, number> }[]
  totals: Record<string, number>
}> {
  const supabase = getServiceClient()

  const { data: firmCases } = await supabase
    .from('cases')
    .select('id, attorney_id, status, case_stage, case_type, client_name, created_at, closed_at')
    .eq('firm_id', firmId)

  let filteredCases = firmCases || []

  if (options.attorneys?.length) {
    filteredCases = filteredCases.filter(c => options.attorneys!.includes(c.attorney_id))
  }
  if (options.caseTypes?.length) {
    filteredCases = filteredCases.filter(c => options.caseTypes!.includes(c.case_type))
  }

  const caseIds = filteredCases.map(c => c.id)
  if (caseIds.length === 0) {
    return { summary: {}, data: [], totals: {} }
  }

  // Fetch data based on report type
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, balance_due, status, case_id, created_at')
    .in('case_id', caseIds)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('duration_minutes, billable, amount, attorney_id, case_id, entry_date')
    .in('case_id', caseIds)
    .gte('entry_date', startDate.toISOString())
    .lte('entry_date', endDate.toISOString())

  // Get attorney profiles
  const attorneyIds = Array.from(new Set(filteredCases.map(c => c.attorney_id).filter(Boolean)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', attorneyIds.length > 0 ? attorneyIds : ['__none__'])

  const profileMap: Record<string, string> = {}
  for (const p of profiles || []) {
    profileMap[p.id] = p.full_name || 'Unknown'
  }

  // Compute totals
  const totalRevenue = (invoices || []).reduce((s, i) => s + (i.total_amount || 0), 0)
  const totalCollected = (invoices || []).reduce((s, i) => s + (i.amount_paid || 0), 0)
  const totalBillableHours = (timeEntries || [])
    .filter(t => t.billable)
    .reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)
  const totalOutstanding = (invoices || []).reduce((s, i) => s + (i.balance_due || 0), 0)

  const summary: Record<string, unknown> = {
    total_revenue: round2(totalRevenue),
    total_collected: round2(totalCollected),
    total_outstanding: round2(totalOutstanding),
    total_billable_hours: round1(totalBillableHours),
    total_cases: filteredCases.length,
    active_cases: filteredCases.filter(c => c.status === 'active').length,
    collection_rate: totalRevenue > 0 ? round1((totalCollected / totalRevenue) * 100) : 0,
  }

  // Group data
  const groupBy = options.groupBy || 'none'
  const groups: Record<string, {
    label: string
    caseIds: string[]
    attorneyId?: string
  }> = {}

  if (groupBy === 'attorney') {
    for (const c of filteredCases) {
      const key = c.attorney_id || 'unassigned'
      if (!groups[key]) {
        groups[key] = {
          label: profileMap[c.attorney_id] || 'Unassigned',
          caseIds: [],
          attorneyId: c.attorney_id,
        }
      }
      groups[key].caseIds.push(c.id)
    }
  } else if (groupBy === 'case_type') {
    const typeLabels: Record<string, string> = {
      divorce: 'Divorce', dissolution: 'Dissolution',
      legal_separation: 'Legal Separation', annulment: 'Annulment',
      custody: 'Custody', support: 'Support', other: 'Other',
    }
    for (const c of filteredCases) {
      const key = c.case_type || 'other'
      if (!groups[key]) {
        groups[key] = { label: typeLabels[key] || key, caseIds: [] }
      }
      groups[key].caseIds.push(c.id)
    }
  } else if (groupBy === 'month') {
    const current = new Date(startDate)
    while (current <= endDate) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
      const label = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      groups[key] = { label, caseIds: caseIds }
      current.setMonth(current.getMonth() + 1)
    }
  } else {
    groups['all'] = { label: 'All', caseIds: caseIds }
  }

  const data: { label: string; group_key: string | null; metrics: Record<string, number> }[] = []

  for (const [key, group] of Object.entries(groups)) {
    let groupInvoices = invoices || []
    let groupTimeEntries = timeEntries || []

    if (groupBy === 'attorney') {
      groupInvoices = groupInvoices.filter(i => group.caseIds.includes(i.case_id))
      groupTimeEntries = groupTimeEntries.filter(t => t.attorney_id === group.attorneyId)
    } else if (groupBy === 'case_type') {
      groupInvoices = groupInvoices.filter(i => group.caseIds.includes(i.case_id))
      groupTimeEntries = groupTimeEntries.filter(t => group.caseIds.includes(t.case_id))
    } else if (groupBy === 'month') {
      const [year, month] = key.split('-').map(Number)
      const mStart = new Date(year, month - 1, 1)
      const mEnd = new Date(year, month, 0)
      groupInvoices = groupInvoices.filter(i => {
        const d = new Date(i.created_at)
        return d >= mStart && d <= mEnd
      })
      groupTimeEntries = groupTimeEntries.filter(t => {
        const d = new Date(t.entry_date)
        return d >= mStart && d <= mEnd
      })
    }

    const revenue = groupInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
    const collected = groupInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0)
    const outstanding = groupInvoices.reduce((s, i) => s + (i.balance_due || 0), 0)
    const hours = groupTimeEntries
      .filter(t => t.billable)
      .reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)
    const caseCount = groupBy === 'month'
      ? filteredCases.filter(c => {
          const d = new Date(c.created_at)
          const [year, month] = key.split('-').map(Number)
          return d.getFullYear() === year && d.getMonth() === month - 1
        }).length
      : group.caseIds.length

    data.push({
      label: group.label,
      group_key: key,
      metrics: {
        revenue: round2(revenue),
        collected: round2(collected),
        outstanding: round2(outstanding),
        billable_hours: round1(hours),
        cases: caseCount,
        collection_rate: revenue > 0 ? round1((collected / revenue) * 100) : 0,
      },
    })
  }

  const totals: Record<string, number> = {
    revenue: round2(totalRevenue),
    collected: round2(totalCollected),
    outstanding: round2(totalOutstanding),
    billable_hours: round1(totalBillableHours),
    cases: filteredCases.length,
    collection_rate: totalRevenue > 0 ? round1((totalCollected / totalRevenue) * 100) : 0,
  }

  return { summary, data, totals }
}

// ============================================================
// Daily Snapshot Computation (for cron)
// ============================================================

export async function computeDailySnapshot(firmId: string) {
  const supabase = getServiceClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  // Cases
  const { data: cases } = await supabase
    .from('cases')
    .select('id, status, case_stage, case_type, attorney_id, created_at, closed_at')
    .eq('firm_id', firmId)

  const activeCases = (cases || []).filter(c => c.status === 'active').length
  const newCases = (cases || []).filter(c => c.created_at?.startsWith(today)).length
  const closedCases = (cases || []).filter(c => c.closed_at?.startsWith(today)).length

  const casesByStage: Record<string, number> = {}
  const casesByType: Record<string, number> = {}
  for (const c of (cases || []).filter(c => c.status === 'active')) {
    const stage = c.case_stage || 'active'
    const type = c.case_type || 'divorce'
    casesByStage[stage] = (casesByStage[stage] || 0) + 1
    casesByType[type] = (casesByType[type] || 0) + 1
  }

  // Financial
  const caseIds = (cases || []).map(c => c.id)
  const { data: todayInvoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, balance_due, status')
    .in('case_id', caseIds.length > 0 ? caseIds : ['__none__'])
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`)

  const { data: mtdInvoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, balance_due, status')
    .in('case_id', caseIds.length > 0 ? caseIds : ['__none__'])
    .gte('created_at', monthStart.toISOString())

  const { data: ytdInvoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid')
    .in('case_id', caseIds.length > 0 ? caseIds : ['__none__'])
    .gte('created_at', yearStart.toISOString())

  const { data: outstandingInvoices } = await supabase
    .from('invoices')
    .select('balance_due')
    .in('case_id', caseIds.length > 0 ? caseIds : ['__none__'])
    .gt('balance_due', 0)
    .not('status', 'eq', 'void')

  // Time entries
  const { data: todayTime } = await supabase
    .from('time_entries')
    .select('duration_minutes, billable, attorney_id, amount')
    .in('case_id', caseIds.length > 0 ? caseIds : ['__none__'])
    .eq('entry_date', today)

  const { data: mtdTime } = await supabase
    .from('time_entries')
    .select('duration_minutes, billable, attorney_id, amount')
    .in('case_id', caseIds.length > 0 ? caseIds : ['__none__'])
    .gte('entry_date', monthStart.toISOString().split('T')[0])

  // Attorney metrics
  const { data: members } = await supabase
    .from('firm_members')
    .select('user_id')
    .eq('firm_id', firmId)
    .eq('status', 'active')
    .in('role', ['owner', 'senior_attorney', 'attorney'])

  const memberIds = (members || []).map(m => m.user_id)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', memberIds.length > 0 ? memberIds : ['__none__'])

  const profileMap: Record<string, string> = {}
  for (const p of profiles || []) {
    profileMap[p.id] = p.full_name || 'Unknown'
  }

  const attorneyMetrics = memberIds.map(uid => {
    const memberCases = (cases || []).filter(c => c.attorney_id === uid && c.status === 'active')
    const memberTime = (mtdTime || []).filter(t => t.attorney_id === uid && t.billable)
    const hours = memberTime.reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)
    const revenue = memberTime.reduce((s, t) => s + (t.amount || 0), 0)

    return {
      user_id: uid,
      full_name: profileMap[uid] || 'Unknown',
      billable_hours: round1(hours),
      revenue: round2(revenue),
      active_cases: memberCases.length,
      utilization: round1(160 > 0 ? Math.min((hours / 160) * 100, 100) : 0),
    }
  })

  const revenueToday = (todayInvoices || []).reduce((s, i) => s + (i.total_amount || 0), 0)
  const revenueMtd = (mtdInvoices || []).reduce((s, i) => s + (i.total_amount || 0), 0)
  const revenueYtd = (ytdInvoices || []).reduce((s, i) => s + (i.total_amount || 0), 0)
  const collectedToday = (todayInvoices || []).reduce((s, i) => s + (i.amount_paid || 0), 0)
  const collectedMtd = (mtdInvoices || []).reduce((s, i) => s + (i.amount_paid || 0), 0)
  const outstandingAR = (outstandingInvoices || []).reduce((s, i) => s + (i.balance_due || 0), 0)

  const billableToday = (todayTime || []).filter(t => t.billable).reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)
  const billableMtd = (mtdTime || []).filter(t => t.billable).reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)
  const nonBillableToday = (todayTime || []).filter(t => !t.billable).reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)
  const totalMtdHours = (mtdTime || []).reduce((s, t) => s + (t.duration_minutes || 0) / 60, 0)

  const utilizationRate = totalMtdHours > 0 ? (billableMtd / totalMtdHours) * 100 : 0
  const collectionRate = revenueMtd > 0 ? (collectedMtd / revenueMtd) * 100 : 0

  // Upsert snapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('analytics_daily_snapshots')
    .upsert({
      firm_id: firmId,
      snapshot_date: today,
      active_cases: activeCases,
      new_cases: newCases,
      closed_cases: closedCases,
      cases_by_stage: casesByStage,
      cases_by_type: casesByType,
      revenue_today: round2(revenueToday),
      revenue_mtd: round2(revenueMtd),
      revenue_ytd: round2(revenueYtd),
      collected_today: round2(collectedToday),
      collected_mtd: round2(collectedMtd),
      outstanding_ar: round2(outstandingAR),
      billable_hours_today: round1(billableToday),
      billable_hours_mtd: round1(billableMtd),
      non_billable_hours_today: round1(nonBillableToday),
      utilization_rate: round1(utilizationRate),
      collection_rate: round1(collectionRate),
      attorney_metrics: attorneyMetrics,
    }, { onConflict: 'firm_id,snapshot_date' })
    .select()
    .single()

  return { data, error }
}

// ============================================================
// Helpers
// ============================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function getEmptyOverview(): DashboardOverview {
  return {
    total_revenue: 0, revenue_change: 0, revenue_trend: 'flat',
    total_collected: 0, collected_change: 0,
    outstanding_ar: 0, ar_change: 0,
    active_cases: 0, cases_change: 0,
    new_cases_period: 0, closed_cases_period: 0,
    billable_hours: 0, hours_change: 0,
    utilization_rate: 0, utilization_change: 0,
    collection_rate: 0, collection_change: 0,
    avg_case_value: 0, avg_case_change: 0,
  }
}
