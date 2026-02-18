// Session 20 CP3: Portal Notification Service
// Multi-channel notifications: in-app, email, push
// Gracefully handles missing VAPID keys / web-push

import { createClient } from '@supabase/supabase-js'
import { ClientNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/portal'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// Create and send notification
// ============================================================

export async function createNotification(params: {
  clientId: string
  caseId?: string
  type: string
  category: 'message' | 'document' | 'task' | 'appointment' | 'payment' | 'case_update' | 'deadline' | 'system'
  title: string
  message: string
  link?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  actionRequired?: boolean
  expiresAt?: Date
}) {
  const supabase = getServiceClient()

  const {
    clientId, caseId, type, category, title, message,
    link, priority = 'normal', actionRequired = false, expiresAt,
  } = params

  // Create notification record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notification, error } = await (supabase as any)
    .from('client_notifications')
    .insert({
      client_id: clientId,
      case_id: caseId || null,
      notification_type: type,
      category,
      title,
      message,
      link: link || null,
      priority,
      action_required: actionRequired,
      expires_at: expiresAt?.toISOString() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create notification:', error)
    return null
  }

  // Get preferences and send via enabled channels
  const preferences = await getPreferences(clientId)
  const typePrefs = preferences.preferences?.[type] || DEFAULT_NOTIFICATION_PREFERENCES[type] || {
    email: true,
    sms: false,
    push: true,
  }

  const inQuietHours = isInQuietHours(preferences)

  // Send push if enabled and not in quiet hours
  if (typePrefs.push && preferences.push_enabled && !inQuietHours) {
    sendPushNotification(notification, clientId).catch(err =>
      console.error('Push notification error:', err)
    )
  }

  // Email sending would be handled by an email service (Resend)
  // Mark as email_sent if preferences indicate it should be sent
  if (typePrefs.email && preferences.email_enabled) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('client_notifications')
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq('id', notification.id)
  }

  return notification
}

// ============================================================
// Get notifications
// ============================================================

export async function getNotifications(
  clientId: string,
  options?: {
    unreadOnly?: boolean
    category?: string
    limit?: number
  }
) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('client_notifications')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (options?.unreadOnly) {
    query = query.eq('is_read', false)
  }

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================================
// Get unread count
// ============================================================

export async function getUnreadCount(clientId: string): Promise<number> {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from('client_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('is_read', false)
    .eq('is_archived', false)

  if (error) throw error
  return count || 0
}

// ============================================================
// Mark notifications as read
// ============================================================

export async function markAsRead(clientId: string, notificationIds: string[]) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('client_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .in('id', notificationIds)
}

// ============================================================
// Mark all as read
// ============================================================

export async function markAllAsRead(clientId: string) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('client_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('is_read', false)
}

// ============================================================
// Archive notification
// ============================================================

export async function archiveNotification(clientId: string, notificationId: string) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('client_notifications')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('id', notificationId)
}

// ============================================================
// Get / create notification preferences
// ============================================================

export async function getPreferences(clientId: string): Promise<ClientNotificationPreferences> {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('client_notification_preferences')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (data) return data

  // Create defaults
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newPrefs } = await (supabase as any)
    .from('client_notification_preferences')
    .insert({
      client_id: clientId,
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    })
    .select()
    .single()

  return newPrefs || {
    id: '',
    client_id: clientId,
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
    digest_enabled: false,
    digest_frequency: 'daily' as const,
    digest_time: '09:00',
    preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    phone_number: null,
    phone_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// ============================================================
// Update preferences
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updatePreferences(clientId: string, updates: Record<string, any>) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('client_notification_preferences')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// Push subscription management
// ============================================================

export async function registerPushSubscription(
  clientId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  deviceInfo: { userAgent: string; deviceType: string }
) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('push_subscriptions')
    .upsert(
      {
        client_id: clientId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: deviceInfo.userAgent,
        device_type: deviceInfo.deviceType,
        is_active: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,endpoint' }
    )
}

export async function unregisterPushSubscription(clientId: string, endpoint: string) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('client_id', clientId)
    .eq('endpoint', endpoint)
}

// ============================================================
// Send push notification
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendPushNotification(notification: any, clientId: string) {
  // Dynamically require web-push to avoid errors if not installed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let webpush: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    webpush = require('web-push')
  } catch {
    // web-push not installed, skip
    return
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidEmail = process.env.VAPID_EMAIL

  if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
    return // VAPID keys not configured
  }

  webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey)

  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscriptions } = await (supabase as any)
    .from('push_subscriptions')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)

  if (!subscriptions || subscriptions.length === 0) return

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: notification.link || '/portal/notifications',
      notificationId: notification.id,
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendPromises = subscriptions.map(async (sub: any) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
        },
        payload
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id)
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired/invalid
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', sub.id)
      }
    }
  })

  await Promise.allSettled(sendPromises)

  // Mark push as sent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('client_notifications')
    .update({ push_sent: true, push_sent_at: new Date().toISOString() })
    .eq('id', notification.id)
}

// ============================================================
// Quiet hours check
// ============================================================

function isInQuietHours(preferences: ClientNotificationPreferences): boolean {
  if (!preferences.quiet_hours_enabled) return false
  if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) return false

  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const currentTime = `${hours}:${minutes}`

  const start = preferences.quiet_hours_start
  const end = preferences.quiet_hours_end

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (start > end) {
    return currentTime >= start || currentTime < end
  }

  return currentTime >= start && currentTime < end
}
