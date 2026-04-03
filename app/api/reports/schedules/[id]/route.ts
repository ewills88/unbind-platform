import { NextRequest, NextResponse } from 'next/server'
import { calculateNextRun } from '@/lib/reports/scheduledReportsService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// PATCH /api/reports/schedules/[id] — update a schedule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // If schedule timing changed, recalculate next run
    if (body.frequency || body.day_of_week !== undefined || body.day_of_month !== undefined || body.time_of_day) {
      const { data: current } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('id', id)
        .single()

      if (current) {
        const updatedSchedule = { ...current, ...body }
        body.next_run_at = calculateNextRun(updatedSchedule).toISOString()
      }
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Scheduled report PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/reports/schedules/[id] — delete a schedule
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Scheduled report DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
