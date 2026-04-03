import { NextRequest, NextResponse } from 'next/server'
import { CreateIntakeRequest, TOTAL_INTAKE_STEPS } from '@/types/intake'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/intakes - List user's intakes
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: intakes, error } = await supabase
      .from('client_intakes')
      .select('*')
      .or(`user_id.eq.${user.id},invited_by.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching intakes:', error)
      return NextResponse.json({ error: 'Failed to fetch intakes' }, { status: 500 })
    }

    return NextResponse.json({ intakes: intakes || [] })
  } catch (error) {
    console.error('Intakes GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/intakes - Start a new intake
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateIntakeRequest = await request.json()

    // Check if user already has an in-progress intake
    const { data: existingIntake } = await supabase
      .from('client_intakes')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['draft', 'in_progress'])
      .single()

    if (existingIntake) {
      return NextResponse.json({
        error: 'You already have an intake in progress',
        existingIntakeId: existingIntake.id
      }, { status: 409 })
    }

    // Create new intake
    const { data: intake, error } = await supabase
      .from('client_intakes')
      .insert({
        user_id: user.id,
        case_id: body.case_id || null,
        invited_by: body.invited_by || null,
        status: 'draft',
        current_step: 1,
        completed_steps: [],
        progress_percentage: 0,
        intake_data: {},
        validation_errors: {},
        auto_save_enabled: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating intake:', error)
      return NextResponse.json({ error: 'Failed to create intake' }, { status: 500 })
    }

    return NextResponse.json({
      intake,
      totalSteps: TOTAL_INTAKE_STEPS
    }, { status: 201 })
  } catch (error) {
    console.error('Intakes POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
