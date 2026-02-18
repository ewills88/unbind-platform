// Session 20 CP2: Client Task Service
// Task listing, status updates, submissions, statistics

import { createClient } from '@supabase/supabase-js'
import { TaskStats } from '@/types/portal'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// Get tasks for a client
// ============================================================

export async function getClientTasks(clientId: string, caseId?: string) {
  const supabase = getServiceClient()

  // First find the client's cases to get tasks
  let caseIds: string[] = []
  if (caseId) {
    caseIds = [caseId]
  } else {
    const { data: cases } = await supabase
      .from('cases')
      .select('id')
      .eq('client_id', clientId)
    caseIds = (cases || []).map(c => c.id)
  }

  if (caseIds.length === 0) return []

  const { data, error } = await supabase
    .from('client_tasks')
    .select('*')
    .in('case_id', caseIds)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw error

  // Enrich with creator names
  const tasks = data || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creatorIds = Array.from(new Set(tasks.map((t: any) => t.created_by).filter(Boolean)))

  let nameMap: Record<string, string> = {}
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds)
    if (profiles) {
      nameMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Unknown']))
    }
  }

  const now = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return tasks.map((t: any) => ({
    ...t,
    created_by_name: t.created_by ? (nameMap[t.created_by] || 'Unknown') : null,
    isOverdue: t.due_date &&
      new Date(t.due_date) < now &&
      !['submitted', 'approved', 'completed'].includes(t.status),
  }))
}

// ============================================================
// Get single task
// ============================================================

export async function getClientTask(taskId: string, clientId: string) {
  const supabase = getServiceClient()

  // Verify client owns the case this task belongs to
  const { data: task } = await supabase
    .from('client_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!task) return null

  // Check access
  const { data: caseAccess } = await supabase
    .from('cases')
    .select('id')
    .eq('id', task.case_id)
    .eq('client_id', clientId)
    .single()

  if (!caseAccess) return null

  // Get creator name
  let createdByName = null
  if (task.created_by) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', task.created_by)
      .single()
    createdByName = profile?.full_name || 'Unknown'
  }

  return {
    ...task,
    created_by_name: createdByName,
    isOverdue: task.due_date &&
      new Date(task.due_date) < new Date() &&
      !['submitted', 'approved', 'completed'].includes(task.status),
  }
}

// ============================================================
// Start task
// ============================================================

export async function startTask(taskId: string, clientId: string) {
  const supabase = getServiceClient()

  // Verify access
  const task = await getClientTask(taskId, clientId)
  if (!task) return { success: false, error: 'Task not found' }

  if (task.status !== 'pending') {
    return { success: false, error: 'Task is not in pending status' }
  }

  await supabase
    .from('client_tasks')
    .update({ status: 'in_progress' })
    .eq('id', taskId)

  return { success: true }
}

// ============================================================
// Submit task
// ============================================================

export async function submitTask(
  taskId: string,
  clientId: string,
  submission: {
    notes?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData?: Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submittedFiles?: any[]
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient()

  const task = await getClientTask(taskId, clientId)
  if (!task) return { success: false, error: 'Task not found' }

  if (['submitted', 'approved', 'cancelled'].includes(task.status)) {
    return { success: false, error: 'Task cannot be submitted in current status' }
  }

  await supabase
    .from('client_tasks')
    .update({
      status: 'submitted',
      completed_by_client_at: new Date().toISOString(),
      submission_notes: submission.notes || null,
      form_data: submission.formData || null,
      submitted_files: submission.submittedFiles || [],
      review_status: 'pending',
    })
    .eq('id', taskId)

  // Log activity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('case_activity_log').insert({
    case_id: task.case_id,
    user_id: clientId,
    activity_type: 'task_completed',
    title: `Task submitted: ${task.title}`,
    is_visible_to_client: true,
    metadata: { task_id: taskId },
  })

  // Notify creator
  if (task.created_by) {
    await supabase.from('notifications').insert({
      user_id: task.created_by,
      title: 'Client Task Submitted',
      message: `Client completed task: ${task.title}`,
      notification_type: 'system',
      action_url: `/dashboard/cases/${task.case_id}`,
    })
  }

  return { success: true }
}

// ============================================================
// Get task statistics
// ============================================================

export async function getTaskStats(clientId: string): Promise<TaskStats> {
  const supabase = getServiceClient()

  // Get client's cases
  const { data: cases } = await supabase
    .from('cases')
    .select('id')
    .eq('client_id', clientId)

  const caseIds = (cases || []).map(c => c.id)
  if (caseIds.length === 0) {
    return { total: 0, pending: 0, inProgress: 0, submitted: 0, approved: 0, overdue: 0 }
  }

  const { data: tasks } = await supabase
    .from('client_tasks')
    .select('status, due_date')
    .in('case_id', caseIds)
    .neq('status', 'cancelled')

  const now = new Date()
  const all = tasks || []

  return {
    total: all.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending: all.filter((t: any) => t.status === 'pending').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inProgress: all.filter((t: any) => t.status === 'in_progress').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitted: all.filter((t: any) => t.status === 'submitted').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approved: all.filter((t: any) => t.status === 'approved' || t.status === 'completed').length,
    overdue: all.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => t.due_date && new Date(t.due_date) < now && !['submitted', 'approved', 'completed'].includes(t.status)
    ).length,
  }
}
