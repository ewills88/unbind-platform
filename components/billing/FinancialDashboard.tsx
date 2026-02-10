'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  Landmark,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { formatCurrency } from '@/types/billing'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface FinancialStats {
  revenue_this_month: number
  revenue_last_month: number
  revenue_growth_percentage: number
  accounts_receivable: number
  overdue_count: number
  unbilled_time_value: number
  unbilled_hours: number
  total_trust_balance: number
  trust_account_count: number
}

interface AgingBucket {
  count: number
  amount: number
}

interface AgingReport {
  current: AgingBucket
  days_31_60: AgingBucket
  days_61_90: AgingBucket
  over_90: AgingBucket
}

interface MonthlyRevenue {
  month: string
  amount: number
}

export default function FinancialDashboard() {
  const [stats, setStats] = useState<FinancialStats | null>(null)
  const [aging, setAging] = useState<AgingReport | null>(null)
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFinancialData()
  }, [])

  const loadFinancialData = async () => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

      // Fetch all data in parallel
      const [
        paymentsThisMonth,
        paymentsLastMonth,
        outstandingInvoices,
        unbilledTime,
        trustAccounts,
      ] = await Promise.all([
        // Revenue this month
        supabase
          .from('payments')
          .select('amount')
          .eq('status', 'succeeded')
          .gte('payment_date', startOfMonth),

        // Revenue last month
        supabase
          .from('payments')
          .select('amount')
          .eq('status', 'succeeded')
          .gte('payment_date', startOfLastMonth)
          .lt('payment_date', endOfLastMonth),

        // Outstanding invoices (sent, viewed, partially_paid, overdue)
        supabase
          .from('invoices')
          .select('balance_due, due_date, status')
          .in('status', ['sent', 'viewed', 'partially_paid', 'overdue']),

        // Unbilled time entries
        supabase
          .from('time_entries')
          .select('duration_minutes, amount')
          .eq('billable', true)
          .is('billed_at', null),

        // Trust accounts
        supabase
          .from('trust_accounts')
          .select('current_balance'),
      ])

      // Calculate stats
      const revenueThisMonth = (paymentsThisMonth.data || []).reduce((sum, p) => sum + parseFloat(String(p.amount)), 0)
      const revenueLastMonth = (paymentsLastMonth.data || []).reduce((sum, p) => sum + parseFloat(String(p.amount)), 0)
      const growthPct = revenueLastMonth > 0
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
        : 0

      const invoices = outstandingInvoices.data || []
      const ar = invoices.reduce((sum, inv) => sum + parseFloat(String(inv.balance_due)), 0)
      const overdueCount = invoices.filter(
        (inv) => new Date(inv.due_date) < now && inv.status !== 'paid'
      ).length

      const timeEntries = unbilledTime.data || []
      const unbilledValue = timeEntries.reduce((sum, te) => sum + parseFloat(String(te.amount)), 0)
      const unbilledMins = timeEntries.reduce((sum, te) => sum + te.duration_minutes, 0)

      const trusts = trustAccounts.data || []
      const trustTotal = trusts.reduce((sum, t) => sum + parseFloat(String(t.current_balance)), 0)

      setStats({
        revenue_this_month: revenueThisMonth,
        revenue_last_month: revenueLastMonth,
        revenue_growth_percentage: growthPct,
        accounts_receivable: ar,
        overdue_count: overdueCount,
        unbilled_time_value: unbilledValue,
        unbilled_hours: Math.round((unbilledMins / 60) * 10) / 10,
        total_trust_balance: trustTotal,
        trust_account_count: trusts.length,
      })

      // Calculate aging buckets
      const agingReport: AgingReport = {
        current: { count: 0, amount: 0 },
        days_31_60: { count: 0, amount: 0 },
        days_61_90: { count: 0, amount: 0 },
        over_90: { count: 0, amount: 0 },
      }

      invoices.forEach((inv) => {
        const daysOld = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
        const amount = parseFloat(String(inv.balance_due))
        if (daysOld <= 30) {
          agingReport.current.count++
          agingReport.current.amount += amount
        } else if (daysOld <= 60) {
          agingReport.days_31_60.count++
          agingReport.days_31_60.amount += amount
        } else if (daysOld <= 90) {
          agingReport.days_61_90.count++
          agingReport.days_61_90.amount += amount
        } else {
          agingReport.over_90.count++
          agingReport.over_90.amount += amount
        }
      })
      setAging(agingReport)

      // Monthly revenue for last 6 months
      const months: MonthlyRevenue[] = []
      for (let i = 5; i >= 0; i--) {
        const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const { data: mPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'succeeded')
          .gte('payment_date', mStart.toISOString())
          .lte('payment_date', mEnd.toISOString())

        months.push({
          month: mStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          amount: (mPayments || []).reduce((s, p) => s + parseFloat(String(p.amount)), 0),
        })
      }
      setMonthlyRevenue(months)
    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load financial data</p>
      </div>
    )
  }

  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.amount), 1)

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Revenue This Month</p>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenue_this_month)}</p>
          <div className="flex items-center gap-1 mt-1">
            {stats.revenue_growth_percentage >= 0 ? (
              <ArrowUpRight className="w-3 h-3 text-green-500" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-red-500" />
            )}
            <p className={`text-xs ${stats.revenue_growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.revenue_growth_percentage >= 0 ? '+' : ''}{stats.revenue_growth_percentage}% vs last month
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Outstanding A/R</p>
            <FileText className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.accounts_receivable)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.overdue_count} invoice{stats.overdue_count !== 1 ? 's' : ''} overdue
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Unbilled Time</p>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.unbilled_time_value)}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.unbilled_hours} hours</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Trust Balance</p>
            <Landmark className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_trust_balance)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Across {stats.trust_account_count} account{stats.trust_account_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Revenue Trend + AR Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend (bar chart) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          </div>
          <div className="flex items-end gap-3 h-48">
            {monthlyRevenue.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-xs font-medium text-gray-700">
                  {m.amount > 0 ? formatCurrency(m.amount) : '$0'}
                </p>
                <div
                  className="w-full bg-blue-500 rounded-t transition-all"
                  style={{
                    height: `${Math.max((m.amount / maxRevenue) * 160, 4)}px`,
                  }}
                />
                <p className="text-xs text-gray-500">{m.month}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Accounts Receivable Aging */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Accounts Receivable Aging</h3>
          </div>
          {aging && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-medium text-gray-500">Age</th>
                    <th className="text-right py-3 font-medium text-gray-500">Invoices</th>
                    <th className="text-right py-3 font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">Current (0-30 days)</td>
                    <td className="py-3 text-right text-gray-700">{aging.current.count}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(aging.current.amount)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-yellow-700">31-60 days</td>
                    <td className="py-3 text-right text-yellow-700">{aging.days_31_60.count}</td>
                    <td className="py-3 text-right font-medium text-yellow-700">{formatCurrency(aging.days_31_60.amount)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-orange-700">61-90 days</td>
                    <td className="py-3 text-right text-orange-700">{aging.days_61_90.count}</td>
                    <td className="py-3 text-right font-medium text-orange-700">{formatCurrency(aging.days_61_90.amount)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-red-700 font-medium">Over 90 days</td>
                    <td className="py-3 text-right text-red-700">{aging.over_90.count}</td>
                    <td className="py-3 text-right font-bold text-red-700">{formatCurrency(aging.over_90.amount)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-3 font-semibold text-gray-900">Total</td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      {aging.current.count + aging.days_31_60.count + aging.days_61_90.count + aging.over_90.count}
                    </td>
                    <td className="py-3 text-right font-bold text-gray-900">
                      {formatCurrency(aging.current.amount + aging.days_31_60.amount + aging.days_61_90.amount + aging.over_90.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
