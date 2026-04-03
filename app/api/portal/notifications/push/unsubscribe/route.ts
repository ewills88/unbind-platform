import { NextRequest, NextResponse } from 'next/server'
import { unregisterPushSubscription } from '@/lib/portal/notificationService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/portal/notifications/push/unsubscribe — remove push subscription
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    await unregisterPushSubscription(user.id, endpoint)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
