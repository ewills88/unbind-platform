import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { CreateCoverageRequest } from '@/types/collaboration'

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

// GET /api/coverage - List coverage assignments for user's firm
export async function GET() {
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

    const { data: coverages, error: coverageError } = await supabase
      .from('coverage_assignments')
      .select(`
        *,
        primary_attorney:profiles!coverage_assignments_primary_attorney_id_fkey(id, full_name),
        coverage_attorney:profiles!coverage_assignments_coverage_attorney_id_fkey(id, full_name)
      `)
      .eq('firm_id', profile.current_firm_id)
      .order('start_date', { ascending: false })

    if (coverageError) {
      const { data: coveragesOnly } = await supabase
        .from('coverage_assignments')
        .select('*')
        .eq('firm_id', profile.current_firm_id)
        .order('start_date', { ascending: false })

      return NextResponse.json({ coverages: coveragesOnly || [] })
    }

    return NextResponse.json({ coverages: coverages || [] })
  } catch (error) {
    console.error('Coverage GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/coverage - Create a coverage assignment
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

    const body: CreateCoverageRequest = await request.json()

    if (!body.coverage_attorney_id) {
      return NextResponse.json({ error: 'Coverage attorney is required' }, { status: 400 })
    }

    if (!body.start_date || !body.end_date) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    // Verify coverage attorney is an active firm member
    const { data: coverageMembership } = await supabase
      .from('firm_members')
      .select('id')
      .eq('firm_id', profile.current_firm_id)
      .eq('user_id', body.coverage_attorney_id)
      .eq('status', 'active')
      .single()

    if (!coverageMembership) {
      return NextResponse.json({ error: 'Coverage attorney must be an active firm member' }, { status: 400 })
    }

    const { data: coverage, error: insertError } = await supabase
      .from('coverage_assignments')
      .insert({
        firm_id: profile.current_firm_id,
        primary_attorney_id: user.id,
        coverage_attorney_id: body.coverage_attorney_id,
        start_date: body.start_date,
        end_date: body.end_date,
        coverage_type: body.coverage_type || 'full_coverage',
        case_ids: body.case_ids || [],
        notes: body.notes || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating coverage:', insertError)
      return NextResponse.json({ error: 'Failed to create coverage' }, { status: 500 })
    }

    return NextResponse.json({ coverage })
  } catch (error) {
    console.error('Coverage POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
