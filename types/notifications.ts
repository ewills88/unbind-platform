// Session 15: Email Notifications & Preferences Types

// Notification trigger types
export type NotificationTriggerType =
  | 'new_message'
  | 'document_uploaded'
  | 'task_assigned'
  | 'task_overdue'
  | 'deadline_reminder'
  | 'invoice_sent'
  | 'payment_received'
  | 'case_update'
  | 'intake_submitted'
  | 'welcome'

// Email delivery frequency
export type EmailFrequency = 'instant' | 'daily_digest' | 'weekly_digest'

// Email queue status
export type EmailStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'bounced'

// Email event types
export type EmailEventType = 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'

// Per-type channel preference
export interface ChannelPreference {
  email: boolean
  push: boolean
}

// Map of trigger type to channel preferences
export type NotificationPreferencesMap = Partial<Record<NotificationTriggerType, ChannelPreference>>

// Enhanced notification preferences (extends existing table with new columns)
export interface EnhancedNotificationPreferences {
  id: string
  user_id: string
  email_enabled: boolean
  app_notifications_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  timezone: string
  preferences: NotificationPreferencesMap
  frequency: EmailFrequency
  // Legacy fields
  default_remind_1_day: boolean
  default_remind_3_days: boolean
  default_remind_1_week: boolean
}

// Email template
export interface EmailTemplate {
  id: string
  firm_id: string | null
  template_type: NotificationTriggerType
  subject: string
  html_content: string
  text_content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Email queue item
export interface EmailQueueItem {
  id: string
  recipient_email: string
  recipient_name: string | null
  template_type: NotificationTriggerType
  subject: string
  html_body: string
  text_body: string | null
  variables: Record<string, string>
  status: EmailStatus
  attempts: number
  max_attempts: number
  scheduled_for: string
  sent_at: string | null
  error_message: string | null
  message_id: string | null
  user_id: string | null
  case_id: string | null
  created_at: string
  updated_at: string
}

// Email event
export interface EmailEvent {
  id: string
  email_queue_id: string
  event_type: EmailEventType
  event_data: Record<string, unknown>
  occurred_at: string
}

// Notification type metadata
export const NOTIFICATION_TYPE_INFO: Record<NotificationTriggerType, {
  label: string
  description: string
  defaultEmail: boolean
  defaultPush: boolean
}> = {
  new_message: {
    label: 'New Messages',
    description: 'When someone sends you a message',
    defaultEmail: true,
    defaultPush: true,
  },
  document_uploaded: {
    label: 'Document Uploads',
    description: 'When a document is uploaded to your case',
    defaultEmail: true,
    defaultPush: true,
  },
  task_assigned: {
    label: 'Task Assignments',
    description: 'When a task is assigned to you',
    defaultEmail: true,
    defaultPush: true,
  },
  task_overdue: {
    label: 'Overdue Tasks',
    description: 'When your tasks become overdue',
    defaultEmail: true,
    defaultPush: true,
  },
  deadline_reminder: {
    label: 'Deadline Reminders',
    description: 'Reminders for approaching deadlines',
    defaultEmail: true,
    defaultPush: true,
  },
  invoice_sent: {
    label: 'Invoices',
    description: 'When a new invoice is issued',
    defaultEmail: true,
    defaultPush: false,
  },
  payment_received: {
    label: 'Payments',
    description: 'When a payment is received',
    defaultEmail: true,
    defaultPush: false,
  },
  case_update: {
    label: 'Case Updates',
    description: 'General updates to your cases',
    defaultEmail: true,
    defaultPush: true,
  },
  intake_submitted: {
    label: 'Intake Forms',
    description: 'When a new intake form is submitted',
    defaultEmail: true,
    defaultPush: true,
  },
  welcome: {
    label: 'Welcome Email',
    description: 'Account setup confirmation',
    defaultEmail: true,
    defaultPush: false,
  },
}

// Frequency options
export const EMAIL_FREQUENCY_OPTIONS: {
  value: EmailFrequency
  label: string
  description: string
}[] = [
  {
    value: 'instant',
    label: 'Instant',
    description: 'Receive emails as events happen',
  },
  {
    value: 'daily_digest',
    label: 'Daily Digest',
    description: 'Receive a summary email once per day',
  },
  {
    value: 'weekly_digest',
    label: 'Weekly Digest',
    description: 'Receive a summary email once per week',
  },
]

// Get default preferences map from NOTIFICATION_TYPE_INFO
export function getDefaultPreferences(): NotificationPreferencesMap {
  const prefs: NotificationPreferencesMap = {}
  for (const [key, info] of Object.entries(NOTIFICATION_TYPE_INFO)) {
    prefs[key as NotificationTriggerType] = {
      email: info.defaultEmail,
      push: info.defaultPush,
    }
  }
  return prefs
}
