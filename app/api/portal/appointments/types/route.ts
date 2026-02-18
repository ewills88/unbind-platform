import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getAppointmentTypes } from '@/lib/portal/appointmentService'

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

// GET /api/portal/appointments/types — list available appointment types
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get firm from client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('firm_id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!caseData?.firm_id) {
      return NextResponse.json({ data: [] })
    }

    const types = await getAppointmentTypes(caseData.firm_id)
    return NextResponse.json({ data: types })
  } catch (error) {
    console.error('Appointment types error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
