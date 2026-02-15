// Session 14 Checkpoint 3: Firm Analytics, Performance Reporting & Revenue Management

// ============================================================
// Metric Types
// ============================================================

export type MetricType =
  | 'revenue'
  | 'cases'
  | 'utilization'
  | 'collection'
  | 'client_satisfaction'
  | 'daily_summary'
  | 'weekly_summary'
  | 'monthly_summary'

export type MetricPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type RevenueShareType = 'time_based' | 'percentage' | 'fixed_amount' | 'referral_fee'

export type RevenueAppliesTo = 'all_revenue' | 'specific_invoices' | 'specific_time_entries'

export type TimeRange = 'month' | 'quarter' | 'year'

// ============================================================
// Interfaces
// ============================================================

export interface FirmAnalyticsCache {
  id: string
  firm_id: string
  metric_date: string
  metric_type: MetricType
  metric_period: MetricPeriod
  metric_data: Record<string, unknown>
  created_at: string
}

export interface RevenueShare {
  id: string
  case_id: string
  firm_id: string
  user_id: string
  share_type: RevenueShareType
  share_percentage: number
  fixed_amount: number
  applies_to: RevenueAppliesTo
  invoice_ids: string[]
  total_allocated: number
  notes: string | null
  created_at: string
  updated_at: string

  // Joined
  user?: { id: string; full_name: string; email: string }
}

export interface FirmMetrics {
  total_revenue: number
  revenue_change_percent: number
  revenue_trend: 'up' | 'down' | 'flat'
  active_cases: number
  cases_change_percent: number
  collection_rate: number
  collection_change_percent: number
  client_satisfaction_score: number
  satisfaction_change: number
  revenue_history: RevenueHistoryPoint[]
}

export interface RevenueHistoryPoint {
  month: string
  revenue: number
  collected: number
}

export interface CasePipelineStage {
  name: string
  count: number
  total_value: number
}

export interface CasePipeline {
  stages: CasePipelineStage[]
  total_cases: number
  total_value: number
}

export interface AttorneyPerformance {
  user_id: string
  full_name: string
  email: string
  initials: string
  active_cases: number
  billable_hours: number
  revenue: number
  avg_case_value: number
  utilization_rate: number
  client_satisfaction: number
  settlement_rate: number
}

export interface AttorneyDetails {
  time_breakdown: { activity: string; hours: number }[]
  settlement_percentage: number
  trial_percentage: number
  settled_cases: number
  trial_cases: number
  closed_cases: number
  avg_case_duration_days: number
  client_retention_rate: number
  recent_cases: AttorneyCase[]
}

export interface AttorneyCase {
  id: string
  case_number: string
  client_name: string
  case_stage: string
  total_hours: number
  total_revenue: number
  status: string
}

export interface FinancialSummary {
  billed: number
  collected: number
  outstanding_ar: number
  invoices_sent: number
  payments_received: number
  avg_days_to_payment: number
}

export interface WorkloadAttorney {
  user_id: string
  full_name: string
  initials: string
  active_cases: number
  billable_hours_this_week: number
  billable_hours_this_month: number
  target_hours: number
  capacity_percentage: number
  utilization_rate: number
  cases_in_discovery: number
  cases_in_settlement: number
}

export interface WorkloadData {
  attorneys: WorkloadAttorney[]
  recommendations: WorkloadRecommendation[]
}

export interface WorkloadRecommendation {
  message: string
  action?: string
}

export interface CapacityWarning {
  user_id: string
  user_name: string
  capacity_percentage: number
  active_cases: number
  billable_hours: number
}

export interface ARAgingData {
  current: number
  current_percent: number
  days_31_60: number
  days_31_60_percent: number
  days_61_90: number
  days_61_90_percent: number
  days_90_plus: number
  days_90_plus_percent: number
  total: number
  invoice_count: number
  invoices: ARInvoice[]
}

export interface ARInvoice {
  id: string
  invoice_number: string
  client_name: string
  client_phone?: string
  issue_date: string
  due_date: string
  total_amount: number
  amount_paid: number
  balance_due: number
  days_overdue: number
}

// ============================================================
// Request Types
// ============================================================

export interface CreateRevenueShareRequest {
  user_id: string
  share_type: RevenueShareType
  share_percentage?: number
  fixed_amount?: number
  applies_to?: RevenueAppliesTo
  notes?: string
}

export interface SaveRevenueSharesRequest {
  shares: CreateRevenueShareRequest[]
}

// ============================================================
// Display Constants
// ============================================================

export const REVENUE_SHARE_TYPE_INFO: Record<RevenueShareType, { label: string; description: string }> = {
  time_based: { label: 'Time-Based', description: 'Revenue allocated proportionally to billable hours' },
  percentage: { label: 'Percentage', description: 'Fixed percentage of case revenue' },
  fixed_amount: { label: 'Fixed Amount', description: 'Set dollar amount per case' },
  referral_fee: { label: 'Referral Fee', description: 'One-time referral payment' },
}

export const TIME_RANGE_INFO: Record<TimeRange, { label: string; months: number }> = {
  month: { label: 'This Month', months: 1 },
  quarter: { label: 'This Quarter', months: 3 },
  year: { label: 'This Year', months: 12 },
}

export const CASE_STAGE_LABELS: Record<string, string> = {
  initial_filing: 'Initial Filing',
  discovery: 'Discovery',
  negotiation: 'Negotiation',
  mediation: 'Mediation',
  settlement: 'Settlement',
  trial: 'Trial',
  closed: 'Closed',
  active: 'Active',
}

// ============================================================
// Helper Functions
// ============================================================

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`
}

export function getCapacityColor(percentage: number): string {
  if (percentage > 90) return 'text-red-600'
  if (percentage > 75) return 'text-orange-600'
  return 'text-green-600'
}

export function getCapacityBadgeVariant(percentage: number): 'destructive' | 'warning' | 'success' {
  if (percentage > 90) return 'destructive'
  if (percentage > 75) return 'warning'
  return 'success'
}

export function calculateRevenuePreview(
  shares: CreateRevenueShareRequest[],
  exampleAmount: number
): { userId: string; amount: number }[] {
  return shares.map(share => ({
    userId: share.user_id,
    amount: share.share_type === 'percentage'
      ? exampleAmount * ((share.share_percentage || 0) / 100)
      : share.fixed_amount || 0,
  }))
}
