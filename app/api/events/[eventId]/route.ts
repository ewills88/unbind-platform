import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { UpdateEventRequest } from '@/types/events'

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
  params: Promise<{ eventId: string }>
}

// GET /api/events/[eventId] - Get a single event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params

    const { data: event, error } = await supabase
      .from('case_events')
      .select(`
        *,
        assignee:assigned_to(id, full_name, role),
        creator:created_by(id, full_name),
        case:case_id(id, case_number, client_name)
      `)
      .eq('id', eventId)
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Event GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/events/[eventId] - Update an event
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params
    const body: UpdateEventRequest = await request.json()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (body.event_type !== undefined) updateData.event_type = body.event_type
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.event_date !== undefined) updateData.event_date = body.event_date
    if (body.all_day !== undefined) updateData.all_day = body.all_day
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to

    // Handle status change
    if (body.status !== undefined) {
      updateData.status = body.status

      // If marking as completed, set completion metadata
      if (body.status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        updateData.completed_by = user.id
      } else if (body.status === 'upcoming') {
        // If reverting to upcoming, clear completion metadata
        updateData.completed_at = null
        updateData.completed_by = null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: event, error } = await supabase
      .from('case_events')
      .update(updateData)
      .eq('id', eventId)
      .select(`
        *,
        assignee:assigned_to(id, full_name, role),
        creator:created_by(id, full_name),
        case:case_id(id, case_number, client_name)
      `)
      .single()

    if (error) {
      console.error('Error updating event:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Event PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/events/[eventId] - Delete an event
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params

    // Check if user is the creator (RLS will enforce this, but we can provide better error)
    const { data: existingEvent } = await supabase
      .from('case_events')
      .select('created_by')
      .eq('id', eventId)
      .single()

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (existingEvent.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the event creator can delete this event' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('case_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error('Error deleting event:', error)
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Event DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
