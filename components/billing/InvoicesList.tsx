'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Plus, Filter, Search, Calendar,
  DollarSign, RefreshCw, Eye, Send, MoreVertical,
  CheckCircle, Clock, AlertTriangle, XCircle,
  Download, Mail
} from 'lucide-react'
import {
  Invoice,
  InvoiceStatus,
  INVOICE_STATUS_INFO,
  formatCurrency,
  formatDate,
  isInvoiceOverdue
} from '@/types/billing'
import InvoiceGenerator from './InvoiceGenerator'
import PaymentPlanModal from './PaymentPlanModal'

interface InvoicesListProps {
  caseId: string
  onInvoiceCreated?: () => void
}

export default function InvoicesList({
  caseId,
  onInvoiceCreated
}: InvoicesListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const [summary, setSummary] = useState({
    total_invoices: 0,
    total_amount: 0,
    paid_amount: 0,
    outstanding_amount: 0,
    overdue_amount: 0
  })

  // Filters
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchInvoices()
  }, [caseId, filterStatus])

  async function fetchInvoices() {
    try {
      setLoading(true)
      let url = `/api/cases/${caseId}/billing/invoices?`

      if (filterStatus !== 'all') {
        url += `status=${filterStatus}&`
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])

        // Calculate summary from invoices
        const invoiceList = data.invoices || []
        const totalAmount = invoiceList.reduce((sum: number, inv: Invoice) => sum + inv.total_amount, 0)
        const paidAmount = invoiceList
          .filter((inv: Invoice) => inv.status === 'paid')
          .reduce((sum: number, inv: Invoice) => sum + inv.total_amount, 0)
        const overdueAmount = invoiceList
          .filter((inv: Invoice) => isInvoiceOverdue(inv))
          .reduce((sum: number, inv: Invoice) => sum + (inv.total_amount - (inv.amount_paid || 0)), 0)

        setSummary({
          total_invoices: invoiceList.length,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          outstanding_amount: totalAmount - paidAmount,
          overdue_amount: overdueAmount
        })
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendInvoice(invoiceId: string) {
    try {
      const response = await fetch(`/api/cases/${caseId}/billing/invoices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, action: 'send' })
      })

      if (response.ok) {
        fetchInvoices()
      }
    } catch (err) {
      console.error('Failed to send invoice:', err)
    }
  }

  async function handleVoidInvoice(invoiceId: string) {
    if (!confirm('Are you sure you want to void this invoice? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/cases/${caseId}/billing/invoices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, action: 'void' })
      })

      if (response.ok) {
        fetchInvoices()
      }
    } catch (err) {
      console.error('Failed to void invoice:', err)
    }
  }

  // Filter invoices by search
  const filteredInvoices = invoices.filter(invoice => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        invoice.invoice_number.toLowerCase().includes(query) ||
        (invoice.notes && invoice.notes.toLowerCase().includes(query))
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white
                   bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Generate Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Invoices</p>
          <p className="text-2xl font-semibold text-gray-900">
            {summary.total_invoices}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Billed</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.total_amount)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-semibold text-green-600">
            {formatCurrency(summary.paid_amount)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-2xl font-semibold text-amber-600">
            {formatCurrency(summary.outstanding_amount)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-semibold text-red-600">
            {formatCurrency(summary.overdue_amount)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filters:</span>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All statuses</option>
          {Object.entries(INVOICE_STATUS_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={fetchInvoices}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">No invoices found</p>
            <button
              onClick={() => setShowGenerator(true)}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700"
            >
              Generate your first invoice
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredInvoices.map(invoice => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                caseId={caseId}
                onSend={() => handleSendInvoice(invoice.id)}
                onVoid={() => handleVoidInvoice(invoice.id)}
                onRefresh={fetchInvoices}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invoice Generator Modal */}
      {showGenerator && (
        <InvoiceGenerator
          caseId={caseId}
          onClose={() => setShowGenerator(false)}
          onGenerated={() => {
            setShowGenerator(false)
            fetchInvoices()
            onInvoiceCreated?.()
          }}
        />
      )}
    </div>
  )
}

interface InvoiceRowProps {
  invoice: Invoice
  caseId: string
  onSend: () => void
  onVoid: () => void
  onRefresh: () => void
}

function InvoiceRow({ invoice, caseId, onSend, onVoid, onRefresh }: InvoiceRowProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showPaymentPlan, setShowPaymentPlan] = useState(false)
  const statusInfo = INVOICE_STATUS_INFO[invoice.status]
  const overdue = isInvoiceOverdue(invoice)

  const StatusIcon = {
    draft: FileText,
    sent: Send,
    viewed: Eye,
    paid: CheckCircle,
    partially_paid: Clock,
    overdue: AlertTriangle,
    void: XCircle
  }[invoice.status] || FileText

  return (
    <div className="px-4 py-3 hover:bg-gray-50 flex items-center gap-4">
      {/* Status icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${statusInfo.bgColor}`}>
        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
      </div>

      {/* Invoice details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {invoice.invoice_number}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
            {overdue && invoice.status !== 'paid' ? 'Overdue' : statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>Issued {formatDate(invoice.issue_date)}</span>
          <span>•</span>
          <span>Due {formatDate(invoice.due_date)}</span>
          {invoice.line_items && (
            <>
              <span>•</span>
              <span>{invoice.line_items.length} items</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0 w-28">
        <p className="text-sm font-medium text-gray-900">
          {formatCurrency(invoice.total_amount)}
        </p>
        {invoice.status === 'partially_paid' && invoice.amount_paid && (
          <p className="text-xs text-gray-500">
            Paid: {formatCurrency(invoice.amount_paid)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="relative flex items-center gap-1 flex-shrink-0">
        <button
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="View Invoice"
        >
          <Eye className="w-4 h-4" />
        </button>

        {invoice.status === 'draft' && (
          <button
            onClick={onSend}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
            title="Send Invoice"
          >
            <Send className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email Invoice
              </button>
              {invoice.status !== 'void' && invoice.status !== 'paid' && invoice.balance_due > 0 && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    setShowPaymentPlan(true)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Set Up Payment Plan
                </button>
              )}
              {invoice.status !== 'void' && invoice.status !== 'paid' && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onVoid()
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Void Invoice
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Payment Plan Modal */}
      {showPaymentPlan && (
        <PaymentPlanModal
          invoice={{
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            total_amount: invoice.total_amount,
            balance_due: invoice.balance_due,
          }}
          caseId={caseId}
          onClose={() => setShowPaymentPlan(false)}
          onSuccess={() => {
            setShowPaymentPlan(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
