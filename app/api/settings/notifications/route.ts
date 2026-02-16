import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getDefaultPreferences } from '@/types/notifications'

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

// GET - Fetch notification preferences (upsert defaults if not exists)
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to fetch existing preferences
    let { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If none exist, create defaults
    if (!prefs) {
      const { data: newPrefs, error: insertError } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: user.id,
          preferences: getDefaultPreferences(),
          frequency: 'instant',
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      prefs = newPrefs
    }

    return NextResponse.json(prefs)
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    if (typeof body.email_enabled === 'boolean') {
      updateData.email_enabled = body.email_enabled
    }
    if (typeof body.app_notifications_enabled === 'boolean') {
      updateData.app_notifications_enabled = body.app_notifications_enabled
    }
    if (body.quiet_hours_start !== undefined) {
      updateData.quiet_hours_start = body.quiet_hours_start
    }
    if (body.quiet_hours_end !== undefined) {
      updateData.quiet_hours_end = body.quiet_hours_end
    }
    if (body.timezone) {
      updateData.timezone = body.timezone
    }
    if (body.preferences) {
      updateData.preferences = body.preferences
    }
    if (body.frequency) {
      updateData.frequency = body.frequency
    }

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from('user_notification_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let prefs
    if (existing) {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      prefs = data
    } else {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: user.id,
          ...updateData,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      prefs = data
    }

    // Update legacy profile fields for backward compatibility
    const profileUpdate: Record<string, unknown> = {}
    if (typeof body.email_enabled === 'boolean') {
      profileUpdate.email_notifications = body.email_enabled
    }
    if (body.preferences) {
      const p = body.preferences as Record<string, { email?: boolean; push?: boolean }>
      if (p.new_message) profileUpdate.notify_messages = p.new_message.email !== false
      if (p.document_uploaded) profileUpdate.notify_documents = p.document_uploaded.email !== false
      if (p.task_assigned) profileUpdate.notify_tasks = p.task_assigned.email !== false
      if (p.deadline_reminder) profileUpdate.notify_deadlines = p.deadline_reminder.email !== false
    }

    if (Object.keys(profileUpdate).length > 0) {
      await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id)
    }

    return NextResponse.json(prefs)
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
