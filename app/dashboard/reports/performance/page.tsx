'use client'

import { useState, useEffect } from 'react'
import {
  Star,
  Loader2,
  Download,
  Users,
} from 'lucide-react'
import { formatCurrency } from '@/types/billing'
import { AttorneyPerformance } from '@/types/analytics'
import { Progress } from '@/components/ui/progress'

export default function AttorneyPerformanceReport() {
  const [performance, setPerformance] = useState<AttorneyPerformance[]>([])
  const [attorneys, setAttorneys] = useState<{ user_id: string; full_name: string }[]>([])
  const [selectedAttorney, setSelectedAttorney] = useState('all')
  const [loading, setLoading] = useState(true)

  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [selectedAttorney, startDate, endDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedAttorney !== 'all') params.set('attorney', selectedAttorney)
      if (startDate) params.set('start', startDate)
      if (endDate) params.set('end', endDate)

      const res = await fetch(`/api/firms/analytics/performance?${params}`)
      const data = await res.json()
      setPerformance(data.performance || [])

      // Build attorney list for dropdown from all attorneys
      if (attorneys.length === 0 && data.performance?.length > 0) {
        setAttorneys(data.performance.map((a: AttorneyPerformance) => ({
          user_id: a.user_id,
          full_name: a.full_name,
        })))
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading && performance.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attorney Performance</h1>
          <p className="text-gray-600 mt-1">Detailed performance metrics by attorney</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedAttorney}
            onChange={(e) => setSelectedAttorney(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Attorneys</option>
            {attorneys.map(a => (
              <option key={a.user_id} value={a.user_id}>{a.full_name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Performance table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attorney</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Cases</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Case Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satisfaction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settlement Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {performance.map(attorney => (
                <tr key={attorney.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-xs">{attorney.initials}</span>
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{attorney.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attorney.active_cases}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attorney.billable_hours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatCurrency(attorney.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(attorney.avg_case_value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Progress value={attorney.utilization_rate} className="w-20" />
                      <span className="text-sm text-gray-900">{attorney.utilization_rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm text-gray-900">{attorney.client_satisfaction.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      attorney.settlement_rate >= 80
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {attorney.settlement_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {performance.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No performance data available for this period</p>
          </div>
        )}
      </div>

      {/* Individual deep dive when attorney selected */}
      {selectedAttorney !== 'all' && performance.length > 0 && (
        <AttorneyDeepDive attorney={performance[0]} />
      )}
    </div>
  )
}

function AttorneyDeepDive({ attorney }: { attorney: AttorneyPerformance }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Time allocation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Active Cases</span>
            <span className="text-sm font-semibold text-gray-900">{attorney.active_cases}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Billable Hours</span>
            <span className="text-sm font-semibold text-gray-900">{attorney.billable_hours}h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Revenue</span>
            <span className="text-sm font-semibold text-green-600">{formatCurrency(attorney.revenue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg. Case Value</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(attorney.avg_case_value)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Utilization Rate</span>
            <div className="flex items-center gap-2">
              <Progress value={attorney.utilization_rate} className="w-24" />
              <span className="text-sm font-semibold">{attorney.utilization_rate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Settlement Rate</span>
            <div className="flex items-center gap-2">
              <Progress value={attorney.settlement_rate} className="w-24" />
              <span className="text-sm font-semibold">{attorney.settlement_rate}%</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Client Satisfaction</span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-semibold">{attorney.client_satisfaction.toFixed(1)}/5</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Revenue per Hour</span>
            <span className="text-sm font-semibold text-gray-900">
              {attorney.billable_hours > 0
                ? formatCurrency(attorney.revenue / attorney.billable_hours)
                : '$0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
