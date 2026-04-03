import { NextRequest, NextResponse } from 'next/server'
import { CreateDelegatedTaskRequest } from '@/types/collaboration'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/cases/[caseId]/delegate-task - Get tasks for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    const { caseId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    let query = supabase
      .from('delegated_tasks')
      .select(`
        *,
        assignee:profiles!delegated_tasks_assigned_to_fkey(id, full_name, email),
        assigner:profiles!delegated_tasks_assigned_by_fkey(id, full_name, email)
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: tasks, error: tasksError } = await query

    if (tasksError) {
      console.error('Error fetching delegated tasks:', tasksError)
      const { data: tasksOnly } = await supabase
        .from('delegated_tasks')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })

      return NextResponse.json({ tasks: tasksOnly || [] })
    }

    return NextResponse.json({ tasks: tasks || [] })
  } catch (error) {
    console.error('Delegate task GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/delegate-task - Create a delegated task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    const { caseId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 403 })
    }

    const body: CreateDelegatedTaskRequest = await request.json()

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!body.assigned_to) {
      return NextResponse.json({ error: 'Assigned user is required' }, { status: 400 })
    }

    // Verify assigned_to is an active firm member
    const { data: assigneeMembership } = await supabase
      .from('firm_members')
      .select('id')
      .eq('firm_id', profile.current_firm_id)
      .eq('user_id', body.assigned_to)
      .eq('status', 'active')
      .single()

    if (!assigneeMembership) {
      return NextResponse.json({ error: 'Assigned user must be an active firm member' }, { status: 400 })
    }

    const { data: task, error: insertError } = await supabase
      .from('delegated_tasks')
      .insert({
        case_id: caseId,
        firm_id: profile.current_firm_id,
        task_type: body.task_type || 'other',
        title: body.title.trim(),
        description: body.description || null,
        assigned_to: body.assigned_to,
        assigned_by: user.id,
        due_date: body.due_date || null,
        priority: body.priority || 'medium',
        time_estimate_minutes: body.time_estimate_minutes || null,
        related_document_id: body.related_document_id || null,
      })
      .select(`
        *,
        assignee:profiles!delegated_tasks_assigned_to_fkey(id, full_name, email),
        assigner:profiles!delegated_tasks_assigned_by_fkey(id, full_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating delegated task:', insertError)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Delegate task POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
