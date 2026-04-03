import { NextRequest, NextResponse } from 'next/server'
import { getClientTasks, getTaskStats } from '@/lib/portal/taskService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/tasks — list client tasks with optional stats
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('case_id') || undefined
    const includeStats = searchParams.get('include_stats') === 'true'

    const tasks = await getClientTasks(user.id, caseId)

    if (includeStats) {
      const stats = await getTaskStats(user.id)
      return NextResponse.json({ data: tasks, stats })
    }

    return NextResponse.json({ data: tasks })
  } catch (error) {
    console.error('Portal tasks GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
