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

// GET /api/delegated-tasks - Get all tasks assigned to current user
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const role = searchParams.get('role') // 'assigned' or 'delegated'

    let query = supabase
      .from('delegated_tasks')
      .select(`
        *,
        assignee:profiles!delegated_tasks_assigned_to_fkey(id, full_name, email),
        assigner:profiles!delegated_tasks_assigned_by_fkey(id, full_name, email)
      `)
      .order('due_date', { ascending: true, nullsFirst: false })

    // Filter by role
    if (role === 'delegated') {
      query = query.eq('assigned_by', user.id)
    } else {
      // Default: tasks assigned to current user
      query = query.eq('assigned_to', user.id)
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    } else {
      // By default exclude approved/rejected
      query = query.in('status', ['pending', 'in_progress', 'completed'])
    }

    const { data: tasks, error: tasksError } = await query

    if (tasksError) {
      console.error('Error fetching delegated tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Also fetch case info for each task
    const caseIds = Array.from(new Set((tasks || []).map(t => t.case_id)))
    let caseMap: Record<string, { id: string; case_number: string; client_name: string }> = {}

    if (caseIds.length > 0) {
      const { data: cases } = await supabase
        .from('cases')
        .select('id, case_number, client_name')
        .in('id', caseIds)

      if (cases) {
        caseMap = cases.reduce((acc, c) => {
          acc[c.id] = c
          return acc
        }, {} as Record<string, { id: string; case_number: string; client_name: string }>)
      }
    }

    const tasksWithCase = (tasks || []).map(task => ({
      ...task,
      case_info: caseMap[task.case_id] || null,
    }))

    return NextResponse.json({ tasks: tasksWithCase })
  } catch (error) {
    console.error('Delegated tasks GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
