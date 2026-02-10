'use client'

import { useState, useEffect } from 'react'
import {
  Clock, Plus, Filter, Search, Calendar,
  DollarSign, RefreshCw, Edit2, Trash2, Check
} from 'lucide-react'
import {
  TimeEntry,
  ActivityType,
  ACTIVITY_TYPE_INFO,
  formatDuration,
  formatCurrency,
  formatDate
} from '@/types/billing'
import TimeEntryForm from './TimeEntryForm'

interface TimeEntriesListProps {
  caseId: string
  defaultRate?: number
  onStartTimer?: () => void
}

export default function TimeEntriesList({
  caseId,
  defaultRate = 300,
  onStartTimer
}: TimeEntriesListProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [summary, setSummary] = useState({
    total_entries: 0,
    total_minutes: 0,
    total_amount: 0,
    billable_minutes: 0,
    unbilled_amount: 0
  })

  // Filters
  const [filterBilled, setFilterBilled] = useState<'all' | 'billed' | 'unbilled'>('all')
  const [filterActivity, setFilterActivity] = useState<ActivityType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchEntries()
  }, [caseId, filterBilled, filterActivity])

  async function fetchEntries() {
    try {
      setLoading(true)
      let url = `/api/cases/${caseId}/time-entries?`

      if (filterBilled === 'billed') {
        url += 'billed=true&'
      } else if (filterBilled === 'unbilled') {
        url += 'billed=false&'
      }

      if (filterActivity !== 'all') {
        url += `activity_type=${filterActivity}&`
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
        setSummary(data.summary || {
          total_entries: 0,
          total_minutes: 0,
          total_amount: 0,
          billable_minutes: 0,
          unbilled_amount: 0
        })
      }
    } catch (err) {
      console.error('Failed to fetch time entries:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter entries by search
  const filteredEntries = entries.filter(entry => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        entry.description.toLowerCase().includes(query) ||
        entry.activity_type.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Group entries by date
  const entriesByDate = filteredEntries.reduce((groups, entry) => {
    const date = entry.entry_date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(entry)
    return groups
  }, {} as Record<string, TimeEntry[]>)

  const dates = Object.keys(entriesByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Time Entries</h2>
        </div>
        <div className="flex gap-2">
          {onStartTimer && (
            <button
              onClick={onStartTimer}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600
                       bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Clock className="w-4 h-4" />
              Start Timer
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white
                     bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Time</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatDuration(summary.total_minutes)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Billable Time</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatDuration(summary.billable_minutes)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.total_amount)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Unbilled</p>
          <p className="text-2xl font-semibold text-green-600">
            {formatCurrency(summary.unbilled_amount)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filters:</span>
        </div>

        <select
          value={filterBilled}
          onChange={(e) => setFilterBilled(e.target.value as typeof filterBilled)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All entries</option>
          <option value="unbilled">Unbilled only</option>
          <option value="billed">Billed only</option>
        </select>

        <select
          value={filterActivity}
          onChange={(e) => setFilterActivity(e.target.value as typeof filterActivity)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All activities</option>
          {Object.entries(ACTIVITY_TYPE_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search descriptions..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={fetchEntries}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading entries...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">No time entries found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              Add your first entry
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dates.map(date => (
              <div key={date}>
                {/* Date header */}
                <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {formatDate(date)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({entriesByDate[date].length} entries,{' '}
                    {formatDuration(entriesByDate[date].reduce((sum, e) => sum + e.duration_minutes, 0))})
                  </span>
                </div>

                {/* Entries for this date */}
                {entriesByDate[date].map(entry => (
                  <TimeEntryRow key={entry.id} entry={entry} onUpdate={fetchEntries} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <TimeEntryForm
          caseId={caseId}
          defaultRate={defaultRate}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            fetchEntries()
          }}
        />
      )}
    </div>
  )
}

interface TimeEntryRowProps {
  entry: TimeEntry
  onUpdate: () => void
}

function TimeEntryRow({ entry, onUpdate }: TimeEntryRowProps) {
  const activityInfo = ACTIVITY_TYPE_INFO[entry.activity_type]

  return (
    <div className="px-4 py-3 hover:bg-gray-50 flex items-center gap-4">
      {/* Activity type badge */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        entry.billable ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
        <Clock className={`w-5 h-5 ${entry.billable ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>

      {/* Entry details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {entry.description}
          </span>
          {entry.billed_at && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              <Check className="w-3 h-3" />
              Billed
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>{activityInfo?.label || entry.activity_type}</span>
          {entry.attorney?.full_name && (
            <>
              <span>•</span>
              <span>{entry.attorney.full_name}</span>
            </>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium text-gray-900">
          {formatDuration(entry.duration_minutes)}
        </p>
        <p className="text-xs text-gray-500">
          {(entry.duration_minutes / 60).toFixed(2)} hrs
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0 w-24">
        {entry.billable ? (
          <>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(entry.amount)}
            </p>
            <p className="text-xs text-gray-500">
              @ {formatCurrency(entry.hourly_rate)}/hr
            </p>
          </>
        ) : (
          <span className="text-sm text-gray-400">Non-billable</span>
        )}
      </div>

      {/* Actions */}
      {!entry.billed_at && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
