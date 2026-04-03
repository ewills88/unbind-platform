import { NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/calendar/googleCalendarService'
import { CalendarConnection } from '@/types/calendar'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET - List user's Google calendars
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!connection) {
      return NextResponse.json({ calendars: [] })
    }

    const service = new GoogleCalendarService(connection as CalendarConnection)
    const calendars = await service.listCalendars()

    return NextResponse.json({ calendars })
  } catch (error) {
    console.error('Google calendars list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
