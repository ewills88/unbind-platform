import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { calculateDeadline, calculateMonthDeadline, formatShortDate } from '@/lib/dates'
import { EventType } from '@/types/events'

interface RouteParams {
  params: Promise<{ caseId: string }>
}

interface CalculateDeadlineRequest {
  trigger_event_type: string
  trigger_date: string
  state_code?: string
}

interface SuggestedEvent {
  event_type: EventType
  title: string
  calculated_date: string
  formatted_date: string
  description: string
  days_from_trigger: number
  is_working_days: boolean
}

interface CalculateDeadlineResponse {
  trigger_event: {
    type: string
    date: string
  }
  state_code: string
  suggested_events: SuggestedEvent[]
}

// Map state_deadlines next_event_type to our EventType enum
const EVENT_TYPE_MAP: Record<string, EventType> = {
  response_due: 'filing_deadline',
  waiting_period_end: 'milestone',
  discovery_due: 'filing_deadline',
  trial_brief_due: 'filing_deadline',
  trial_date: 'court_date',
  discovery_response_due: 'filing_deadline',
  financial_affidavit_due: 'filing_deadline',
  mediation_complete: 'milestone',
}

// Title templates for generated events
const EVENT_TITLE_MAP: Record<string, string> = {
  response_due: 'Response Filing Due',
  waiting_period_end: 'Waiting Period Ends',
  discovery_due: 'Discovery Due',
  trial_brief_due: 'Trial Brief Due',
  trial_date: 'Estimated Trial Date',
  discovery_response_due: 'Discovery Response Due',
  financial_affidavit_due: 'Financial Affidavit Due',
  mediation_complete: 'Mediation Deadline',
}

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { client: null, user: null }
  }

  return { client: supabase, user }
}

// POST /api/cases/[caseId]/events/calculate-deadline
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body: CalculateDeadlineRequest = await request.json()

    // Validate required fields
    if (!body.trigger_event_type || !body.trigger_date) {
      return NextResponse.json(
        { error: 'Missing required fields: trigger_event_type, trigger_date' },
        { status: 400 }
      )
    }

    // Get case to verify access and get state if not provided
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, state')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 })
    }

    // Use provided state_code or fall back to case state
    const stateCode = body.state_code || caseData.state || 'CA'

    // Query state_deadlines for applicable rules
    const { data: deadlineRules, error: rulesError } = await supabase
      .from('state_deadlines')
      .select('*')
      .eq('state_code', stateCode)
      .eq('event_type', body.trigger_event_type)
      .order('deadline_days', { ascending: true })

    if (rulesError) {
      console.error('Error fetching deadline rules:', rulesError)
      return NextResponse.json({ error: 'Failed to fetch deadline rules' }, { status: 500 })
    }

    // Calculate suggested events based on rules
    const triggerDate = new Date(body.trigger_date)
    const suggestedEvents: SuggestedEvent[] = []

    for (const rule of deadlineRules || []) {
      let calculatedDate: Date

      // Special handling for waiting periods (typically months, not days)
      if (rule.next_event_type === 'waiting_period_end' && rule.deadline_days >= 60) {
        // Convert days to approximate months for waiting periods
        const months = Math.round(rule.deadline_days / 30)
        calculatedDate = calculateMonthDeadline(triggerDate, months)
      } else {
        calculatedDate = calculateDeadline(
          triggerDate,
          rule.deadline_days,
          rule.is_working_days,
          stateCode
        )
      }

      const eventType = EVENT_TYPE_MAP[rule.next_event_type] || 'other'
      const title = EVENT_TITLE_MAP[rule.next_event_type] || rule.next_event_type.replace(/_/g, ' ')

      suggestedEvents.push({
        event_type: eventType,
        title: title,
        calculated_date: calculatedDate.toISOString(),
        formatted_date: formatShortDate(calculatedDate),
        description: rule.description || '',
        days_from_trigger: rule.deadline_days,
        is_working_days: rule.is_working_days,
      })
    }

    const response: CalculateDeadlineResponse = {
      trigger_event: {
        type: body.trigger_event_type,
        date: body.trigger_date,
      },
      state_code: stateCode,
      suggested_events: suggestedEvents,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Calculate deadline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
