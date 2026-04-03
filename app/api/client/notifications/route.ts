import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/client/notifications - Fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: notifications, error: fetchError } = await supabase
      .from('client_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    const unreadCount = (notifications || []).filter(n => !n.read_at).length

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: unreadCount,
    })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/client/notifications - Mark notification(s) as read
export async function PATCH(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notification_id, mark_all } = await request.json()

    if (mark_all) {
      const { error: updateError } = await supabase
        .from('client_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (updateError) {
        console.error('Error marking all as read:', updateError)
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (!notification_id) {
      return NextResponse.json({ error: 'notification_id or mark_all required' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('client_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notification_id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error marking notification as read:', updateError)
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
