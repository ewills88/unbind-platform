import { NextRequest, NextResponse } from 'next/server'
import { getNotifications, getUnreadCount } from '@/lib/portal/notificationService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/notifications — list client notifications
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const category = searchParams.get('category') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(user.id, { unreadOnly, category, limit }),
      getUnreadCount(user.id),
    ])

    return NextResponse.json({ data: notifications, unreadCount })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
