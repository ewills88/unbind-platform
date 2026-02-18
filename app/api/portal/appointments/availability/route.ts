import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getAvailableSlots } from '@/lib/portal/appointmentService'

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

// GET /api/portal/appointments/availability — get available time slots
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const attorneyId = searchParams.get('attorney_id')
    const typeId = searchParams.get('type_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!attorneyId || !typeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'attorney_id, type_id, start_date, and end_date are required' },
        { status: 400 }
      )
    }

    const slots = await getAvailableSlots({
      attorneyId,
      appointmentTypeId: typeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    })

    return NextResponse.json({ data: slots })
  } catch (error) {
    console.error('Availability error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
