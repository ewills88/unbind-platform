'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import {
  DollarSign, Briefcase, Clock, TrendingUp,
  Minus, Target, BarChart3, FileText, Loader2,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
  Users, PieChart, Star,
  AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart as RPieChart,
  Pie, Cell,
} from 'recharts'
import { formatCurrency } from '@/types/billing'
import {
  type DashboardOverview,
  type RevenueTrendPoint,
  type CaseAnalyticsData,
  type AttorneyLeaderboardEntry,
  type KPIScorecard,
  type ReportConfiguration,
  formatMetricValue,
  getKPIStatusColor,
  getKPIStatusBg,
  REPORT_TYPE_INFO,
  type ReportType,
  type DateRangePreset,
  DATE_RANGE_PRESETS,
} from '@/types/reporting'

type DashboardTab = 'overview' | 'reports' | 'kpi'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function AnalyticsDashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month')
  const [loading, setLoading] = useState(true)

  // Dashboard data
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([])
  const [caseAnalytics, setCaseAnalytics] = useState<CaseAnalyticsData | null>(null)
  const [leaderboard, setLeaderboard] = useState<AttorneyLeaderboardEntry[]>([])
  const [kpiScorecard, setKpiScorecard] = useState<KPIScorecard[]>([])
  const [savedReports, setSavedReports] = useState<ReportConfiguration[]>([])

  // Report generation
  const [reportType, setReportType] = useState<ReportType>('revenue_summary')
  const [reportDateRange, setReportDateRange] = useState<DateRangePreset>('this_month')
  const [reportGroupBy, setReportGroupBy] = useState('none')
  const [generatingReport, setGeneratingReport] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [generatedReport, setGeneratedReport] = useState<any>(null)

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['metrics', 'revenue', 'cases', 'attorneys', 'kpi'])
  )

  useEffect(() => {
    fetchDashboard()
  }, [timeRange])

  async function fetchDashboard() {
    setLoading(true)
    try {
      const res = await authFetch(`/api/analytics/dashboard?range=${timeRange}`)
      if (res.ok) {
        const data = await res.json()
        setOverview(data.overview || null)
        setRevenueTrend(data.revenue_trend || [])
        setCaseAnalytics(data.case_analytics || null)
        setLeaderboard(data.attorney_leaderboard || [])
        setKpiScorecard(data.kpi_scorecard || [])
        setSavedReports(data.saved_reports || [])
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateReport() {
    setGeneratingReport(true)
    try {
      const res = await authFetch('/api/analytics/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          report_type: reportType,
          date_range: reportDateRange,
          group_by: reportGroupBy !== 'none' ? reportGroupBy : undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeneratedReport(data.report)
      }
    } catch {
      // Ignore
    } finally {
      setGeneratingReport(false)
    }
  }

  function toggleSection(section: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const TABS: { key: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { key: 'kpi', label: 'KPI Targets', icon: <Target className="w-4 h-4" /> },
  ]

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
              <p className="text-sm text-gray-500 mt-0.5">Comprehensive firm performance analytics</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value as 'month' | 'quarter' | 'year')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Scorecard Row */}
              {kpiScorecard.length > 0 && (
                <CollapsibleSection
                  title="KPI Scorecard"
                  subtitle="Key performance indicators vs targets"
                  isExpanded={expandedSections.has('kpi')}
                  onToggle={() => toggleSection('kpi')}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {kpiScorecard.map(kpi => (
                      <div
                        key={kpi.metric_key}
                        className={`p-3 rounded-lg border ${getKPIStatusBg(kpi.status)}`}
                      >
                        <p className="text-xs text-gray-600 mb-1 truncate">{kpi.label}</p>
                        <p className={`text-lg font-bold ${getKPIStatusColor(kpi.status)}`}>
                          {formatMetricValue(kpi.current_value, kpi.format)}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">
                            Target: {formatMetricValue(kpi.target_value, kpi.format)}
                          </span>
                          <div className="flex items-center">
                            {kpi.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-500" />}
                            {kpi.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-500" />}
                            {kpi.trend === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              kpi.status === 'exceeded' ? 'bg-green-500' :
                              kpi.status === 'on_track' ? 'bg-blue-500' :
                              kpi.status === 'warning' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min((kpi.current_value / kpi.target_value) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Key Metrics */}
              <CollapsibleSection
                title="Key Metrics"
                subtitle={`Performance for ${timeRange === 'month' ? 'this month' : timeRange === 'quarter' ? 'this quarter' : 'this year'}`}
                isExpanded={expandedSections.has('metrics')}
                onToggle={() => toggleSection('metrics')}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Revenue"
                    value={formatCurrency(overview?.total_revenue || 0)}
                    change={overview?.revenue_change}
                    icon={<DollarSign className="w-5 h-5 text-green-500" />}
                  />
                  <MetricCard
                    title="Collected"
                    value={formatCurrency(overview?.total_collected || 0)}
                    change={overview?.collected_change}
                    icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
                  />
                  <MetricCard
                    title="Active Cases"
                    value={String(overview?.active_cases || 0)}
                    change={overview?.cases_change}
                    subtitle={`${overview?.new_cases_period || 0} new, ${overview?.closed_cases_period || 0} closed`}
                    icon={<Briefcase className="w-5 h-5 text-blue-500" />}
                  />
                  <MetricCard
                    title="Billable Hours"
                    value={`${overview?.billable_hours || 0}h`}
                    change={overview?.hours_change}
                    icon={<Clock className="w-5 h-5 text-purple-500" />}
                  />
                  <MetricCard
                    title="Utilization Rate"
                    value={`${overview?.utilization_rate || 0}%`}
                    change={overview?.utilization_change}
                    icon={<Target className="w-5 h-5 text-indigo-500" />}
                    changeIsDelta
                  />
                  <MetricCard
                    title="Collection Rate"
                    value={`${overview?.collection_rate || 0}%`}
                    change={overview?.collection_change}
                    icon={<TrendingUp className="w-5 h-5 text-teal-500" />}
                    changeIsDelta
                  />
                  <MetricCard
                    title="Outstanding A/R"
                    value={formatCurrency(overview?.outstanding_ar || 0)}
                    change={overview?.ar_change}
                    invertChange
                    icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
                  />
                  <MetricCard
                    title="Avg Case Value"
                    value={formatCurrency(overview?.avg_case_value || 0)}
                    change={overview?.avg_case_change}
                    icon={<BarChart3 className="w-5 h-5 text-cyan-500" />}
                  />
                </div>
              </CollapsibleSection>

              {/* Revenue Trend */}
              <CollapsibleSection
                title="Revenue Trend"
                subtitle="Monthly revenue and collections over 12 months"
                isExpanded={expandedSections.has('revenue')}
                onToggle={() => toggleSection('revenue')}
              >
                {revenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Revenue"
                      />
                      <Line
                        type="monotone"
                        dataKey="collected"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Collected"
                      />
                      {revenueTrend[0]?.target !== null && (
                        <Line
                          type="monotone"
                          dataKey="target"
                          stroke="#f59e0b"
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Target"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={<BarChart3 className="w-12 h-12" />} message="No revenue data yet" />
                )}
              </CollapsibleSection>

              {/* Case Analytics + Attorney Leaderboard */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Case Analytics */}
                <CollapsibleSection
                  title="Case Analytics"
                  subtitle="Distribution by stage and type"
                  isExpanded={expandedSections.has('cases')}
                  onToggle={() => toggleSection('cases')}
                >
                  {caseAnalytics && caseAnalytics.by_stage.length > 0 ? (
                    <div className="space-y-6">
                      {/* By Stage */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">By Stage</h4>
                        <div className="space-y-2">
                          {caseAnalytics.by_stage.map(stage => {
                            const total = caseAnalytics.by_stage.reduce((s, st) => s + st.count, 0)
                            const pct = total > 0 ? (stage.count / total) * 100 : 0
                            return (
                              <div key={stage.stage}>
                                <div className="flex justify-between text-sm mb-0.5">
                                  <span className="text-gray-700">{stage.label}</span>
                                  <span className="text-gray-500">{stage.count} ({Math.round(pct)}%)</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* By Type (Pie) */}
                      {caseAnalytics.by_type.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">By Type</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <RPieChart>
                              <Pie
                                data={caseAnalytics.by_type}
                                dataKey="count"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                innerRadius={40}
                                paddingAngle={2}
                              >
                                {caseAnalytics.by_type.map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                            </RPieChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Summary stats */}
                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900">{caseAnalytics.avg_duration_days}</p>
                          <p className="text-xs text-gray-500">Avg Duration (days)</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">{caseAnalytics.open_rate}</p>
                          <p className="text-xs text-gray-500">Opened This Month</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{caseAnalytics.close_rate}</p>
                          <p className="text-xs text-gray-500">Closed This Month</p>
                        </div>
                      </div>

                      {/* Case Aging */}
                      {caseAnalytics.aging.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Case Aging</h4>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={caseAnalytics.aging}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Cases" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState icon={<PieChart className="w-12 h-12" />} message="No case data yet" />
                  )}
                </CollapsibleSection>

                {/* Attorney Leaderboard */}
                <CollapsibleSection
                  title="Attorney Leaderboard"
                  subtitle="Performance rankings this period"
                  isExpanded={expandedSections.has('attorneys')}
                  onToggle={() => toggleSection('attorneys')}
                >
                  {leaderboard.length > 0 ? (
                    <div className="space-y-3">
                      {leaderboard.map((attorney) => (
                        <div key={attorney.user_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 w-8">
                            {attorney.rank <= 3 ? (
                              <span className={`text-sm font-bold ${
                                attorney.rank === 1 ? 'text-yellow-500' :
                                attorney.rank === 2 ? 'text-gray-400' :
                                'text-amber-700'
                              }`}>
                                #{attorney.rank}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">#{attorney.rank}</span>
                            )}
                          </div>
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-xs">{attorney.initials}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{attorney.full_name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{attorney.active_cases} cases</span>
                              <span>{attorney.billable_hours}h</span>
                              <span>{attorney.utilization_rate}% util</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">{formatCurrency(attorney.revenue)}</p>
                            <p className="text-xs text-gray-500">{attorney.collection_rate}% collected</p>
                          </div>
                        </div>
                      ))}

                      <Link
                        href="/dashboard/reports/performance"
                        className="block w-full px-4 py-2 text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        View Detailed Performance Report
                      </Link>
                    </div>
                  ) : (
                    <EmptyState icon={<Users className="w-12 h-12" />} message="No attorney data yet" />
                  )}
                </CollapsibleSection>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Report Generator */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Report</h2>
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                    <select
                      value={reportType}
                      onChange={e => setReportType(e.target.value as ReportType)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(REPORT_TYPE_INFO).filter(([k]) => k !== 'custom').map(([key, info]) => (
                        <option key={key} value={key}>{info.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                      value={reportDateRange}
                      onChange={e => setReportDateRange(e.target.value as DateRangePreset)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(DATE_RANGE_PRESETS).filter(([k]) => k !== 'custom').map(([key, info]) => (
                        <option key={key} value={key}>{info.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                    <select
                      value={reportGroupBy}
                      onChange={e => setReportGroupBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="none">No Grouping</option>
                      <option value="attorney">Attorney</option>
                      <option value="case_type">Case Type</option>
                      <option value="month">Month</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateReport}
                      disabled={generatingReport}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {generatingReport ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <BarChart3 className="w-4 h-4" />
                      )}
                      Generate
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  {REPORT_TYPE_INFO[reportType]?.description}
                </p>
              </div>

              {/* Generated Report Results */}
              {generatedReport && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {REPORT_TYPE_INFO[generatedReport.report_type as ReportType]?.label || 'Report'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {new Date(generatedReport.period.start).toLocaleDateString()} -{' '}
                        {new Date(generatedReport.period.end).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setGeneratedReport(null)}
                      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {generatedReport.summary && Object.entries(generatedReport.summary).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-0.5">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {typeof value === 'number'
                            ? key.includes('rate') ? `${value}%`
                            : key.includes('revenue') || key.includes('collected') || key.includes('outstanding')
                              ? formatCurrency(value)
                              : key.includes('hours') ? `${value}h`
                              : value.toLocaleString()
                            : String(value)
                          }
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Data Table */}
                  {generatedReport.data && generatedReport.data.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Group</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-700">Revenue</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-700">Collected</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-700">Outstanding</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-700">Hours</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-700">Cases</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-700">Collection Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generatedReport.data.map((row: { label: string; metrics: Record<string, number> }, i: number) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium text-gray-900">{row.label}</td>
                              <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(row.metrics.revenue || 0)}</td>
                              <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(row.metrics.collected || 0)}</td>
                              <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(row.metrics.outstanding || 0)}</td>
                              <td className="py-2 px-3 text-right text-gray-700">{row.metrics.billable_hours || 0}h</td>
                              <td className="py-2 px-3 text-right text-gray-700">{row.metrics.cases || 0}</td>
                              <td className="py-2 px-3 text-right">
                                <span className={`font-medium ${(row.metrics.collection_rate || 0) >= 80 ? 'text-green-600' : (row.metrics.collection_rate || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {row.metrics.collection_rate || 0}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 font-semibold">
                            <td className="py-2 px-3 text-gray-900">Totals</td>
                            <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(generatedReport.totals?.revenue || 0)}</td>
                            <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(generatedReport.totals?.collected || 0)}</td>
                            <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(generatedReport.totals?.outstanding || 0)}</td>
                            <td className="py-2 px-3 text-right text-gray-900">{generatedReport.totals?.billable_hours || 0}h</td>
                            <td className="py-2 px-3 text-right text-gray-900">{generatedReport.totals?.cases || 0}</td>
                            <td className="py-2 px-3 text-right text-gray-900">{generatedReport.totals?.collection_rate || 0}%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Chart for grouped data */}
                  {generatedReport.data && generatedReport.data.length > 1 && (
                    <div className="mt-6">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={generatedReport.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend />
                          <Bar dataKey="metrics.revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="metrics.collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Saved Reports */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Saved Reports</h2>
                </div>

                {savedReports.length > 0 ? (
                  <div className="space-y-2">
                    {savedReports.map(report => (
                      <div key={report.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{report.report_name}</p>
                              {report.is_favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                            </div>
                            <p className="text-xs text-gray-500">
                              {REPORT_TYPE_INFO[report.report_type as ReportType]?.label || report.report_type}
                              {report.last_run_at && ` \u2022 Last run: ${new Date(report.last_run_at).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setReportType(report.report_type as ReportType)
                            if (report.filters.date_range) {
                              setReportDateRange(report.filters.date_range)
                            }
                            if (report.group_by) {
                              setReportGroupBy(report.group_by)
                            }
                            handleGenerateReport()
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                        >
                          Run
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<FileText className="w-12 h-12" />} message="No saved reports yet. Generate a report above to get started." />
                )}
              </div>

              {/* Quick Report Links */}
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(REPORT_TYPE_INFO)
                  .filter(([k]) => k !== 'custom')
                  .slice(0, 6)
                  .map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setReportType(key as ReportType)
                        handleGenerateReport()
                      }}
                      className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{info.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* KPI Targets Tab */}
          {activeTab === 'kpi' && (
            <KPITargetsSection kpiScorecard={kpiScorecard} onRefresh={fetchDashboard} />
          )}
        </div>
      </main>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function CollapsibleSection({
  title,
  subtitle,
  isExpanded,
  onToggle,
  children,
}: {
  title: string
  subtitle?: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon,
  invertChange = false,
  changeIsDelta = false,
}: {
  title: string
  value: string
  change?: number
  subtitle?: string
  icon: React.ReactNode
  invertChange?: boolean
  changeIsDelta?: boolean
}) {
  const effectiveChange = change || 0
  const isPositive = invertChange ? effectiveChange < 0 : effectiveChange > 0
  const isNegative = invertChange ? effectiveChange > 0 : effectiveChange < 0

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {effectiveChange !== 0 && (
        <div className="flex items-center gap-1 mt-1">
          {isPositive && <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />}
          {isNegative && <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />}
          <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
            {changeIsDelta ? `${effectiveChange > 0 ? '+' : ''}${effectiveChange}pp` : `${Math.abs(effectiveChange)}%`}
          </span>
          <span className="text-xs text-gray-400">vs last period</span>
        </div>
      )}
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto text-gray-300 mb-3">{icon}</div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}

function KPITargetsSection({
  kpiScorecard,
  onRefresh,
}: {
  kpiScorecard: KPIScorecard[]
  onRefresh: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [targets, setTargets] = useState<Record<string, number>>({})

  useEffect(() => {
    // Initialize from scorecard
    const initial: Record<string, number> = {}
    for (const kpi of kpiScorecard) {
      initial[kpi.metric_key] = kpi.target_value
    }
    setTargets(initial)
  }, [kpiScorecard])

  async function handleSave() {
    setSaving(true)
    try {
      const targetList = Object.entries(targets).map(([metric_key, target_value]) => ({
        metric_key,
        target_value,
        warning_threshold: target_value * 0.8,
      }))

      await authFetch('/api/analytics/kpi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: targetList }),
      })

      onRefresh()
    } catch {
      // Ignore
    } finally {
      setSaving(false)
    }
  }

  const statusIcons: Record<string, React.ReactNode> = {
    exceeded: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    on_track: <CheckCircle2 className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    behind: <XCircle className="w-5 h-5 text-red-500" />,
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">KPI Targets</h2>
            <p className="text-sm text-gray-500 mt-0.5">Set performance targets for your firm</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Targets
          </button>
        </div>

        <div className="space-y-4">
          {kpiScorecard.map(kpi => (
            <div key={kpi.metric_key} className={`p-4 rounded-lg border ${getKPIStatusBg(kpi.status)}`}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {statusIcons[kpi.status]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{kpi.label}</p>
                      <p className="text-xs text-gray-500">
                        Current: {formatMetricValue(kpi.current_value, kpi.format)}
                        {kpi.change_percent !== 0 && (
                          <span className={kpi.change_percent > 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({kpi.change_percent > 0 ? '+' : ''}{kpi.change_percent}%)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Target:</label>
                      <input
                        type="number"
                        value={targets[kpi.metric_key] ?? kpi.target_value}
                        onChange={e => setTargets(prev => ({ ...prev, [kpi.metric_key]: Number(e.target.value) }))}
                        className="w-24 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                      />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        kpi.status === 'exceeded' ? 'bg-green-500' :
                        kpi.status === 'on_track' ? 'bg-blue-500' :
                        kpi.status === 'warning' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((kpi.current_value / (targets[kpi.metric_key] ?? kpi.target_value)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">0</span>
                    <span className="text-xs text-gray-500">{formatMetricValue(targets[kpi.metric_key] ?? kpi.target_value, kpi.format)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {kpiScorecard.length === 0 && (
          <EmptyState icon={<Target className="w-12 h-12" />} message="No KPI data available. Metrics will appear as your firm generates data." />
        )}
      </div>
    </div>
  )
}
