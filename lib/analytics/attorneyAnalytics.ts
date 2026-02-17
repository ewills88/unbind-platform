// Session 19 CP2: Attorney Analytics Service
// Individual performance, team comparison, and productivity trends

import { createClient } from '@supabase/supabase-js'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface DateRange {
  start: Date
  end: Date
}

// ============================================================
// Individual Attorney Performance
// ============================================================

export interface AttorneyPerformanceReport {
  attorney: { id: string; name: string }
  productivity: {
    totalHours: number
    billableHours: number
    nonBillableHours: number
    utilizationRate: number
    byTaskType: { type: string; hours: number }[]
    dailyTrend: { date: string; total: number; billable: number }[]
  }
  caseManagement: {
    activeCases: number
    totalCases: number
    casesClosedInPeriod: number
    taskCompletionRate: number
  }
  financial: {
    revenueGenerated: number
    collectionsGenerated: number
    realizationRate: number
    averageBillingRate: number
  }
}

export async function getAttorneyPerformance(
  firmId: string,
  attorneyId: string,
  dateRange?: DateRange
): Promise<AttorneyPerformanceReport> {
  const supabase = getServiceClient()
  const { start, end } = dateRange || getDefaultDateRange()

  // Attorney profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', attorneyId)
    .single()

  // Cases assigned to this attorney
  const { data: cases } = await supabase
    .from('cases')
    .select('id, status, created_at, closed_at')
    .eq('firm_id', firmId)
    .eq('attorney_id', attorneyId)

  const caseIds = (cases || []).map(c => c.id)
  const activeCases = (cases || []).filter(c => c.status === 'active').length
  const casesClosedInPeriod = (cases || []).filter(c =>
    c.closed_at && new Date(c.closed_at) >= start && new Date(c.closed_at) <= end
  ).length

  // Time entries in period
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('duration_minutes, billable, activity_type, entry_date, amount')
    .eq('attorney_id', attorneyId)
    .in('case_id', caseIds.length > 0 ? caseIds : ['__none__'])
    .gte('entry_date', start.toISOString().split('T')[0])
    .lte('entry_date', end.toISOString().split('T')[0])

  const totalMinutes = (timeEntries || []).reduce((s, t) => s + (t.duration_minutes || 0), 0)
  const billableMinutes = (timeEntries || []).filter(t => t.billable)
    .reduce((s, t) => s + (t.duration_minutes || 0), 0)

  const totalHours = totalMinutes / 60
  const billableHours = billableMinutes / 60
  const utilizationRate = totalMinutes > 0 ? (billableMinutes / totalMinutes) * 100 : 0

  // Hours by task type
  const taskTypeMap: Record<string, number> = {}
  for (const te of timeEntries || []) {
    const type = te.activity_type || 'other'
    taskTypeMap[type] = (taskTypeMap[type] || 0) + (te.duration_minutes || 0) / 60
  }

  // Daily trend
  const dailyMap: Record<string, { total: number; billable: number }> = {}
  for (const te of timeEntries || []) {
    const date = te.entry_date
    if (!dailyMap[date]) dailyMap[date] = { total: 0, billable: 0 }
    dailyMap[date].total += (te.duration_minutes || 0) / 60
    if (te.billable) dailyMap[date].billable += (te.duration_minutes || 0) / 60
  }

  // Revenue from invoices on attorney's cases
  let revenueGenerated = 0
  let collectionsGenerated = 0
  if (caseIds.length > 0) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid')
      .in('case_id', caseIds)
      .gte('issue_date', start.toISOString().split('T')[0])
      .lte('issue_date', end.toISOString().split('T')[0])

    revenueGenerated = (invoices || []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
    collectionsGenerated = (invoices || []).reduce((s, i) => s + (Number(i.amount_paid) || 0), 0)
  }

  // Task completion
  let taskCompletionRate = 100
  if (caseIds.length > 0) {
    const { data: tasks } = await supabase
      .from('delegated_tasks')
      .select('id, status')
      .eq('firm_id', firmId)
      .eq('assigned_to', attorneyId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    const totalTasks = tasks?.length || 0
    const completedTasks = (tasks || []).filter(t =>
      t.status === 'completed' || t.status === 'approved'
    ).length
    taskCompletionRate = totalTasks > 0 ? round1((completedTasks / totalTasks) * 100) : 100
  }

  return {
    attorney: { id: attorneyId, name: profile?.full_name || 'Unknown' },
    productivity: {
      totalHours: round1(totalHours),
      billableHours: round1(billableHours),
      nonBillableHours: round1(totalHours - billableHours),
      utilizationRate: round1(utilizationRate),
      byTaskType: Object.entries(taskTypeMap)
        .map(([type, hours]) => ({ type, hours: round1(hours) }))
        .sort((a, b) => b.hours - a.hours),
      dailyTrend: Object.entries(dailyMap)
        .map(([date, d]) => ({ date, total: round1(d.total), billable: round1(d.billable) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    },
    caseManagement: {
      activeCases,
      totalCases: cases?.length || 0,
      casesClosedInPeriod,
      taskCompletionRate,
    },
    financial: {
      revenueGenerated: round2(revenueGenerated),
      collectionsGenerated: round2(collectionsGenerated),
      realizationRate: revenueGenerated > 0 ? round1((collectionsGenerated / revenueGenerated) * 100) : 0,
      averageBillingRate: billableHours > 0 ? Math.round(revenueGenerated / billableHours) : 0,
    },
  }
}

// ============================================================
// Team Performance Comparison
// ============================================================

export interface TeamPerformanceReport {
  attorneys: (AttorneyPerformanceReport & { role: string })[]
  teamTotals: {
    totalHours: number
    billableHours: number
    revenueGenerated: number
    collectionsGenerated: number
    activeCases: number
    casesClosedInPeriod: number
  }
  teamAverages: {
    avgBillableHours: number
    avgUtilizationRate: number
    avgRevenueGenerated: number
  }
}

export async function getTeamPerformance(firmId: string, dateRange?: DateRange): Promise<TeamPerformanceReport> {
  const supabase = getServiceClient()
  const { start, end } = dateRange || getDefaultDateRange()

  // Get attorneys in firm
  const { data: members } = await supabase
    .from('firm_members')
    .select('user_id, role')
    .eq('firm_id', firmId)
    .eq('status', 'active')
    .in('role', ['owner', 'senior_attorney', 'attorney'])

  if (!members || members.length === 0) {
    return {
      attorneys: [],
      teamTotals: { totalHours: 0, billableHours: 0, revenueGenerated: 0, collectionsGenerated: 0, activeCases: 0, casesClosedInPeriod: 0 },
      teamAverages: { avgBillableHours: 0, avgUtilizationRate: 0, avgRevenueGenerated: 0 },
    }
  }

  const roleMap: Record<string, string> = {}
  for (const m of members) roleMap[m.user_id] = m.role

  // Get performance for each attorney
  const performances = await Promise.all(
    members.map(async (m) => {
      const perf = await getAttorneyPerformance(firmId, m.user_id, { start, end })
      return { ...perf, role: m.role }
    })
  )

  const teamTotals = {
    totalHours: round1(performances.reduce((s, p) => s + p.productivity.totalHours, 0)),
    billableHours: round1(performances.reduce((s, p) => s + p.productivity.billableHours, 0)),
    revenueGenerated: round2(performances.reduce((s, p) => s + p.financial.revenueGenerated, 0)),
    collectionsGenerated: round2(performances.reduce((s, p) => s + p.financial.collectionsGenerated, 0)),
    activeCases: performances.reduce((s, p) => s + p.caseManagement.activeCases, 0),
    casesClosedInPeriod: performances.reduce((s, p) => s + p.caseManagement.casesClosedInPeriod, 0),
  }

  const count = performances.length
  const teamAverages = {
    avgBillableHours: count > 0 ? round1(teamTotals.billableHours / count) : 0,
    avgUtilizationRate: count > 0
      ? round1(performances.reduce((s, p) => s + p.productivity.utilizationRate, 0) / count)
      : 0,
    avgRevenueGenerated: count > 0 ? round2(teamTotals.revenueGenerated / count) : 0,
  }

  return {
    attorneys: performances.sort((a, b) => b.financial.revenueGenerated - a.financial.revenueGenerated),
    teamTotals,
    teamAverages,
  }
}

// ============================================================
// Productivity Trends
// ============================================================

export interface ProductivityTrendReport {
  trends: { month: string; billableHours: number; revenue: number }[]
  averageBillableHours: number
  averageRevenue: number
}

export async function getProductivityTrends(
  firmId: string,
  attorneyId?: string,
  months: number = 6
): Promise<ProductivityTrendReport> {
  const supabase = getServiceClient()

  // Get relevant case IDs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let caseQuery = (supabase as any).from('cases').select('id').eq('firm_id', firmId)
  if (attorneyId) caseQuery = caseQuery.eq('attorney_id', attorneyId)
  const { data: cases } = await caseQuery
  const caseIds = (cases || []).map((c: { id: string }) => c.id)

  if (caseIds.length === 0) {
    return { trends: [], averageBillableHours: 0, averageRevenue: 0 }
  }

  // Fetch all time entries and invoices for the range in bulk
  const rangeStart = startOfMonth(subMonths(new Date(), months - 1))
  const rangeEnd = endOfMonth(new Date())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let timeQuery = (supabase as any)
    .from('time_entries')
    .select('duration_minutes, billable, entry_date')
    .in('case_id', caseIds)
    .eq('billable', true)
    .gte('entry_date', rangeStart.toISOString().split('T')[0])
    .lte('entry_date', rangeEnd.toISOString().split('T')[0])

  if (attorneyId) timeQuery = timeQuery.eq('attorney_id', attorneyId)

  const { data: allTimeEntries } = await timeQuery

  const { data: allInvoices } = await supabase
    .from('invoices')
    .select('total_amount, issue_date')
    .in('case_id', caseIds)
    .gte('issue_date', rangeStart.toISOString().split('T')[0])
    .lte('issue_date', rangeEnd.toISOString().split('T')[0])

  // Build monthly trends
  const trends: { month: string; billableHours: number; revenue: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i)
    const mStart = startOfMonth(monthDate)
    const mEnd = endOfMonth(monthDate)
    const label = format(monthDate, 'MMM yyyy')

    const monthTime = (allTimeEntries || []).filter((t: { entry_date: string }) => {
      const d = new Date(t.entry_date)
      return d >= mStart && d <= mEnd
    })

    const monthInvoices = (allInvoices || []).filter((inv: { issue_date: string }) => {
      const d = new Date(inv.issue_date)
      return d >= mStart && d <= mEnd
    })

    const billableHours = monthTime.reduce((s: number, t: { duration_minutes: number }) =>
      s + (t.duration_minutes || 0) / 60, 0
    )
    const revenue = monthInvoices.reduce((s: number, inv: { total_amount: number }) =>
      s + (Number(inv.total_amount) || 0), 0
    )

    trends.push({ month: label, billableHours: round1(billableHours), revenue: round2(revenue) })
  }

  return {
    trends,
    averageBillableHours: trends.length > 0
      ? round1(trends.reduce((s, t) => s + t.billableHours, 0) / trends.length)
      : 0,
    averageRevenue: trends.length > 0
      ? round2(trends.reduce((s, t) => s + t.revenue, 0) / trends.length)
      : 0,
  }
}

// ============================================================
// Helpers
// ============================================================

function getDefaultDateRange(): DateRange {
  return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
