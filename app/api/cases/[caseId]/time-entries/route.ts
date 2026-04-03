import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/cases/[caseId]/time-entries - List time entries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)

    // Filters
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const billable = searchParams.get('billable')
    const billed = searchParams.get('billed')
    const activityType = searchParams.get('activity_type')

    // Verify access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData || (caseData.attorney_id !== user.id && caseData.client_id !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        attorney:profiles!time_entries_attorney_id_fkey(
          id, full_name
        )
      `)
      .eq('case_id', caseId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (startDate) {
      query = query.gte('entry_date', startDate)
    }
    if (endDate) {
      query = query.lte('entry_date', endDate)
    }
    if (billable !== null && billable !== undefined) {
      query = query.eq('billable', billable === 'true')
    }
    if (billed === 'true') {
      query = query.not('billed_at', 'is', null)
    } else if (billed === 'false') {
      query = query.is('billed_at', null)
    }
    if (activityType) {
      query = query.eq('activity_type', activityType)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching time entries:', error)
      return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 })
    }

    // Calculate totals
    const totalMinutes = entries?.reduce((sum, e) => sum + e.duration_minutes, 0) || 0
    const totalAmount = entries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
    const billableMinutes = entries?.filter(e => e.billable).reduce((sum, e) => sum + e.duration_minutes, 0) || 0
    const unbilledAmount = entries?.filter(e => e.billable && !e.billed_at).reduce((sum, e) => sum + Number(e.amount), 0) || 0

    return NextResponse.json({
      entries,
      summary: {
        total_entries: entries?.length || 0,
        total_minutes: totalMinutes,
        total_amount: totalAmount,
        billable_minutes: billableMinutes,
        unbilled_amount: unbilledAmount
      }
    })
  } catch (error) {
    console.error('Time entries GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/time-entries - Create time entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    // Verify attorney access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can create time entries' }, { status: 403 })
    }

    // Get billing settings for default rate
    const { data: settings } = await supabase
      .from('attorney_billing_settings')
      .select('*')
      .eq('attorney_id', user.id)
      .single()

    const hourlyRate = body.hourly_rate || settings?.default_hourly_rate || 300

    // Round duration to increment if settings exist
    let durationMinutes = body.duration_minutes
    if (settings?.minimum_increment_minutes) {
      durationMinutes = Math.ceil(durationMinutes / settings.minimum_increment_minutes) *
                       settings.minimum_increment_minutes
    }

    // Calculate amount
    const amount = (durationMinutes / 60) * hourlyRate

    // Create time entry
    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        case_id: caseId,
        attorney_id: user.id,
        entry_date: body.entry_date || new Date().toISOString().split('T')[0],
        start_time: body.start_time,
        end_time: body.end_time,
        duration_minutes: durationMinutes,
        activity_type: body.activity_type || 'other',
        description: body.description,
        billable: body.billable !== false,
        hourly_rate: hourlyRate,
        amount: amount,
        created_by: user.id
      })
      .select(`
        *,
        attorney:profiles!time_entries_attorney_id_fkey(
          id, full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating time entry:', error)
      return NextResponse.json({ error: 'Failed to create time entry' }, { status: 500 })
    }

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('Time entries POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
