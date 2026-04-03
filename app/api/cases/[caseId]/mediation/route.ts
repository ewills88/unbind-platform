import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/mediation
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    const { data, error } = await supabase
      .from('mediation_sessions')
      .select('*')
      .eq('case_id', caseId)
      .order('session_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Mediation GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/mediation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    // Get firm_id and next session number
    const [caseRes, sessionsRes] = await Promise.all([
      supabase.from('cases').select('firm_id').eq('id', caseId).single(),
      supabase.from('mediation_sessions').select('session_number')
        .eq('case_id', caseId)
        .order('session_number', { ascending: false })
        .limit(1),
    ])

    const nextNumber = sessionsRes.data && sessionsRes.data.length > 0
      ? sessionsRes.data[0].session_number + 1 : 1

    const { data, error } = await supabase
      .from('mediation_sessions')
      .insert({
        case_id: caseId,
        firm_id: caseRes.data?.firm_id || null,
        session_number: nextNumber,
        session_date: body.session_date,
        session_start_time: body.session_start_time || null,
        session_end_time: body.session_end_time || null,
        mediator_name: body.mediator_name,
        mediator_company: body.mediator_company || null,
        mediator_email: body.mediator_email || null,
        mediator_phone: body.mediator_phone || null,
        location_type: body.location_type || 'video',
        location_address: body.location_address || null,
        video_link: body.video_link || null,
        status: body.status || 'scheduled',
        our_attendees: body.our_attendees || [],
        their_attendees: body.their_attendees || [],
        pre_session_notes: body.pre_session_notes || null,
        total_cost: body.total_cost || 0,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create timeline event
    await supabase.from('negotiation_events').insert({
      case_id: caseId,
      firm_id: caseRes.data?.firm_id || null,
      event_type: 'mediation_scheduled',
      event_date: body.session_date,
      title: `Mediation #${nextNumber} scheduled with ${body.mediator_name}`,
      from_party: 'both',
      is_milestone: true,
      created_by: user.id,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Mediation POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
