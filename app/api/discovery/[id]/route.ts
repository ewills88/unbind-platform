import { NextRequest, NextResponse } from 'next/server'
import { getDaysUntilDeadline } from '@/lib/discovery/deadlineCalculator'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/discovery/[id] - Get a single discovery request with extensions
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: discovery, error } = await supabase
      .from('discovery_requests')
      .select(`
        *,
        extensions:discovery_extensions(*)
      `)
      .eq('id', id)
      .single()

    if (error || !discovery) {
      return NextResponse.json({ error: 'Discovery request not found' }, { status: 404 })
    }

    // Add computed fields
    const effectiveDueDate = discovery.extended_due_date || discovery.response_due_date
    const deadline = effectiveDueDate ? getDaysUntilDeadline(effectiveDueDate) : null

    return NextResponse.json({
      data: {
        ...discovery,
        days_until_due: deadline?.days ?? null,
        urgency: deadline?.urgency ?? 'normal',
        effective_due_date: effectiveDueDate,
      },
    })
  } catch (error) {
    console.error('Discovery GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/discovery/[id] - Update a discovery request
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.status !== undefined) updateData.status = body.status
    if (body.actual_response_date !== undefined) updateData.actual_response_date = body.actual_response_date
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.item_count !== undefined) updateData.item_count = body.item_count
    if (body.propounding_party !== undefined) updateData.propounding_party = body.propounding_party
    if (body.responding_party !== undefined) updateData.responding_party = body.responding_party
    if (body.served_date !== undefined) updateData.served_date = body.served_date
    if (body.service_method !== undefined) updateData.service_method = body.service_method
    if (typeof body.reminder_sent === 'boolean') updateData.reminder_sent = body.reminder_sent

    const { data, error } = await supabase
      .from('discovery_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Discovery PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/discovery/[id] - Delete a discovery request
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('discovery_requests')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Discovery DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
