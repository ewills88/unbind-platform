'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard, RefreshCw, Calendar, CheckCircle, XCircle,
  Clock, AlertTriangle, DollarSign, FileText, Building,
  Banknote, ArrowRightLeft, MoreVertical, Download, Mail
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/types/billing'
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PAYMENT_STATUS_INFO,
  PAYMENT_METHOD_INFO
} from '@/types/payments'

interface PaymentsListProps {
  caseId: string
}

export default function PaymentsList({ caseId }: PaymentsListProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    total_payments: 0,
    total_amount: 0,
    total_fees: 0,
    net_received: 0
  })

  useEffect(() => {
    fetchPayments()
  }, [caseId])

  async function fetchPayments() {
    try {
      setLoading(true)
      const response = await fetch(`/api/cases/${caseId}/payments`)
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
        setSummary(data.summary || {
          total_payments: 0,
          total_amount: 0,
          total_fees: 0,
          net_received: 0
        })
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'credit_card': return CreditCard
      case 'ach': return Building
      case 'check': return FileText
      case 'cash': return Banknote
      case 'wire': return ArrowRightLeft
      default: return DollarSign
    }
  }

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'succeeded': return CheckCircle
      case 'failed': return XCircle
      case 'pending':
      case 'processing': return Clock
      case 'refunded':
      case 'partially_refunded': return AlertTriangle
      default: return Clock
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
        </div>
        <button
          onClick={fetchPayments}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Payments</p>
          <p className="text-2xl font-semibold text-gray-900">
            {summary.total_payments}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Received</p>
          <p className="text-2xl font-semibold text-green-600">
            {formatCurrency(summary.total_amount)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Processing Fees</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.total_fees)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Net Received</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.net_received)}
          </p>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">No payments recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payments.map((payment) => {
              const MethodIcon = getMethodIcon(payment.payment_method)
              const StatusIcon = getStatusIcon(payment.status)
              const statusInfo = PAYMENT_STATUS_INFO[payment.status]
              const methodInfo = PAYMENT_METHOD_INFO[payment.payment_method]

              return (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  MethodIcon={MethodIcon}
                  StatusIcon={StatusIcon}
                  statusInfo={statusInfo}
                  methodInfo={methodInfo}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface PaymentRowProps {
  payment: Payment
  MethodIcon: typeof CreditCard
  StatusIcon: typeof CheckCircle
  statusInfo: { label: string; color: string; bgColor: string }
  methodInfo: { label: string; icon: string }
}

function PaymentRow({
  payment,
  MethodIcon,
  StatusIcon,
  statusInfo,
  methodInfo
}: PaymentRowProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="px-4 py-3 hover:bg-gray-50 flex items-center gap-4">
      {/* Method icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        payment.status === 'succeeded' ? 'bg-green-100' : statusInfo.bgColor
      }`}>
        <MethodIcon className={`w-5 h-5 ${
          payment.status === 'succeeded' ? 'text-green-600' : statusInfo.color
        }`} />
      </div>

      {/* Payment details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {methodInfo.label}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusInfo.label}
          </span>
          {payment.refund_amount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              -{formatCurrency(payment.refund_amount)} refunded
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(payment.payment_date)}
          </span>
          {payment.invoice && (
            <>
              <span>•</span>
              <span>Invoice #{payment.invoice.invoice_number}</span>
            </>
          )}
          {payment.check_number && (
            <>
              <span>•</span>
              <span>Check #{payment.check_number}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0 w-28">
        <p className={`text-sm font-medium ${
          payment.status === 'succeeded' ? 'text-green-600' :
          payment.status === 'failed' ? 'text-red-600' : 'text-gray-900'
        }`}>
          {formatCurrency(payment.amount)}
        </p>
        {payment.transaction_fee > 0 && (
          <p className="text-xs text-gray-500">
            Fee: {formatCurrency(payment.transaction_fee)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

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
                Download Receipt
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email Receipt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
