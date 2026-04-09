import { NextRequest, NextResponse } from 'next/server'
import { getDaysUntilDeadline } from '@/lib/discovery/deadlineCalculator'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/discovery/dashboard - Firm-wide discovery dashboard data
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all discovery requests the user can see
    const { data: discoveries, error: discError } = await supabase
      .from('discovery_requests')
      .select(`
        id, case_id, discovery_type, direction, title, status,
        response_due_date, extended_due_date, item_count,
        served_date, set_number
      `)
      .order('response_due_date', { ascending: true })

    if (discError) {
      return NextResponse.json({ error: discError.message }, { status: 500 })
    }

    const allDiscoveries = discoveries || []

    // Compute stats
    const now = new Date()
    let totalActive = 0
    let overdue = 0
    let dueIn7Days = 0
    let dueIn30Days = 0
    let responded = 0

    interface UpcomingDeadline {
      id: string
      case_id: string
      title: string
      due_date: string
      days_until: number
      urgency: string
      discovery_type: string
    }

    const upcomingDeadlines: UpcomingDeadline[] = []

    for (const d of allDiscoveries) {
      if (d.status === 'responded') {
        responded++
        continue
      }

      totalActive++
      const effectiveDue = d.extended_due_date || d.response_due_date
      if (!effectiveDue) continue

      const deadline = getDaysUntilDeadline(effectiveDue)
      const dueDate = new Date(effectiveDue)

      if (dueDate < now && d.status !== 'responded') {
        overdue++
      }
      if (deadline.days >= 0 && deadline.days <= 7) {
        dueIn7Days++
      }
      if (deadline.days >= 0 && deadline.days <= 30) {
        dueIn30Days++
      }

      if (deadline.days <= 30 && d.status !== 'responded') {
        upcomingDeadlines.push({
          id: d.id,
          case_id: d.case_id,
          title: d.title,
          due_date: effectiveDue,
          days_until: deadline.days,
          urgency: deadline.urgency,
          discovery_type: d.discovery_type,
        })
      }
    }

    // Sort upcoming deadlines by due date
    upcomingDeadlines.sort((a, b) => a.days_until - b.days_until)

    // Fetch upcoming depositions
    const { data: depositions } = await supabase
      .from('depositions')
      .select('id, case_id, deponent_name, deponent_type, scheduled_date, location, location_type, status')
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_date', now.toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(10)

    // Group discovery by case for the by-case table
    const caseIds = Array.from(new Set(allDiscoveries.map(d => d.case_id)))

    const { data: cases } = await supabase
      .from('cases')
      .select('id, case_number, client_name, spouse_name, status')
      .in('id', caseIds.length > 0 ? caseIds : ['none'])

    const caseMap = new Map((cases || []).map(c => [c.id, c]))

    interface CaseSummary {
      case_id: string
      case_number: string
      case_name: string
      case_status: string
      total_discovery: number
      active: number
      overdue: number
      next_deadline: string | null
    }

    const byCaseMap = new Map<string, CaseSummary>()
    for (const d of allDiscoveries) {
      const c = caseMap.get(d.case_id)
      if (!byCaseMap.has(d.case_id)) {
        byCaseMap.set(d.case_id, {
          case_id: d.case_id,
          case_number: c?.case_number || '',
          case_name: c ? `${c.client_name || ''} v. ${c.spouse_name || ''}` : '',
          case_status: c?.status || '',
          total_discovery: 0,
          active: 0,
          overdue: 0,
          next_deadline: null,
        })
      }
      const entry = byCaseMap.get(d.case_id)!
      entry.total_discovery++

      if (d.status !== 'responded') {
        entry.active++
        const effectiveDue = d.extended_due_date || d.response_due_date
        if (effectiveDue) {
          const dueDate = new Date(effectiveDue)
          if (dueDate < now) entry.overdue++
          if (!entry.next_deadline || effectiveDue < entry.next_deadline) {
            entry.next_deadline = effectiveDue
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        stats: {
          total_active: totalActive,
          overdue,
          due_in_7_days: dueIn7Days,
          due_in_30_days: dueIn30Days,
          responded,
          total: allDiscoveries.length,
        },
        upcoming_deadlines: upcomingDeadlines.slice(0, 15),
        upcoming_depositions: depositions || [],
        by_case: Array.from(byCaseMap.values()).sort((a, b) => {
          // Sort by overdue first, then next deadline
          if (a.overdue !== b.overdue) return b.overdue - a.overdue
          if (a.next_deadline && b.next_deadline) return a.next_deadline.localeCompare(b.next_deadline)
          if (a.next_deadline) return -1
          if (b.next_deadline) return 1
          return 0
        }),
      },
    })
  } catch (error) {
    console.error('Discovery dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
