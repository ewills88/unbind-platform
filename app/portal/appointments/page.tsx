'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar, Clock, MapPin, Video, Phone, Plus, X,
  Loader2, AlertCircle, CheckCircle, ChevronLeft,
  ChevronRight, User,
} from 'lucide-react'
import {
  ClientAppointment, AppointmentType, AvailableSlot,
  AppointmentLocationType,
  APPOINTMENT_LOCATION_LABELS, APPOINTMENT_STATUS_LABELS,
} from '@/types/portal'

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

const LOCATION_ICONS = {
  in_person: MapPin,
  video: Video,
  phone: Phone,
}

export default function PortalAppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<ClientAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [showBooking, setShowBooking] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Booking state
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([])
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<AppointmentLocationType | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingStep, setBookingStep] = useState(1) // 1=type, 2=date/time, 3=confirm
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    fetchAppointments()
  }, [filter])

  const fetchAppointments = async () => {
    try {
      const res = await authFetch(`/api/portal/appointments?filter=${filter}`)
      if (res.status === 401) {
        router.push('/portal/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load appointments')
      const data = await res.json()
      setAppointments(data.data || [])
    } catch (err) {
      console.error('Appointments error:', err)
      setError('Unable to load appointments.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAppointmentTypes = async () => {
    try {
      const res = await authFetch('/api/portal/appointments/types')
      if (res.ok) {
        const data = await res.json()
        setAppointmentTypes(data.data || [])
      }
    } catch (err) {
      console.error('Types error:', err)
    }
  }

  const fetchSlots = async (typeId: string) => {
    setSlotsLoading(true)
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + weekOffset * 7)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 7)

      const params = new URLSearchParams({
        type_id: typeId,
        attorney_id: '', // Will use case attorney
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })
      const res = await authFetch(`/api/portal/appointments/availability?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableSlots(data.data || [])
      }
    } catch (err) {
      console.error('Slots error:', err)
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleStartBooking = async () => {
    setShowBooking(true)
    setBookingStep(1)
    setSelectedType(null)
    setSelectedLocation(null)
    setSelectedSlot(null)
    setBookingNotes('')
    setWeekOffset(0)
    await fetchAppointmentTypes()
  }

  const handleSelectType = (type: AppointmentType) => {
    setSelectedType(type)
    // Auto-select location if only one is available
    const locations: AppointmentLocationType[] = []
    if (type.allow_in_person) locations.push('in_person')
    if (type.allow_video) locations.push('video')
    if (type.allow_phone) locations.push('phone')
    if (locations.length === 1) {
      setSelectedLocation(locations[0])
    }
    setBookingStep(2)
    fetchSlots(type.id)
  }

  const handleBook = async () => {
    if (!selectedType || !selectedSlot || !selectedLocation) return
    setBooking(true)
    setError(null)
    try {
      const res = await authFetch('/api/portal/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_type_id: selectedType.id,
          start_time: selectedSlot.startDateTime,
          location_type: selectedLocation,
          notes: bookingNotes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Booking failed')
      }
      setShowBooking(false)
      fetchAppointments()
    } catch (err) {
      console.error('Booking error:', err)
      setError(err instanceof Error ? err.message : 'Failed to book appointment')
    } finally {
      setBooking(false)
    }
  }

  const handleCancel = async (appointmentId: string) => {
    if (!cancelReason.trim()) return
    setCancelling(true)
    try {
      const res = await authFetch(`/api/portal/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Cancel failed')
      }
      setShowCancelModal(null)
      setCancelReason('')
      fetchAppointments()
    } catch (err) {
      console.error('Cancel error:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment')
    } finally {
      setCancelling(false)
    }
  }

  // Group slots by date
  const slotsByDate: Record<string, AvailableSlot[]> = {}
  for (const slot of availableSlots) {
    if (!slotsByDate[slot.date]) slotsByDate[slot.date] = []
    slotsByDate[slot.date].push(slot)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-1">Schedule and manage appointments with your legal team</p>
        </div>
        <button
          onClick={handleStartBooking}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 text-sm underline mt-1">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Appointments list */}
      <div className="space-y-3">
        {appointments.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No {filter !== 'all' ? filter : ''} appointments</p>
            <p className="text-sm mt-1">
              {filter === 'upcoming'
                ? 'Book an appointment with your legal team.'
                : 'Your appointment history will appear here.'}
            </p>
            {filter === 'upcoming' && (
              <button
                onClick={handleStartBooking}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Book Appointment
              </button>
            )}
          </div>
        ) : (
          appointments.map(apt => {
            const statusInfo = APPOINTMENT_STATUS_LABELS[apt.status]
            const LocationIcon = LOCATION_ICONS[apt.location_type]
            const locationInfo = APPOINTMENT_LOCATION_LABELS[apt.location_type]
            const canCancel = ['scheduled', 'confirmed'].includes(apt.status)

            return (
              <div key={apt.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Date card */}
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className={`rounded-lg overflow-hidden border ${
                      apt.status === 'cancelled' ? 'border-gray-200 opacity-50' : 'border-blue-200'
                    }`}>
                      <div className={`text-xs font-medium py-0.5 ${
                        apt.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-blue-600 text-white'
                      }`}>
                        {new Date(apt.start_time).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="py-1 bg-white">
                        <div className="text-xl font-bold text-gray-900">
                          {new Date(apt.start_time).getDate()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {apt.appointment_type?.type_name || 'Appointment'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <LocationIcon className="w-3.5 h-3.5" />
                            {locationInfo.label}
                          </span>
                          {apt.attorney_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {apt.attorney_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {canCancel && (
                          <button
                            onClick={() => setShowCancelModal(apt.id)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Video link */}
                    {apt.location_type === 'video' && apt.video_link && apt.status !== 'cancelled' && (
                      <div className="mt-2">
                        <a
                          href={apt.video_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                        >
                          <Video className="w-4 h-4" />
                          Join Video Call
                        </a>
                      </div>
                    )}

                    {apt.client_notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Notes:</span> {apt.client_notes}
                      </p>
                    )}

                    {apt.cancellation_reason && (
                      <p className="text-sm text-red-600 mt-2">
                        <span className="font-medium">Cancellation reason:</span> {apt.cancellation_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {bookingStep === 1 && 'Select Appointment Type'}
                {bookingStep === 2 && 'Choose Date & Time'}
                {bookingStep === 3 && 'Confirm Booking'}
              </h2>
              <button
                onClick={() => setShowBooking(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {/* Step 1: Select type */}
              {bookingStep === 1 && (
                <div className="space-y-3">
                  {appointmentTypes.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No appointment types available.</p>
                  ) : (
                    appointmentTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => handleSelectType(type)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: type.color || '#3B82F6' }}
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">{type.type_name}</h3>
                            {type.description && (
                              <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {type.duration_minutes} min
                              </span>
                              <div className="flex items-center gap-1.5">
                                {type.allow_in_person && <span title="In person"><MapPin className="w-3 h-3" /></span>}
                                {type.allow_video && <span title="Video"><Video className="w-3 h-3" /></span>}
                                {type.allow_phone && <span title="Phone"><Phone className="w-3 h-3" /></span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Step 2: Select date/time */}
              {bookingStep === 2 && selectedType && (
                <div>
                  {/* Location selection (if multiple) */}
                  {!selectedLocation && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select location type
                      </label>
                      <div className="flex gap-2">
                        {selectedType.allow_in_person && (
                          <button
                            onClick={() => setSelectedLocation('in_person')}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-blue-400 text-sm"
                          >
                            <MapPin className="w-4 h-4" /> In Person
                          </button>
                        )}
                        {selectedType.allow_video && (
                          <button
                            onClick={() => setSelectedLocation('video')}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-blue-400 text-sm"
                          >
                            <Video className="w-4 h-4" /> Video
                          </button>
                        )}
                        {selectedType.allow_phone && (
                          <button
                            onClick={() => setSelectedLocation('phone')}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-blue-400 text-sm"
                          >
                            <Phone className="w-4 h-4" /> Phone
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedLocation && (
                    <>
                      {/* Week navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => {
                            if (weekOffset > 0) {
                              setWeekOffset(weekOffset - 1)
                              fetchSlots(selectedType.id)
                            }
                          }}
                          disabled={weekOffset === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                          {weekOffset === 0 ? 'This week' : `${weekOffset} week${weekOffset !== 1 ? 's' : ''} out`}
                        </span>
                        <button
                          onClick={() => {
                            setWeekOffset(weekOffset + 1)
                            fetchSlots(selectedType.id)
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {slotsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : Object.keys(slotsByDate).length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No available slots this week.</p>
                          <p className="text-xs mt-1">Try a different week.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-64 overflow-y-auto">
                          {Object.entries(slotsByDate).map(([date, slots]) => (
                            <div key={date}>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                {formatDateLong(date)}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {slots.map((slot, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                      selectedSlot?.startDateTime === slot.startDateTime
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                                    }`}
                                  >
                                    {slot.startTime}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedSlot && (
                        <div className="mt-4 flex justify-between items-center">
                          <button
                            onClick={() => { setBookingStep(1); setSelectedSlot(null); setSelectedLocation(null) }}
                            className="text-sm text-gray-600 hover:text-gray-800"
                          >
                            Back
                          </button>
                          <button
                            onClick={() => setBookingStep(3)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                          >
                            Continue
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Confirm */}
              {bookingStep === 3 && selectedType && selectedSlot && selectedLocation && (
                <div>
                  <div className="space-y-3 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">Appointment Type</div>
                      <div className="font-medium text-gray-900">{selectedType.type_name}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">Date & Time</div>
                      <div className="font-medium text-gray-900">
                        {formatDateLong(selectedSlot.date)} at {selectedSlot.startTime}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {selectedType.duration_minutes} minutes
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">Location</div>
                      <div className="font-medium text-gray-900">
                        {APPOINTMENT_LOCATION_LABELS[selectedLocation].label}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Any topics you'd like to discuss..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setBookingStep(2)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleBook}
                      disabled={booking}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                    >
                      {booking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Confirm Booking
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Cancel Appointment</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-3">
                Please provide a reason for cancellation.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setShowCancelModal(null); setCancelReason('') }}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={() => handleCancel(showCancelModal)}
                  disabled={!cancelReason.trim() || cancelling}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Appointment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
