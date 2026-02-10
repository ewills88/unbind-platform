'use client'

import { useState } from 'react'
import { X, Clock, DollarSign, AlertCircle } from 'lucide-react'
import {
  ActivityType,
  ACTIVITY_TYPE_INFO,
  formatCurrency,
  calculateAmount
} from '@/types/billing'

interface TimeEntryFormProps {
  caseId: string
  defaultRate?: number
  onClose: () => void
  onSaved: (entry: unknown) => void
}

export default function TimeEntryForm({
  caseId,
  defaultRate = 300,
  onClose,
  onSaved
}: TimeEntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [activityType, setActivityType] = useState<ActivityType>('other')
  const [description, setDescription] = useState('')
  const [billable, setBillable] = useState(true)
  const [hourlyRate, setHourlyRate] = useState(defaultRate)

  // Calculate duration and amount
  const durationMinutes = (hours * 60) + minutes
  const roundedMinutes = Math.ceil(durationMinutes / 6) * 6 // Round to 6-min increments
  const amount = calculateAmount(roundedMinutes, hourlyRate)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    if (durationMinutes <= 0) {
      setError('Duration must be greater than 0')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/cases/${caseId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: entryDate,
          duration_minutes: roundedMinutes,
          activity_type: activityType,
          description: description.trim(),
          billable,
          hourly_rate: hourlyRate
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create time entry')
      }

      const data = await response.json()
      onSaved(data.entry)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save time entry')
    } finally {
      setLoading(false)
    }
  }

  // Quick time buttons
  const quickTimes = [
    { label: '6m', minutes: 6 },
    { label: '15m', minutes: 15 },
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '1.5h', minutes: 90 },
    { label: '2h', minutes: 120 }
  ]

  function setQuickTime(mins: number) {
    setHours(Math.floor(mins / 60))
    setMinutes(mins % 60)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Add Time Entry</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={hours}
                    onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 text-sm text-gray-600">
                    hrs
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 text-sm text-gray-600">
                    min
                  </span>
                </div>
              </div>
            </div>

            {/* Quick time buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              {quickTimes.map((qt) => (
                <button
                  key={qt.label}
                  type="button"
                  onClick={() => setQuickTime(qt.minutes)}
                  className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-lg
                           hover:bg-gray-200"
                >
                  {qt.label}
                </button>
              ))}
            </div>

            {durationMinutes > 0 && durationMinutes !== roundedMinutes && (
              <p className="text-xs text-gray-500 mt-2">
                Will be rounded to {roundedMinutes} minutes (nearest 6-min increment)
              </p>
            )}
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Type
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(ACTIVITY_TYPE_INFO).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work performed..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Billing options */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded
                         focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Billable</span>
            </label>

            {billable && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-500">/hr</span>
              </div>
            )}
          </div>

          {/* Amount preview */}
          {billable && durationMinutes > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Amount:</span>
                <span className="text-lg font-semibold text-green-700">
                  {formatCurrency(amount)}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {(roundedMinutes / 60).toFixed(2)} hrs × {formatCurrency(hourlyRate)}/hr
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg
                       hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || durationMinutes <= 0}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
