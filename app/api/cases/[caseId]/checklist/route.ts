import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/cases/[caseId]/checklist - Get checklists with progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    // Get case info for state
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('state_code')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Get checklists for this state
    const { data: checklists } = await supabase
      .from('filing_checklists')
      .select('*')
      .eq('state_code', caseData.state_code)
      .eq('case_type', 'dissolution')
      .order('display_order', { ascending: true })

    // Get progress for this case
    const { data: progress } = await supabase
      .from('case_checklist_progress')
      .select('*')
      .eq('case_id', caseId)

    // Merge progress into checklists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checklistsWithProgress = (checklists || []).map((checklist: any) => ({
      ...checklist,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (checklist.items || []).map((item: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemProgress = (progress || []).find((p: any) =>
          p.checklist_id === checklist.id && p.item_id === item.id
        )
        return {
          ...item,
          status: itemProgress?.status || 'not_started',
          filing_id: itemProgress?.filing_id || null,
          completed_date: itemProgress?.completed_date || null,
          deadline_date: itemProgress?.deadline_date || null,
          notes: itemProgress?.notes || null,
        }
      }),
    }))

    return NextResponse.json({ data: checklistsWithProgress })
  } catch (error) {
    console.error('Checklist GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/checklist - Update checklist item progress
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()
    const { checklist_id, item_id, item_name, status, notes, filing_id, waiver_reason } = body

    if (!checklist_id || !item_id || !status) {
      return NextResponse.json({ error: 'checklist_id, item_id, and status are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('case_checklist_progress')
      .upsert({
        case_id: caseId,
        checklist_id,
        item_id,
        item_name: item_name || null,
        status,
        notes: notes || null,
        filing_id: filing_id || null,
        waiver_reason: waiver_reason || null,
        completed_date: status === 'complete' ? new Date().toISOString().split('T')[0] : null,
        completed_by: status === 'complete' ? user.id : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'case_id,checklist_id,item_id',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Checklist PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
