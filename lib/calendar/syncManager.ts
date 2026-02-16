// Calendar Sync Manager
// Session 15: Triggers for syncing events to external calendars

import { createClient } from '@supabase/supabase-js'
import { GoogleCalendarService } from './googleCalendarService'
import { SyncableEvent, CalendarConnection } from '@/types/calendar'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Enrich a case_event with case details needed for calendar sync.
 */
async function enrichEvent(eventId: string, caseId: string): Promise<SyncableEvent | null> {
  const supabase = getServiceClient()

  const { data: event } = await supabase
    .from('case_events')
    .select('id, case_id, event_type, title, description, event_date, all_day, status')
    .eq('id', eventId)
    .single()

  if (!event) return null

  const { data: caseData } = await supabase
    .from('cases')
    .select('case_number, client_name')
    .eq('id', caseId)
    .single()

  return {
    id: event.id,
    case_id: event.case_id,
    event_type: event.event_type,
    title: event.title,
    description: event.description,
    event_date: event.event_date,
    all_day: event.all_day,
    status: event.status,
    case_number: caseData?.case_number || null,
    client_name: caseData?.client_name || 'Unknown',
  }
}

/**
 * Get active calendar connections for users on a given case.
 */
async function getConnectionsForCase(caseId: string): Promise<CalendarConnection[]> {
  const supabase = getServiceClient()

  // Get case team: attorney + client + assigned members
  const { data: caseData } = await supabase
    .from('cases')
    .select('attorney_id, client_id')
    .eq('id', caseId)
    .single()

  if (!caseData) return []

  const userIds: string[] = []
  if (caseData.attorney_id) userIds.push(caseData.attorney_id)
  if (caseData.client_id) userIds.push(caseData.client_id)

  // Also include case_assignments
  const { data: assignments } = await supabase
    .from('case_assignments')
    .select('user_id')
    .eq('case_id', caseId)

  if (assignments) {
    for (const a of assignments) {
      if (!userIds.includes(a.user_id)) {
        userIds.push(a.user_id)
      }
    }
  }

  if (userIds.length === 0) return []

  // Get active calendar connections for these users
  const { data: connections } = await supabase
    .from('calendar_connections')
    .select('*')
    .in('user_id', userIds)
    .eq('sync_enabled', true)
    .eq('sync_status', 'active')

  return (connections as CalendarConnection[]) || []
}

/**
 * Sync a single event to all connected calendars for the case team.
 */
export async function syncEventToCalendars(
  eventId: string,
  caseId: string,
  action: 'create' | 'update' | 'delete'
) {
  const connections = await getConnectionsForCase(caseId)
  if (connections.length === 0) return

  const supabase = getServiceClient()

  for (const connection of connections) {
    try {
      const service = new GoogleCalendarService(connection)

      if (action === 'delete') {
        await service.deleteEvent(eventId)
      } else {
        const syncableEvent = await enrichEvent(eventId, caseId)
        if (!syncableEvent) continue

        if (action === 'create') {
          await service.createEvent(syncableEvent)
        } else {
          await service.updateEvent(syncableEvent)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Calendar sync failed for user ${connection.user_id}:`, message)

      // Mark connection as error if auth failure
      const code = (error as { code?: number })?.code
      if (code === 401 || code === 403) {
        await supabase
          .from('calendar_connections')
          .update({
            sync_status: 'error',
            error_message: 'Authentication expired. Please reconnect.',
          })
          .eq('id', connection.id)
      }
    }
  }
}

// Convenience wrappers for event lifecycle hooks
export async function onEventCreated(eventId: string, caseId: string) {
  await syncEventToCalendars(eventId, caseId, 'create')
}

export async function onEventUpdated(eventId: string, caseId: string) {
  await syncEventToCalendars(eventId, caseId, 'update')
}

export async function onEventDeleted(eventId: string, caseId: string) {
  await syncEventToCalendars(eventId, caseId, 'delete')
}
