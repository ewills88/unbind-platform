'use client'

import { useState, useEffect } from 'react'
import {
  Download,
  Loader2,
  FileText,
  MoreVertical,
  Mail,
  Eye,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/types/billing'
import { ARAgingData, FinancialSummary } from '@/types/analytics'
import { authFetch } from '@/lib/supabase/auth-fetch'

export default function FinancialReports() {
  const [reportType, setReportType] = useState('revenue')
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [arAging, setArAging] = useState<ARAgingData | null>(null)
  const [loading, setLoading] = useState(true)

  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-01-01`
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchFinancials()
  }, [startDate, endDate])

  const fetchFinancials = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/firms/analytics/financial?report=ar`)
      const data = await res.json()
      setSummary(data.summary || null)
      setArAging(data.ar_aging || null)
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
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive financial analytics</p>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2">
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
          </div>

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="ar">A/R Aging</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-6">
          <RevenueReport summary={summary} />
        </TabsContent>

        <TabsContent value="ar" className="mt-6">
          <ARAgingReport arData={arAging} />
        </TabsContent>

        <TabsContent value="profitability" className="mt-6">
          <ProfitabilityReport summary={summary} />
        </TabsContent>

        <TabsContent value="collections" className="mt-6">
          <CollectionsReport summary={summary} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RevenueReport({ summary }: { summary: FinancialSummary | null }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Billed</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary?.billed || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">{summary?.invoices_sent || 0} invoices</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Collected</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(summary?.collected || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">{summary?.payments_received || 0} payments</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Outstanding</p>
          <p className="text-3xl font-bold text-orange-600">{formatCurrency(summary?.outstanding_ar || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">Avg. {summary?.avg_days_to_payment || 0} days to pay</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-sm text-gray-700">Collection Rate</span>
            <span className="text-sm font-semibold text-gray-900">
              {summary && summary.billed > 0
                ? `${Math.round((summary.collected / summary.billed) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-sm text-gray-700">Average Days to Payment</span>
            <span className="text-sm font-semibold text-gray-900">{summary?.avg_days_to_payment || 0} days</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-sm text-gray-700">Outstanding Receivables</span>
            <span className="text-sm font-semibold text-orange-600">{formatCurrency(summary?.outstanding_ar || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ARAgingReport({ arData }: { arData: ARAgingData | null }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  if (!arData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <FileText className="mx-auto w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500">No outstanding receivables</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aging buckets */}
      <div className="grid md:grid-cols-5 gap-4">
        <AgingBucket
          title="Current (0-30 days)"
          amount={arData.current}
          percent={arData.current_percent}
          variant="success"
        />
        <AgingBucket
          title="31-60 days"
          amount={arData.days_31_60}
          percent={arData.days_31_60_percent}
          variant="warning"
        />
        <AgingBucket
          title="61-90 days"
          amount={arData.days_61_90}
          percent={arData.days_61_90_percent}
          variant="warning"
        />
        <AgingBucket
          title="90+ days"
          amount={arData.days_90_plus}
          percent={arData.days_90_plus_percent}
          variant="destructive"
        />
        <AgingBucket
          title="Total A/R"
          amount={arData.total}
          percent={100}
          subtitle={`${arData.invoice_count} invoices`}
        />
      </div>

      {/* Invoice detail */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Aging Detail by Client</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Overdue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {arData.invoices.map(invoice => {
                const severity = invoice.days_overdue > 90 ? 'high' : invoice.days_overdue > 60 ? 'medium' : 'low'

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.client_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      #{invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(invoice.amount_paid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(invoice.balance_due)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        severity === 'high'
                          ? 'bg-red-100 text-red-800'
                          : severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.days_overdue} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === invoice.id ? null : invoice.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {openMenu === invoice.id && (
                          <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => setOpenMenu(null)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Mail className="w-4 h-4" />
                              Send Reminder
                            </button>
                            <button
                              onClick={() => setOpenMenu(null)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="w-4 h-4" />
                              View Invoice
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {arData.invoices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No outstanding invoices</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AgingBucket({
  title,
  amount,
  percent,
  subtitle,
  variant,
}: {
  title: string
  amount: number
  percent: number
  subtitle?: string
  variant?: 'success' | 'warning' | 'destructive'
}) {
  const colorMap = {
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    destructive: 'border-red-200 bg-red-50',
  }

  return (
    <div className={`rounded-xl border shadow-sm p-4 ${
      variant ? colorMap[variant] : 'border-gray-200 bg-white'
    }`}>
      <p className="text-xs text-gray-600 mb-1">{title}</p>
      <p className="text-xl font-bold text-gray-900">{formatCurrency(amount)}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle || `${percent}% of total`}</p>
    </div>
  )
}

function ProfitabilityReport({ summary }: { summary: FinancialSummary | null }) {
  const collectionRate = summary && summary.billed > 0
    ? Math.round((summary.collected / summary.billed) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-700">Revenue</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(summary?.billed || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-700">Collected</span>
              <span className="text-sm font-bold text-green-600">{formatCurrency(summary?.collected || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-700">Write-offs</span>
              <span className="text-sm font-bold text-red-600">
                {formatCurrency(Math.max(0, (summary?.billed || 0) - (summary?.collected || 0) - (summary?.outstanding_ar || 0)))}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-semibold text-gray-900">Net Collection Rate</span>
              <span className="text-sm font-bold text-blue-600">{collectionRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Indicators</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-700">Average Invoice Amount</span>
              <span className="text-sm font-semibold text-gray-900">
                {summary && summary.invoices_sent > 0
                  ? formatCurrency(summary.billed / summary.invoices_sent)
                  : '$0'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-700">Days Sales Outstanding</span>
              <span className="text-sm font-semibold text-gray-900">{summary?.avg_days_to_payment || 0} days</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-700">Outstanding Receivables</span>
              <span className="text-sm font-semibold text-orange-600">{formatCurrency(summary?.outstanding_ar || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CollectionsReport({ summary }: { summary: FinancialSummary | null }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Invoices Sent</p>
          <p className="text-3xl font-bold text-gray-900">{summary?.invoices_sent || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Payments Received</p>
          <p className="text-3xl font-bold text-green-600">{summary?.payments_received || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Amount Collected</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(summary?.collected || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Avg. Days to Pay</p>
          <p className="text-3xl font-bold text-gray-900">{summary?.avg_days_to_payment || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Performance</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-700">Collection Rate</span>
              <span className="text-sm font-semibold">
                {summary && summary.billed > 0
                  ? `${Math.round((summary.collected / summary.billed) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{
                  width: `${summary && summary.billed > 0
                    ? Math.round((summary.collected / summary.billed) * 100)
                    : 0}%`
                }}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Billed</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(summary?.billed || 0)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Collected</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(summary?.collected || 0)}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Outstanding</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(summary?.outstanding_ar || 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
