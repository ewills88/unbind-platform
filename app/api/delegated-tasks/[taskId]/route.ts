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

// PATCH /api/delegated-tasks/[taskId] - Update task status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { taskId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Status transitions
    if (body.status === 'in_progress') {
      updates.status = 'in_progress'
    } else if (body.status === 'completed') {
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()
      if (body.completion_notes) updates.completion_notes = body.completion_notes
      if (body.actual_time_minutes) updates.actual_time_minutes = body.actual_time_minutes
    } else if (body.status === 'approved') {
      updates.status = 'approved'
      updates.approved_by = user.id
      updates.approved_at = new Date().toISOString()
    } else if (body.status === 'rejected') {
      updates.status = 'rejected'
      updates.approved_by = user.id
      updates.approved_at = new Date().toISOString()
      if (body.rejection_reason) updates.rejection_reason = body.rejection_reason
    }

    // Allow updating other fields
    if (body.title) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.priority) updates.priority = body.priority
    if (body.due_date !== undefined) updates.due_date = body.due_date

    const { data: task, error: updateError } = await supabase
      .from('delegated_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating task:', updateError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Delegated task PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
