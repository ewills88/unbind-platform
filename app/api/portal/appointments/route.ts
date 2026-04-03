import { NextRequest, NextResponse } from 'next/server'
import { getClientAppointments, bookAppointment } from '@/lib/portal/appointmentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/appointments — list client appointments
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = (searchParams.get('filter') || 'upcoming') as 'upcoming' | 'past' | 'all'

    const appointments = await getClientAppointments(user.id, filter)
    return NextResponse.json({ data: appointments })
  } catch (error) {
    console.error('Portal appointments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/portal/appointments — book a new appointment
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.appointment_type_id || !body.start_time || !body.location_type) {
      return NextResponse.json(
        { error: 'appointment_type_id, start_time, and location_type are required' },
        { status: 400 }
      )
    }

    // Get client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, firm_id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'No active case found' }, { status: 400 })
    }

    const result = await bookAppointment({
      clientId: user.id,
      caseId: caseData.id,
      firmId: caseData.firm_id,
      attorneyId: body.attorney_id || caseData.attorney_id,
      appointmentTypeId: body.appointment_type_id,
      startTime: body.start_time,
      locationType: body.location_type,
      clientNotes: body.notes,
      intakeFormData: body.intake_form_data,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.appointment })
  } catch (error) {
    console.error('Portal appointments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
