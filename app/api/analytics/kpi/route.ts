import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/analytics/kpi - Get KPI targets
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

    const { searchParams } = new URL(request.url)
    const metricKey = searchParams.get('metric_key')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('kpi_targets')
      .select('*')
      .eq('firm_id', profile.current_firm_id)
      .eq('is_active', true)
      .order('metric_key')

    if (metricKey) {
      query = query.eq('metric_key', metricKey)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('KPI GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/analytics/kpi - Upsert KPI targets
export async function PUT(request: NextRequest) {
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

    if (!body.targets || !Array.isArray(body.targets)) {
      return NextResponse.json({ error: 'targets array is required' }, { status: 400 })
    }

    const firmId = profile.current_firm_id
    const results = []

    for (const target of body.targets) {
      if (!target.metric_key || target.target_value === undefined) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('kpi_targets')
        .upsert({
          firm_id: firmId,
          metric_key: target.metric_key,
          target_value: target.target_value,
          warning_threshold: target.warning_threshold || null,
          period: target.period || 'monthly',
          applies_to: target.applies_to || null,
          is_active: target.is_active !== false,
        }, { onConflict: 'firm_id,metric_key,period,applies_to' })
        .select()
        .single()

      if (error) {
        results.push({ metric_key: target.metric_key, error: error.message })
      } else {
        results.push({ metric_key: target.metric_key, data })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('KPI PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
