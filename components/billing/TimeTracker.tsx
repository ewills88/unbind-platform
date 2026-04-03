'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Play, Pause, Square, Clock, ChevronDown, ChevronUp,
  RefreshCw, Briefcase
} from 'lucide-react'
import { ActiveTimer, ActivityType, ACTIVITY_TYPE_INFO, formatDuration } from '@/types/billing'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface TimeTrackerProps {
  onTimerStop?: (entry: unknown) => void
  className?: string
}

export default function TimeTracker({ onTimerStop, className = '' }: TimeTrackerProps) {
  const [timer, setTimer] = useState<ActiveTimer | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [activityType, setActivityType] = useState<ActivityType>('other')

  // Fetch current timer state
  const fetchTimer = useCallback(async () => {
    try {
      const response = await authFetch('/api/timer')
      if (response.ok) {
        const data = await response.json()
        setTimer(data.timer)
        setElapsedSeconds(data.elapsed_seconds || 0)
        setIsRunning(data.is_running)
        if (data.timer) {
          setDescription(data.timer.description || '')
          setActivityType(data.timer.activity_type || 'other')
        }
      }
    } catch (err) {
      console.error('Failed to fetch timer:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTimer()
  }, [fetchTimer])

  // Update elapsed time every second when running
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  async function handleAction(action: string, caseId?: string) {
    try {
      const response = await authFetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          case_id: caseId,
          activity_type: activityType,
          description
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTimer(data.timer)

        if (action === 'stop' && data.entry) {
          onTimerStop?.(data.entry)
          setElapsedSeconds(0)
          setIsRunning(false)
          setDescription('')
        } else if (action === 'discard') {
          setElapsedSeconds(0)
          setIsRunning(false)
          setDescription('')
        } else if (action === 'pause') {
          setIsRunning(false)
          setElapsedSeconds(data.elapsed_seconds || 0)
        } else if (action === 'resume' || action === 'start') {
          setIsRunning(true)
        }

        // Refresh timer state
        await fetchTimer()
      }
    } catch (err) {
      console.error('Timer action failed:', err)
    }
  }

  async function handleUpdateTimer() {
    if (!timer) return

    try {
      await authFetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          activity_type: activityType,
          description
        })
      })
    } catch (err) {
      console.error('Failed to update timer:', err)
    }
  }

  // Format time display
  const hours = Math.floor(elapsedSeconds / 3600)
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
  const seconds = elapsedSeconds % 60

  const timeDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Loading timer...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Compact view */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isRunning ? 'bg-green-100' : timer ? 'bg-yellow-100' : 'bg-gray-100'
          }`}>
            <Clock className={`w-5 h-5 ${
              isRunning ? 'text-green-600' : timer ? 'text-yellow-600' : 'text-gray-400'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-lg font-semibold ${
                isRunning ? 'text-green-600' : 'text-gray-700'
              }`}>
                {timeDisplay}
              </span>
              {isRunning && (
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            {timer?.case && (
              <p className="text-xs text-gray-500 truncate max-w-[150px]">
                {timer.case.client_name} - {timer.case.case_number}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {timer ? (
            <>
              {isRunning ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAction('pause') }}
                  className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                  title="Pause"
                >
                  <Pause className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAction('resume') }}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                  title="Resume"
                >
                  <Play className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleAction('stop') }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Stop & Save"
              >
                <Square className="w-5 h-5" />
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-400">No timer active</span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {timer ? (
            <>
              {/* Current case */}
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {timer.case?.client_name || 'Unknown'} - {timer.case?.case_number || 'No case'}
                </span>
              </div>

              {/* Activity type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Type
                </label>
                <select
                  value={activityType}
                  onChange={(e) => {
                    setActivityType(e.target.value as ActivityType)
                    handleUpdateTimer()
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
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
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleUpdateTimer}
                  placeholder="What are you working on?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Time summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Elapsed time:</span>
                  <span className="font-medium">
                    {formatDuration(Math.ceil(elapsedSeconds / 60))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Will bill:</span>
                  <span className="font-medium text-green-600">
                    {formatDuration(Math.ceil(Math.ceil(elapsedSeconds / 60) / 6) * 6)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Rounded to nearest 6-minute increment
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('discard')}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-100
                           rounded-lg hover:bg-gray-200"
                >
                  Discard
                </button>
                <button
                  onClick={() => handleAction('stop')}
                  className="flex-1 px-3 py-2 text-sm text-white bg-blue-600
                           rounded-lg hover:bg-blue-700"
                >
                  Stop & Save
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">
                No timer running. Start a timer from a case page.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
