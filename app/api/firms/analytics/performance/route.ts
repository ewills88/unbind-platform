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

// GET /api/firms/analytics/performance - Attorney performance data
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
    const attorneyFilter = searchParams.get('attorney') || 'all'
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    // Get firm members who are attorneys
    const { data: members } = await supabase
      .from('firm_members')
      .select('user_id')
      .eq('firm_id', firmId)
      .eq('status', 'active')
      .in('role', ['owner', 'senior_attorney', 'attorney'])

    if (!members || members.length === 0) {
      return NextResponse.json({ performance: [] })
    }

    const memberIds = attorneyFilter !== 'all'
      ? [attorneyFilter]
      : members.map(m => m.user_id)

    // Get profiles for these members
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', memberIds)

    const profileMap: Record<string, { full_name: string; email: string }> = {}
    for (const p of profiles || []) {
      profileMap[p.id] = { full_name: p.full_name || p.email, email: p.email }
    }

    // Batch-fetch all cases for these attorneys in one query
    const { data: allCases } = await supabase
      .from('cases')
      .select('id, attorney_id, status')
      .in('attorney_id', memberIds)

    // Batch-fetch all billable time entries for these attorneys in one query
    let timeQuery = supabase
      .from('time_entries')
      .select('duration_minutes, billable, amount, activity_type, attorney_id')
      .in('attorney_id', memberIds)
      .eq('billable', true)

    if (startDate) timeQuery = timeQuery.gte('entry_date', startDate)
    if (endDate) timeQuery = timeQuery.lte('entry_date', endDate)

    const { data: allTimeEntries } = await timeQuery

    // Build performance data per attorney (in-memory filtering)
    const performance = []

    for (const memberId of memberIds) {
      const memberCases = (allCases || []).filter(c => c.attorney_id === memberId)
      const activeCases = memberCases.filter(c => c.status === 'active').length
      const caseCount = memberCases.length

      const memberTimeEntries = (allTimeEntries || []).filter(t => t.attorney_id === memberId)
      const billableHours = memberTimeEntries.reduce(
        (sum, t) => sum + (t.duration_minutes || 0) / 60, 0
      )
      const revenue = memberTimeEntries.reduce(
        (sum, t) => sum + (t.amount || 0), 0
      )

      const avgCaseValue = caseCount > 0 ? revenue / caseCount : 0

      // Utilization (assuming 8hr day, ~22 working days)
      const targetHours = 160
      const utilization = targetHours > 0
        ? Math.round((billableHours / targetHours) * 100)
        : 0

      const prof = profileMap[memberId]
      const name = prof?.full_name || 'Unknown'
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

      performance.push({
        user_id: memberId,
        full_name: name,
        email: prof?.email || '',
        initials,
        active_cases: activeCases,
        billable_hours: Math.round(billableHours * 10) / 10,
        revenue: Math.round(revenue * 100) / 100,
        avg_case_value: Math.round(avgCaseValue * 100) / 100,
        utilization_rate: Math.min(utilization, 100),
        client_satisfaction: 4.5,
        settlement_rate: 75,
      })
    }

    // Sort by revenue descending
    performance.sort((a, b) => b.revenue - a.revenue)

    return NextResponse.json({ performance })
  } catch (error) {
    console.error('Attorney performance GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
