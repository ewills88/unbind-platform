// Session 15: Google Calendar Integration Types

// Calendar provider (extensible for future Outlook support)
export type CalendarProvider = 'google' | 'outlook'

// Sync statuses
export type CalendarSyncStatus = 'active' | 'error' | 'disconnected'
export type SyncDirection = 'to_external' | 'from_external' | 'bidirectional'
export type EventSyncStatus = 'synced' | 'pending' | 'error' | 'deleted'

// Calendar connection (stored in DB)
export interface CalendarConnection {
  id: string
  user_id: string
  provider: CalendarProvider
  access_token: string
  refresh_token: string
  token_expires_at: string
  calendar_id: string | null
  calendar_name: string | null
  sync_enabled: boolean
  last_synced_at: string | null
  sync_status: CalendarSyncStatus
  error_message: string | null
  settings: Record<string, unknown>
  connected_at: string
  created_at: string
  updated_at: string
}

// Synced event record
export interface SyncedEvent {
  id: string
  user_id: string
  unbind_event_id: string
  external_event_id: string
  provider: CalendarProvider
  sync_direction: SyncDirection
  last_synced_at: string
  sync_status: EventSyncStatus
  error_message: string | null
  created_at: string
}

// Calendar info from Google API
export interface CalendarInfo {
  id: string
  name: string
  primary: boolean
  accessRole: string
  backgroundColor: string | null
}

// Event data enriched with case details for sync
export interface SyncableEvent {
  id: string
  case_id: string
  event_type: string
  title: string
  description: string | null
  event_date: string
  all_day: boolean
  status: string
  case_number: string | null
  client_name: string
}

// Google Calendar color map for event types
export const EVENT_TYPE_COLORS: Record<string, string> = {
  court_date: '11',       // Red
  filing_deadline: '6',   // Orange
  meeting: '7',           // Cyan
  milestone: '3',         // Purple
  task: '5',              // Yellow
  waiting_period: '10',   // Green
  other: '1',             // Blue
}
