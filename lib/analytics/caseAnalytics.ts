// Session 19 CP2: Case Analytics Service
// Case lifecycle, outcomes, and workload analysis

import { createClient } from '@supabase/supabase-js'
import { differenceInDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface DateRange {
  start: Date
  end: Date
}

interface CaseFilters {
  dateRange?: DateRange
  caseType?: string
}

// ============================================================
// Case Lifecycle Analysis
// ============================================================

export interface CaseLifecycleReport {
  summary: {
    casesAnalyzed: number
    avgDaysToClose: number
    medianDaysToClose: number
  }
  byCaseType: {
    caseType: string
    count: number
    avgDays: number
  }[]
  byStage: {
    stage: string
    label: string
    count: number
    avgDays: number
  }[]
}

export async function getCaseLifecycleAnalysis(firmId: string, filters?: CaseFilters): Promise<CaseLifecycleReport> {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('cases')
    .select('id, case_number, case_type, case_stage, status, created_at, closed_at')
    .eq('firm_id', firmId)
    .eq('status', 'closed')

  if (filters?.dateRange) {
    query = query
      .gte('closed_at', filters.dateRange.start.toISOString())
      .lte('closed_at', filters.dateRange.end.toISOString())
  }
  if (filters?.caseType) {
    query = query.eq('case_type', filters.caseType)
  }

  const { data: cases } = await query

  if (!cases || cases.length === 0) {
    return {
      summary: { casesAnalyzed: 0, avgDaysToClose: 0, medianDaysToClose: 0 },
      byCaseType: [], byStage: [],
    }
  }

  // Calculate total durations
  const durations: number[] = []
  for (const c of cases) {
    if (c.created_at && c.closed_at) {
      durations.push(differenceInDays(new Date(c.closed_at), new Date(c.created_at)))
    }
  }

  const avgDaysToClose = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  // By case type
  const typeMap: Record<string, { count: number; totalDays: number }> = {}
  for (const c of cases) {
    const type = c.case_type || 'divorce'
    if (!typeMap[type]) typeMap[type] = { count: 0, totalDays: 0 }
    typeMap[type].count++
    if (c.created_at && c.closed_at) {
      typeMap[type].totalDays += differenceInDays(new Date(c.closed_at), new Date(c.created_at))
    }
  }

  const typeLabels: Record<string, string> = {
    divorce: 'Divorce', dissolution: 'Dissolution',
    legal_separation: 'Legal Separation', annulment: 'Annulment',
    custody: 'Custody', support: 'Support Modification', other: 'Other',
  }

  // Get stage distribution from active cases for lifecycle context
  const { data: activeCases } = await supabase
    .from('cases')
    .select('case_stage')
    .eq('firm_id', firmId)
    .eq('status', 'active')

  const stageMap: Record<string, number> = {}
  for (const c of activeCases || []) {
    const stage = c.case_stage || 'active'
    stageMap[stage] = (stageMap[stage] || 0) + 1
  }

  const stageLabels: Record<string, string> = {
    getting_started: 'Getting Started', filed: 'Filed',
    discovery: 'Discovery', negotiation: 'Negotiation',
    final: 'Final', complete: 'Complete', active: 'Active',
    initial_filing: 'Initial Filing', settlement: 'Settlement',
    mediation: 'Mediation', trial: 'Trial',
  }

  // Estimate avg days per stage from closed cases
  // Use proportional estimate based on total case duration
  const stageOrder = ['getting_started', 'filed', 'discovery', 'negotiation', 'final']
  const stageCount = stageOrder.length
  const avgDaysPerStage = avgDaysToClose > 0 ? Math.round(avgDaysToClose / stageCount) : 0

  return {
    summary: {
      casesAnalyzed: cases.length,
      avgDaysToClose,
      medianDaysToClose: calculateMedian(durations),
    },
    byCaseType: Object.entries(typeMap).map(([caseType, d]) => ({
      caseType: typeLabels[caseType] || caseType,
      count: d.count,
      avgDays: d.count > 0 ? Math.round(d.totalDays / d.count) : 0,
    })),
    byStage: Object.entries(stageMap).map(([stage, count]) => ({
      stage,
      label: stageLabels[stage] || stage,
      count,
      avgDays: avgDaysPerStage,
    })),
  }
}

// ============================================================
// Case Outcomes Analysis
// ============================================================

export interface CaseOutcomesReport {
  summary: {
    totalCases: number
    settlementRate: number
    trialRate: number
  }
  outcomes: {
    settled: number
    trial: number
    dismissed: number
    defaultJudgment: number
    other: number
  }
  byCaseType: {
    caseType: string
    settled: number
    trial: number
    dismissed: number
    defaultJudgment: number
    other: number
    total: number
  }[]
}

export async function getCaseOutcomesAnalysis(firmId: string, filters?: CaseFilters): Promise<CaseOutcomesReport> {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('cases')
    .select('id, case_type, status, case_stage, closed_at')
    .eq('firm_id', firmId)
    .eq('status', 'closed')

  if (filters?.dateRange) {
    query = query
      .gte('closed_at', filters.dateRange.start.toISOString())
      .lte('closed_at', filters.dateRange.end.toISOString())
  }
  if (filters?.caseType) {
    query = query.eq('case_type', filters.caseType)
  }

  const { data: closedCases } = await query

  if (!closedCases || closedCases.length === 0) {
    return {
      summary: { totalCases: 0, settlementRate: 0, trialRate: 0 },
      outcomes: { settled: 0, trial: 0, dismissed: 0, defaultJudgment: 0, other: 0 },
      byCaseType: [],
    }
  }

  // Get settlement proposals for these cases to determine outcomes
  const caseIds = closedCases.map((c: { id: string }) => c.id)
  const { data: settlements } = await supabase
    .from('settlement_proposals')
    .select('case_id, status')
    .in('case_id', caseIds)
    .eq('status', 'accepted')

  const settledCaseIds = new Set((settlements || []).map(s => s.case_id))

  // Get hearings to check for trials
  const { data: hearings } = await supabase
    .from('court_hearings')
    .select('case_id, hearing_type')
    .in('case_id', caseIds)
    .eq('hearing_type', 'trial')

  const trialCaseIds = new Set((hearings || []).map(h => h.case_id))

  const outcomes = { settled: 0, trial: 0, dismissed: 0, defaultJudgment: 0, other: 0 }
  const byCaseTypeMap: Record<string, { settled: number; trial: number; dismissed: number; defaultJudgment: number; other: number }> = {}

  for (const c of closedCases) {
    const type = c.case_type || 'divorce'
    if (!byCaseTypeMap[type]) {
      byCaseTypeMap[type] = { settled: 0, trial: 0, dismissed: 0, defaultJudgment: 0, other: 0 }
    }

    if (settledCaseIds.has(c.id)) {
      outcomes.settled++
      byCaseTypeMap[type].settled++
    } else if (trialCaseIds.has(c.id)) {
      outcomes.trial++
      byCaseTypeMap[type].trial++
    } else if (c.case_stage === 'complete') {
      // Default judgment or other completion
      outcomes.defaultJudgment++
      byCaseTypeMap[type].defaultJudgment++
    } else {
      outcomes.other++
      byCaseTypeMap[type].other++
    }
  }

  const total = closedCases.length
  const typeLabels: Record<string, string> = {
    divorce: 'Divorce', dissolution: 'Dissolution',
    legal_separation: 'Legal Separation', annulment: 'Annulment',
    custody: 'Custody', support: 'Support', other: 'Other',
  }

  return {
    summary: {
      totalCases: total,
      settlementRate: total > 0 ? round1((outcomes.settled / total) * 100) : 0,
      trialRate: total > 0 ? round1((outcomes.trial / total) * 100) : 0,
    },
    outcomes,
    byCaseType: Object.entries(byCaseTypeMap).map(([caseType, data]) => ({
      caseType: typeLabels[caseType] || caseType,
      ...data,
      total: data.settled + data.trial + data.dismissed + data.defaultJudgment + data.other,
    })),
  }
}

// ============================================================
// Workload Analysis
// ============================================================

export interface WorkloadReport {
  summary: {
    totalActiveCases: number
    unassignedCases: number
    avgCasesPerAttorney: number
  }
  byAttorney: {
    userId: string
    name: string
    role: string
    caseCount: number
    avgComplexity: number
    casesByStage: Record<string, number>
  }[]
  byPhase: { phase: string; label: string; count: number }[]
  byType: { type: string; label: string; count: number }[]
  unassignedCases: {
    id: string
    caseNumber: string
    clientName: string
    caseStage: string
    createdAt: string
  }[]
}

export async function getWorkloadAnalysis(firmId: string): Promise<WorkloadReport> {
  const supabase = getServiceClient()

  // Active cases
  const { data: cases } = await supabase
    .from('cases')
    .select('id, case_number, client_name, case_type, case_stage, attorney_id, created_at')
    .eq('firm_id', firmId)
    .eq('status', 'active')

  // Firm members
  const { data: members } = await supabase
    .from('firm_members')
    .select('user_id, role')
    .eq('firm_id', firmId)
    .eq('status', 'active')
    .in('role', ['owner', 'senior_attorney', 'attorney'])

  const memberIds = (members || []).map(m => m.user_id)
  const roleMap: Record<string, string> = {}
  for (const m of members || []) roleMap[m.user_id] = m.role

  // Get profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', memberIds.length > 0 ? memberIds : ['__none__'])

  const nameMap: Record<string, string> = {}
  for (const p of profiles || []) nameMap[p.id] = p.full_name || 'Unknown'

  // Build workload per attorney
  const workloadMap: Record<string, {
    caseCount: number
    casesByStage: Record<string, number>
  }> = {}

  for (const uid of memberIds) {
    workloadMap[uid] = { caseCount: 0, casesByStage: {} }
  }

  const unassigned: WorkloadReport['unassignedCases'] = []

  for (const c of cases || []) {
    if (!c.attorney_id || !workloadMap[c.attorney_id]) {
      unassigned.push({
        id: c.id,
        caseNumber: c.case_number || '',
        clientName: c.client_name || 'Unknown',
        caseStage: c.case_stage || 'active',
        createdAt: c.created_at,
      })
      continue
    }

    workloadMap[c.attorney_id].caseCount++
    const stage = c.case_stage || 'active'
    workloadMap[c.attorney_id].casesByStage[stage] =
      (workloadMap[c.attorney_id].casesByStage[stage] || 0) + 1
  }

  const byAttorney = memberIds.map(uid => ({
    userId: uid,
    name: nameMap[uid] || 'Unknown',
    role: roleMap[uid] || 'attorney',
    caseCount: workloadMap[uid]?.caseCount || 0,
    avgComplexity: 3,
    casesByStage: workloadMap[uid]?.casesByStage || {},
  })).sort((a, b) => b.caseCount - a.caseCount)

  // Cases by phase
  const phaseMap: Record<string, number> = {}
  const typeMap: Record<string, number> = {}
  for (const c of cases || []) {
    const phase = c.case_stage || 'active'
    phaseMap[phase] = (phaseMap[phase] || 0) + 1
    const type = c.case_type || 'divorce'
    typeMap[type] = (typeMap[type] || 0) + 1
  }

  const stageLabels: Record<string, string> = {
    getting_started: 'Getting Started', filed: 'Filed',
    discovery: 'Discovery', negotiation: 'Negotiation',
    final: 'Final', complete: 'Complete', active: 'Active',
    initial_filing: 'Initial Filing', settlement: 'Settlement',
    mediation: 'Mediation', trial: 'Trial',
  }

  const typeLabels: Record<string, string> = {
    divorce: 'Divorce', dissolution: 'Dissolution',
    legal_separation: 'Legal Separation', annulment: 'Annulment',
    custody: 'Custody', support: 'Support', other: 'Other',
  }

  const attorneyCount = byAttorney.filter(a => a.caseCount > 0).length || 1
  const totalActive = cases?.length || 0

  return {
    summary: {
      totalActiveCases: totalActive,
      unassignedCases: unassigned.length,
      avgCasesPerAttorney: round1(totalActive / attorneyCount),
    },
    byAttorney,
    byPhase: Object.entries(phaseMap).map(([phase, count]) => ({
      phase, label: stageLabels[phase] || phase, count,
    })),
    byType: Object.entries(typeMap).map(([type, count]) => ({
      type, label: typeLabels[type] || type, count,
    })),
    unassignedCases: unassigned,
  }
}

// ============================================================
// Helpers
// ============================================================

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
