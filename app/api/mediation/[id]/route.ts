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

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/mediation/[id] - Full session with positions and offers
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const [sessionRes, positionsRes, offersRes] = await Promise.all([
      supabase.from('mediation_sessions').select('*').eq('id', id).single(),
      supabase.from('mediation_positions').select('*').eq('mediation_id', id).order('display_order'),
      supabase.from('mediation_offers').select('*').eq('mediation_id', id).order('offer_number'),
    ])

    if (sessionRes.error || !sessionRes.data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...sessionRes.data,
        positions: positionsRes.data || [],
        offers: offersRes.data || [],
      },
    })
  } catch (error) {
    console.error('Mediation session GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/mediation/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Handle position sub-resource
    if (body._action === 'add_position') {
      const { data: session } = await supabase
        .from('mediation_sessions')
        .select('id')
        .eq('id', id)
        .single()
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

      const { data, error } = await supabase
        .from('mediation_positions')
        .insert({
          mediation_id: id,
          issue_category: body.issue_category || 'other',
          issue_name: body.issue_name,
          our_starting_position: body.our_starting_position || null,
          our_target: body.our_target || null,
          our_bottom_line: body.our_bottom_line || null,
          their_known_position: body.their_known_position || null,
          priority: body.priority || 'medium',
          flexibility_notes: body.flexibility_notes || null,
          batna: body.batna || null,
          display_order: body.display_order || 0,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data }, { status: 201 })
    }

    // Handle position update
    if (body._action === 'update_position') {
      const updateData: Record<string, unknown> = {}
      const fields = [
        'issue_category', 'issue_name', 'our_starting_position', 'our_target',
        'our_bottom_line', 'their_known_position', 'priority', 'flexibility_notes',
        'batna', 'resolved', 'final_resolution', 'display_order',
      ]
      for (const f of fields) {
        if (body[f] !== undefined) updateData[f] = body[f]
      }

      const { data, error } = await supabase
        .from('mediation_positions')
        .update(updateData)
        .eq('id', body.position_id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    // Handle delete position
    if (body._action === 'delete_position') {
      await supabase.from('mediation_positions').delete().eq('id', body.position_id)
      return NextResponse.json({ success: true })
    }

    // Handle add offer
    if (body._action === 'add_offer') {
      // Get next offer number
      const { data: existing } = await supabase
        .from('mediation_offers')
        .select('offer_number')
        .eq('mediation_id', id)
        .order('offer_number', { ascending: false })
        .limit(1)

      const nextNumber = existing && existing.length > 0 ? existing[0].offer_number + 1 : 1

      const { data, error } = await supabase
        .from('mediation_offers')
        .insert({
          mediation_id: id,
          offer_number: nextNumber,
          offered_by: body.offered_by || 'our_client',
          offer_time: body.offer_time || new Date().toISOString(),
          offer_summary: body.offer_summary,
          offer_details: body.offer_details || {},
          response: body.response || 'pending',
          response_notes: body.response_notes || null,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data }, { status: 201 })
    }

    // Handle respond to offer
    if (body._action === 'respond_offer') {
      const { data, error } = await supabase
        .from('mediation_offers')
        .update({
          response: body.response,
          response_time: new Date().toISOString(),
          response_notes: body.response_notes || null,
        })
        .eq('id', body.offer_id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    // Default: update session fields
    const updateData: Record<string, unknown> = {}
    const fields = [
      'session_date', 'session_start_time', 'session_end_time',
      'mediator_name', 'mediator_company', 'mediator_email', 'mediator_phone',
      'location_type', 'location_address', 'video_link',
      'status', 'cancellation_reason',
      'our_attendees', 'their_attendees',
      'pre_session_notes', 'session_notes',
      'agreements_reached', 'open_issues',
      'next_steps', 'follow_up_deadline',
      'outcome', 'total_cost',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }

    const { data, error } = await supabase
      .from('mediation_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create timeline event for status changes
    if (body.status === 'completed' && body.outcome) {
      const { data: session } = await supabase
        .from('mediation_sessions')
        .select('case_id, firm_id, session_number, mediator_name')
        .eq('id', id)
        .single()

      if (session) {
        const outcomeLabels: Record<string, string> = {
          full_settlement: 'Full settlement reached',
          partial_settlement: 'Partial settlement reached',
          no_agreement: 'No agreement reached',
          continued: 'Session to be continued',
        }

        await supabase.from('negotiation_events').insert({
          case_id: session.case_id,
          firm_id: session.firm_id,
          event_type: 'mediation_completed',
          event_date: new Date().toISOString(),
          title: `Mediation #${session.session_number} completed`,
          description: outcomeLabels[body.outcome] || body.outcome,
          from_party: 'both',
          is_milestone: body.outcome === 'full_settlement',
          created_by: user.id,
        })
      }
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Mediation session PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/mediation/[id]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('mediation_sessions')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mediation DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
