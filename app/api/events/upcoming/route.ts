import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { UpcomingEventsResponse } from '@/types/events'

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

// GET /api/events/upcoming - Get upcoming and overdue events for current user
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Get upcoming events using the database function
    const { data: upcomingEvents, error: upcomingError } = await supabase
      .rpc('get_upcoming_events_for_user', {
        p_user_id: user.id,
        p_limit: limit
      })

    if (upcomingError) {
      console.error('Error fetching upcoming events:', upcomingError)
      return NextResponse.json({ error: 'Failed to fetch upcoming events' }, { status: 500 })
    }

    // Get overdue events using the database function
    const { data: overdueEvents, error: overdueError } = await supabase
      .rpc('get_overdue_events_for_user', {
        p_user_id: user.id
      })

    if (overdueError) {
      console.error('Error fetching overdue events:', overdueError)
      return NextResponse.json({ error: 'Failed to fetch overdue events' }, { status: 500 })
    }

    const response: UpcomingEventsResponse = {
      events: upcomingEvents || [],
      overdue: overdueEvents || []
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Upcoming events GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
