import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET /api/cases/[caseId]/filings/[filingId] - Get filing detail with related data
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, filingId } = await params

    const { data: filing, error } = await supabase
      .from('case_filings')
      .select('*')
      .eq('id', filingId)
      .eq('case_id', caseId)
      .single()

    if (error || !filing) {
      return NextResponse.json({ error: 'Filing not found' }, { status: 404 })
    }

    // Fetch related data in parallel
    const [docsRes, serviceRes, deadlinesRes, filingTypeRes] = await Promise.all([
      supabase
        .from('filing_documents')
        .select('*')
        .eq('filing_id', filingId)
        .order('display_order'),
      supabase
        .from('service_records')
        .select('*')
        .eq('filing_id', filingId)
        .order('created_at', { ascending: false }),
      supabase
        .from('filing_deadlines')
        .select('*')
        .eq('filing_id', filingId)
        .order('deadline_date'),
      filing.filing_type_id
        ? supabase
            .from('filing_types')
            .select('*')
            .eq('id', filing.filing_type_id)
            .single()
        : Promise.resolve({ data: null }),
    ])

    // Fetch court info if court_id exists
    let court = null
    if (filing.court_id) {
      const { data: courtData } = await supabase
        .from('courts')
        .select('*')
        .eq('id', filing.court_id)
        .single()
      court = courtData
    }

    return NextResponse.json({
      data: {
        ...filing,
        filing_type: filingTypeRes.data || null,
        court,
        documents: docsRes.data || [],
        service_records: serviceRes.data || [],
        deadlines: deadlinesRes.data || [],
      },
    })
  } catch (error) {
    console.error('Filing GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/filings/[filingId] - Update filing
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, filingId } = await params
    const body = await request.json()

    // Verify filing exists and belongs to case
    const { data: existing, error: fetchError } = await supabase
      .from('case_filings')
      .select('id, status')
      .eq('id', filingId)
      .eq('case_id', caseId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Filing not found' }, { status: 404 })
    }

    // Handle status transitions
    const allowedFields: Record<string, boolean> = {
      filing_name: true,
      description: true,
      category: true,
      status: true,
      filed_date: true,
      filing_method: true,
      filing_fee: true,
      fee_paid: true,
      fee_waiver_requested: true,
      fee_waiver_granted: true,
      filing_number: true,
      confirmation_number: true,
      rejection_reason: true,
      hearing_date: true,
      hearing_location: true,
      hearing_notes: true,
      court_id: true,
      case_number: true,
      priority: true,
      notes: true,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {}
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields[key]) {
        updates[key] = value
      }
    }

    // If status changing to 'filed', set filed_date and filed_by
    if (updates.status === 'filed' && existing.status !== 'filed') {
      updates.filed_date = updates.filed_date || new Date().toISOString()
      updates.filed_by = user.id
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('case_filings')
      .update(updates)
      .eq('id', filingId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Filing PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/filings/[filingId] - Delete a filing (draft only)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, filingId } = await params

    // Verify filing exists, is draft, and user has access
    const { data: filing, error: fetchError } = await supabase
      .from('case_filings')
      .select('id, status')
      .eq('id', filingId)
      .eq('case_id', caseId)
      .single()

    if (fetchError || !filing) {
      return NextResponse.json({ error: 'Filing not found' }, { status: 404 })
    }

    if (filing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft filings can be deleted' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('case_filings')
      .delete()
      .eq('id', filingId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Filing deleted' })
  } catch (error) {
    console.error('Filing DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
