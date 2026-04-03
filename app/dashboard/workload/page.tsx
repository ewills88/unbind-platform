'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Loader2,
  Lightbulb,
  Users,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
  WorkloadData,
  CapacityWarning,
} from '@/types/analytics'

export default function WorkloadDistribution() {
  const [workloadData, setWorkloadData] = useState<WorkloadData | null>(null)
  const [warnings, setWarnings] = useState<CapacityWarning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkload()
  }, [])

  const fetchWorkload = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/firms/analytics/workload')
      const data = await res.json()
      setWorkloadData(data.workload || null)
      setWarnings(data.warnings || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Workload Distribution</h1>
        <p className="text-gray-600 mt-1">Monitor and balance team capacity</p>
      </div>

      {/* Capacity warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">Capacity Warnings</p>
              <ul className="mt-2 space-y-1">
                {warnings.map(warning => (
                  <li key={warning.user_id} className="text-sm text-yellow-700">
                    <strong>{warning.user_name}</strong> is at {warning.capacity_percentage}% capacity
                    ({warning.active_cases} active cases, {warning.billable_hours}h this week)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Attorney workload */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Attorney Workload</h2>
          <p className="text-sm text-gray-500">Active cases and billable hours by attorney</p>
        </div>

        <div className="space-y-6">
          {workloadData?.attorneys.map(attorney => (
            <div key={attorney.user_id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">{attorney.initials}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{attorney.full_name}</p>
                    <p className="text-sm text-gray-600">
                      {attorney.active_cases} cases &bull; {attorney.billable_hours_this_week}h this week
                    </p>
                  </div>
                </div>

                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  attorney.capacity_percentage > 90
                    ? 'bg-red-100 text-red-800'
                    : attorney.capacity_percentage > 75
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}>
                  {attorney.capacity_percentage}% capacity
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1.5">Cases by Stage</p>
                  <Progress
                    value={attorney.active_cases > 0
                      ? (attorney.cases_in_discovery / attorney.active_cases) * 100
                      : 0}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Discovery: {attorney.cases_in_discovery}</span>
                    <span>Settlement: {attorney.cases_in_settlement}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1.5">Utilization Rate</p>
                  <Progress value={attorney.utilization_rate} className="h-2" />
                  <p className="text-xs text-gray-600 mt-1">
                    {attorney.billable_hours_this_month}h / {attorney.target_hours}h target
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(!workloadData?.attorneys || workloadData.attorneys.length === 0) && (
          <div className="text-center py-12">
            <Users className="mx-auto w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No attorney workload data available</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {workloadData?.recommendations && workloadData.recommendations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h2>
          <div className="space-y-3">
            {workloadData.recommendations.map((rec, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">{rec.message}</p>
                  {rec.action && (
                    <button className="mt-2 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors">
                      {rec.action}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
