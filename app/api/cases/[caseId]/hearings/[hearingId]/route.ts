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

// GET /api/cases/[caseId]/hearings/[hearingId] - Get hearing detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string; hearingId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, hearingId } = await params

    const { data, error } = await supabase
      .from('court_hearings')
      .select(`
        *,
        court:courts(court_name, county, address, city, phone),
        related_filing:case_filings(id, filing_name, filing_code, status),
        prep_tasks:hearing_prep_tasks(*),
        exhibits:hearing_exhibits(*)
      `)
      .eq('id', hearingId)
      .eq('case_id', caseId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Hearing detail GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/hearings/[hearingId] - Update hearing
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; hearingId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, hearingId } = await params
    const body = await request.json()

    // Handle special actions
    if (body.action === 'continue') {
      // Continue hearing to new date
      const { data, error } = await supabase
        .from('court_hearings')
        .update({
          status: 'continued',
          continued_to_date: body.continued_to_date,
          continuance_reason: body.continuance_reason || null,
        })
        .eq('id', hearingId)
        .eq('case_id', caseId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (body.action === 'vacate') {
      const { data, error } = await supabase
        .from('court_hearings')
        .update({ status: 'vacated' })
        .eq('id', hearingId)
        .eq('case_id', caseId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (body.action === 'complete') {
      const { data, error } = await supabase
        .from('court_hearings')
        .update({
          status: 'completed',
          outcome: body.outcome || null,
          outcome_details: body.outcome_details || null,
          orders_issued: body.orders_issued || null,
          next_hearing_date: body.next_hearing_date || null,
        })
        .eq('id', hearingId)
        .eq('case_id', caseId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (body.action === 'update_prep_task') {
      const { task_id, status } = body
      const { data, error } = await supabase
        .from('hearing_prep_tasks')
        .update({
          status,
          completed_at: status === 'complete' ? new Date().toISOString() : null,
          completed_by: status === 'complete' ? user.id : null,
        })
        .eq('id', task_id)
        .eq('hearing_id', hearingId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    // General update
    const updateFields: Record<string, unknown> = {}
    const allowedFields = [
      'hearing_name', 'hearing_date', 'hearing_time', 'estimated_duration',
      'court_id', 'department', 'judge_name', 'appearance_type',
      'remote_link', 'remote_phone', 'remote_access_code',
      'issues_to_be_heard', 'our_position', 'their_position',
      'status', 'tentative_ruling', 'tentative_ruling_url',
      'prep_notes', 'client_prep_complete', 'documents_prepared', 'notes',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[field] = body[field]
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('court_hearings')
      .update(updateFields)
      .eq('id', hearingId)
      .eq('case_id', caseId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Hearing PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/hearings/[hearingId] - Delete hearing
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string; hearingId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, hearingId } = await params

    // Only allow deleting scheduled hearings
    const { data: hearing } = await supabase
      .from('court_hearings')
      .select('status')
      .eq('id', hearingId)
      .eq('case_id', caseId)
      .single()

    if (!hearing) {
      return NextResponse.json({ error: 'Hearing not found' }, { status: 404 })
    }

    if (hearing.status !== 'scheduled') {
      return NextResponse.json({ error: 'Only scheduled hearings can be deleted' }, { status: 400 })
    }

    const { error } = await supabase
      .from('court_hearings')
      .delete()
      .eq('id', hearingId)
      .eq('case_id', caseId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Hearing DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
