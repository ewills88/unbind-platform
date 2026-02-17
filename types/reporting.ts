// Session 19 Checkpoint 1: Reporting & Analytics Dashboard Types

// ============================================================
// Union Types
// ============================================================

export type ReportType =
  | 'revenue_summary'
  | 'case_analytics'
  | 'attorney_performance'
  | 'collection_report'
  | 'client_report'
  | 'practice_area'
  | 'custom'

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'

export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'mixed'

export type DateRangePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom'

export type MetricKey =
  | 'revenue_monthly'
  | 'billable_hours_monthly'
  | 'collection_rate'
  | 'cases_opened_monthly'
  | 'cases_closed_monthly'
  | 'avg_case_duration_days'
  | 'client_satisfaction'
  | 'utilization_rate'

export type KPIStatus = 'on_track' | 'warning' | 'behind' | 'exceeded'

export type TrendDirection = 'up' | 'down' | 'flat'

// ============================================================
// Interfaces
// ============================================================

export interface ReportConfiguration {
  id: string
  firm_id: string
  created_by: string
  report_name: string
  report_type: ReportType
  description: string | null
  metrics: string[]
  filters: ReportFilters
  group_by: string | null
  sort_by: string
  sort_direction: string
  chart_type: ChartType
  is_favorite: boolean
  is_system: boolean
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface ReportFilters {
  date_range?: DateRangePreset
  start_date?: string
  end_date?: string
  attorneys?: string[]
  case_types?: string[]
  case_stages?: string[]
  statuses?: string[]
}

export interface ReportSnapshot {
  id: string
  firm_id: string
  report_config_id: string | null
  created_by: string
  snapshot_name: string
  report_type: string
  period_start: string
  period_end: string
  summary_data: Record<string, unknown>
  detail_data: unknown[]
  comparison_data: Record<string, unknown> | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ReportSchedule {
  id: string
  firm_id: string
  report_config_id: string
  created_by: string
  frequency: ReportFrequency
  day_of_week: number | null
  day_of_month: number | null
  recipients: string[]
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
  updated_at: string

  // Joined
  report?: ReportConfiguration
}

export interface KPITarget {
  id: string
  firm_id: string
  metric_key: MetricKey
  target_value: number
  warning_threshold: number | null
  period: string
  applies_to: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DailySnapshot {
  id: string
  firm_id: string
  snapshot_date: string
  active_cases: number
  new_cases: number
  closed_cases: number
  cases_by_stage: Record<string, number>
  cases_by_type: Record<string, number>
  revenue_today: number
  revenue_mtd: number
  revenue_ytd: number
  collected_today: number
  collected_mtd: number
  outstanding_ar: number
  billable_hours_today: number
  billable_hours_mtd: number
  non_billable_hours_today: number
  utilization_rate: number
  collection_rate: number
  attorney_metrics: AttorneyDailyMetric[]
  created_at: string
}

export interface AttorneyDailyMetric {
  user_id: string
  full_name: string
  billable_hours: number
  revenue: number
  active_cases: number
  utilization: number
}

// ============================================================
// Dashboard Data Interfaces
// ============================================================

export interface AnalyticsDashboardData {
  overview: DashboardOverview
  revenue_trend: RevenueTrendPoint[]
  case_analytics: CaseAnalyticsData
  attorney_leaderboard: AttorneyLeaderboardEntry[]
  kpi_scorecard: KPIScorecard[]
  recent_snapshots: ReportSnapshot[]
  saved_reports: ReportConfiguration[]
}

export interface DashboardOverview {
  total_revenue: number
  revenue_change: number
  revenue_trend: TrendDirection
  total_collected: number
  collected_change: number
  outstanding_ar: number
  ar_change: number
  active_cases: number
  cases_change: number
  new_cases_period: number
  closed_cases_period: number
  billable_hours: number
  hours_change: number
  utilization_rate: number
  utilization_change: number
  collection_rate: number
  collection_change: number
  avg_case_value: number
  avg_case_change: number
}

export interface RevenueTrendPoint {
  date: string
  label: string
  revenue: number
  collected: number
  target: number | null
}

export interface CaseAnalyticsData {
  by_stage: { stage: string; label: string; count: number; value: number }[]
  by_type: { type: string; label: string; count: number }[]
  avg_duration_days: number
  open_rate: number
  close_rate: number
  aging: { bucket: string; count: number }[]
}

export interface AttorneyLeaderboardEntry {
  user_id: string
  full_name: string
  initials: string
  rank: number
  revenue: number
  billable_hours: number
  utilization_rate: number
  active_cases: number
  collection_rate: number
  avg_case_value: number
}

export interface KPIScorecard {
  metric_key: MetricKey
  label: string
  current_value: number
  target_value: number
  warning_threshold: number | null
  status: KPIStatus
  trend: TrendDirection
  change_percent: number
  format: 'currency' | 'percent' | 'number' | 'hours' | 'days'
}

// ============================================================
// Report Generation Interfaces
// ============================================================

export interface GenerateReportRequest {
  report_type: ReportType
  date_range: DateRangePreset
  start_date?: string
  end_date?: string
  attorneys?: string[]
  case_types?: string[]
  group_by?: string
  metrics?: string[]
  save_snapshot?: boolean
  snapshot_name?: string
}

export interface GeneratedReport {
  report_type: ReportType
  period: { start: string; end: string }
  generated_at: string
  summary: Record<string, unknown>
  data: ReportDataRow[]
  comparison: Record<string, unknown> | null
  totals: Record<string, number>
}

export interface ReportDataRow {
  label: string
  group_key: string | null
  metrics: Record<string, number>
}

// ============================================================
// Constants
// ============================================================

export const REPORT_TYPE_INFO: Record<ReportType, {
  label: string
  description: string
  icon: string
  defaultMetrics: string[]
}> = {
  revenue_summary: {
    label: 'Revenue Summary',
    description: 'Revenue, collections, and financial performance',
    icon: 'DollarSign',
    defaultMetrics: ['revenue', 'collected', 'outstanding_ar', 'collection_rate'],
  },
  case_analytics: {
    label: 'Case Analytics',
    description: 'Case volume, stages, and outcomes',
    icon: 'Briefcase',
    defaultMetrics: ['active_cases', 'new_cases', 'closed_cases', 'avg_duration'],
  },
  attorney_performance: {
    label: 'Attorney Performance',
    description: 'Individual attorney metrics and rankings',
    icon: 'Users',
    defaultMetrics: ['billable_hours', 'revenue', 'utilization', 'active_cases'],
  },
  collection_report: {
    label: 'Collection Report',
    description: 'AR aging, payment tracking, and collection rates',
    icon: 'CreditCard',
    defaultMetrics: ['outstanding_ar', 'collection_rate', 'avg_days_to_payment', 'overdue_invoices'],
  },
  client_report: {
    label: 'Client Report',
    description: 'Client demographics, retention, and satisfaction',
    icon: 'UserCheck',
    defaultMetrics: ['total_clients', 'new_clients', 'client_retention', 'satisfaction'],
  },
  practice_area: {
    label: 'Practice Area',
    description: 'Breakdown by case type and practice area',
    icon: 'PieChart',
    defaultMetrics: ['cases_by_type', 'revenue_by_type', 'avg_value_by_type'],
  },
  custom: {
    label: 'Custom Report',
    description: 'Build your own report with custom metrics',
    icon: 'Settings',
    defaultMetrics: [],
  },
}

export const DATE_RANGE_PRESETS: Record<DateRangePreset, {
  label: string
  getRange: () => { start: Date; end: Date }
}> = {
  today: {
    label: 'Today',
    getRange: () => {
      const d = new Date()
      return { start: d, end: d }
    },
  },
  this_week: {
    label: 'This Week',
    getRange: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      return { start, end: now }
    },
  },
  this_month: {
    label: 'This Month',
    getRange: () => {
      const now = new Date()
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    },
  },
  last_month: {
    label: 'Last Month',
    getRange: () => {
      const now = new Date()
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      }
    },
  },
  this_quarter: {
    label: 'This Quarter',
    getRange: () => {
      const now = new Date()
      const q = Math.floor(now.getMonth() / 3)
      return { start: new Date(now.getFullYear(), q * 3, 1), end: now }
    },
  },
  last_quarter: {
    label: 'Last Quarter',
    getRange: () => {
      const now = new Date()
      const q = Math.floor(now.getMonth() / 3)
      return {
        start: new Date(now.getFullYear(), (q - 1) * 3, 1),
        end: new Date(now.getFullYear(), q * 3, 0),
      }
    },
  },
  this_year: {
    label: 'This Year',
    getRange: () => {
      const now = new Date()
      return { start: new Date(now.getFullYear(), 0, 1), end: now }
    },
  },
  last_year: {
    label: 'Last Year',
    getRange: () => {
      const now = new Date()
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31),
      }
    },
  },
  custom: {
    label: 'Custom Range',
    getRange: () => {
      const now = new Date()
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    },
  },
}

export const METRIC_KEY_INFO: Record<MetricKey, {
  label: string
  description: string
  format: 'currency' | 'percent' | 'number' | 'hours' | 'days'
  defaultTarget: number
}> = {
  revenue_monthly: {
    label: 'Monthly Revenue',
    description: 'Total billed revenue per month',
    format: 'currency',
    defaultTarget: 50000,
  },
  billable_hours_monthly: {
    label: 'Monthly Billable Hours',
    description: 'Total billable hours per month',
    format: 'hours',
    defaultTarget: 640,
  },
  collection_rate: {
    label: 'Collection Rate',
    description: 'Percentage of billed amount collected',
    format: 'percent',
    defaultTarget: 90,
  },
  cases_opened_monthly: {
    label: 'Cases Opened',
    description: 'New cases opened per month',
    format: 'number',
    defaultTarget: 10,
  },
  cases_closed_monthly: {
    label: 'Cases Closed',
    description: 'Cases closed per month',
    format: 'number',
    defaultTarget: 8,
  },
  avg_case_duration_days: {
    label: 'Avg Case Duration',
    description: 'Average days to close a case',
    format: 'days',
    defaultTarget: 180,
  },
  client_satisfaction: {
    label: 'Client Satisfaction',
    description: 'Average client satisfaction score (1-5)',
    format: 'number',
    defaultTarget: 4.5,
  },
  utilization_rate: {
    label: 'Utilization Rate',
    description: 'Percentage of available hours billed',
    format: 'percent',
    defaultTarget: 75,
  },
}

export const CHART_TYPE_INFO: Record<ChartType, { label: string; icon: string }> = {
  bar: { label: 'Bar Chart', icon: 'BarChart3' },
  line: { label: 'Line Chart', icon: 'LineChart' },
  pie: { label: 'Pie Chart', icon: 'PieChart' },
  table: { label: 'Table', icon: 'Table' },
  mixed: { label: 'Mixed', icon: 'LayoutDashboard' },
}

export const REPORT_FREQUENCY_INFO: Record<ReportFrequency, {
  label: string
  description: string
}> = {
  daily: { label: 'Daily', description: 'Every business day' },
  weekly: { label: 'Weekly', description: 'Once per week' },
  monthly: { label: 'Monthly', description: 'First of each month' },
  quarterly: { label: 'Quarterly', description: 'First of each quarter' },
}

// ============================================================
// Helper Functions
// ============================================================

export function getKPIStatus(current: number, target: number, warningThreshold: number | null): KPIStatus {
  if (current >= target) return 'exceeded'
  const threshold = warningThreshold ?? target * 0.8
  if (current >= threshold) return 'on_track'
  if (current >= target * 0.5) return 'warning'
  return 'behind'
}

export function getKPIStatusColor(status: KPIStatus): string {
  switch (status) {
    case 'exceeded': return 'text-green-600'
    case 'on_track': return 'text-blue-600'
    case 'warning': return 'text-yellow-600'
    case 'behind': return 'text-red-600'
  }
}

export function getKPIStatusBg(status: KPIStatus): string {
  switch (status) {
    case 'exceeded': return 'bg-green-50 border-green-200'
    case 'on_track': return 'bg-blue-50 border-blue-200'
    case 'warning': return 'bg-yellow-50 border-yellow-200'
    case 'behind': return 'bg-red-50 border-red-200'
  }
}

export function getTrendIcon(trend: TrendDirection): string {
  switch (trend) {
    case 'up': return 'TrendingUp'
    case 'down': return 'TrendingDown'
    case 'flat': return 'Minus'
  }
}

export function formatMetricValue(value: number, format: 'currency' | 'percent' | 'number' | 'hours' | 'days'): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    case 'percent':
      return `${Math.round(value * 10) / 10}%`
    case 'hours':
      return `${Math.round(value * 10) / 10}h`
    case 'days':
      return `${Math.round(value)}d`
    case 'number':
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
  }
}

export function getDateRangeForPreset(preset: DateRangePreset): { start: string; end: string } {
  const { start, end } = DATE_RANGE_PRESETS[preset].getRange()
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export function getTrendDirection(changePercent: number): TrendDirection {
  if (changePercent > 2) return 'up'
  if (changePercent < -2) return 'down'
  return 'flat'
}
