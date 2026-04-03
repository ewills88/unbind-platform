import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET - Get current calendar connection
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('id, provider, calendar_id, calendar_name, sync_enabled, last_synced_at, sync_status, error_message, settings, connected_at')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ connection: connection || null })
  } catch (error) {
    console.error('Google settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update calendar settings
export async function PATCH(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (typeof body.sync_enabled === 'boolean') {
      updateData.sync_enabled = body.sync_enabled
    }
    if (body.calendar_id) {
      updateData.calendar_id = body.calendar_id
    }
    if (body.calendar_name) {
      updateData.calendar_name = body.calendar_name
    }
    if (body.settings) {
      updateData.settings = body.settings
    }

    const { data, error } = await supabase
      .from('calendar_connections')
      .update(updateData)
      .eq('user_id', user.id)
      .select('id, provider, calendar_id, calendar_name, sync_enabled, last_synced_at, sync_status, error_message, settings, connected_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ connection: data })
  } catch (error) {
    console.error('Google settings PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
