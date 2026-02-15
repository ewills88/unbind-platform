'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Star,
  Loader2,
  Users,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/types/billing'
import {
  FirmMetrics,
  CasePipeline,
  AttorneyPerformance,
  FinancialSummary,
  TimeRange,
} from '@/types/analytics'

export default function FirmExecutiveDashboard() {
  const [metrics, setMetrics] = useState<FirmMetrics | null>(null)
  const [pipeline, setPipeline] = useState<CasePipeline | null>(null)
  const [performance, setPerformance] = useState<AttorneyPerformance[]>([])
  const [financial, setFinancial] = useState<FinancialSummary | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [timeRange])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [metricsRes, pipelineRes, perfRes, finRes] = await Promise.all([
        fetch(`/api/firms/analytics?range=${timeRange}`),
        fetch('/api/firms/analytics/pipeline'),
        fetch('/api/firms/analytics/performance'),
        fetch('/api/firms/analytics/financial'),
      ])

      const [metricsData, pipelineData, perfData, finData] = await Promise.all([
        metricsRes.json(),
        pipelineRes.json(),
        perfRes.json(),
        finRes.json(),
      ])

      setMetrics(metricsData.metrics || null)
      setPipeline(pipelineData.pipeline || null)
      setPerformance(perfData.performance || [])
      setFinancial(finData.summary || null)
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
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Firm Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your firm&apos;s performance</p>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Key metric cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics?.total_revenue || 0)}
          change={metrics?.revenue_change_percent}
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
        />
        <MetricCard
          title="Active Cases"
          value={String(metrics?.active_cases || 0)}
          change={metrics?.cases_change_percent}
          icon={<Briefcase className="w-5 h-5 text-blue-500" />}
        />
        <MetricCard
          title="Collection Rate"
          value={`${metrics?.collection_rate || 0}%`}
          change={metrics?.collection_change_percent}
          target={95}
          icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
        />
        <MetricCard
          title="Client Satisfaction"
          value={`${metrics?.client_satisfaction_score || 0}/5`}
          change={metrics?.satisfaction_change}
          icon={<Star className="w-5 h-5 text-yellow-500" />}
        />
      </div>

      {/* Revenue trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
          <p className="text-sm text-gray-500">Monthly revenue over the past 12 months</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics?.revenue_history || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="collected"
              stroke="#10b981"
              strokeWidth={2}
              name="Collected"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Case pipeline + Attorney performance */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Case Pipeline */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Case Pipeline</h2>
            <p className="text-sm text-gray-500">Cases by stage</p>
          </div>
          <div className="space-y-3">
            {pipeline?.stages.map((stage) => (
              <div key={stage.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                  <span className="text-sm text-gray-600">
                    {stage.count} cases {stage.total_value > 0 && `\u2022 ${formatCurrency(stage.total_value)}`}
                  </span>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                    style={{
                      width: `${pipeline.total_cases > 0 ? (stage.count / pipeline.total_cases) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {pipeline && pipeline.total_cases > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total Pipeline Value</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(pipeline.total_value)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Attorney Performance */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Attorney Performance</h2>
            <p className="text-sm text-gray-500">Revenue by attorney this period</p>
          </div>
          <div className="space-y-4">
            {performance.slice(0, 5).map((attorney, index) => (
              <div key={attorney.user_id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-400 w-6">{index + 1}</span>
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">{attorney.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{attorney.full_name}</p>
                  <p className="text-xs text-gray-600">{attorney.active_cases} active cases</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 text-sm">{formatCurrency(attorney.revenue)}</p>
                  <p className="text-xs text-gray-600">{attorney.billable_hours}h billed</p>
                </div>
              </div>
            ))}
          </div>

          {performance.length > 0 && (
            <Link
              href="/dashboard/reports/performance"
              className="block w-full mt-4 px-4 py-2 text-center text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Detailed Report
            </Link>
          )}

          {performance.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No performance data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Financial summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Billed This Month</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(financial?.billed || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {financial?.invoices_sent || 0} invoices sent
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Collected This Month</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(financial?.collected || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {financial?.payments_received || 0} payments
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Outstanding A/R</p>
            <p className="text-3xl font-bold text-orange-600">
              {formatCurrency(financial?.outstanding_ar || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Avg. {financial?.avg_days_to_payment || 0} days to payment
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  target,
  icon,
}: {
  title: string
  value: string
  change?: number
  target?: number
  icon: React.ReactNode
}) {
  const isPositive = (change || 0) > 0
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''))
  const meetsTarget = target ? numericValue >= target : true

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm text-gray-600">{title}</p>
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>

      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>

      {change !== undefined && change !== 0 && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {Math.abs(change)}%
          </div>
          <span className="text-sm text-gray-600">vs last period</span>
        </div>
      )}

      {target && (
        <p className={`text-xs mt-2 ${meetsTarget ? 'text-green-600' : 'text-orange-600'}`}>
          {meetsTarget ? '\u2713' : '\u26A0'} Target: {target}%
        </p>
      )}
    </div>
  )
}
