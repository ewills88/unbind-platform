'use client'

import { useState, useEffect } from 'react'
import {
  FileText, TrendingUp, Clock, BarChart3,
  PieChart, ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import { AnalyticsSummary } from '@/types/document-collaboration'

interface DocumentAnalyticsProps {
  caseId?: string
}

export default function DocumentAnalytics({ caseId }: DocumentAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    // For now, use mock data since we don't have an analytics API yet
    // In production, this would fetch from /api/analytics/documents
    setLoading(true)
    setTimeout(() => {
      setAnalytics({
        total_documents_generated: 47,
        documents_this_month: 12,
        month_over_month_change: 20,
        avg_generation_time_minutes: 2.5,
        time_saved_vs_manual_hours: 23.5,
        most_used_template: {
          template_code: 'CA-FL100',
          template_name: 'Petition for Dissolution',
          usage_count: 15
        },
        by_document_type: [
          { type: 'petition', count: 15, percentage: 32 },
          { type: 'financial_disclosure', count: 12, percentage: 26 },
          { type: 'summons', count: 8, percentage: 17 },
          { type: 'settlement_agreement', count: 6, percentage: 13 },
          { type: 'other', count: 6, percentage: 12 }
        ],
        by_state: [
          { state_code: 'CA', count: 30 },
          { state_code: 'TX', count: 10 },
          { state_code: 'FL', count: 7 }
        ],
        recent_documents: [
          {
            id: '1',
            title: 'Petition for Dissolution - Smith',
            template_code: 'CA-FL100',
            created_at: new Date().toISOString(),
            status: 'draft'
          },
          {
            id: '2',
            title: 'Income & Expense Declaration',
            template_code: 'CA-FL150',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            status: 'in_review'
          },
          {
            id: '3',
            title: 'Summons - Johnson',
            template_code: 'CA-FL110',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            status: 'approved'
          }
        ]
      })
      setLoading(false)
    }, 500)
  }, [caseId, period])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto" />
        <p className="mt-2 text-gray-500">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize
                       ${period === p
                         ? 'bg-blue-100 text-blue-700'
                         : 'text-gray-600 hover:bg-gray-50'
                       }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={analytics.total_documents_generated}
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <StatCard
          title="This Month"
          value={analytics.documents_this_month}
          change={analytics.month_over_month_change}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />
        <StatCard
          title="Avg. Generation Time"
          value={`${analytics.avg_generation_time_minutes}m`}
          icon={Clock}
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Time Saved"
          value={`${analytics.time_saved_vs_manual_hours}h`}
          subtitle="vs. manual drafting"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Types Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-gray-400" />
            Documents by Type
          </h3>
          <div className="mt-4 space-y-3">
            {analytics.by_document_type.map((item) => (
              <div key={item.type} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 capitalize">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By State */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            Documents by State
          </h3>
          <div className="mt-4 space-y-3">
            {analytics.by_state.map((item, index) => {
              const maxCount = Math.max(...analytics.by_state.map(s => s.count))
              const barColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500']
              return (
                <div key={item.state_code} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-gray-700">
                    {item.state_code}
                  </span>
                  <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full ${barColors[index % barColors.length]} rounded-lg
                               flex items-center justify-end pr-2`}
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    >
                      <span className="text-xs font-medium text-white">
                        {item.count}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Most Used Template & Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Used Template */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Most Used Template</h3>
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {analytics.most_used_template.template_name}
              </p>
              <p className="text-sm text-gray-500">
                {analytics.most_used_template.template_code} - Used {analytics.most_used_template.usage_count} times
              </p>
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Recent Documents</h3>
          <div className="space-y-3">
            {analytics.recent_documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-500">{doc.template_code}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    doc.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : doc.status === 'in_review'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {doc.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  icon: typeof FileText
  iconColor: string
  iconBg: string
}

function StatCard({ title, value, subtitle, change, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              change > 0
                ? 'text-green-600'
                : change < 0
                ? 'text-red-600'
                : 'text-gray-500'
            }`}
          >
            {change > 0 ? (
              <ArrowUp className="w-4 h-4" />
            ) : change < 0 ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">
          {subtitle || title}
        </p>
      </div>
    </div>
  )
}
