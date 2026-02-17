import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  calculateServiceResponseDeadline,
  buildHolidaySet,
} from '@/lib/filings/deadlineCalculator'

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

interface RouteParams {
  params: Promise<{ caseId: string; filingId: string }>
}

// GET /api/cases/[caseId]/filings/[filingId]/service - List service records
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filingId } = await params

    const { data, error } = await supabase
      .from('service_records')
      .select('*')
      .eq('filing_id', filingId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Service records GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/filings/[filingId]/service - Create a service record
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, filingId } = await params
    const body = await request.json()

    // Verify filing exists
    const { data: filing, error: filingError } = await supabase
      .from('case_filings')
      .select('id, filing_type_id, case_id')
      .eq('id', filingId)
      .eq('case_id', caseId)
      .single()

    if (filingError || !filing) {
      return NextResponse.json({ error: 'Filing not found' }, { status: 404 })
    }

    const {
      served_party_name,
      served_party_role,
      served_party_address,
      served_party_email,
      service_method,
      service_date,
      server_name,
      server_company,
      server_license,
      server_fee,
      notes,
    } = body

    if (!served_party_name) {
      return NextResponse.json({ error: 'served_party_name is required' }, { status: 400 })
    }

    // Calculate response due date if filing type has response_days
    let responseDueDate = null
    let defaultEligibleDate = null

    if (service_date) {
      // Get filing type for response_days
      let responseDays = null
      let isWorkingDays = false
      if (filing.filing_type_id) {
        const { data: ft } = await supabase
          .from('filing_types')
          .select('response_days, is_working_days, state_code')
          .eq('id', filing.filing_type_id)
          .single()

        if (ft && ft.response_days) {
          responseDays = ft.response_days
          isWorkingDays = ft.is_working_days

          // Fetch holidays
          const { data: holidays } = await supabase
            .from('court_holidays')
            .select('holiday_date')
            .eq('state_code', ft.state_code || 'CA')

          const holidaySet = buildHolidaySet(holidays || [])
          const dueDate = calculateServiceResponseDeadline(
            service_date,
            responseDays,
            isWorkingDays,
            service_method || 'personal',
            holidaySet
          )
          responseDueDate = dueDate.toISOString()

          // Default eligible date is typically response due + 1 day
          const defaultDate = new Date(dueDate)
          defaultDate.setDate(defaultDate.getDate() + 1)
          defaultEligibleDate = defaultDate.toISOString()
        }
      }
    }

    const insertData = {
      filing_id: filingId,
      case_id: caseId,
      served_party_name,
      served_party_role: served_party_role || 'respondent',
      served_party_address: served_party_address || null,
      served_party_email: served_party_email || null,
      service_method: service_method || 'personal',
      service_status: service_date ? 'completed' : 'pending',
      service_date: service_date || null,
      service_attempts: service_date ? 1 : 0,
      server_name: server_name || null,
      server_company: server_company || null,
      server_license: server_license || null,
      server_fee: server_fee || 0,
      proof_filed: false,
      response_due_date: responseDueDate,
      default_eligible_date: defaultEligibleDate,
      notes: notes || null,
      created_by: user.id,
    }

    const { data: record, error: insertError } = await supabase
      .from('service_records')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // If service is completed, create a response deadline
    if (service_date && responseDueDate) {
      await supabase.from('filing_deadlines').insert({
        case_id: caseId,
        filing_id: filingId,
        deadline_name: 'Response Due',
        description: `Response to ${body.served_party_name || 'served party'}`,
        deadline_date: responseDueDate,
        deadline_type: 'response',
        priority: 'high',
        status: 'upcoming',
        source_type: 'auto_calculated',
        source_filing_id: filingId,
        calculation_rule: `Calculated from service date ${service_date}`,
        is_working_days: false,
        reminder_days: [7, 3, 1],
        created_by: user.id,
      })
    }

    // Update filing status to 'served' if it was 'filed'
    if (service_date) {
      const { data: currentFiling } = await supabase
        .from('case_filings')
        .select('status')
        .eq('id', filingId)
        .single()

      if (currentFiling && currentFiling.status === 'filed') {
        await supabase
          .from('case_filings')
          .update({ status: 'served' })
          .eq('id', filingId)
      }
    }

    return NextResponse.json({ data: record }, { status: 201 })
  } catch (error) {
    console.error('Service record POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/filings/[filingId]/service - Update a service record
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filingId } = await params
    const body = await request.json()
    const { record_id, ...updates } = body

    if (!record_id) {
      return NextResponse.json({ error: 'record_id is required' }, { status: 400 })
    }

    const allowedFields: Record<string, boolean> = {
      service_status: true,
      service_date: true,
      service_attempts: true,
      service_method: true,
      server_name: true,
      server_company: true,
      server_license: true,
      server_fee: true,
      proof_filed: true,
      proof_file_path: true,
      proof_filed_date: true,
      response_received: true,
      response_date: true,
      notes: true,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered: Record<string, any> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key]) filtered[key] = value
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('service_records')
      .update(filtered)
      .eq('id', record_id)
      .eq('filing_id', filingId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Service record PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
