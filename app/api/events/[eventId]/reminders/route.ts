import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

interface RouteParams {
  params: Promise<{ eventId: string }>
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

// GET /api/events/[eventId]/reminders - Get reminders for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params

    const { data: reminders, error } = await supabase
      .from('event_reminders')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .order('remind_before_minutes', { ascending: true })

    if (error) {
      console.error('Error fetching reminders:', error)
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
    }

    return NextResponse.json({ reminders: reminders || [] })
  } catch (error) {
    console.error('Reminders GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/events/[eventId]/reminders - Create a reminder
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()

    const { remind_before_minutes, remind_via_email = true, remind_via_app = true } = body

    if (!remind_before_minutes) {
      return NextResponse.json({ error: 'remind_before_minutes is required' }, { status: 400 })
    }

    const { data: reminder, error } = await supabase
      .from('event_reminders')
      .insert({
        event_id: eventId,
        user_id: user.id,
        remind_before_minutes,
        remind_via_email,
        remind_via_app,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Reminder already exists for this timing' }, { status: 409 })
      }
      console.error('Error creating reminder:', error)
      return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
    }

    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    console.error('Reminders POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/events/[eventId]/reminders - Delete a reminder
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const reminderId = searchParams.get('reminder_id')

    if (!reminderId) {
      return NextResponse.json({ error: 'reminder_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('event_reminders')
      .delete()
      .eq('id', reminderId)
      .eq('user_id', user.id)
      .eq('event_id', eventId)

    if (error) {
      console.error('Error deleting reminder:', error)
      return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reminders DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
