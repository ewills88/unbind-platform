import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  generateAutoDeadlines,
  buildDeadlineInserts,
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
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/filings - List all filings for a case
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    const { data, error } = await supabase
      .from('case_filings')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch deadline counts per filing
    const filingIds = (data || []).map((f: { id: string }) => f.id)
    let deadlineCounts: Record<string, { total: number; overdue: number; completed: number }> = {}

    if (filingIds.length > 0) {
      const { data: deadlines } = await supabase
        .from('filing_deadlines')
        .select('filing_id, status, deadline_date')
        .in('filing_id', filingIds)

      const now = new Date()
      deadlineCounts = (deadlines || []).reduce((
        acc: Record<string, { total: number; overdue: number; completed: number }>,
        d: { filing_id: string; status: string; deadline_date: string }
      ) => {
        if (!d.filing_id) return acc
        if (!acc[d.filing_id]) acc[d.filing_id] = { total: 0, overdue: 0, completed: 0 }
        acc[d.filing_id].total++
        if (d.status === 'completed') acc[d.filing_id].completed++
        else if (new Date(d.deadline_date) < now && d.status === 'upcoming') acc[d.filing_id].overdue++
        return acc
      }, {})
    }

    // Fetch service record counts per filing
    let serviceCounts: Record<string, { total: number; completed: number }> = {}
    if (filingIds.length > 0) {
      const { data: services } = await supabase
        .from('service_records')
        .select('filing_id, service_status')
        .in('filing_id', filingIds)

      serviceCounts = (services || []).reduce((
        acc: Record<string, { total: number; completed: number }>,
        s: { filing_id: string; service_status: string }
      ) => {
        if (!acc[s.filing_id]) acc[s.filing_id] = { total: 0, completed: 0 }
        acc[s.filing_id].total++
        if (s.service_status === 'completed') acc[s.filing_id].completed++
        return acc
      }, {})
    }

    const enriched = (data || []).map((filing: { id: string }) => ({
      ...filing,
      deadline_summary: deadlineCounts[filing.id] || { total: 0, overdue: 0, completed: 0 },
      service_summary: serviceCounts[filing.id] || { total: 0, completed: 0 },
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Filings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/filings - Create a new filing
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    // Verify case access
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, state_code, firm_id, case_number')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const {
      filing_type_id,
      court_id,
      filing_name,
      description,
      category,
      filing_method,
      filing_fee,
      fee_waiver_requested,
      priority,
      notes,
    } = body

    if (!filing_name) {
      return NextResponse.json({ error: 'filing_name is required' }, { status: 400 })
    }

    // If filing_type_id provided, fetch the type for auto-population
    let filingType = null
    if (filing_type_id) {
      const { data: ft } = await supabase
        .from('filing_types')
        .select('*')
        .eq('id', filing_type_id)
        .single()
      filingType = ft
    }

    const insertData = {
      case_id: caseId,
      filing_type_id: filing_type_id || null,
      court_id: court_id || null,
      firm_id: caseData.firm_id || null,
      filing_code: filingType?.filing_code || null,
      filing_name: filing_name || filingType?.filing_name || 'Untitled Filing',
      description: description || filingType?.description || null,
      category: category || filingType?.category || 'other',
      status: 'draft',
      case_number: caseData.case_number || null,
      filing_method: filing_method || 'in_person',
      filing_fee: filing_fee ?? filingType?.fee_amount ?? 0,
      fee_paid: false,
      fee_waiver_requested: fee_waiver_requested || false,
      priority: priority || 'normal',
      notes: notes || null,
      created_by: user.id,
    }

    const { data: filing, error: filingError } = await supabase
      .from('case_filings')
      .insert(insertData)
      .select()
      .single()

    if (filingError) {
      return NextResponse.json({ error: filingError.message }, { status: 500 })
    }

    // Generate auto-deadlines if filing type has them
    if (filingType?.auto_deadlines && Array.isArray(filingType.auto_deadlines) && filingType.auto_deadlines.length > 0) {
      // Fetch court holidays for deadline calculation
      const stateCode = caseData.state_code || 'CA'
      const { data: holidays } = await supabase
        .from('court_holidays')
        .select('holiday_date')
        .eq('state_code', stateCode)

      const holidaySet = buildHolidaySet(holidays || [])
      const triggerDate = new Date().toISOString()

      const calculated = generateAutoDeadlines(
        filingType.auto_deadlines,
        {
          caseId,
          filingId: filing.id,
          firmId: caseData.firm_id,
          triggerDate,
          stateCode,
          createdBy: user.id,
        },
        holidaySet
      )

      if (calculated.length > 0) {
        const inserts = buildDeadlineInserts(calculated, {
          caseId,
          filingId: filing.id,
          firmId: caseData.firm_id,
          triggerDate,
          stateCode,
          createdBy: user.id,
        })
        await supabase.from('filing_deadlines').insert(inserts)
      }
    }

    return NextResponse.json({ data: filing }, { status: 201 })
  } catch (error) {
    console.error('Filings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
