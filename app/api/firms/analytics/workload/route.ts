import { NextResponse } from 'next/server'
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

// GET /api/firms/analytics/workload - Workload distribution data
export async function GET() {
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

    // Get firm attorneys
    const { data: members } = await supabase
      .from('firm_members')
      .select('user_id, role')
      .eq('firm_id', firmId)
      .eq('status', 'active')
      .in('role', ['owner', 'senior_attorney', 'attorney'])

    if (!members || members.length === 0) {
      return NextResponse.json({ workload: { attorneys: [], recommendations: [] } })
    }

    const memberIds = members.map(m => m.user_id)

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', memberIds)

    const profileMap: Record<string, string> = {}
    for (const p of profiles || []) {
      profileMap[p.id] = p.full_name || p.email
    }

    // Date calculations
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const attorneys = []
    const warnings = []
    const TARGET_HOURS = 160 // monthly target
    const MAX_CASES = 25 // capacity threshold

    for (const memberId of memberIds) {
      const name = profileMap[memberId] || 'Unknown'
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

      // Active cases
      const { data: cases } = await supabase
        .from('cases')
        .select('id, case_stage, status')
        .eq('attorney_id', memberId)
        .eq('status', 'active')

      const activeCases = cases?.length || 0
      const casesInDiscovery = (cases || []).filter(c => c.case_stage === 'discovery').length
      const casesInSettlement = (cases || []).filter(c =>
        c.case_stage === 'settlement' || c.case_stage === 'negotiation'
      ).length

      // Weekly billable hours
      const { data: weekEntries } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('attorney_id', memberId)
        .eq('billable', true)
        .gte('entry_date', weekStart.toISOString())

      const weeklyHours = (weekEntries || []).reduce(
        (sum, t) => sum + (t.duration_minutes || 0) / 60, 0
      )

      // Monthly billable hours
      const { data: monthEntries } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('attorney_id', memberId)
        .eq('billable', true)
        .gte('entry_date', monthStart.toISOString())

      const monthlyHours = (monthEntries || []).reduce(
        (sum, t) => sum + (t.duration_minutes || 0) / 60, 0
      )

      const capacityPercentage = Math.round((activeCases / MAX_CASES) * 100)
      const utilizationRate = TARGET_HOURS > 0
        ? Math.round((monthlyHours / TARGET_HOURS) * 100)
        : 0

      attorneys.push({
        user_id: memberId,
        full_name: name,
        initials,
        active_cases: activeCases,
        billable_hours_this_week: Math.round(weeklyHours * 10) / 10,
        billable_hours_this_month: Math.round(monthlyHours * 10) / 10,
        target_hours: TARGET_HOURS,
        capacity_percentage: Math.min(capacityPercentage, 100),
        utilization_rate: Math.min(utilizationRate, 100),
        cases_in_discovery: casesInDiscovery,
        cases_in_settlement: casesInSettlement,
      })

      if (capacityPercentage > 80) {
        warnings.push({
          user_id: memberId,
          user_name: name,
          capacity_percentage: capacityPercentage,
          active_cases: activeCases,
          billable_hours: Math.round(weeklyHours * 10) / 10,
        })
      }
    }

    // Sort by capacity descending
    attorneys.sort((a, b) => b.capacity_percentage - a.capacity_percentage)

    // Generate recommendations
    const recommendations = []
    const overloaded = attorneys.filter(a => a.capacity_percentage > 80)
    const underloaded = attorneys.filter(a => a.capacity_percentage < 40)

    if (overloaded.length > 0 && underloaded.length > 0) {
      recommendations.push({
        message: `${overloaded[0].full_name} has ${overloaded[0].active_cases} active cases (${overloaded[0].capacity_percentage}% capacity). Consider reassigning cases to ${underloaded[0].full_name} who is at ${underloaded[0].capacity_percentage}% capacity.`,
        action: 'Reassign Cases',
      })
    }

    if (overloaded.length > 0) {
      recommendations.push({
        message: `${overloaded.length} attorney(s) are operating above 80% capacity. Consider hiring additional staff or redistributing workload.`,
      })
    }

    const lowUtilization = attorneys.filter(a => a.utilization_rate < 50 && a.active_cases > 0)
    if (lowUtilization.length > 0) {
      recommendations.push({
        message: `${lowUtilization[0].full_name} has ${lowUtilization[0].active_cases} cases but only ${lowUtilization[0].utilization_rate}% utilization. Review if cases need more attention or billable activities.`,
      })
    }

    if (recommendations.length === 0) {
      recommendations.push({
        message: 'Workload is well-balanced across the team. All attorneys are within normal capacity ranges.',
      })
    }

    return NextResponse.json({
      workload: { attorneys, recommendations },
      warnings,
    })
  } catch (error) {
    console.error('Workload analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
