import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { GoogleCalendarService } from '@/lib/calendar/googleCalendarService'
import { CalendarConnection } from '@/types/calendar'

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

// GET - List user's Google calendars
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

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
