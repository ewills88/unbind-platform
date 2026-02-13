import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { client: null, user: null }
  }

  return { client: supabase, user }
}

// PATCH /api/client/tasks/[id]/complete - Mark a task as completed
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params

    // Get the task and verify client owns the case
    const { data: task, error: taskError } = await supabase
      .from('client_tasks')
      .select('id, case_id, status')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify client owns this case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id')
      .eq('id', task.case_id)
      .eq('client_id', user.id)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Already completed or approved
    if (task.status === 'completed' || task.status === 'approved') {
      return NextResponse.json({ error: 'Task already completed' }, { status: 400 })
    }

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from('client_tasks')
      .update({
        status: 'completed',
        completed_by_client_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single()

    if (updateError) {
      console.error('Error completing task:', updateError)
      return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Task complete PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
