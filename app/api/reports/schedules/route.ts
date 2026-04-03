import { NextRequest, NextResponse } from 'next/server'
import { calculateNextRun } from '@/lib/reports/scheduledReportsService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/reports/schedules — list scheduled reports for the firm
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('firm_id', profile.current_firm_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Scheduled reports GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/reports/schedules — create a new schedule
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const body = await request.json()
    const nextRun = calculateNextRun(body)

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        firm_id: profile.current_firm_id,
        schedule_name: body.schedule_name,
        report_type: body.report_type,
        template_id: body.template_id || null,
        description: body.description || null,
        frequency: body.frequency || 'weekly',
        day_of_week: body.day_of_week ?? 1,
        day_of_month: body.day_of_month ?? 1,
        time_of_day: body.time_of_day || '08:00',
        timezone: body.timezone || 'America/Los_Angeles',
        recipients: body.recipients || [],
        export_format: body.export_format || 'pdf',
        filters: body.filters || {},
        include_charts: body.include_charts ?? true,
        next_run_at: nextRun.toISOString(),
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Scheduled reports POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
