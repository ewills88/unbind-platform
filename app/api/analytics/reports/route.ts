import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { generateReport } from '@/lib/analytics/metricsService'
import { getDateRangeForPreset, type DateRangePreset } from '@/types/reporting'

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

// GET /api/analytics/reports - List saved report configurations
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
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

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')
    const favoritesOnly = searchParams.get('favorites') === 'true'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('report_configurations')
      .select('*')
      .eq('firm_id', profile.current_firm_id)
      .order('updated_at', { ascending: false })

    if (reportType) {
      query = query.eq('report_type', reportType)
    }
    if (favoritesOnly) {
      query = query.eq('is_favorite', true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/analytics/reports - Generate a report or save a report config
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
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

    const firmId = profile.current_firm_id
    const body = await request.json()
    const action = body.action || 'generate'

    if (action === 'save') {
      // Save report configuration
      if (!body.report_name || !body.report_type) {
        return NextResponse.json({ error: 'report_name and report_type are required' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('report_configurations')
        .insert({
          firm_id: firmId,
          created_by: user.id,
          report_name: body.report_name,
          report_type: body.report_type,
          description: body.description || null,
          metrics: body.metrics || [],
          filters: body.filters || {},
          group_by: body.group_by || null,
          sort_by: body.sort_by || 'date',
          sort_direction: body.sort_direction || 'desc',
          chart_type: body.chart_type || 'bar',
          is_favorite: body.is_favorite || false,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // Generate report
    if (!body.report_type) {
      return NextResponse.json({ error: 'report_type is required' }, { status: 400 })
    }

    const dateRange = body.date_range as DateRangePreset || 'this_month'
    let startDate: string
    let endDate: string

    if (body.start_date && body.end_date) {
      startDate = body.start_date
      endDate = body.end_date
    } else {
      const range = getDateRangeForPreset(dateRange)
      startDate = range.start
      endDate = range.end
    }

    const report = await generateReport(
      firmId,
      body.report_type,
      new Date(startDate),
      new Date(endDate),
      {
        attorneys: body.attorneys,
        caseTypes: body.case_types,
        groupBy: body.group_by,
      }
    )

    // Save snapshot if requested
    if (body.save_snapshot) {
      await supabase.from('report_snapshots').insert({
        firm_id: firmId,
        report_config_id: body.report_config_id || null,
        created_by: user.id,
        snapshot_name: body.snapshot_name || `${body.report_type} - ${new Date().toLocaleDateString()}`,
        report_type: body.report_type,
        period_start: startDate,
        period_end: endDate,
        summary_data: report.summary,
        detail_data: report.data,
        metadata: {
          filters: body.filters || {},
          group_by: body.group_by,
          generated_at: new Date().toISOString(),
        },
      })
    }

    // Update last_run_at if running a saved config
    if (body.report_config_id) {
      await supabase
        .from('report_configurations')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', body.report_config_id)
    }

    return NextResponse.json({
      report: {
        report_type: body.report_type,
        period: { start: startDate, end: endDate },
        generated_at: new Date().toISOString(),
        ...report,
      },
    })
  } catch (error) {
    console.error('Reports POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
