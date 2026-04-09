import { NextRequest, NextResponse } from 'next/server'
import { calculateDiscoveryDeadline, getDaysUntilDeadline } from '@/lib/discovery/deadlineCalculator'
import { generateDiscoveryTitle } from '@/types/discovery'
import type { DiscoveryType, DiscoveryDirection } from '@/types/discovery'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/discovery - List discovery requests for a case
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)

    const direction = searchParams.get('direction')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = supabase
      .from('discovery_requests')
      .select(`
        *,
        extensions:discovery_extensions(*)
      `)
      .eq('case_id', caseId)
      .order('response_due_date', { ascending: true })

    if (direction && direction !== 'all') {
      query = query.eq('direction', direction)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('discovery_type', type)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add computed fields
    const enrichedData = (data || []).map(discovery => {
      const effectiveDueDate = discovery.extended_due_date || discovery.response_due_date
      if (!effectiveDueDate) {
        return { ...discovery, days_until_due: null, urgency: 'normal', effective_due_date: null }
      }
      const deadline = getDaysUntilDeadline(effectiveDueDate)
      return {
        ...discovery,
        days_until_due: deadline.days,
        urgency: deadline.urgency,
        effective_due_date: effectiveDueDate,
      }
    })

    return NextResponse.json({ data: enrichedData })
  } catch (error) {
    console.error('Discovery GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/discovery - Create a discovery request
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    if (!body.discovery_type || !body.direction || !body.served_date || !body.service_method) {
      return NextResponse.json(
        { error: 'discovery_type, direction, served_date, and service_method are required' },
        { status: 400 }
      )
    }

    // Get case for state_code and firm_id
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, state_code, firm_id, attorney_id')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const stateCode = caseData.state_code || 'CA'

    // Calculate deadline
    const deadline = await calculateDiscoveryDeadline({
      stateCode,
      discoveryType: body.discovery_type,
      servedDate: new Date(body.served_date),
      serviceMethod: body.service_method,
    })

    const title = body.title || generateDiscoveryTitle(
      body.discovery_type as DiscoveryType,
      body.set_number || 'Set One',
      body.direction as DiscoveryDirection
    )

    // Create discovery request
    const { data, error } = await supabase
      .from('discovery_requests')
      .insert({
        case_id: caseId,
        firm_id: caseData.firm_id || null,
        discovery_type: body.discovery_type,
        direction: body.direction,
        set_number: body.set_number || 'Set One',
        title,
        propounding_party: body.propounding_party || null,
        responding_party: body.responding_party || null,
        served_date: body.served_date,
        service_method: body.service_method,
        response_due_date: deadline.dueDate,
        item_count: body.item_count || 0,
        status: body.direction === 'incoming' ? 'pending' : 'responded',
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create calendar events for incoming discovery
    if (body.direction === 'incoming' && deadline.dueDate) {
      await createDiscoveryCalendarEvents(supabase, caseId, data, deadline)
    }

    return NextResponse.json({
      data,
      deadline: {
        due_date: deadline.dueDate,
        total_days: deadline.totalDays,
        statutory_reference: deadline.statutoryReference,
        warnings: deadline.warnings,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Discovery POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function createDiscoveryCalendarEvents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  caseId: string,
  discovery: { id: string; title: string },
  deadline: { dueDate: string; statutoryReference: string; warnings: string[] }
) {
  const dueDate = new Date(deadline.dueDate)

  // Response due date event
  await supabase.from('case_events').insert({
    case_id: caseId,
    event_type: 'filing_deadline',
    title: `Discovery Response Due: ${discovery.title}`,
    description: [
      `Response to ${discovery.title}`,
      deadline.statutoryReference ? `\n${deadline.statutoryReference}` : '',
      deadline.warnings.length > 0 ? `\n${deadline.warnings.join('\n')}` : '',
    ].join(''),
    event_date: dueDate.toISOString(),
    all_day: true,
    status: 'upcoming',
  })

  // Start drafting reminder (14 days before)
  const draftDate = new Date(dueDate)
  draftDate.setDate(draftDate.getDate() - 14)
  if (draftDate > new Date()) {
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'task',
      title: `Start Drafting: ${discovery.title}`,
      description: `Begin drafting responses to ${discovery.title}. Due in 14 days.`,
      event_date: draftDate.toISOString(),
      all_day: true,
      status: 'upcoming',
    })
  }

  // Attorney review reminder (7 days before)
  const reviewDate = new Date(dueDate)
  reviewDate.setDate(reviewDate.getDate() - 7)
  if (reviewDate > new Date()) {
    await supabase.from('case_events').insert({
      case_id: caseId,
      event_type: 'task',
      title: `Attorney Review: ${discovery.title}`,
      description: `Review draft responses to ${discovery.title}. Due in 7 days.`,
      event_date: reviewDate.toISOString(),
      all_day: true,
      status: 'upcoming',
    })
  }
}
