import { NextRequest, NextResponse } from 'next/server'
import { submitTask } from '@/lib/portal/taskService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/portal/tasks/[id]/submit — submit a completed task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const result = await submitTask(id, user.id, {
      notes: body.notes,
      formData: body.form_data,
      submittedFiles: body.submitted_files,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Task submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
