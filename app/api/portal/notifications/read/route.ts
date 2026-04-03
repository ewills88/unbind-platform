import { NextRequest, NextResponse } from 'next/server'
import { markAsRead, markAllAsRead } from '@/lib/portal/notificationService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/portal/notifications/read — mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, all } = body

    if (all) {
      await markAllAsRead(user.id)
    } else if (notificationIds && notificationIds.length > 0) {
      await markAsRead(user.id, notificationIds)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
