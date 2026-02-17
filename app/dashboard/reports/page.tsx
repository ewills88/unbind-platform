'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import {
  DollarSign, Users, Briefcase, Loader2, Download,
  TrendingUp, Clock, AlertTriangle, BarChart3,
  PieChart, FileText, ChevronDown, ChevronUp,
  Scale, Wallet, Receipt, Target, UserCheck,
  Calendar, Play, Pause, Trash2, Plus, X,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart as RPieChart,
  Pie, Cell, LineChart, Line,
} from 'recharts'
import { formatCurrency } from '@/types/billing'
import { Progress } from '@/components/ui/progress'

// Types from analytics services
import type { RevenueReport, ARAgingReport, CollectionsReport, ProfitabilityReport, TrustAccountReport } from '@/lib/analytics/financialAnalytics'
import type { AttorneyPerformanceReport, TeamPerformanceReport, ProductivityTrendReport } from '@/lib/analytics/attorneyAnalytics'
import type { CaseLifecycleReport, CaseOutcomesReport, WorkloadReport } from '@/lib/analytics/caseAnalytics'

type ReportCategory = 'financial' | 'attorney' | 'cases' | 'scheduled'
type FinancialSubType = 'revenue' | 'ar_aging' | 'collections' | 'profitability' | 'trust'
type AttorneySubType = 'team' | 'trends'
type CaseSubType = 'lifecycle' | 'outcomes' | 'workload'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function ReportsPage() {
  const [category, setCategory] = useState<ReportCategory>('financial')
  const [financialSub, setFinancialSub] = useState<FinancialSubType>('revenue')
  const [attorneySub, setAttorneySub] = useState<AttorneySubType>('team')
  const [caseSub, setCaseSub] = useState<CaseSubType>('lifecycle')
  const [loading, setLoading] = useState(false)

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 11)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // Data state
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null)
  const [arAgingData, setArAgingData] = useState<ARAgingReport | null>(null)
  const [collectionsData, setCollectionsData] = useState<CollectionsReport | null>(null)
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityReport | null>(null)
  const [trustData, setTrustData] = useState<TrustAccountReport | null>(null)
  const [teamData, setTeamData] = useState<TeamPerformanceReport | null>(null)
  const [trendsData, setTrendsData] = useState<ProductivityTrendReport | null>(null)
  const [lifecycleData, setLifecycleData] = useState<CaseLifecycleReport | null>(null)
  const [outcomesData, setOutcomesData] = useState<CaseOutcomesReport | null>(null)
  const [workloadData, setWorkloadData] = useState<WorkloadReport | null>(null)

  // Export state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf')

  // Scheduled reports state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [schedules, setSchedules] = useState<any[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [showCreateSchedule, setShowCreateSchedule] = useState(false)
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null)

  useEffect(() => {
    if (category === 'scheduled') fetchSchedules()
    else if (category === 'financial') fetchFinancialReport(financialSub)
    else if (category === 'attorney') fetchAttorneyReport(attorneySub)
    else fetchCaseReport(caseSub)
  }, [category, financialSub, attorneySub, caseSub, startDate, endDate])

  async function fetchFinancialReport(type: FinancialSubType) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type })
      if (type !== 'ar_aging' && type !== 'trust') {
        params.set('start', startDate)
        params.set('end', endDate)
      }
      const res = await fetch(`/api/analytics/financial?${params}`)
      if (res.ok) {
        const json = await res.json()
        switch (type) {
          case 'revenue': setRevenueData(json.data); break
          case 'ar_aging': setArAgingData(json.data); break
          case 'collections': setCollectionsData(json.data); break
          case 'profitability': setProfitabilityData(json.data); break
          case 'trust': setTrustData(json.data); break
        }
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function fetchAttorneyReport(type: AttorneySubType) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type, start: startDate, end: endDate })
      const res = await fetch(`/api/analytics/attorneys?${params}`)
      if (res.ok) {
        const json = await res.json()
        if (type === 'team') setTeamData(json.data)
        else setTrendsData(json.data)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function fetchCaseReport(type: CaseSubType) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type })
      if (type !== 'workload') {
        params.set('start', startDate)
        params.set('end', endDate)
      }
      const res = await fetch(`/api/analytics/cases?${params}`)
      if (res.ok) {
        const json = await res.json()
        switch (type) {
          case 'lifecycle': setLifecycleData(json.data); break
          case 'outcomes': setOutcomesData(json.data); break
          case 'workload': setWorkloadData(json.data); break
        }
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function fetchSchedules() {
    setSchedulesLoading(true)
    try {
      const res = await fetch('/api/reports/schedules')
      if (res.ok) {
        const json = await res.json()
        setSchedules(json.data || [])
      }
    } catch { /* ignore */ } finally { setSchedulesLoading(false) }
  }

  function getCurrentReportType(): string {
    if (category === 'financial') return financialSub
    if (category === 'attorney') return attorneySub
    return caseSub
  }

  function getCurrentReportName(): string {
    if (category === 'financial') {
      const tab = financialTabs.find(t => t.key === financialSub)
      return tab ? `${tab.label} Report` : 'Financial Report'
    }
    if (category === 'attorney') {
      const tab = attorneyTabs.find(t => t.key === attorneySub)
      return tab ? `${tab.label} Report` : 'Attorney Report'
    }
    const tab = caseTabs.find(t => t.key === caseSub)
    return tab ? `${tab.label} Report` : 'Case Report'
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: getCurrentReportType(),
          export_format: exportFormat,
          report_name: getCurrentReportName(),
          filters: { start_date: startDate, end_date: endDate },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url) window.open(data.url, '_blank')
      }
    } catch { /* ignore */ } finally {
      setExporting(false)
      setShowExportModal(false)
    }
  }

  async function handleRunNow(scheduleId: string) {
    setRunningScheduleId(scheduleId)
    try {
      await fetch(`/api/reports/schedules/${scheduleId}/run`, { method: 'POST' })
      fetchSchedules()
    } catch { /* ignore */ } finally { setRunningScheduleId(null) }
  }

  async function handleToggleSchedule(scheduleId: string, isActive: boolean) {
    await fetch(`/api/reports/schedules/${scheduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    fetchSchedules()
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm('Delete this scheduled report?')) return
    await fetch(`/api/reports/schedules/${scheduleId}`, { method: 'DELETE' })
    fetchSchedules()
  }

  const categories = [
    { key: 'financial' as const, label: 'Financial', icon: DollarSign },
    { key: 'attorney' as const, label: 'Attorney', icon: Users },
    { key: 'cases' as const, label: 'Cases', icon: Briefcase },
    { key: 'scheduled' as const, label: 'Scheduled', icon: Calendar },
  ]

  const financialTabs = [
    { key: 'revenue' as const, label: 'Revenue' },
    { key: 'ar_aging' as const, label: 'AR Aging' },
    { key: 'collections' as const, label: 'Collections' },
    { key: 'profitability' as const, label: 'Profitability' },
    { key: 'trust' as const, label: 'Trust Accounts' },
  ]

  const attorneyTabs = [
    { key: 'team' as const, label: 'Team Comparison' },
    { key: 'trends' as const, label: 'Productivity Trends' },
  ]

  const caseTabs = [
    { key: 'lifecycle' as const, label: 'Case Lifecycle' },
    { key: 'outcomes' as const, label: 'Case Outcomes' },
    { key: 'workload' as const, label: 'Workload' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-64 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-1">Financial, attorney, and case analytics</p>
          </div>
          <div className="flex items-center gap-2">
            {category !== 'scheduled' && (
              <>
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
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                category === cat.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto">
          {category === 'financial' && financialTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFinancialSub(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                financialSub === tab.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {category === 'attorney' && attorneyTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setAttorneySub(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                attorneySub === tab.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {category === 'cases' && caseTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCaseSub(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                caseSub === tab.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Report content */}
        {!loading && (
          <>
            {category === 'financial' && financialSub === 'revenue' && revenueData && (
              <RevenueSection data={revenueData} />
            )}
            {category === 'financial' && financialSub === 'ar_aging' && arAgingData && (
              <ARAgingSection data={arAgingData} />
            )}
            {category === 'financial' && financialSub === 'collections' && collectionsData && (
              <CollectionsSection data={collectionsData} />
            )}
            {category === 'financial' && financialSub === 'profitability' && profitabilityData && (
              <ProfitabilitySection data={profitabilityData} />
            )}
            {category === 'financial' && financialSub === 'trust' && trustData && (
              <TrustSection data={trustData} />
            )}
            {category === 'attorney' && attorneySub === 'team' && teamData && (
              <TeamComparisonSection data={teamData} />
            )}
            {category === 'attorney' && attorneySub === 'trends' && trendsData && (
              <ProductivityTrendsSection data={trendsData} />
            )}
            {category === 'cases' && caseSub === 'lifecycle' && lifecycleData && (
              <CaseLifecycleSection data={lifecycleData} />
            )}
            {category === 'cases' && caseSub === 'outcomes' && outcomesData && (
              <CaseOutcomesSection data={outcomesData} />
            )}
            {category === 'cases' && caseSub === 'workload' && workloadData && (
              <WorkloadSection data={workloadData} />
            )}
          </>
        )}

        {/* Scheduled Reports Tab */}
        {category === 'scheduled' && (
          <ScheduledReportsSection
            schedules={schedules}
            loading={schedulesLoading}
            runningId={runningScheduleId}
            showCreate={showCreateSchedule}
            onShowCreate={setShowCreateSchedule}
            onRunNow={handleRunNow}
            onToggle={handleToggleSchedule}
            onDelete={handleDeleteSchedule}
            onRefresh={fetchSchedules}
          />
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Export Report</h3>
                <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">{getCurrentReportName()}</p>

              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium text-gray-700">Export Format</label>
                {(['pdf', 'excel', 'csv'] as const).map(fmt => (
                  <label key={fmt} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="export_format"
                      checked={exportFormat === fmt}
                      onChange={() => setExportFormat(fmt)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {fmt === 'pdf' ? 'PDF' : fmt === 'excel' ? 'Excel (.xlsx)' : 'CSV'}
                      </span>
                      <p className="text-xs text-gray-500">
                        {fmt === 'pdf' ? 'Formatted report document' : fmt === 'excel' ? 'Multi-sheet workbook with formatting' : 'Raw data for import'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ============================================================
// Financial: Revenue
// ============================================================

function RevenueSection({ data }: { data: RevenueReport }) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Total Billed" value={formatCurrency(data.summary.totalBilled)} icon={DollarSign} color="blue" />
        <MetricCard label="Total Collected" value={formatCurrency(data.summary.totalCollected)} icon={TrendingUp} color="green" />
        <MetricCard label="Outstanding" value={formatCurrency(data.summary.totalOutstanding)} icon={AlertTriangle} color="amber" />
        <MetricCard label="Realization Rate" value={`${data.summary.realizationRate}%`} icon={Target} color="purple" />
        <MetricCard label="Invoices" value={data.summary.invoiceCount.toString()} icon={Receipt} color="gray" />
      </div>

      {/* Revenue by month chart */}
      {data.byMonth.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Month</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="billed" name="Billed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue by attorney and case type */}
      <div className="grid md:grid-cols-2 gap-6">
        {data.byAttorney.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Attorney</h3>
            <div className="space-y-3">
              {data.byAttorney.map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-gray-700 truncate">{a.name || 'Unassigned'}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(a.billed)}</span>
                    <span className="text-xs text-gray-500 ml-2">({a.count} inv.)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.byCaseType.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Case Type</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RPieChart>
                <Pie
                  data={data.byCaseType}
                  dataKey="billed"
                  nameKey="caseType"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => `${props.name || ''} (${((props.percent || 0) * 100).toFixed(0)}%)`}
                >
                  {data.byCaseType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top clients */}
      {data.byClient.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Clients by Revenue</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billed</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collected</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Realization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.byClient.slice(0, 10).map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-900">{formatCurrency(c.billed)}</td>
                    <td className="px-6 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(c.collected)}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-900">
                      {c.billed > 0 ? `${Math.round((c.collected / c.billed) * 100)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Financial: AR Aging
// ============================================================

function ARAgingSection({ data }: { data: ARAgingReport }) {
  const bucketLabels = [
    { key: 'current', label: 'Current', color: '#10b981' },
    { key: 'days_1_30', label: '1-30 Days', color: '#3b82f6' },
    { key: 'days_31_60', label: '31-60 Days', color: '#f59e0b' },
    { key: 'days_61_90', label: '61-90 Days', color: '#ef4444' },
    { key: 'days_90_plus', label: '90+ Days', color: '#7c3aed' },
  ]

  const chartData = bucketLabels.map(b => ({
    name: b.label,
    amount: data.buckets[b.key as keyof typeof data.buckets].total,
    count: data.buckets[b.key as keyof typeof data.buckets].count,
  }))

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Outstanding" value={formatCurrency(data.summary.totalOutstanding)} icon={DollarSign} color="red" />
        <MetricCard label="Outstanding Invoices" value={data.summary.invoiceCount.toString()} icon={Receipt} color="amber" />
        <MetricCard label="Avg. Days Outstanding" value={`${data.summary.averageDaysOutstanding} days`} icon={Clock} color="blue" />
      </div>

      {/* Aging buckets chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Bar dataKey="amount" name="Amount">
              {chartData.map((_, i) => (
                <Cell key={i} fill={bucketLabels[i].color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By client table */}
      {data.byClient.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Aging by Client</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">1-30</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">31-60</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">61-90</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">90+</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.byClient.slice(0, 15).map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-900">{c.current > 0 ? formatCurrency(c.current) : '-'}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-900">{c.days_1_30 > 0 ? formatCurrency(c.days_1_30) : '-'}</td>
                    <td className="px-6 py-3 text-sm text-right text-amber-600">{c.days_31_60 > 0 ? formatCurrency(c.days_31_60) : '-'}</td>
                    <td className="px-6 py-3 text-sm text-right text-red-500">{c.days_61_90 > 0 ? formatCurrency(c.days_61_90) : '-'}</td>
                    <td className="px-6 py-3 text-sm text-right text-red-700 font-medium">{c.days_90_plus > 0 ? formatCurrency(c.days_90_plus) : '-'}</td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Financial: Collections
// ============================================================

function CollectionsSection({ data }: { data: CollectionsReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Collected" value={formatCurrency(data.summary.totalCollected)} icon={DollarSign} color="green" />
        <MetricCard label="Payments" value={data.summary.paymentCount.toString()} icon={Receipt} color="blue" />
        <MetricCard label="Avg. Payment" value={formatCurrency(data.summary.averagePayment)} icon={TrendingUp} color="purple" />
      </div>

      {/* Collections by month */}
      {data.byMonth.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Collections by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="amount" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* By payment method */}
        {data.byMethod.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">By Payment Method</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RPieChart>
                <Pie
                  data={data.byMethod}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => `${props.name || ''} (${((props.percent || 0) * 100).toFixed(0)}%)`}
                >
                  {data.byMethod.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top paying clients */}
        {data.byClient.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Paying Clients</h3>
            <div className="space-y-3">
              {data.byClient.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-gray-700 truncate">{c.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600 flex-shrink-0 ml-4">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Financial: Profitability
// ============================================================

function ProfitabilitySection({ data }: { data: ProfitabilityReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Cases Analyzed" value={data.summary.casesAnalyzed.toString()} icon={Briefcase} color="blue" />
        <MetricCard label="Total Billed" value={formatCurrency(data.summary.totalBilled)} icon={DollarSign} color="green" />
        <MetricCard label="Avg. Revenue/Case" value={formatCurrency(data.summary.avgRevenuePerCase)} icon={TrendingUp} color="purple" />
        <MetricCard label="Avg. Days to Close" value={`${data.summary.avgDaysToClose} days`} icon={Clock} color="amber" />
      </div>

      {/* By case type chart */}
      {data.byCaseType.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability by Case Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byCaseType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="caseType" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="totalBilled" name="Billed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalCollected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Case profitability table */}
      {data.cases.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Case Profitability Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billed</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collected</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eff. Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Realization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.cases.slice(0, 20).map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.caseNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.clientName}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(c.totalBilled)}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(c.totalCollected)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{c.billableHours}h</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(c.effectiveRate)}/hr</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{c.daysOpen}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        c.realizationRate >= 80 ? 'bg-green-100 text-green-800' :
                        c.realizationRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {c.realizationRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Financial: Trust Accounts
// ============================================================

function TrustSection({ data }: { data: TrustAccountReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Trust Balance" value={formatCurrency(data.summary.totalTrustBalance)} icon={Wallet} color="blue" />
        <MetricCard label="Active Accounts" value={data.summary.accountCount.toString()} icon={Briefcase} color="green" />
        <MetricCard label="Low Balance Alerts" value={data.summary.lowBalanceCount.toString()} icon={AlertTriangle} color="red" />
      </div>

      {/* Trust accounts table */}
      {data.accounts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Trust Account Balances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deposits</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Withdrawals</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.accounts.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{a.clientName}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{a.caseNumber}</td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(a.balance)}</td>
                    <td className="px-6 py-3 text-sm text-right text-green-600">{formatCurrency(a.totalDeposits)}</td>
                    <td className="px-6 py-3 text-sm text-right text-red-600">{formatCurrency(a.totalWithdrawals)}</td>
                    <td className="px-6 py-3 text-center">
                      {a.isLowBalance ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3" /> Low
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {data.recentTransactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Trust Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.recentTransactions.slice(0, 15).map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-700">{new Date(t.transactionDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{t.clientName}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        t.transactionType === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {t.transactionType}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-sm text-right font-medium ${
                      t.transactionType === 'deposit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {t.transactionType === 'deposit' ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-gray-900">{formatCurrency(t.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Attorney: Team Comparison
// ============================================================

function TeamComparisonSection({ data }: { data: TeamPerformanceReport }) {
  const chartData = data.attorneys.map(a => ({
    name: a.attorney.name.split(' ')[0],
    billableHours: a.productivity.billableHours,
    revenue: a.financial.revenueGenerated,
    utilization: a.productivity.utilizationRate,
  }))

  return (
    <div className="space-y-6">
      {/* Team totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Total Billable Hours" value={`${data.teamTotals.billableHours}h`} icon={Clock} color="blue" />
        <MetricCard label="Total Revenue" value={formatCurrency(data.teamTotals.revenueGenerated)} icon={DollarSign} color="green" />
        <MetricCard label="Active Cases" value={data.teamTotals.activeCases.toString()} icon={Briefcase} color="purple" />
      </div>

      {/* Team averages */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Avg. Billable Hours</p>
          <p className="text-xl font-bold text-gray-900">{data.teamAverages.avgBillableHours}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Avg. Utilization</p>
          <p className="text-xl font-bold text-gray-900">{data.teamAverages.avgUtilizationRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Avg. Revenue</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(data.teamAverages.avgRevenueGenerated)}</p>
        </div>
      </div>

      {/* Comparison chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attorney Comparison</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="hours" orientation="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="revenue" orientation="right" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => name === 'Revenue' ? formatCurrency(value as number) : `${value}h`} />
              <Legend />
              <Bar yAxisId="hours" dataKey="billableHours" name="Billable Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="revenue" dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Attorney detail table */}
      {data.attorneys.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Attorney Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attorney</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billable Hrs</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilization</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Active Cases</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closed</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collections</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Task Comp.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.attorneys.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.attorney.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{a.role.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{a.productivity.billableHours}h</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={a.productivity.utilizationRate} className="w-16" />
                        <span className="text-sm text-gray-900">{a.productivity.utilizationRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{a.caseManagement.activeCases}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{a.caseManagement.casesClosedInPeriod}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{formatCurrency(a.financial.revenueGenerated)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(a.financial.collectionsGenerated)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{a.caseManagement.taskCompletionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Attorney: Productivity Trends
// ============================================================

function ProductivityTrendsSection({ data }: { data: ProductivityTrendReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Avg. Billable Hours/Mo" value={`${data.averageBillableHours}h`} icon={Clock} color="blue" />
        <MetricCard label="Avg. Revenue/Mo" value={formatCurrency(data.averageRevenue)} icon={DollarSign} color="green" />
      </div>

      {data.trends.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="hours" orientation="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="revenue" orientation="right" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => name === 'Revenue' ? formatCurrency(value as number) : `${value}h`} />
              <Legend />
              <Line yAxisId="hours" type="monotone" dataKey="billableHours" name="Billable Hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trend table */}
      {data.trends.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Data</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billable Hours</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eff. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.trends.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{t.month}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-900">{t.billableHours}h</td>
                    <td className="px-6 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(t.revenue)}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-900">
                      {t.billableHours > 0 ? formatCurrency(Math.round(t.revenue / t.billableHours)) + '/hr' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Cases: Lifecycle
// ============================================================

function CaseLifecycleSection({ data }: { data: CaseLifecycleReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Cases Analyzed" value={data.summary.casesAnalyzed.toString()} icon={Briefcase} color="blue" />
        <MetricCard label="Avg. Days to Close" value={`${data.summary.avgDaysToClose} days`} icon={Clock} color="amber" />
        <MetricCard label="Median Days to Close" value={`${data.summary.medianDaysToClose} days`} icon={Target} color="purple" />
      </div>

      {/* By case type chart */}
      {data.byCaseType.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Duration by Case Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byCaseType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="caseType" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: 'Avg Days', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="avgDays" name="Avg. Days" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {data.byCaseType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stage distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {data.byStage.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Cases by Stage</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RPieChart>
                <Pie
                  data={data.byStage}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => `${props.name || ''} (${((props.percent || 0) * 100).toFixed(0)}%)`}
                >
                  {data.byStage.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.byCaseType.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Closed Cases by Type</h3>
            <div className="space-y-3">
              {data.byCaseType.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-gray-700">{t.caseType}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{t.count} cases</span>
                    <span className="text-xs text-gray-500 ml-2">({t.avgDays} days avg)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Cases: Outcomes
// ============================================================

function CaseOutcomesSection({ data }: { data: CaseOutcomesReport }) {
  const outcomeData = [
    { name: 'Settled', value: data.outcomes.settled, color: '#10b981' },
    { name: 'Trial', value: data.outcomes.trial, color: '#3b82f6' },
    { name: 'Dismissed', value: data.outcomes.dismissed, color: '#f59e0b' },
    { name: 'Default Judgment', value: data.outcomes.defaultJudgment, color: '#8b5cf6' },
    { name: 'Other', value: data.outcomes.other, color: '#6b7280' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Cases" value={data.summary.totalCases.toString()} icon={Briefcase} color="blue" />
        <MetricCard label="Settlement Rate" value={`${data.summary.settlementRate}%`} icon={Scale} color="green" />
        <MetricCard label="Trial Rate" value={`${data.summary.trialRate}%`} icon={BarChart3} color="amber" />
      </div>

      {/* Outcomes pie chart */}
      <div className="grid md:grid-cols-2 gap-6">
        {outcomeData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Case Outcomes</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RPieChart>
                <Pie
                  data={outcomeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  label={(props) => `${props.name || ''} (${((props.percent || 0) * 100).toFixed(0)}%)`}
                >
                  {outcomeData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Outcomes legend */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Outcome Summary</h3>
          <div className="space-y-4">
            {outcomeData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: d.color }} />
                  <span className="text-sm text-gray-700">{d.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-900">{d.value}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({data.summary.totalCases > 0 ? Math.round((d.value / data.summary.totalCases) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By case type */}
      {data.byCaseType.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Outcomes by Case Type</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Settled</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trial</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dismissed</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Default</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Other</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.byCaseType.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{t.caseType}</td>
                    <td className="px-6 py-3 text-sm text-right text-green-600">{t.settled}</td>
                    <td className="px-6 py-3 text-sm text-right text-blue-600">{t.trial}</td>
                    <td className="px-6 py-3 text-sm text-right text-amber-600">{t.dismissed}</td>
                    <td className="px-6 py-3 text-sm text-right text-purple-600">{t.defaultJudgment}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-600">{t.other}</td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{t.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Cases: Workload
// ============================================================

function WorkloadSection({ data }: { data: WorkloadReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Active Cases" value={data.summary.totalActiveCases.toString()} icon={Briefcase} color="blue" />
        <MetricCard label="Unassigned Cases" value={data.summary.unassignedCases.toString()} icon={AlertTriangle} color="red" />
        <MetricCard label="Avg. Cases/Attorney" value={data.summary.avgCasesPerAttorney.toString()} icon={Users} color="purple" />
      </div>

      {/* Workload by attorney chart */}
      {data.byAttorney.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cases by Attorney</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byAttorney.map(a => ({ name: a.name.split(' ')[0], cases: a.caseCount }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="cases" name="Cases" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {data.byAttorney.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* By phase */}
        {data.byPhase.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cases by Phase</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RPieChart>
                <Pie
                  data={data.byPhase}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => `${props.name || ''} (${((props.percent || 0) * 100).toFixed(0)}%)`}
                >
                  {data.byPhase.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By type */}
        {data.byType.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cases by Type</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RPieChart>
                <Pie
                  data={data.byType}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => `${props.name || ''} (${((props.percent || 0) * 100).toFixed(0)}%)`}
                >
                  {data.byType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Attorney workload table */}
      {data.byAttorney.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Attorney Workload Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attorney</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cases</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cases by Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.byAttorney.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{a.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-700 capitalize">{a.role.replace('_', ' ')}</td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{a.caseCount}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(a.casesByStage).map(([stage, count]) => (
                          <span key={stage} className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                            {stage.replace('_', ' ')}: {count}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unassigned cases */}
      {data.unassignedCases.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-200 bg-red-50">
            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Unassigned Cases ({data.unassignedCases.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.unassignedCases.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.caseNumber || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{c.clientName}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize">
                        {c.caseStage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Shared Components
// ============================================================

function MetricCard({ label, value, icon: Icon, color }: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-900' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-900' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-900' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-900' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-900' },
    gray: { bg: 'bg-gray-50', icon: 'text-gray-600', text: 'text-gray-900' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-xl font-bold ${c.text}`}>{value}</p>
    </div>
  )
}

// ============================================================
// Scheduled Reports Section
// ============================================================

function ScheduledReportsSection({ schedules, loading, runningId, showCreate, onShowCreate, onRunNow, onToggle, onDelete, onRefresh }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schedules: any[]
  loading: boolean
  runningId: string | null
  showCreate: boolean
  onShowCreate: (show: boolean) => void
  onRunNow: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
  onRefresh: () => void
}) {
  const frequencyLabels: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', biweekly: 'Every 2 Weeks',
    monthly: 'Monthly', quarterly: 'Quarterly',
  }
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Scheduled Reports</h2>
          <p className="text-sm text-gray-600">Automatically generate and deliver reports</p>
        </div>
        <button
          onClick={() => onShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Calendar className="mx-auto w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scheduled Reports</h3>
          <p className="text-gray-600 mb-4">Set up automated reports to be delivered to your inbox</p>
          <button
            onClick={() => onShowCreate(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Create Your First Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    schedule.is_active ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Calendar className={`w-6 h-6 ${schedule.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{schedule.schedule_name}</h3>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {schedule.is_active ? 'Active' : 'Paused'}
                      </span>
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                        {(schedule.export_format || 'pdf').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {frequencyLabels[schedule.frequency] || schedule.frequency}
                      {schedule.frequency === 'weekly' && ` on ${dayLabels[schedule.day_of_week] || 'Mon'}`}
                      {schedule.frequency === 'monthly' && ` on day ${schedule.day_of_month || 1}`}
                      {' at '}{schedule.time_of_day || '08:00'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{schedule.recipients?.length || 0} recipients</span>
                      {schedule.last_run_at && (
                        <span>Last run: {new Date(schedule.last_run_at).toLocaleDateString()}</span>
                      )}
                      {schedule.next_run_at && schedule.is_active && (
                        <span>Next: {new Date(schedule.next_run_at).toLocaleDateString()}</span>
                      )}
                      <span>{schedule.run_count || 0} runs</span>
                    </div>
                    {schedule.last_run_status?.startsWith('error') && (
                      <p className="text-xs text-red-600 mt-1">{schedule.last_run_status}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRunNow(schedule.id)}
                    disabled={runningId === schedule.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {runningId === schedule.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    Run Now
                  </button>
                  <button
                    onClick={() => onToggle(schedule.id, schedule.is_active)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                    title={schedule.is_active ? 'Pause' : 'Resume'}
                  >
                    {schedule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onDelete(schedule.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateScheduleModal
          onClose={() => onShowCreate(false)}
          onCreated={() => { onShowCreate(false); onRefresh() }}
        />
      )}
    </div>
  )
}

// ============================================================
// Create Schedule Modal
// ============================================================

function CreateScheduleModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: () => void
}) {
  const [formData, setFormData] = useState({
    schedule_name: '',
    report_type: 'revenue',
    frequency: 'weekly',
    day_of_week: 1,
    day_of_month: 1,
    time_of_day: '08:00',
    timezone: 'America/Los_Angeles',
    export_format: 'pdf',
    recipients: [''],
    filters: { date_range: 'last_month' },
    include_charts: true,
  })
  const [submitting, setSubmitting] = useState(false)

  const reportTypes = [
    { value: 'revenue', label: 'Revenue Report' },
    { value: 'ar_aging', label: 'AR Aging Report' },
    { value: 'collections', label: 'Collections Report' },
    { value: 'profitability', label: 'Profitability Report' },
    { value: 'team', label: 'Team Performance' },
    { value: 'lifecycle', label: 'Case Lifecycle' },
    { value: 'outcomes', label: 'Case Outcomes' },
    { value: 'workload', label: 'Workload Analysis' },
  ]

  const dateRangeOptions = [
    { value: 'last_week', label: 'Last 7 Days' },
    { value: 'last_month', label: 'Last 30 Days' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'mtd', label: 'Month to Date' },
    { value: 'ytd', label: 'Year to Date' },
  ]

  async function handleSubmit() {
    const validRecipients = formData.recipients.filter(r => r.trim())
    if (!formData.schedule_name.trim()) return
    if (validRecipients.length === 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, recipients: validRecipients }),
      })
      if (res.ok) onCreated()
    } catch { /* ignore */ } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Create Scheduled Report</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Schedule name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
            <input
              value={formData.schedule_name}
              onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
              placeholder="e.g., Weekly Revenue Report"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Report type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={formData.report_type}
              onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {reportTypes.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>

          {/* Frequency and day */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 Weeks</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            {formData.frequency === 'weekly' || formData.frequency === 'biweekly' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
            ) : formData.frequency === 'monthly' || formData.frequency === 'quarterly' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
                <select
                  value={formData.day_of_month}
                  onChange={(e) => setFormData({ ...formData, day_of_month: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {Array.from({ length: 28 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* Time and format */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={formData.time_of_day}
                onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={formData.export_format}
                onChange={(e) => setFormData({ ...formData, export_format: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>

          {/* Date range for report */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Date Range</label>
            <select
              value={formData.filters.date_range}
              onChange={(e) => setFormData({ ...formData, filters: { ...formData.filters, date_range: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {dateRangeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
            <div className="space-y-2">
              {formData.recipients.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const updated = [...formData.recipients]
                      updated[index] = e.target.value
                      setFormData({ ...formData, recipients: updated })
                    }}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  {formData.recipients.length > 1 && (
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          recipients: formData.recipients.filter((_, i) => i !== index),
                        })
                      }}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setFormData({ ...formData, recipients: [...formData.recipients, ''] })}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3 h-3" /> Add Recipient
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !formData.schedule_name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Schedule
          </button>
        </div>
      </div>
    </div>
  )
}
