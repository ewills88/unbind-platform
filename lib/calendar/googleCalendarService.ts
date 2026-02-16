// Google Calendar Service
// Session 15: Create, update, delete events in Google Calendar

import { google, calendar_v3 } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { decrypt, encrypt } from '@/lib/encryption'
import { CalendarConnection, CalendarInfo, SyncableEvent, EVENT_TYPE_COLORS } from '@/types/calendar'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export class GoogleCalendarService {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>
  private calendar: calendar_v3.Calendar
  private userId: string
  private connection: CalendarConnection

  constructor(connection: CalendarConnection) {
    this.connection = connection
    this.userId = connection.user_id

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    this.oauth2Client.setCredentials({
      access_token: decrypt(connection.access_token),
      refresh_token: decrypt(connection.refresh_token),
      expiry_date: new Date(connection.token_expires_at).getTime(),
    })

    // Handle automatic token refresh
    this.oauth2Client.on('tokens', async (tokens) => {
      const supabase = getServiceClient()
      const updateData: Record<string, unknown> = {
        access_token: encrypt(tokens.access_token!),
      }
      if (tokens.refresh_token) {
        updateData.refresh_token = encrypt(tokens.refresh_token)
      }
      if (tokens.expiry_date) {
        updateData.token_expires_at = new Date(tokens.expiry_date).toISOString()
      }
      await supabase
        .from('calendar_connections')
        .update(updateData)
        .eq('user_id', this.userId)
    })

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  async createEvent(event: SyncableEvent): Promise<string | null> {
    const supabase = getServiceClient()
    try {
      const googleEvent = this.mapToGoogleEvent(event)

      const { data } = await this.calendar.events.insert({
        calendarId: this.connection.calendar_id || 'primary',
        requestBody: googleEvent,
      })

      if (!data.id) return null

      // Store sync record
      await supabase.from('synced_events').upsert({
        user_id: this.userId,
        unbind_event_id: event.id,
        external_event_id: data.id,
        provider: 'google',
        sync_direction: 'to_external',
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
        error_message: null,
      }, {
        onConflict: 'unbind_event_id,user_id',
      })

      return data.id
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to create Google event:', message)
      await this.logSyncError(event.id, message)
      return null
    }
  }

  async updateEvent(event: SyncableEvent): Promise<boolean> {
    const supabase = getServiceClient()
    try {
      // Get the external event ID
      const { data: syncRecord } = await supabase
        .from('synced_events')
        .select('external_event_id')
        .eq('unbind_event_id', event.id)
        .eq('user_id', this.userId)
        .single()

      if (!syncRecord) {
        // Event not synced yet, create it
        await this.createEvent(event)
        return true
      }

      const googleEvent = this.mapToGoogleEvent(event)

      await this.calendar.events.update({
        calendarId: this.connection.calendar_id || 'primary',
        eventId: syncRecord.external_event_id,
        requestBody: googleEvent,
      })

      // Update sync record
      await supabase
        .from('synced_events')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
          error_message: null,
        })
        .eq('unbind_event_id', event.id)
        .eq('user_id', this.userId)

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to update Google event:', message)
      await this.logSyncError(event.id, message)
      return false
    }
  }

  async deleteEvent(unbindEventId: string): Promise<boolean> {
    const supabase = getServiceClient()
    try {
      const { data: syncRecord } = await supabase
        .from('synced_events')
        .select('external_event_id')
        .eq('unbind_event_id', unbindEventId)
        .eq('user_id', this.userId)
        .single()

      if (!syncRecord) return true

      try {
        await this.calendar.events.delete({
          calendarId: this.connection.calendar_id || 'primary',
          eventId: syncRecord.external_event_id,
        })
      } catch (deleteErr) {
        // 404/410 means already deleted - that's fine
        const status = (deleteErr as { code?: number })?.code
        if (status !== 404 && status !== 410) throw deleteErr
      }

      // Mark sync record as deleted
      await supabase
        .from('synced_events')
        .update({ sync_status: 'deleted' })
        .eq('unbind_event_id', unbindEventId)
        .eq('user_id', this.userId)

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to delete Google event:', message)
      return false
    }
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    try {
      const { data } = await this.calendar.calendarList.list()

      return (data.items || []).map(cal => ({
        id: cal.id || '',
        name: cal.summary || 'Untitled',
        primary: cal.primary || false,
        accessRole: cal.accessRole || 'reader',
        backgroundColor: cal.backgroundColor || null,
      }))
    } catch (error) {
      console.error('Failed to list calendars:', error)
      return []
    }
  }

  private mapToGoogleEvent(event: SyncableEvent): calendar_v3.Schema$Event {
    const caseLabel = event.case_number ? `Case #${event.case_number}` : event.client_name

    const googleEvent: calendar_v3.Schema$Event = {
      summary: `${event.title} - ${caseLabel}`,
      description: this.buildDescription(event),
      colorId: EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.other,
    }

    if (event.all_day) {
      const dateOnly = event.event_date.split('T')[0]
      googleEvent.start = { date: dateOnly }
      // All-day events need end date to be the next day in Google Calendar
      const nextDay = new Date(dateOnly)
      nextDay.setDate(nextDay.getDate() + 1)
      googleEvent.end = { date: nextDay.toISOString().split('T')[0] }
    } else {
      googleEvent.start = {
        dateTime: event.event_date,
        timeZone: 'America/Los_Angeles',
      }
      // Default 1-hour duration
      const endDate = new Date(event.event_date)
      endDate.setHours(endDate.getHours() + 1)
      googleEvent.end = {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Los_Angeles',
      }
    }

    // Add reminders based on event type
    googleEvent.reminders = {
      useDefault: false,
      overrides: this.getRemindersForEventType(event.event_type),
    }

    return googleEvent
  }

  private buildDescription(event: SyncableEvent): string {
    let desc = event.description || ''

    desc += '\n\n--- Unbind Case Details ---'
    if (event.case_number) {
      desc += `\nCase: #${event.case_number}`
    }
    desc += `\nClient: ${event.client_name}`
    desc += `\n\nView in Unbind: ${BASE_URL}/dashboard/cases/${event.case_id}/timeline`

    return desc.trim()
  }

  private getRemindersForEventType(eventType: string): calendar_v3.Schema$EventReminder[] {
    if (eventType === 'court_date' || eventType === 'filing_deadline') {
      return [
        { method: 'email', minutes: 1440 },  // 1 day before
        { method: 'popup', minutes: 60 },     // 1 hour before
        { method: 'popup', minutes: 15 },     // 15 min before
      ]
    }
    return [
      { method: 'popup', minutes: 30 },
      { method: 'popup', minutes: 10 },
    ]
  }

  private async logSyncError(eventId: string, error: string) {
    const supabase = getServiceClient()
    await supabase
      .from('synced_events')
      .upsert({
        unbind_event_id: eventId,
        user_id: this.userId,
        external_event_id: '',
        provider: 'google',
        sync_status: 'error',
        error_message: error,
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'unbind_event_id,user_id',
      })
  }
}
