import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/onboarding/[userId] - Get onboarding status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    // Only allow users to view their own onboarding
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: onboarding, error } = await supabase
      .from('client_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching onboarding:', error)
      return NextResponse.json({ error: 'Failed to fetch onboarding' }, { status: 500 })
    }

    return NextResponse.json({ onboarding })
  } catch (error) {
    console.error('Onboarding GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/onboarding/[userId] - Update onboarding status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    // Only allow users to update their own onboarding
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.tour_completed !== undefined) {
      updateData.tour_completed = body.tour_completed
      if (body.tour_completed) {
        updateData.tour_completed_at = new Date().toISOString()
      }
    }

    if (body.tour_skipped !== undefined) {
      updateData.tour_skipped = body.tour_skipped
    }

    if (body.steps_completed !== undefined) {
      updateData.steps_completed = body.steps_completed
    }

    if (body.welcome_video_watched !== undefined) {
      updateData.welcome_video_watched = body.welcome_video_watched
    }

    // Upsert onboarding record
    const { data: onboarding, error } = await supabase
      .from('client_onboarding')
      .upsert({
        user_id: userId,
        ...updateData,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating onboarding:', error)
      return NextResponse.json({ error: 'Failed to update onboarding' }, { status: 500 })
    }

    return NextResponse.json({ onboarding })
  } catch (error) {
    console.error('Onboarding PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
