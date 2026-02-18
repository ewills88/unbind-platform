import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getClientTasks, getTaskStats } from '@/lib/portal/taskService'

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

// GET /api/portal/tasks — list client tasks with optional stats
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient()
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
