import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET /api/timer - Get current active timer
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: timer, error } = await supabase
      .from('active_timers')
      .select(`
        *,
        case:cases(
          id, case_number, client_name
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching timer:', error)
      return NextResponse.json({ error: 'Failed to fetch timer' }, { status: 500 })
    }

    // Calculate current elapsed time if timer is running
    let elapsed_seconds = timer?.accumulated_seconds || 0
    if (timer && !timer.paused_at) {
      const startedAt = new Date(timer.started_at).getTime()
      const now = Date.now()
      elapsed_seconds += Math.floor((now - startedAt) / 1000)
    }

    return NextResponse.json({
      timer: timer || null,
      elapsed_seconds,
      is_running: timer && !timer.paused_at
    })
  } catch (error) {
    console.error('Timer GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/timer - Start or manage timer
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, case_id, activity_type, description } = body

    // Get existing timer
    const { data: existingTimer } = await supabase
      .from('active_timers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    switch (action) {
      case 'start': {
        if (!case_id) {
          return NextResponse.json({ error: 'case_id is required to start timer' }, { status: 400 })
        }

        // Verify case access
        const { data: caseData } = await supabase
          .from('cases')
          .select('id, attorney_id')
          .eq('id', case_id)
          .single()

        if (!caseData || caseData.attorney_id !== user.id) {
          return NextResponse.json({ error: 'Access denied to this case' }, { status: 403 })
        }

        if (existingTimer) {
          // Stop existing timer first by saving the time entry
          const elapsedSeconds = calculateElapsedSeconds(existingTimer)
          if (elapsedSeconds > 0) {
            await saveTimeEntry(supabase, user.id, existingTimer, elapsedSeconds)
          }

          // Delete the existing timer
          await supabase
            .from('active_timers')
            .delete()
            .eq('user_id', user.id)
        }

        // Create new timer
        const { data: timer, error } = await supabase
          .from('active_timers')
          .insert({
            user_id: user.id,
            case_id: case_id,
            started_at: new Date().toISOString(),
            activity_type: activity_type || 'other',
            description: description || '',
            accumulated_seconds: 0
          })
          .select(`
            *,
            case:cases(id, case_number, client_name)
          `)
          .single()

        if (error) {
          console.error('Error starting timer:', error)
          return NextResponse.json({ error: 'Failed to start timer' }, { status: 500 })
        }

        return NextResponse.json({ timer, message: 'Timer started' })
      }

      case 'pause': {
        if (!existingTimer) {
          return NextResponse.json({ error: 'No active timer' }, { status: 400 })
        }

        if (existingTimer.paused_at) {
          return NextResponse.json({ error: 'Timer is already paused' }, { status: 400 })
        }

        // Calculate elapsed and add to accumulated
        const elapsedSinceStart = Math.floor(
          (Date.now() - new Date(existingTimer.started_at).getTime()) / 1000
        )
        const newAccumulated = existingTimer.accumulated_seconds + elapsedSinceStart

        const { data: timer, error } = await supabase
          .from('active_timers')
          .update({
            paused_at: new Date().toISOString(),
            accumulated_seconds: newAccumulated
          })
          .eq('user_id', user.id)
          .select(`
            *,
            case:cases(id, case_number, client_name)
          `)
          .single()

        if (error) {
          console.error('Error pausing timer:', error)
          return NextResponse.json({ error: 'Failed to pause timer' }, { status: 500 })
        }

        return NextResponse.json({ timer, elapsed_seconds: newAccumulated, message: 'Timer paused' })
      }

      case 'resume': {
        if (!existingTimer) {
          return NextResponse.json({ error: 'No active timer' }, { status: 400 })
        }

        if (!existingTimer.paused_at) {
          return NextResponse.json({ error: 'Timer is not paused' }, { status: 400 })
        }

        const { data: timer, error } = await supabase
          .from('active_timers')
          .update({
            started_at: new Date().toISOString(),
            paused_at: null
          })
          .eq('user_id', user.id)
          .select(`
            *,
            case:cases(id, case_number, client_name)
          `)
          .single()

        if (error) {
          console.error('Error resuming timer:', error)
          return NextResponse.json({ error: 'Failed to resume timer' }, { status: 500 })
        }

        return NextResponse.json({ timer, message: 'Timer resumed' })
      }

      case 'stop': {
        if (!existingTimer) {
          return NextResponse.json({ error: 'No active timer' }, { status: 400 })
        }

        const elapsedSeconds = calculateElapsedSeconds(existingTimer)

        // Save time entry
        const entry = await saveTimeEntry(supabase, user.id, existingTimer, elapsedSeconds)

        // Delete timer
        await supabase
          .from('active_timers')
          .delete()
          .eq('user_id', user.id)

        return NextResponse.json({
          timer: null,
          entry,
          elapsed_seconds: elapsedSeconds,
          message: 'Timer stopped and time entry created'
        })
      }

      case 'discard': {
        if (!existingTimer) {
          return NextResponse.json({ error: 'No active timer' }, { status: 400 })
        }

        await supabase
          .from('active_timers')
          .delete()
          .eq('user_id', user.id)

        return NextResponse.json({ timer: null, message: 'Timer discarded' })
      }

      case 'update': {
        if (!existingTimer) {
          return NextResponse.json({ error: 'No active timer' }, { status: 400 })
        }

        const updates: Record<string, unknown> = {}
        if (activity_type) updates.activity_type = activity_type
        if (description !== undefined) updates.description = description

        const { data: timer, error } = await supabase
          .from('active_timers')
          .update(updates)
          .eq('user_id', user.id)
          .select(`
            *,
            case:cases(id, case_number, client_name)
          `)
          .single()

        if (error) {
          console.error('Error updating timer:', error)
          return NextResponse.json({ error: 'Failed to update timer' }, { status: 500 })
        }

        return NextResponse.json({ timer, message: 'Timer updated' })
      }

      case 'switch_case': {
        if (!case_id) {
          return NextResponse.json({ error: 'case_id is required' }, { status: 400 })
        }

        // Verify new case access
        const { data: caseData } = await supabase
          .from('cases')
          .select('id, attorney_id')
          .eq('id', case_id)
          .single()

        if (!caseData || caseData.attorney_id !== user.id) {
          return NextResponse.json({ error: 'Access denied to this case' }, { status: 403 })
        }

        if (existingTimer) {
          // Save time entry for current case
          const elapsedSeconds = calculateElapsedSeconds(existingTimer)
          if (elapsedSeconds > 0) {
            await saveTimeEntry(supabase, user.id, existingTimer, elapsedSeconds)
          }

          // Update timer with new case
          const { data: timer, error } = await supabase
            .from('active_timers')
            .update({
              case_id: case_id,
              started_at: new Date().toISOString(),
              accumulated_seconds: 0,
              paused_at: null
            })
            .eq('user_id', user.id)
            .select(`
              *,
              case:cases(id, case_number, client_name)
            `)
            .single()

          if (error) {
            console.error('Error switching case:', error)
            return NextResponse.json({ error: 'Failed to switch case' }, { status: 500 })
          }

          return NextResponse.json({ timer, message: 'Switched to new case' })
        } else {
          // No existing timer, just start new one
          const { data: timer, error } = await supabase
            .from('active_timers')
            .insert({
              user_id: user.id,
              case_id: case_id,
              started_at: new Date().toISOString(),
              activity_type: activity_type || 'other',
              description: description || '',
              accumulated_seconds: 0
            })
            .select(`
              *,
              case:cases(id, case_number, client_name)
            `)
            .single()

          if (error) {
            console.error('Error starting timer:', error)
            return NextResponse.json({ error: 'Failed to start timer' }, { status: 500 })
          }

          return NextResponse.json({ timer, message: 'Timer started for case' })
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timer POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateElapsedSeconds(timer: {
  accumulated_seconds: number
  started_at: string
  paused_at: string | null
}): number {
  let elapsed = timer.accumulated_seconds || 0

  if (!timer.paused_at) {
    const startedAt = new Date(timer.started_at).getTime()
    const now = Date.now()
    elapsed += Math.floor((now - startedAt) / 1000)
  }

  return elapsed
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveTimeEntry(
  supabase: any,
  userId: string,
  timer: {
    case_id: string
    activity_type: string
    description: string
  },
  elapsedSeconds: number
) {
  // Get billing settings
  const { data: settings } = await supabase
    .from('attorney_billing_settings')
    .select('*')
    .eq('attorney_id', userId)
    .single()

  const hourlyRate = settings?.default_hourly_rate || 300
  const incrementMinutes = settings?.minimum_increment_minutes || 6

  // Round up to nearest increment
  let durationMinutes = Math.ceil(elapsedSeconds / 60)
  durationMinutes = Math.ceil(durationMinutes / incrementMinutes) * incrementMinutes

  // Minimum 6 minutes
  if (durationMinutes < incrementMinutes) {
    durationMinutes = incrementMinutes
  }

  const amount = (durationMinutes / 60) * hourlyRate

  const { data: entry, error } = await supabase
    .from('time_entries')
    .insert({
      case_id: timer.case_id,
      attorney_id: userId,
      entry_date: new Date().toISOString().split('T')[0],
      duration_minutes: durationMinutes,
      activity_type: timer.activity_type || 'other',
      description: timer.description || 'Time tracked via timer',
      billable: true,
      hourly_rate: hourlyRate,
      amount: amount,
      created_by: userId
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving time entry:', error)
    throw error
  }

  return entry
}
