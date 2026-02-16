// Bulk Calendar Sync
// Session 15: Initial sync and periodic sync for calendar connections

import { createClient } from '@supabase/supabase-js'
import { GoogleCalendarService } from './googleCalendarService'
import { CalendarConnection, SyncableEvent } from '@/types/calendar'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Perform initial/full sync of all future events for a user.
 */
export async function performInitialSync(
  userId: string
): Promise<{ synced: number; errors: number; total: number }> {
  const supabase = getServiceClient()

  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!connection || !connection.sync_enabled) {
    return { synced: 0, errors: 0, total: 0 }
  }

  // Get cases this user is on (as attorney, client, or assigned)
  const caseIds = new Set<string>()

  // Cases where user is attorney or client
  const { data: userCases } = await supabase
    .from('cases')
    .select('id')
    .or(`attorney_id.eq.${userId},client_id.eq.${userId}`)

  if (userCases) {
    for (const c of userCases) caseIds.add(c.id)
  }

  // Cases via assignments
  const { data: assignments } = await supabase
    .from('case_assignments')
    .select('case_id')
    .eq('user_id', userId)

  if (assignments) {
    for (const a of assignments) caseIds.add(a.case_id)
  }

  if (caseIds.size === 0) {
    return { synced: 0, errors: 0, total: 0 }
  }

  // Get all future events for these cases
  const { data: events } = await supabase
    .from('case_events')
    .select('id, case_id, event_type, title, description, event_date, all_day, status')
    .in('case_id', Array.from(caseIds))
    .gte('event_date', new Date().toISOString())
    .eq('status', 'upcoming')
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    await supabase
      .from('calendar_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId)
    return { synced: 0, errors: 0, total: 0 }
  }

  // Batch-fetch case details
  const eventCaseIds = Array.from(new Set(events.map(e => e.case_id)))
  const { data: casesData } = await supabase
    .from('cases')
    .select('id, case_number, client_name')
    .in('id', eventCaseIds)

  const caseMap: Record<string, { case_number: string | null; client_name: string }> = {}
  for (const c of casesData || []) {
    caseMap[c.id] = { case_number: c.case_number, client_name: c.client_name }
  }

  // Get already-synced event IDs
  const { data: existingSyncs } = await supabase
    .from('synced_events')
    .select('unbind_event_id')
    .eq('user_id', userId)
    .eq('sync_status', 'synced')

  const alreadySynced = new Set((existingSyncs || []).map(s => s.unbind_event_id))

  const service = new GoogleCalendarService(connection as CalendarConnection)

  let synced = 0
  let errors = 0

  for (const event of events) {
    if (alreadySynced.has(event.id)) continue

    const caseInfo = caseMap[event.case_id]
    const syncableEvent: SyncableEvent = {
      ...event,
      case_number: caseInfo?.case_number || null,
      client_name: caseInfo?.client_name || 'Unknown',
    }

    const result = await service.createEvent(syncableEvent)
    if (result) {
      synced++
    } else {
      errors++
    }

    // Rate limiting - Google allows ~10 requests/second
    await sleep(120)
  }

  // Update last synced timestamp
  await supabase
    .from('calendar_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId)

  return { synced, errors, total: events.length }
}

/**
 * Run periodic sync for all active connections that haven't synced recently.
 */
export async function runPeriodicSync(): Promise<{
  connectionsProcessed: number
  totalSynced: number
  totalErrors: number
}> {
  const supabase = getServiceClient()

  const fifteenMinutesAgo = new Date()
  fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15)

  const { data: connections } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('sync_enabled', true)
    .eq('sync_status', 'active')
    .or(`last_synced_at.is.null,last_synced_at.lt.${fifteenMinutesAgo.toISOString()}`)

  if (!connections || connections.length === 0) {
    return { connectionsProcessed: 0, totalSynced: 0, totalErrors: 0 }
  }

  let totalSynced = 0
  let totalErrors = 0

  for (const connection of connections) {
    try {
      const result = await performInitialSync(connection.user_id)
      totalSynced += result.synced
      totalErrors += result.errors
    } catch (error) {
      console.error(`Periodic sync failed for user ${connection.user_id}:`, error)
      totalErrors++
    }
  }

  return {
    connectionsProcessed: connections.length,
    totalSynced,
    totalErrors,
  }
}
