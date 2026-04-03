import { NextResponse } from 'next/server'
import { getAppointmentTypes } from '@/lib/portal/appointmentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/appointments/types — list available appointment types
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
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
