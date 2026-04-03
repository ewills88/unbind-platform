import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/client/tasks - List tasks for the client's case
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // pending, completed, or all

    // Get client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!caseData) {
      return NextResponse.json({ tasks: [] })
    }

    // Build query
    let query = supabase
      .from('client_tasks')
      .select('*')
      .eq('case_id', caseData.id)
      .order('due_date', { ascending: true, nullsFirst: false })

    // Apply status filter
    if (statusFilter === 'pending') {
      query = query.in('status', ['pending', 'in_progress'])
    } else if (statusFilter === 'completed') {
      query = query.in('status', ['completed', 'approved'])
    }

    const { data: tasks, error: tasksError } = await query

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({ tasks: tasks || [] })
  } catch (error) {
    console.error('Client tasks GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
