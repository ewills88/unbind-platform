import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/negotiation-timeline
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')

    let query = supabase
      .from('negotiation_events')
      .select('*')
      .eq('case_id', caseId)
      .order('event_date', { ascending: false })

    if (filter && filter !== 'all') {
      query = query.eq('event_type', filter)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Negotiation timeline GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/negotiation-timeline
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    // Get firm_id from case
    const { data: caseData } = await supabase
      .from('cases')
      .select('firm_id')
      .eq('id', caseId)
      .single()

    const { data, error } = await supabase
      .from('negotiation_events')
      .insert({
        case_id: caseId,
        firm_id: caseData?.firm_id || null,
        event_type: body.event_type,
        event_date: body.event_date || new Date().toISOString(),
        proposal_id: body.proposal_id || null,
        title: body.title,
        description: body.description || null,
        participants: body.participants || [],
        from_party: body.from_party || 'both',
        movement_summary: body.movement_summary || null,
        key_changes: body.key_changes || {},
        documents: body.documents || [],
        next_steps: body.next_steps || null,
        deadline: body.deadline || null,
        is_milestone: body.is_milestone || false,
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Negotiation timeline POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
