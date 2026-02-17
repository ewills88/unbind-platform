// Session 19 CP2: Financial Analytics Service
// Revenue, AR aging, collections, profitability, and trust account reports

import { createClient } from '@supabase/supabase-js'
import { differenceInDays, startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

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

interface FinancialFilters {
  dateRange?: DateRange
  attorneyId?: string
  caseId?: string
}

// ============================================================
// Revenue Report
// ============================================================

export interface RevenueReport {
  summary: {
    totalBilled: number
    totalCollected: number
    totalOutstanding: number
    realizationRate: number
    invoiceCount: number
  }
  byMonth: { month: string; billed: number; collected: number }[]
  byAttorney: { attorneyId: string; name: string; billed: number; collected: number; count: number }[]
  byCaseType: { caseType: string; billed: number; collected: number; count: number }[]
  byClient: { name: string; billed: number; collected: number }[]
}

export async function getRevenueReport(firmId: string, filters: FinancialFilters = {}): Promise<RevenueReport> {
  const supabase = getServiceClient()
  const { start, end } = filters.dateRange || getDefaultDateRange()

  // Get firm cases
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let caseQuery = (supabase as any)
    .from('cases')
    .select('id, attorney_id, case_type, client_name')
    .eq('firm_id', firmId)

  if (filters.attorneyId) {
    caseQuery = caseQuery.eq('attorney_id', filters.attorneyId)
  }
  if (filters.caseId) {
    caseQuery = caseQuery.eq('id', filters.caseId)
  }

  const { data: cases } = await caseQuery
  const caseIds = (cases || []).map((c: { id: string }) => c.id)

  if (caseIds.length === 0) {
    return {
      summary: { totalBilled: 0, totalCollected: 0, totalOutstanding: 0, realizationRate: 0, invoiceCount: 0 },
      byMonth: [], byAttorney: [], byCaseType: [], byClient: [],
    }
  }

  const caseMap: Record<string, { attorney_id: string; case_type: string; client_name: string }> = {}
  for (const c of cases || []) {
    caseMap[c.id] = { attorney_id: c.attorney_id, case_type: c.case_type, client_name: c.client_name }
  }

  // Get invoices in date range
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, total_amount, amount_paid, balance_due, status, case_id, issue_date')
    .in('case_id', caseIds)
    .gte('issue_date', start.toISOString().split('T')[0])
    .lte('issue_date', end.toISOString().split('T')[0])

  const totalBilled = (invoices || []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
  const totalCollected = (invoices || []).reduce((s, i) => s + (Number(i.amount_paid) || 0), 0)
  const totalOutstanding = totalBilled - totalCollected
  const realizationRate = totalBilled > 0 ? round1((totalCollected / totalBilled) * 100) : 0

  // By month
  const monthMap: Record<string, { billed: number; collected: number }> = {}
  for (const inv of invoices || []) {
    const month = format(new Date(inv.issue_date), 'yyyy-MM')
    if (!monthMap[month]) monthMap[month] = { billed: 0, collected: 0 }
    monthMap[month].billed += Number(inv.total_amount) || 0
    monthMap[month].collected += Number(inv.amount_paid) || 0
  }
  const byMonth = Object.entries(monthMap)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // By attorney
  const attMap: Record<string, { name: string; billed: number; collected: number; count: number }> = {}
  for (const inv of invoices || []) {
    const c = caseMap[inv.case_id]
    const attId = c?.attorney_id || 'unassigned'
    if (!attMap[attId]) attMap[attId] = { name: '', billed: 0, collected: 0, count: 0 }
    attMap[attId].billed += Number(inv.total_amount) || 0
    attMap[attId].collected += Number(inv.amount_paid) || 0
    attMap[attId].count++
  }

  // Fetch attorney names
  const attIds = Object.keys(attMap).filter(id => id !== 'unassigned')
  if (attIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', attIds)
    for (const p of profiles || []) {
      if (attMap[p.id]) attMap[p.id].name = p.full_name || 'Unknown'
    }
  }
  if (attMap['unassigned']) attMap['unassigned'].name = 'Unassigned'

  const byAttorney = Object.entries(attMap)
    .map(([attorneyId, data]) => ({ attorneyId, ...data }))
    .sort((a, b) => b.billed - a.billed)

  // By case type
  const typeMap: Record<string, { billed: number; collected: number; count: number }> = {}
  for (const inv of invoices || []) {
    const c = caseMap[inv.case_id]
    const caseType = c?.case_type || 'unknown'
    if (!typeMap[caseType]) typeMap[caseType] = { billed: 0, collected: 0, count: 0 }
    typeMap[caseType].billed += Number(inv.total_amount) || 0
    typeMap[caseType].collected += Number(inv.amount_paid) || 0
    typeMap[caseType].count++
  }
  const byCaseType = Object.entries(typeMap)
    .map(([caseType, data]) => ({ caseType, ...data }))
    .sort((a, b) => b.billed - a.billed)

  // By client
  const clientMap: Record<string, { billed: number; collected: number }> = {}
  for (const inv of invoices || []) {
    const c = caseMap[inv.case_id]
    const name = c?.client_name || 'Unknown'
    if (!clientMap[name]) clientMap[name] = { billed: 0, collected: 0 }
    clientMap[name].billed += Number(inv.total_amount) || 0
    clientMap[name].collected += Number(inv.amount_paid) || 0
  }
  const byClient = Object.entries(clientMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.billed - a.billed)
    .slice(0, 20)

  return {
    summary: {
      totalBilled: round2(totalBilled),
      totalCollected: round2(totalCollected),
      totalOutstanding: round2(totalOutstanding),
      realizationRate,
      invoiceCount: invoices?.length || 0,
    },
    byMonth, byAttorney, byCaseType, byClient,
  }
}

// ============================================================
// AR Aging Report
// ============================================================

export interface ARAgingBucket {
  total: number
  count: number
  invoices: {
    id: string
    invoice_number: string
    client_name: string
    issue_date: string
    due_date: string
    total_amount: number
    amount_paid: number
    balance: number
    daysOverdue: number
  }[]
}

export interface ARAgingReport {
  summary: {
    totalOutstanding: number
    invoiceCount: number
    averageDaysOutstanding: number
  }
  buckets: {
    current: ARAgingBucket
    days_1_30: ARAgingBucket
    days_31_60: ARAgingBucket
    days_61_90: ARAgingBucket
    days_90_plus: ARAgingBucket
  }
  byClient: {
    name: string
    caseNumber: string | null
    current: number
    days_1_30: number
    days_31_60: number
    days_61_90: number
    days_90_plus: number
    total: number
  }[]
}

export async function getARAgingReport(firmId: string): Promise<ARAgingReport> {
  const supabase = getServiceClient()

  const { data: cases } = await supabase
    .from('cases')
    .select('id, client_name, case_number')
    .eq('firm_id', firmId)

  const caseIds = (cases || []).map(c => c.id)
  const caseNameMap: Record<string, { client_name: string; case_number: string }> = {}
  for (const c of cases || []) {
    caseNameMap[c.id] = { client_name: c.client_name || 'Unknown', case_number: c.case_number || '' }
  }

  if (caseIds.length === 0) {
    return {
      summary: { totalOutstanding: 0, invoiceCount: 0, averageDaysOutstanding: 0 },
      buckets: {
        current: emptyBucket(), days_1_30: emptyBucket(),
        days_31_60: emptyBucket(), days_61_90: emptyBucket(), days_90_plus: emptyBucket(),
      },
      byClient: [],
    }
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, issue_date, due_date, total_amount, amount_paid, balance_due, status, case_id')
    .in('case_id', caseIds)
    .gt('balance_due', 0)
    .not('status', 'eq', 'void')
    .not('status', 'eq', 'draft')

  const now = new Date()
  const buckets = {
    current: emptyBucket(),
    days_1_30: emptyBucket(),
    days_31_60: emptyBucket(),
    days_61_90: emptyBucket(),
    days_90_plus: emptyBucket(),
  }

  const clientBuckets: Record<string, {
    name: string; caseNumber: string | null
    current: number; days_1_30: number; days_31_60: number; days_61_90: number; days_90_plus: number; total: number
  }> = {}

  let totalDaysOutstanding = 0

  for (const inv of invoices || []) {
    const balance = Number(inv.balance_due) || 0
    const dueDate = new Date(inv.due_date || inv.issue_date)
    const daysOverdue = Math.max(0, differenceInDays(now, dueDate))
    const cInfo = caseNameMap[inv.case_id] || { client_name: 'Unknown', case_number: null }

    totalDaysOutstanding += differenceInDays(now, new Date(inv.issue_date))

    const invData = {
      id: inv.id,
      invoice_number: inv.invoice_number,
      client_name: cInfo.client_name,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      total_amount: Number(inv.total_amount),
      amount_paid: Number(inv.amount_paid) || 0,
      balance,
      daysOverdue,
    }

    // Initialize client bucket
    if (!clientBuckets[cInfo.client_name]) {
      clientBuckets[cInfo.client_name] = {
        name: cInfo.client_name, caseNumber: cInfo.case_number,
        current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total: 0,
      }
    }
    clientBuckets[cInfo.client_name].total += balance

    if (daysOverdue <= 0) {
      buckets.current.total += balance
      buckets.current.count++
      buckets.current.invoices.push(invData)
      clientBuckets[cInfo.client_name].current += balance
    } else if (daysOverdue <= 30) {
      buckets.days_1_30.total += balance
      buckets.days_1_30.count++
      buckets.days_1_30.invoices.push(invData)
      clientBuckets[cInfo.client_name].days_1_30 += balance
    } else if (daysOverdue <= 60) {
      buckets.days_31_60.total += balance
      buckets.days_31_60.count++
      buckets.days_31_60.invoices.push(invData)
      clientBuckets[cInfo.client_name].days_31_60 += balance
    } else if (daysOverdue <= 90) {
      buckets.days_61_90.total += balance
      buckets.days_61_90.count++
      buckets.days_61_90.invoices.push(invData)
      clientBuckets[cInfo.client_name].days_61_90 += balance
    } else {
      buckets.days_90_plus.total += balance
      buckets.days_90_plus.count++
      buckets.days_90_plus.invoices.push(invData)
      clientBuckets[cInfo.client_name].days_90_plus += balance
    }
  }

  const totalOutstanding = Object.values(buckets).reduce((s, b) => s + b.total, 0)
  const invoiceCount = invoices?.length || 0
  const averageDaysOutstanding = invoiceCount > 0 ? Math.round(totalDaysOutstanding / invoiceCount) : 0

  return {
    summary: { totalOutstanding: round2(totalOutstanding), invoiceCount, averageDaysOutstanding },
    buckets,
    byClient: Object.values(clientBuckets).sort((a, b) => b.total - a.total),
  }
}

// ============================================================
// Collections Report
// ============================================================

export interface CollectionsReport {
  summary: {
    totalCollected: number
    paymentCount: number
    averagePayment: number
  }
  byMonth: { month: string; amount: number }[]
  byMethod: { method: string; amount: number; count: number }[]
  byClient: { name: string; amount: number }[]
}

export async function getCollectionsReport(firmId: string, filters: FinancialFilters = {}): Promise<CollectionsReport> {
  const supabase = getServiceClient()
  const { start, end } = filters.dateRange || getDefaultDateRange()

  // Get firm case IDs
  const { data: cases } = await supabase
    .from('cases')
    .select('id, client_name')
    .eq('firm_id', firmId)

  const caseIds = (cases || []).map(c => c.id)
  if (caseIds.length === 0) {
    return { summary: { totalCollected: 0, paymentCount: 0, averagePayment: 0 }, byMonth: [], byMethod: [], byClient: [] }
  }

  const caseNameMap: Record<string, string> = {}
  for (const c of cases || []) {
    caseNameMap[c.id] = c.client_name || 'Unknown'
  }

  // Get invoice IDs for firm cases
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, case_id')
    .in('case_id', caseIds)

  const invoiceIds = (invoices || []).map(i => i.id)
  const invoiceCaseMap: Record<string, string> = {}
  for (const inv of invoices || []) {
    invoiceCaseMap[inv.id] = inv.case_id
  }

  if (invoiceIds.length === 0) {
    return { summary: { totalCollected: 0, paymentCount: 0, averagePayment: 0 }, byMonth: [], byMethod: [], byClient: [] }
  }

  // Get payments
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, payment_date, payment_method, invoice_id, status')
    .in('invoice_id', invoiceIds)
    .eq('status', 'succeeded')
    .gte('payment_date', start.toISOString())
    .lte('payment_date', end.toISOString())

  const totalCollected = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const paymentCount = payments?.length || 0

  // By month
  const monthMap: Record<string, number> = {}
  for (const p of payments || []) {
    const month = format(new Date(p.payment_date), 'yyyy-MM')
    monthMap[month] = (monthMap[month] || 0) + (Number(p.amount) || 0)
  }

  // By method
  const methodMap: Record<string, { amount: number; count: number }> = {}
  for (const p of payments || []) {
    const method = p.payment_method || 'other'
    if (!methodMap[method]) methodMap[method] = { amount: 0, count: 0 }
    methodMap[method].amount += Number(p.amount) || 0
    methodMap[method].count++
  }

  // By client
  const clientPayMap: Record<string, number> = {}
  for (const p of payments || []) {
    const caseId = invoiceCaseMap[p.invoice_id]
    const clientName = caseId ? caseNameMap[caseId] || 'Unknown' : 'Unknown'
    clientPayMap[clientName] = (clientPayMap[clientName] || 0) + (Number(p.amount) || 0)
  }

  return {
    summary: {
      totalCollected: round2(totalCollected),
      paymentCount,
      averagePayment: paymentCount > 0 ? round2(totalCollected / paymentCount) : 0,
    },
    byMonth: Object.entries(monthMap)
      .map(([month, amount]) => ({ month, amount: round2(amount) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    byMethod: Object.entries(methodMap)
      .map(([method, data]) => ({ method, amount: round2(data.amount), count: data.count }))
      .sort((a, b) => b.amount - a.amount),
    byClient: Object.entries(clientPayMap)
      .map(([name, amount]) => ({ name, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20),
  }
}

// ============================================================
// Profitability Report
// ============================================================

export interface ProfitabilityReport {
  summary: {
    casesAnalyzed: number
    totalBilled: number
    totalCollected: number
    totalHours: number
    avgRevenuePerCase: number
    avgDaysToClose: number
    overallRealizationRate: number
  }
  byCaseType: {
    caseType: string
    count: number
    totalBilled: number
    totalCollected: number
    totalHours: number
    avgRevenue: number
  }[]
  cases: {
    caseId: string
    caseNumber: string
    clientName: string
    caseType: string
    totalBilled: number
    totalCollected: number
    totalHours: number
    billableHours: number
    effectiveRate: number
    daysOpen: number
    realizationRate: number
  }[]
}

export async function getProfitabilityReport(firmId: string, filters: FinancialFilters = {}): Promise<ProfitabilityReport> {
  const supabase = getServiceClient()
  const { start, end } = filters.dateRange || getDefaultDateRange()

  // Get closed cases in date range
  const { data: closedCases } = await supabase
    .from('cases')
    .select('id, case_number, client_name, case_type, created_at, closed_at')
    .eq('firm_id', firmId)
    .eq('status', 'closed')
    .gte('closed_at', start.toISOString())
    .lte('closed_at', end.toISOString())

  if (!closedCases || closedCases.length === 0) {
    return {
      summary: { casesAnalyzed: 0, totalBilled: 0, totalCollected: 0, totalHours: 0, avgRevenuePerCase: 0, avgDaysToClose: 0, overallRealizationRate: 0 },
      byCaseType: [], cases: [],
    }
  }

  const caseIds = closedCases.map(c => c.id)

  // Batch fetch invoices and time entries
  const [{ data: invoices }, { data: timeEntries }] = await Promise.all([
    supabase.from('invoices').select('total_amount, amount_paid, case_id').in('case_id', caseIds),
    supabase.from('time_entries').select('duration_minutes, billable, case_id').in('case_id', caseIds),
  ])

  // Group by case
  const invoicesByCase: Record<string, { billed: number; collected: number }> = {}
  for (const inv of invoices || []) {
    if (!invoicesByCase[inv.case_id]) invoicesByCase[inv.case_id] = { billed: 0, collected: 0 }
    invoicesByCase[inv.case_id].billed += Number(inv.total_amount) || 0
    invoicesByCase[inv.case_id].collected += Number(inv.amount_paid) || 0
  }

  const timeByCase: Record<string, { total: number; billable: number }> = {}
  for (const te of timeEntries || []) {
    if (!timeByCase[te.case_id]) timeByCase[te.case_id] = { total: 0, billable: 0 }
    timeByCase[te.case_id].total += (te.duration_minutes || 0) / 60
    if (te.billable) timeByCase[te.case_id].billable += (te.duration_minutes || 0) / 60
  }

  const caseMetrics = closedCases.map(c => {
    const inv = invoicesByCase[c.id] || { billed: 0, collected: 0 }
    const time = timeByCase[c.id] || { total: 0, billable: 0 }
    const daysOpen = c.closed_at ? differenceInDays(new Date(c.closed_at), new Date(c.created_at)) : 0
    const effectiveRate = time.billable > 0 ? inv.billed / time.billable : 0

    return {
      caseId: c.id,
      caseNumber: c.case_number || '',
      clientName: c.client_name || 'Unknown',
      caseType: c.case_type || 'divorce',
      totalBilled: round2(inv.billed),
      totalCollected: round2(inv.collected),
      totalHours: round1(time.total),
      billableHours: round1(time.billable),
      effectiveRate: Math.round(effectiveRate),
      daysOpen,
      realizationRate: inv.billed > 0 ? round1((inv.collected / inv.billed) * 100) : 0,
    }
  })

  const totalBilled = caseMetrics.reduce((s, c) => s + c.totalBilled, 0)
  const totalCollected = caseMetrics.reduce((s, c) => s + c.totalCollected, 0)
  const totalHours = caseMetrics.reduce((s, c) => s + c.totalHours, 0)
  const avgDays = caseMetrics.length > 0 ? caseMetrics.reduce((s, c) => s + c.daysOpen, 0) / caseMetrics.length : 0

  // By case type
  const typeMap: Record<string, { count: number; billed: number; collected: number; hours: number }> = {}
  for (const c of caseMetrics) {
    if (!typeMap[c.caseType]) typeMap[c.caseType] = { count: 0, billed: 0, collected: 0, hours: 0 }
    typeMap[c.caseType].count++
    typeMap[c.caseType].billed += c.totalBilled
    typeMap[c.caseType].collected += c.totalCollected
    typeMap[c.caseType].hours += c.totalHours
  }

  return {
    summary: {
      casesAnalyzed: caseMetrics.length,
      totalBilled: round2(totalBilled),
      totalCollected: round2(totalCollected),
      totalHours: round1(totalHours),
      avgRevenuePerCase: caseMetrics.length > 0 ? Math.round(totalBilled / caseMetrics.length) : 0,
      avgDaysToClose: Math.round(avgDays),
      overallRealizationRate: totalBilled > 0 ? round1((totalCollected / totalBilled) * 100) : 0,
    },
    byCaseType: Object.entries(typeMap)
      .map(([caseType, d]) => ({
        caseType, count: d.count,
        totalBilled: round2(d.billed), totalCollected: round2(d.collected),
        totalHours: round1(d.hours),
        avgRevenue: d.count > 0 ? Math.round(d.billed / d.count) : 0,
      }))
      .sort((a, b) => b.totalBilled - a.totalBilled),
    cases: caseMetrics.sort((a, b) => b.totalBilled - a.totalBilled),
  }
}

// ============================================================
// Trust Account Report
// ============================================================

export interface TrustAccountReport {
  summary: {
    totalTrustBalance: number
    accountCount: number
    lowBalanceCount: number
  }
  accounts: {
    caseId: string
    clientName: string
    caseNumber: string
    balance: number
    totalDeposits: number
    totalWithdrawals: number
    isLowBalance: boolean
  }[]
  recentTransactions: {
    id: string
    clientName: string
    transactionType: string
    amount: number
    balanceAfter: number
    description: string
    transactionDate: string
  }[]
}

export async function getTrustAccountReport(firmId: string): Promise<TrustAccountReport> {
  const supabase = getServiceClient()
  const MINIMUM_BALANCE = 500

  const { data: cases } = await supabase
    .from('cases')
    .select('id, client_name, case_number')
    .eq('firm_id', firmId)

  const caseIds = (cases || []).map(c => c.id)
  const caseInfoMap: Record<string, { client_name: string; case_number: string }> = {}
  for (const c of cases || []) {
    caseInfoMap[c.id] = { client_name: c.client_name || 'Unknown', case_number: c.case_number || '' }
  }

  if (caseIds.length === 0) {
    return { summary: { totalTrustBalance: 0, accountCount: 0, lowBalanceCount: 0 }, accounts: [], recentTransactions: [] }
  }

  // Get trust accounts
  const { data: accounts } = await supabase
    .from('trust_accounts')
    .select('id, case_id, current_balance, total_deposits, total_withdrawals')
    .in('case_id', caseIds)
    .gt('current_balance', 0)

  const totalBalance = (accounts || []).reduce((s, a) => s + (Number(a.current_balance) || 0), 0)
  const lowBalanceAccounts = (accounts || []).filter(a => Number(a.current_balance) < MINIMUM_BALANCE)

  const accountIds = (accounts || []).map(a => a.id)

  // Get recent transactions
  let recentTransactions: TrustAccountReport['recentTransactions'] = []
  if (accountIds.length > 0) {
    const { data: transactions } = await supabase
      .from('trust_transactions')
      .select('id, trust_account_id, transaction_type, amount, balance_after, description, transaction_date, case_id')
      .in('case_id', caseIds)
      .order('transaction_date', { ascending: false })
      .limit(30)

    recentTransactions = (transactions || []).map(t => ({
      id: t.id,
      clientName: caseInfoMap[t.case_id]?.client_name || 'Unknown',
      transactionType: t.transaction_type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balance_after),
      description: t.description,
      transactionDate: t.transaction_date,
    }))
  }

  return {
    summary: {
      totalTrustBalance: round2(totalBalance),
      accountCount: accounts?.length || 0,
      lowBalanceCount: lowBalanceAccounts.length,
    },
    accounts: (accounts || []).map(a => {
      const cInfo = caseInfoMap[a.case_id] || { client_name: 'Unknown', case_number: '' }
      return {
        caseId: a.case_id,
        clientName: cInfo.client_name,
        caseNumber: cInfo.case_number,
        balance: Number(a.current_balance),
        totalDeposits: Number(a.total_deposits),
        totalWithdrawals: Number(a.total_withdrawals),
        isLowBalance: Number(a.current_balance) < MINIMUM_BALANCE,
      }
    }).sort((a, b) => b.balance - a.balance),
    recentTransactions,
  }
}

// ============================================================
// Helpers
// ============================================================

function emptyBucket(): ARAgingBucket {
  return { total: 0, count: 0, invoices: [] }
}

function getDefaultDateRange(): DateRange {
  return { start: startOfMonth(subMonths(new Date(), 11)), end: endOfMonth(new Date()) }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
