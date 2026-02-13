'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  FileText,
  ChevronRight,
  Download,
} from 'lucide-react'
import { Invoice, InvoiceStatus, INVOICE_STATUS_INFO, formatCurrency, formatDate, isInvoiceOverdue } from '@/types/billing'

interface PaymentSummary {
  total_outstanding: number
  total_paid: number
  overdue_count: number
  overdue_amount: number
}

export default function ClientPaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'paid'>('all')

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/client/invoices')
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusDisplay = (invoice: Invoice) => {
    const overdue = isInvoiceOverdue(invoice)
    if (overdue && invoice.status !== 'paid' && invoice.status !== 'void') {
      return INVOICE_STATUS_INFO.overdue
    }
    return INVOICE_STATUS_INFO[invoice.status]
  }

  const getStatusIcon = (status: InvoiceStatus, overdue: boolean) => {
    if (overdue) return <AlertTriangle className="w-4 h-4" />
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-4 h-4" />
      case 'sent':
      case 'viewed': return <Clock className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'outstanding') {
      return inv.status !== 'paid' && inv.status !== 'void' && inv.status !== 'draft'
    }
    if (filter === 'paid') {
      return inv.status === 'paid'
    }
    return inv.status !== 'draft' // Don't show drafts to clients
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payments & Invoices</h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">Outstanding</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(summary.total_outstanding)}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Total Paid</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(summary.total_paid)}
            </p>
          </div>

          {summary.overdue_count > 0 && (
            <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {summary.overdue_count} overdue invoice{summary.overdue_count > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {formatCurrency(summary.overdue_amount)} past due
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'outstanding', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All' : f === 'outstanding' ? 'Outstanding' : 'Paid'}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {filter === 'outstanding' ? 'No outstanding invoices' :
               filter === 'paid' ? 'No paid invoices yet' :
               'No invoices yet'}
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const overdue = isInvoiceOverdue(invoice)
            const statusInfo = getStatusDisplay(invoice)
            const dueDate = new Date(invoice.due_date)
            const now = new Date()
            const daysOverdue = overdue ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

            return (
              <div
                key={invoice.id}
                className={`bg-white rounded-xl border p-4 ${
                  overdue && invoice.status !== 'paid' ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Invoice #{invoice.invoice_number}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Issued {formatDate(invoice.issue_date)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                    {getStatusIcon(invoice.status, overdue)}
                    {overdue && invoice.status !== 'paid' ? 'Overdue' : statusInfo.label}
                  </span>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(invoice.balance_due > 0 ? invoice.balance_due : invoice.total_amount)}
                    </p>
                    {invoice.amount_paid > 0 && invoice.balance_due > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatCurrency(invoice.amount_paid)} paid · {formatCurrency(invoice.balance_due)} remaining
                      </p>
                    )}
                    <p className={`text-xs mt-1 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {overdue
                        ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`
                        : `Due ${formatDate(invoice.due_date)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {invoice.pdf_path && (
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {invoice.status !== 'paid' && invoice.status !== 'void' && (
                      <button className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]">
                        <CreditCard className="w-4 h-4" />
                        Pay Now
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Line items preview */}
                {invoice.line_items && invoice.line_items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Items</p>
                    {invoice.line_items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-gray-600 py-0.5">
                        <span className="truncate mr-4">{item.description}</span>
                        <span className="flex-shrink-0">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    {invoice.line_items.length > 3 && (
                      <p className="text-xs text-blue-600 mt-1">
                        +{invoice.line_items.length - 3} more items
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Payment info */}
      <div className="mt-8 bg-blue-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Payment Information</h3>
        <ul className="text-xs text-blue-700 space-y-1.5">
          <li>• Payments are processed securely through Stripe</li>
          <li>• You will receive an email receipt for all payments</li>
          <li>• Contact your attorney if you need to set up a payment plan</li>
          <li>• Questions about a charge? Send a message to your attorney</li>
        </ul>
      </div>
    </div>
  )
}
