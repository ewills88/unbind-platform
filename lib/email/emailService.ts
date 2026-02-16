// Email Service
// Session 15: Queue, render, and send emails via Resend

import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import {
  NotificationTriggerType,
  EnhancedNotificationPreferences,
} from '@/types/notifications'
import { DEFAULT_EMAIL_TEMPLATES } from './templates'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Service role client for server-side operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * Send an email via Resend API.
 */
export async function sendEmail(
  to: string,
  toName: string | null,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const resend = getResend()
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@unbind.app'

    const { data, error } = await resend.emails.send({
      from: `Unbind <${fromEmail}>`,
      to: toName ? `${toName} <${to}>` : to,
      subject,
      html,
      text,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error sending email'
    return { success: false, error: message }
  }
}

/**
 * Replace {{key}} placeholders with variable values.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

/**
 * Check if the current time is within the user's quiet hours.
 * Returns whether we're in quiet hours and when the next active time is.
 */
export function isQuietHours(
  prefs: Pick<EnhancedNotificationPreferences, 'quiet_hours_start' | 'quiet_hours_end' | 'timezone'>
): { inQuietHours: boolean; nextActiveTime: Date | null } {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return { inQuietHours: false, nextActiveTime: null }
  }

  const tz = prefs.timezone || 'America/Los_Angeles'
  const now = new Date()

  // Get current time in user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
  const currentMinutes = currentHour * 60 + currentMinute

  const [startH, startM] = prefs.quiet_hours_start.split(':').map(Number)
  const [endH, endM] = prefs.quiet_hours_end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  let inQuiet = false
  if (startMinutes <= endMinutes) {
    // Same day range (e.g., 22:00 - 22:00 means disabled, 09:00 - 17:00)
    inQuiet = currentMinutes >= startMinutes && currentMinutes < endMinutes
  } else {
    // Crosses midnight (e.g., 22:00 - 07:00)
    inQuiet = currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  if (!inQuiet) {
    return { inQuietHours: false, nextActiveTime: null }
  }

  // Calculate next active time
  const nextActive = new Date(now)
  // Set to end of quiet hours
  const endDate = new Date(now)
  endDate.setHours(endH, endM, 0, 0)
  // If end is before now (crosses midnight), push to tomorrow
  if (endDate <= now) {
    endDate.setDate(endDate.getDate() + 1)
  }

  return { inQuietHours: true, nextActiveTime: endDate }
}

/**
 * Main entry point: queue an email for a user based on template type.
 * Checks preferences, quiet hours, and template resolution.
 */
export async function queueEmail(
  userId: string,
  templateType: NotificationTriggerType,
  variables: Record<string, string>,
  caseId?: string
): Promise<{ queued: boolean; reason?: string }> {
  const supabase = getServiceClient()

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, firm_id')
    .eq('id', userId)
    .single()

  if (!profile || !profile.email) {
    return { queued: false, reason: 'User or email not found' }
  }

  // 2. Fetch notification preferences (upsert defaults if missing)
  let { data: prefs } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!prefs) {
    // Create default preferences
    const { data: newPrefs } = await supabase
      .from('user_notification_preferences')
      .insert({ user_id: userId })
      .select()
      .single()
    prefs = newPrefs
  }

  if (!prefs) {
    return { queued: false, reason: 'Could not load preferences' }
  }

  // 3. Check global email enabled
  if (!prefs.email_enabled) {
    return { queued: false, reason: 'Email notifications disabled' }
  }

  // 4. Check per-type preference
  const typePrefs = prefs.preferences as Record<string, { email?: boolean }> | null
  if (typePrefs && typePrefs[templateType] && typePrefs[templateType].email === false) {
    return { queued: false, reason: `Email disabled for ${templateType}` }
  }

  // 5. Check quiet hours
  let scheduledFor = new Date()
  const quietCheck = isQuietHours({
    quiet_hours_start: prefs.quiet_hours_start,
    quiet_hours_end: prefs.quiet_hours_end,
    timezone: prefs.timezone || 'America/Los_Angeles',
  })
  if (quietCheck.inQuietHours && quietCheck.nextActiveTime) {
    scheduledFor = quietCheck.nextActiveTime
  }

  // 6. Resolve template: firm-specific > system DB > hardcoded default
  let subject = ''
  let htmlBody = ''
  let textBody = ''

  // Try firm-specific template
  if (profile.firm_id) {
    const { data: firmTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('firm_id', profile.firm_id)
      .eq('template_type', templateType)
      .eq('is_active', true)
      .single()

    if (firmTemplate) {
      subject = firmTemplate.subject
      htmlBody = firmTemplate.html_content
      textBody = firmTemplate.text_content
    }
  }

  // Fall back to system template
  if (!subject) {
    const { data: systemTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .is('firm_id', null)
      .eq('template_type', templateType)
      .eq('is_active', true)
      .single()

    if (systemTemplate) {
      subject = systemTemplate.subject
      htmlBody = systemTemplate.html_content
      textBody = systemTemplate.text_content
    }
  }

  // Fall back to hardcoded default
  if (!subject) {
    const defaultTemplate = DEFAULT_EMAIL_TEMPLATES[templateType]
    if (defaultTemplate) {
      subject = defaultTemplate.subject
      htmlBody = defaultTemplate.html
      textBody = defaultTemplate.text
    }
  }

  if (!subject) {
    return { queued: false, reason: `No template found for ${templateType}` }
  }

  // 7. Add common variables
  const allVariables: Record<string, string> = {
    recipient_name: profile.full_name || 'there',
    action_url: variables.action_url || `${BASE_URL}/dashboard`,
    unsubscribe_url: `${BASE_URL}/dashboard/settings/notifications`,
    ...variables,
  }

  // 8. Render templates
  const renderedSubject = renderTemplate(subject, allVariables)
  const renderedHtml = renderTemplate(htmlBody, allVariables)
  const renderedText = renderTemplate(textBody, allVariables)

  // 9. Insert into email queue
  const { error: insertError } = await supabase
    .from('email_queue')
    .insert({
      recipient_email: profile.email,
      recipient_name: profile.full_name,
      template_type: templateType,
      subject: renderedSubject,
      html_body: renderedHtml,
      text_body: renderedText,
      variables: allVariables,
      status: 'pending',
      scheduled_for: scheduledFor.toISOString(),
      user_id: userId,
      case_id: caseId || null,
    })

  if (insertError) {
    return { queued: false, reason: insertError.message }
  }

  return { queued: true }
}
