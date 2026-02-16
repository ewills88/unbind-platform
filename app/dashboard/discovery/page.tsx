'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import {
  FileText, Clock, AlertTriangle, CheckCircle, Users,
  Calendar, Loader2, ArrowRight, TrendingUp,
  BarChart3, MapPin, Video,
} from 'lucide-react'
import { DISCOVERY_TYPE_INFO, DEPOSITION_STATUS_INFO } from '@/types/discovery'
import type { DiscoveryType, DepositionStatus } from '@/types/discovery'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

interface DashboardStats {
  total_active: number
  overdue: number
  due_in_7_days: number
  due_in_30_days: number
  responded: number
  total: number
}

interface UpcomingDeadline {
  id: string
  case_id: string
  title: string
  due_date: string
  days_until: number
  urgency: string
  discovery_type: string
}

interface UpcomingDeposition {
  id: string
  case_id: string
  deponent_name: string
  deponent_type: string
  scheduled_date: string
  location: string | null
  location_type: string
  status: DepositionStatus
}

interface CaseSummary {
  case_id: string
  case_number: string
  case_name: string
  case_status: string
  total_discovery: number
  active: number
  overdue: number
  next_deadline: string | null
}

export default function DiscoveryDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([])
  const [depositions, setDepositions] = useState<UpcomingDeposition[]>([])
  const [byCase, setByCase] = useState<CaseSummary[]>([])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/discovery/dashboard')
      if (res.ok) {
        const d = await res.json()
        setStats(d.data.stats)
        setDeadlines(d.data.upcoming_deadlines)
        setDepositions(d.data.upcoming_depositions)
        setByCase(d.data.by_case)
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Discovery Dashboard</h1>
          <p className="text-gray-500 text-sm mb-6">Firm-wide overview of discovery and depositions</p>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Active Requests"
                value={stats.total_active}
                icon={<FileText className="w-5 h-5 text-blue-500" />}
                color="blue"
              />
              <StatCard
                label="Overdue"
                value={stats.overdue}
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                color="red"
                alert={stats.overdue > 0}
              />
              <StatCard
                label="Due in 7 Days"
                value={stats.due_in_7_days}
                icon={<Clock className="w-5 h-5 text-orange-500" />}
                color="orange"
                alert={stats.due_in_7_days > 0}
              />
              <StatCard
                label="Completed"
                value={stats.responded}
                icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                color="green"
                subtitle={`of ${stats.total} total`}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Upcoming Deadlines */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" /> Upcoming Deadlines
                </h2>
                <span className="text-xs text-gray-500">{deadlines.length} upcoming</span>
              </div>
              <div className="divide-y divide-gray-100">
                {deadlines.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 text-center">No upcoming deadlines</p>
                ) : (
                  deadlines.slice(0, 8).map(dl => {
                    const urgencyColors: Record<string, string> = {
                      overdue: 'bg-red-50 border-l-red-500',
                      urgent: 'bg-orange-50 border-l-orange-500',
                      warning: 'bg-yellow-50 border-l-yellow-400',
                      normal: 'bg-white border-l-gray-200',
                    }
                    const typeInfo = DISCOVERY_TYPE_INFO[dl.discovery_type as DiscoveryType]
                    return (
                      <div
                        key={dl.id}
                        className={`flex items-center gap-3 px-4 py-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${urgencyColors[dl.urgency] || urgencyColors.normal}`}
                        onClick={() => router.push(`/dashboard/cases/${dl.case_id}/discovery/${dl.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{dl.title}</p>
                          <p className="text-xs text-gray-500">{typeInfo?.shortLabel || dl.discovery_type}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold ${dl.days_until < 0 ? 'text-red-600' : dl.days_until <= 3 ? 'text-orange-600' : 'text-gray-600'}`}>
                            {dl.days_until < 0 ? `${Math.abs(dl.days_until)}d overdue` : dl.days_until === 0 ? 'Due today' : `${dl.days_until}d left`}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(dl.due_date)}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Upcoming Depositions */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" /> Upcoming Depositions
                </h2>
                <span className="text-xs text-gray-500">{depositions.length} scheduled</span>
              </div>
              <div className="divide-y divide-gray-100">
                {depositions.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 text-center">No upcoming depositions</p>
                ) : (
                  depositions.slice(0, 8).map(dep => {
                    const statusInfo = DEPOSITION_STATUS_INFO[dep.status]
                    return (
                      <div
                        key={dep.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/cases/${dep.case_id}`)}
                      >
                        <div className="shrink-0">
                          {dep.location_type === 'remote' ? (
                            <Video className="w-5 h-5 text-blue-400" />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{dep.deponent_name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="capitalize">{dep.deponent_type.replace('_', ' ')}</span>
                            {dep.location && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3" /> {dep.location}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-gray-600">
                            {dep.scheduled_date ? formatDateTime(dep.scheduled_date) : 'TBD'}
                          </p>
                          <span className={`text-xs ${statusInfo?.color || 'text-gray-500'}`}>
                            {statusInfo?.label || dep.status}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* By Case Table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-500" /> Discovery by Case
              </h2>
              <span className="text-xs text-gray-500">{byCase.length} cases</span>
            </div>
            {byCase.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Case</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Total</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Active</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Overdue</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Next Deadline</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCase.map((cs, i) => (
                      <tr
                        key={cs.case_id}
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        onClick={() => router.push(`/dashboard/cases/${cs.case_id}`)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{cs.case_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{cs.case_number || 'No case #'}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{cs.total_discovery}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cs.active > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                            {cs.active}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {cs.overdue > 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                              <AlertTriangle className="w-3 h-3" /> {cs.overdue}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {cs.next_deadline ? formatDate(cs.next_deadline) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ArrowRight className="w-4 h-4 text-gray-300 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm text-gray-500 text-center">No discovery data found</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// Stat Card
// ============================================================================
function StatCard({
  label, value, icon, color, alert, subtitle,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  alert?: boolean
  subtitle?: string
}) {
  const borderColors: Record<string, string> = {
    blue: 'border-blue-200',
    red: 'border-red-200',
    orange: 'border-orange-200',
    green: 'border-green-200',
  }
  const bgColors: Record<string, string> = {
    blue: '',
    red: alert ? 'bg-red-50' : '',
    orange: alert ? 'bg-orange-50' : '',
    green: '',
  }

  return (
    <div className={`bg-white border ${borderColors[color] || 'border-gray-200'} ${bgColors[color]} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        {alert && value > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}
