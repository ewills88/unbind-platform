import { NextRequest, NextResponse } from 'next/server'
import { getPreferences, updatePreferences } from '@/lib/portal/notificationService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/notifications/preferences — get notification preferences
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await getPreferences(user.id)
    return NextResponse.json({ data: preferences })
  } catch (error) {
    console.error('Preferences GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/portal/notifications/preferences — update preferences
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()
    const preferences = await updatePreferences(user.id, updates)
    return NextResponse.json({ data: preferences })
  } catch (error) {
    console.error('Preferences PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
