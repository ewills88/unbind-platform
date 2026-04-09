import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ caseId: string; filingId: string }>
}

// GET /api/cases/[caseId]/filings/[filingId]/deadlines - List deadlines for a filing
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filingId } = await params

    const { data, error } = await supabase
      .from('filing_deadlines')
      .select('*')
      .eq('filing_id', filingId)
      .order('deadline_date')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Filing deadlines GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/filings/[filingId]/deadlines - Add a manual deadline
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, filingId } = await params
    const body = await request.json()

    const {
      deadline_name,
      description,
      deadline_date,
      deadline_type,
      priority,
      assigned_to,
      notes,
    } = body

    if (!deadline_name || !deadline_date) {
      return NextResponse.json(
        { error: 'deadline_name and deadline_date are required' },
        { status: 400 }
      )
    }

    // Verify case access
    const { data: caseData } = await supabase
      .from('cases')
      .select('firm_id')
      .eq('id', caseId)
      .single()

    const { data: deadline, error } = await supabase
      .from('filing_deadlines')
      .insert({
        case_id: caseId,
        filing_id: filingId,
        firm_id: caseData?.firm_id || null,
        deadline_name,
        description: description || null,
        deadline_date,
        deadline_type: deadline_type || 'filing',
        priority: priority || 'normal',
        status: 'upcoming',
        source_type: 'manual',
        source_filing_id: filingId,
        is_working_days: false,
        reminder_days: [7, 3, 1],
        assigned_to: assigned_to || null,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: deadline }, { status: 201 })
  } catch (error) {
    console.error('Filing deadline POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/filings/[filingId]/deadlines - Update a deadline
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filingId } = await params
    const body = await request.json()
    const { deadline_id, action, ...updates } = body

    if (!deadline_id) {
      return NextResponse.json({ error: 'deadline_id is required' }, { status: 400 })
    }

    // Handle special actions
    if (action === 'complete') {
      const { data: updated, error } = await supabase
        .from('filing_deadlines')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
          completed_by: user.id,
        })
        .eq('id', deadline_id)
        .eq('filing_id', filingId)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data: updated })
    }

    if (action === 'extend') {
      if (!updates.new_date) {
        return NextResponse.json({ error: 'new_date is required for extension' }, { status: 400 })
      }

      // Get current deadline to store original_date
      const { data: current } = await supabase
        .from('filing_deadlines')
        .select('deadline_date, original_date')
        .eq('id', deadline_id)
        .single()

      const { data: updated, error } = await supabase
        .from('filing_deadlines')
        .update({
          deadline_date: updates.new_date,
          original_date: current?.original_date || current?.deadline_date,
          extension_reason: updates.extension_reason || null,
          extension_granted_by: updates.extension_granted_by || null,
          status: 'extended',
        })
        .eq('id', deadline_id)
        .eq('filing_id', filingId)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data: updated })
    }

    if (action === 'waive') {
      const { data: updated, error } = await supabase
        .from('filing_deadlines')
        .update({ status: 'waived' })
        .eq('id', deadline_id)
        .eq('filing_id', filingId)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data: updated })
    }

    // Generic update
    const allowedFields: Record<string, boolean> = {
      deadline_name: true,
      description: true,
      deadline_date: true,
      deadline_type: true,
      priority: true,
      assigned_to: true,
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
      .from('filing_deadlines')
      .update(filtered)
      .eq('id', deadline_id)
      .eq('filing_id', filingId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Filing deadline PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
