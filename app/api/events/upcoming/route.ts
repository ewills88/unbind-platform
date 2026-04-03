import { NextRequest, NextResponse } from 'next/server'
import { UpcomingEventsResponse } from '@/types/events'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/events/upcoming - Get upcoming and overdue events for current user
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

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
