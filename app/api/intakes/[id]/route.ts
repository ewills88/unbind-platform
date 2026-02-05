import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { UpdateIntakeRequest, TOTAL_INTAKE_STEPS } from '@/types/intake'

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

// GET /api/intakes/[id] - Get intake by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: intake, error } = await supabase
      .from('client_intakes')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // Verify user has access
    if (intake.user_id !== user.id && intake.invited_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      intake,
      totalSteps: TOTAL_INTAKE_STEPS
    })
  } catch (error) {
    console.error('Intake GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/intakes/[id] - Update intake (auto-save)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body: UpdateIntakeRequest = await request.json()

    // Verify intake exists and user has access
    const { data: existingIntake, error: fetchError } = await supabase
      .from('client_intakes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingIntake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    if (existingIntake.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow updates to draft/in_progress intakes
    if (!['draft', 'in_progress'].includes(existingIntake.status)) {
      return NextResponse.json({
        error: 'Cannot update submitted intake'
      }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      last_saved_at: new Date().toISOString()
    }

    // Update status to in_progress if still draft
    if (existingIntake.status === 'draft') {
      updateData.status = 'in_progress'
    }

    if (body.current_step !== undefined) {
      updateData.current_step = body.current_step
    }

    if (body.completed_steps !== undefined) {
      updateData.completed_steps = body.completed_steps
      // Calculate progress percentage
      updateData.progress_percentage = Math.round(
        (body.completed_steps.length / TOTAL_INTAKE_STEPS) * 100
      )
    }

    if (body.intake_data !== undefined) {
      // Merge with existing intake data
      updateData.intake_data = {
        ...existingIntake.intake_data,
        ...body.intake_data
      }
    }

    if (body.auto_save_enabled !== undefined) {
      updateData.auto_save_enabled = body.auto_save_enabled
    }

    const { data: intake, error } = await supabase
      .from('client_intakes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating intake:', error)
      return NextResponse.json({ error: 'Failed to update intake' }, { status: 500 })
    }

    return NextResponse.json({ intake })
  } catch (error) {
    console.error('Intake PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/intakes/[id] - Delete draft intake
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify intake exists and is deletable
    const { data: existingIntake, error: fetchError } = await supabase
      .from('client_intakes')
      .select('user_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingIntake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    if (existingIntake.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (existingIntake.status !== 'draft') {
      return NextResponse.json({
        error: 'Can only delete draft intakes'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('client_intakes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting intake:', error)
      return NextResponse.json({ error: 'Failed to delete intake' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Intake DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
