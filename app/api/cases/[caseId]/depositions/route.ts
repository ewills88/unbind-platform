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

interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/depositions - List depositions for a case
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('depositions')
      .select('*')
      .eq('case_id', caseId)
      .order('scheduled_date', { ascending: true, nullsFirst: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Depositions list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/depositions - Create a deposition
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    const { deponent_name, deponent_type, deponent_role, scheduled_date,
            scheduled_end_time, location, location_type, video_link,
            court_reporter, court_reporter_contact, videographer,
            discovery_request_id, duration_hours, notes } = body

    if (!deponent_name) {
      return NextResponse.json({ error: 'deponent_name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('depositions')
      .insert({
        case_id: caseId,
        deponent_name,
        deponent_type: deponent_type || 'party',
        deponent_role,
        scheduled_date,
        scheduled_end_time,
        location,
        location_type: location_type || 'in_person',
        video_link,
        court_reporter,
        court_reporter_contact,
        videographer,
        discovery_request_id,
        duration_hours,
        notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Deposition create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
