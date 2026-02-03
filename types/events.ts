// Session 7: Case Timeline & Deadline Management Types

export type EventType =
  | 'court_date'
  | 'filing_deadline'
  | 'milestone'
  | 'task'
  | 'meeting'
  | 'waiting_period'
  | 'other'

export type EventStatus = 'upcoming' | 'completed' | 'cancelled'

export interface CaseEvent {
  id: string
  case_id: string
  event_type: EventType
  title: string
  description: string | null
  event_date: string
  all_day: boolean
  assigned_to: string | null
  status: EventStatus
  completed_at: string | null
  completed_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// Event with joined user/case data
export interface CaseEventWithDetails extends CaseEvent {
  assignee?: {
    id: string
    full_name: string
    role: string
  } | null
  creator?: {
    id: string
    full_name: string
  }
  case?: {
    id: string
    case_number: string | null
    client_name: string
  }
}

// For upcoming events widget
export interface UpcomingEvent {
  event_id: string
  case_id: string
  case_number: string | null
  client_name: string
  event_type: EventType
  title: string
  description: string | null
  event_date: string
  all_day: boolean
  status: EventStatus
  days_until: number
}

// For overdue events
export interface OverdueEvent {
  event_id: string
  case_id: string
  case_number: string | null
  client_name: string
  event_type: EventType
  title: string
  event_date: string
  days_overdue: number
}

// State deadline rules
export interface StateDeadline {
  id: string
  state_code: string
  event_type: string
  next_event_type: string
  deadline_days: number
  is_working_days: boolean
  description: string | null
  created_at: string
}

// API Request/Response types
export interface CreateEventRequest {
  event_type: EventType
  title: string
  description?: string
  event_date: string
  all_day?: boolean
  assigned_to?: string
}

export interface UpdateEventRequest {
  event_type?: EventType
  title?: string
  description?: string | null
  event_date?: string
  all_day?: boolean
  assigned_to?: string | null
  status?: EventStatus
}

export interface EventsResponse {
  events: CaseEventWithDetails[]
  total_count: number
}

export interface UpcomingEventsResponse {
  events: UpcomingEvent[]
  overdue: OverdueEvent[]
}

// Event type display metadata
export const EVENT_TYPE_CONFIG: Record<EventType, {
  label: string
  color: string
  bgColor: string
  icon: string
}> = {
  court_date: {
    label: 'Court Date',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: 'gavel'
  },
  filing_deadline: {
    label: 'Filing Deadline',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: 'file-clock'
  },
  milestone: {
    label: 'Milestone',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: 'flag'
  },
  task: {
    label: 'Task',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: 'check-square'
  },
  meeting: {
    label: 'Meeting',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: 'users'
  },
  waiting_period: {
    label: 'Waiting Period',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: 'clock'
  },
  other: {
    label: 'Other',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: 'calendar'
  }
}

// Recurrence patterns
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

// Extended event with recurrence
export interface CaseEventWithRecurrence extends CaseEvent {
  recurrence: RecurrencePattern
  recurrence_end_date: string | null
  parent_event_id: string | null
  recurrence_index: number
}

// Event reminder
export interface EventReminder {
  id: string
  event_id: string
  user_id: string
  remind_before_minutes: number
  remind_via_email: boolean
  remind_via_app: boolean
  reminder_sent_at: string | null
  is_dismissed: boolean
  created_at: string
}

// Notification
export interface AppNotification {
  id: string
  user_id: string
  title: string
  message: string
  notification_type: 'reminder' | 'system' | 'message' | 'document'
  case_id: string | null
  event_id: string | null
  is_read: boolean
  read_at: string | null
  action_url: string | null
  created_at: string
}

// User notification preferences
export interface NotificationPreferences {
  id: string
  user_id: string
  default_remind_1_day: boolean
  default_remind_3_days: boolean
  default_remind_1_week: boolean
  email_enabled: boolean
  app_notifications_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  timezone: string
}

// Reminder timing options
export const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
  { value: 4320, label: '3 days before' },
  { value: 10080, label: '1 week before' },
] as const

// Recurrence options
export const RECURRENCE_OPTIONS: { value: RecurrencePattern; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

// Event status display metadata
export const EVENT_STATUS_CONFIG: Record<EventStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  upcoming: {
    label: 'Upcoming',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  completed: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100'
  }
}
