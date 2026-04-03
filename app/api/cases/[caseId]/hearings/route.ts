import { NextRequest, NextResponse } from 'next/server'
import { addDays } from 'date-fns'
import { getAuthenticatedClient } from '@/lib/supabase/server'

const HEARING_TYPE_NAMES: Record<string, string> = {
  status_conference: 'Status Conference',
  cmc: 'Case Management Conference',
  rfo: 'Request for Order Hearing',
  motion: 'Motion Hearing',
  osc: 'Order to Show Cause',
  settlement_conference: 'Settlement Conference',
  msc: 'Mandatory Settlement Conference',
  trial: 'Trial',
  prove_up: 'Prove-Up Hearing',
  default: 'Default Hearing',
  other: 'Hearing',
}

// GET /api/cases/[caseId]/hearings - List hearings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('court_hearings')
      .select(`
        *,
        court:courts(court_name, county),
        related_filing:case_filings(id, filing_name),
        prep_tasks:hearing_prep_tasks(*),
        exhibits:hearing_exhibits(*)
      `)
      .eq('case_id', caseId)
      .order('hearing_date', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    if (upcoming) {
      query = query.gte('hearing_date', new Date().toISOString().split('T')[0])
      query = query.neq('status', 'vacated')
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Hearings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/hearings - Schedule a hearing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    if (!body.hearing_type || !body.hearing_date) {
      return NextResponse.json({ error: 'hearing_type and hearing_date are required' }, { status: 400 })
    }

    // Get case firm_id
    const { data: caseData } = await supabase
      .from('cases')
      .select('firm_id')
      .eq('id', caseId)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const hearingName = body.hearing_name || HEARING_TYPE_NAMES[body.hearing_type] || 'Hearing'

    const { data, error } = await supabase
      .from('court_hearings')
      .insert({
        case_id: caseId,
        firm_id: caseData.firm_id,
        hearing_type: body.hearing_type,
        hearing_name: hearingName,
        hearing_date: body.hearing_date,
        hearing_time: body.hearing_time || null,
        estimated_duration: body.estimated_duration || null,
        court_id: body.court_id || null,
        department: body.department || null,
        judge_name: body.judge_name || null,
        appearance_type: body.appearance_type || 'in_person',
        remote_link: body.remote_link || null,
        remote_phone: body.remote_phone || null,
        remote_access_code: body.remote_access_code || null,
        related_filing_id: body.related_filing_id || null,
        issues_to_be_heard: body.issues_to_be_heard || [],
        status: 'scheduled',
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create default prep tasks
    const hearingDate = new Date(body.hearing_date)
    const defaultTasks = [
      {
        hearing_id: data.id,
        task_title: 'Prepare client for hearing',
        task_type: 'client_prep',
        due_date: addDays(hearingDate, -3).toISOString().split('T')[0],
        status: 'pending',
      },
      {
        hearing_id: data.id,
        task_title: 'Prepare exhibits and documents',
        task_type: 'document_prep',
        due_date: addDays(hearingDate, -2).toISOString().split('T')[0],
        status: 'pending',
      },
      {
        hearing_id: data.id,
        task_title: 'Check for tentative ruling',
        task_type: 'other',
        due_date: addDays(hearingDate, -1).toISOString().split('T')[0],
        status: 'pending',
      },
    ]

    await supabase.from('hearing_prep_tasks').insert(defaultTasks)

    // Create calendar event (ignore errors)
    try {
      await supabase.from('case_events').insert({
        case_id: caseId,
        event_type: 'hearing',
        title: hearingName,
        description: `${body.hearing_type} hearing${body.department ? ` in Dept. ${body.department}` : ''}`,
        start_date: body.hearing_time
          ? new Date(`${body.hearing_date}T${body.hearing_time}`)
          : new Date(body.hearing_date),
        all_day: !body.hearing_time,
      })
    } catch {
      // Ignore calendar event creation errors
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Hearings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
