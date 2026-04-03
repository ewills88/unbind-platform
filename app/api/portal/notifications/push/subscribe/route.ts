import { NextRequest, NextResponse } from 'next/server'
import { registerPushSubscription } from '@/lib/portal/notificationService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

function parseDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'unknown'
  const ua = userAgent.toLowerCase()
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios'
  if (ua.includes('android')) return 'android'
  if (ua.includes('mobile')) return 'mobile'
  return 'desktop'
}

// POST /api/portal/notifications/push/subscribe — register push subscription
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Push subscription data is required' },
        { status: 400 }
      )
    }

    const userAgent = request.headers.get('user-agent') || 'unknown'
    const deviceType = parseDeviceType(userAgent)

    await registerPushSubscription(
      user.id,
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys || { p256dh: '', auth: '' },
      },
      { userAgent, deviceType }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
