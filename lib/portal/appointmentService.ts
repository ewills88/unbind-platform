// Session 20 CP2: Appointment Scheduling Service
// Availability slots, booking, cancellation, rescheduling

import { createClient } from '@supabase/supabase-js'
import { addMinutes, addDays, format, eachDayOfInterval, isBefore, setHours, setMinutes } from 'date-fns'
import { AvailableSlot } from '@/types/portal'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// Get appointment types for a firm
// ============================================================

export async function getAppointmentTypes(firmId: string) {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('appointment_types')
    .select('*')
    .eq('firm_id', firmId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
}

// ============================================================
// Get available slots
// ============================================================

export async function getAvailableSlots(params: {
  attorneyId: string
  appointmentTypeId: string
  startDate: Date
  endDate: Date
}): Promise<AvailableSlot[]> {
  const { attorneyId, appointmentTypeId, startDate, endDate } = params
  const supabase = getServiceClient()

  // Get appointment type
  const { data: appointmentType } = await supabase
    .from('appointment_types')
    .select('*')
    .eq('id', appointmentTypeId)
    .single()

  if (!appointmentType) {
    throw new Error('Appointment type not found')
  }

  // Calculate effective date range
  const minNoticeTime = addMinutes(new Date(), (appointmentType.min_notice_hours || 24) * 60)
  const maxBookingDate = addDays(new Date(), appointmentType.advance_booking_days || 30)
  const effectiveStart = isBefore(startDate, minNoticeTime) ? minNoticeTime : startDate
  const effectiveEnd = isBefore(endDate, maxBookingDate) ? endDate : maxBookingDate

  // Get availability windows
  const { data: windows } = await supabase
    .from('availability_windows')
    .select('*')
    .eq('user_id', attorneyId)
    .eq('is_active', true)

  // Get overrides for date range
  const { data: overrides } = await supabase
    .from('availability_overrides')
    .select('*')
    .eq('user_id', attorneyId)
    .gte('override_date', format(effectiveStart, 'yyyy-MM-dd'))
    .lte('override_date', format(effectiveEnd, 'yyyy-MM-dd'))

  // Get existing appointments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingAppointments } = await (supabase as any)
    .from('client_appointments')
    .select('start_time, end_time')
    .eq('attorney_id', attorneyId)
    .gte('start_time', effectiveStart.toISOString())
    .lte('start_time', effectiveEnd.toISOString())
    .in('status', ['scheduled', 'confirmed'])

  const slots: AvailableSlot[] = []
  const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd })

  for (const day of days) {
    const dayOfWeek = day.getDay()
    const dateStr = format(day, 'yyyy-MM-dd')

    // Check for override
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const override = overrides?.find((o: any) => o.override_date === dateStr)

    if (override && !override.is_available) {
      continue // Day is blocked
    }

    // Get applicable windows for this day
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dayWindows = (windows || []).filter((w: any) => w.day_of_week === dayOfWeek)

    if (override?.is_available && override.start_time && override.end_time) {
      dayWindows = [{ start_time: override.start_time, end_time: override.end_time }]
    }

    // Filter by appointment type if window restricts types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dayWindows = dayWindows.filter((w: any) =>
      !w.appointment_type_ids ||
      w.appointment_type_ids.length === 0 ||
      w.appointment_type_ids.includes(appointmentTypeId)
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const window of dayWindows as any[]) {
      const windowStart = parseTime(window.start_time, day)
      const windowEnd = parseTime(window.end_time, day)

      let slotStart = windowStart

      while (addMinutes(slotStart, appointmentType.duration_minutes) <= windowEnd) {
        const slotEnd = addMinutes(slotStart, appointmentType.duration_minutes)

        // Skip if in the past
        if (isBefore(slotStart, minNoticeTime)) {
          slotStart = addMinutes(slotStart, 30)
          continue
        }

        // Check for conflicts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasConflict = (existingAppointments || []).some((apt: any) => {
          const aptStart = new Date(apt.start_time)
          const aptEnd = new Date(apt.end_time)
          const bufferedStart = addMinutes(aptStart, -(appointmentType.buffer_before_minutes || 0))
          const bufferedEnd = addMinutes(aptEnd, appointmentType.buffer_after_minutes || 15)

          return (
            (slotStart >= bufferedStart && slotStart < bufferedEnd) ||
            (slotEnd > bufferedStart && slotEnd <= bufferedEnd) ||
            (slotStart <= bufferedStart && slotEnd >= bufferedEnd)
          )
        })

        if (!hasConflict) {
          slots.push({
            date: dateStr,
            startTime: format(slotStart, 'HH:mm'),
            endTime: format(slotEnd, 'HH:mm'),
            startDateTime: slotStart.toISOString(),
            endDateTime: slotEnd.toISOString(),
          })
        }

        slotStart = addMinutes(slotStart, 30) // 30-minute increments
      }
    }
  }

  return slots
}

// ============================================================
// Book an appointment
// ============================================================

export async function bookAppointment(params: {
  clientId: string
  caseId: string
  firmId: string
  attorneyId: string
  appointmentTypeId: string
  startTime: string
  locationType: 'in_person' | 'video' | 'phone'
  clientNotes?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intakeFormData?: Record<string, any>
}): Promise<{ appointment?: { id: string }; error?: string }> {
  const supabase = getServiceClient()

  // Get appointment type
  const { data: appointmentType } = await supabase
    .from('appointment_types')
    .select('*')
    .eq('id', params.appointmentTypeId)
    .single()

  if (!appointmentType) {
    return { error: 'Appointment type not found' }
  }

  // Validate location type
  if (params.locationType === 'video' && !appointmentType.allow_video) {
    return { error: 'Video appointments not available for this type' }
  }
  if (params.locationType === 'phone' && !appointmentType.allow_phone) {
    return { error: 'Phone appointments not available for this type' }
  }
  if (params.locationType === 'in_person' && !appointmentType.allow_in_person) {
    return { error: 'In-person appointments not available for this type' }
  }

  const startDateTime = new Date(params.startTime)
  const endDateTime = addMinutes(startDateTime, appointmentType.duration_minutes)

  // Check for conflicts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conflicts } = await (supabase as any)
    .from('client_appointments')
    .select('id')
    .eq('attorney_id', params.attorneyId)
    .in('status', ['scheduled', 'confirmed'])
    .lt('start_time', endDateTime.toISOString())
    .gt('end_time', startDateTime.toISOString())

  if (conflicts && conflicts.length > 0) {
    return { error: 'This time slot is no longer available' }
  }

  // Generate video link if needed
  let videoLink: string | null = null
  if (params.locationType === 'video') {
    const meetingId = Math.random().toString(36).substring(2, 10)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    videoLink = `${siteUrl}/meet/${meetingId}`
  }

  // Create appointment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: appointment, error } = await (supabase as any)
    .from('client_appointments')
    .insert({
      case_id: params.caseId,
      client_id: params.clientId,
      firm_id: params.firmId,
      attorney_id: params.attorneyId,
      appointment_type_id: params.appointmentTypeId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      timezone: 'America/Los_Angeles',
      location_type: params.locationType,
      video_link: videoLink,
      status: 'scheduled',
      intake_form_completed: !!params.intakeFormData,
      intake_form_data: params.intakeFormData || null,
      client_notes: params.clientNotes || null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Log activity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('case_activity_log').insert({
    case_id: params.caseId,
    user_id: params.clientId,
    activity_type: 'appointment_scheduled',
    title: `Appointment booked: ${appointmentType.type_name}`,
    description: `${appointmentType.type_name} on ${format(startDateTime, 'MMM d, yyyy')} at ${format(startDateTime, 'h:mm a')}`,
    is_visible_to_client: true,
    metadata: { appointment_id: appointment.id },
  })

  // Notify attorney
  await supabase.from('notifications').insert({
    user_id: params.attorneyId,
    title: 'New Appointment Booked',
    message: `Client booked a ${appointmentType.type_name} for ${format(startDateTime, 'MMM d')} at ${format(startDateTime, 'h:mm a')}`,
    notification_type: 'system',
    action_url: `/dashboard/calendar?date=${format(startDateTime, 'yyyy-MM-dd')}`,
  })

  return { appointment }
}

// ============================================================
// Cancel an appointment
// ============================================================

export async function cancelAppointment(
  appointmentId: string,
  clientId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: appointment } = await (supabase as any)
    .from('client_appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('client_id', clientId)
    .single()

  if (!appointment) {
    return { success: false, error: 'Appointment not found' }
  }

  if (appointment.status === 'cancelled') {
    return { success: false, error: 'Appointment already cancelled' }
  }

  if (appointment.status === 'completed') {
    return { success: false, error: 'Cannot cancel completed appointment' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('client_appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'client',
      cancellation_reason: reason,
    })
    .eq('id', appointmentId)

  // Log activity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('case_activity_log').insert({
    case_id: appointment.case_id,
    user_id: clientId,
    activity_type: 'appointment_scheduled',
    title: 'Appointment cancelled',
    description: `Reason: ${reason}`,
    is_visible_to_client: true,
  })

  // Notify attorney
  await supabase.from('notifications').insert({
    user_id: appointment.attorney_id,
    title: 'Appointment Cancelled',
    message: `Client cancelled their ${format(new Date(appointment.start_time), 'MMM d')} appointment. Reason: ${reason}`,
    notification_type: 'system',
  })

  return { success: true }
}

// ============================================================
// Get client appointments
// ============================================================

export async function getClientAppointments(
  clientId: string,
  filter: 'upcoming' | 'past' | 'all' = 'all'
) {
  const supabase = getServiceClient()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('client_appointments')
    .select('*')
    .eq('client_id', clientId)

  if (filter === 'upcoming') {
    query = query.gte('start_time', now).in('status', ['scheduled', 'confirmed'])
  } else if (filter === 'past') {
    query = query.lt('start_time', now)
  }

  const { data, error } = await query.order('start_time', { ascending: filter === 'upcoming' })

  if (error) throw error

  // Enrich with type and attorney info
  const appointments = data || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeIds = Array.from(new Set(appointments.map((a: any) => a.appointment_type_id).filter(Boolean)))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attorneyIds = Array.from(new Set(appointments.map((a: any) => a.attorney_id)))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let typeMap: Record<string, any> = {}
  if (typeIds.length > 0) {
    const { data: types } = await supabase
      .from('appointment_types')
      .select('id, type_name, duration_minutes, color')
      .in('id', typeIds)
    if (types) {
      typeMap = Object.fromEntries(types.map(t => [t.id, t]))
    }
  }

  let nameMap: Record<string, string> = {}
  if (attorneyIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', attorneyIds)
    if (profiles) {
      nameMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Unknown']))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return appointments.map((a: any) => ({
    ...a,
    appointment_type: a.appointment_type_id ? typeMap[a.appointment_type_id] : null,
    attorney_name: nameMap[a.attorney_id] || 'Unknown',
  }))
}

// ============================================================
// Helpers
// ============================================================

function parseTime(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return setMinutes(setHours(new Date(date), hours), minutes)
}
