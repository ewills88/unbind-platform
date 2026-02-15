import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey)
}

export async function calculateDailyFirmMetrics(firmId: string) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

  // Get firm cases
  const { data: firmCases } = await supabase
    .from('cases')
    .select('id')
    .eq('firm_id', firmId)

  const caseIds = (firmCases || []).map(c => c.id)

  if (caseIds.length === 0) {
    return { dailyRevenue: 0, dailyCollections: 0, newCases: 0, activeCases: 0, billableHours: 0 }
  }

  // Revenue metrics from invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid')
    .in('case_id', caseIds)
    .gte('created_at', startOfToday.toISOString())
    .lte('created_at', endOfToday.toISOString())

  const dailyRevenue = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const dailyCollections = (invoices || []).reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)

  // Case metrics
  const { count: newCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', firmId)
    .gte('created_at', startOfToday.toISOString())
    .lte('created_at', endOfToday.toISOString())

  const { count: activeCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', firmId)
    .eq('status', 'active')

  // Time entry metrics
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('duration_minutes, billable')
    .in('case_id', caseIds)
    .gte('entry_date', startOfToday.toISOString().split('T')[0])
    .lte('entry_date', endOfToday.toISOString().split('T')[0])

  const billableHours = (timeEntries || [])
    .filter(t => t.billable)
    .reduce((sum, t) => sum + (t.duration_minutes || 0) / 60, 0)

  // Save to analytics cache
  await supabase.from('firm_analytics_cache').insert({
    firm_id: firmId,
    metric_date: today.toISOString().split('T')[0],
    metric_type: 'daily_summary',
    metric_period: 'daily',
    metric_data: {
      revenue: dailyRevenue,
      collections: dailyCollections,
      new_cases: newCases || 0,
      active_cases: activeCases || 0,
      billable_hours: Math.round(billableHours * 10) / 10,
    },
  })

  return {
    dailyRevenue,
    dailyCollections,
    newCases: newCases || 0,
    activeCases: activeCases || 0,
    billableHours: Math.round(billableHours * 10) / 10,
  }
}

export async function calculateWeeklyFirmMetrics(firmId: string) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)

  // Aggregate daily metrics for the week
  const { data: dailyMetrics } = await supabase
    .from('firm_analytics_cache')
    .select('metric_data')
    .eq('firm_id', firmId)
    .eq('metric_type', 'daily_summary')
    .eq('metric_period', 'daily')
    .gte('metric_date', weekStart.toISOString().split('T')[0])
    .lte('metric_date', today.toISOString().split('T')[0])

  const weeklyData = (dailyMetrics || []).reduce(
    (acc, m) => {
      const data = m.metric_data as Record<string, number>
      return {
        revenue: acc.revenue + (data.revenue || 0),
        collections: acc.collections + (data.collections || 0),
        new_cases: acc.new_cases + (data.new_cases || 0),
        billable_hours: acc.billable_hours + (data.billable_hours || 0),
      }
    },
    { revenue: 0, collections: 0, new_cases: 0, billable_hours: 0 }
  )

  await supabase.from('firm_analytics_cache').insert({
    firm_id: firmId,
    metric_date: today.toISOString().split('T')[0],
    metric_type: 'weekly_summary',
    metric_period: 'weekly',
    metric_data: weeklyData,
  })

  return weeklyData
}

export async function calculateMonthlyFirmMetrics(firmId: string) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  // Aggregate daily metrics for the month
  const { data: dailyMetrics } = await supabase
    .from('firm_analytics_cache')
    .select('metric_data')
    .eq('firm_id', firmId)
    .eq('metric_type', 'daily_summary')
    .eq('metric_period', 'daily')
    .gte('metric_date', monthStart.toISOString().split('T')[0])
    .lte('metric_date', today.toISOString().split('T')[0])

  const monthlyData = (dailyMetrics || []).reduce(
    (acc, m) => {
      const data = m.metric_data as Record<string, number>
      return {
        revenue: acc.revenue + (data.revenue || 0),
        collections: acc.collections + (data.collections || 0),
        new_cases: acc.new_cases + (data.new_cases || 0),
        billable_hours: acc.billable_hours + (data.billable_hours || 0),
      }
    },
    { revenue: 0, collections: 0, new_cases: 0, billable_hours: 0 }
  )

  await supabase.from('firm_analytics_cache').insert({
    firm_id: firmId,
    metric_date: today.toISOString().split('T')[0],
    metric_type: 'monthly_summary',
    metric_period: 'monthly',
    metric_data: monthlyData,
  })

  return monthlyData
}

// Entry point for cron job: calculate metrics for all active firms
export async function calculateAllFirmMetrics() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  const { data: firms } = await supabase
    .from('firms')
    .select('id')

  const today = new Date()
  const isMonday = today.getDay() === 1
  const isFirstOfMonth = today.getDate() === 1

  for (const firm of firms || []) {
    await calculateDailyFirmMetrics(firm.id)

    if (isMonday) {
      await calculateWeeklyFirmMetrics(firm.id)
    }

    if (isFirstOfMonth) {
      await calculateMonthlyFirmMetrics(firm.id)
    }
  }
}
