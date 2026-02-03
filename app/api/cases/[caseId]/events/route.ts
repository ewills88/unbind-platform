import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { CreateEventRequest, CaseEventWithDetails, EventsResponse } from '@/types/events'

// Create authenticated Supabase client
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

interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/events - List all events for a case
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)

    // Optional filters
    const status = searchParams.get('status')
    const eventType = searchParams.get('event_type')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('case_events')
      .select(`
        *,
        assignee:assigned_to(id, full_name, role),
        creator:created_by(id, full_name)
      `)
      .eq('case_id', caseId)
      .order('event_date', { ascending: true })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    if (fromDate) {
      query = query.gte('event_date', fromDate)
    }
    if (toDate) {
      query = query.lte('event_date', toDate)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    const response: EventsResponse = {
      events: events as CaseEventWithDetails[],
      total_count: events?.length || 0
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Events GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/events - Create a new event
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body: CreateEventRequest = await request.json()

    // Validate required fields
    if (!body.event_type || !body.title || !body.event_date) {
      return NextResponse.json(
        { error: 'Missing required fields: event_type, title, event_date' },
        { status: 400 }
      )
    }

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 })
    }

    // Create the event
    const { data: event, error } = await supabase
      .from('case_events')
      .insert({
        case_id: caseId,
        event_type: body.event_type,
        title: body.title,
        description: body.description || null,
        event_date: body.event_date,
        all_day: body.all_day ?? false,
        assigned_to: body.assigned_to || null,
        created_by: user.id,
        status: 'upcoming'
      })
      .select(`
        *,
        assignee:assigned_to(id, full_name, role),
        creator:created_by(id, full_name)
      `)
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Events POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
