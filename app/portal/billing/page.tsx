'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard, DollarSign, Clock, AlertCircle, CheckCircle,
  Loader2, Plus, Trash2, Star, X, Receipt, ArrowRight,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  PortalInvoiceSummary, PortalPaymentMethod, PaymentHistoryItem,
  PAYMENT_STATUS_LABELS,
} from '@/types/portal'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Due', color: 'bg-blue-100 text-blue-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
  partially_paid: { label: 'Partially Paid', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  void: { label: 'Void', color: 'bg-gray-100 text-gray-500' },
}

const CARD_BRAND_COLORS: Record<string, string> = {
  visa: 'text-blue-600',
  mastercard: 'text-red-600',
  amex: 'text-blue-400',
  discover: 'text-orange-500',
}

export default function PortalBillingPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<PortalInvoiceSummary[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PortalPaymentMethod[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'invoices' | 'methods' | 'history'>('invoices')
  const [error, setError] = useState<string | null>(null)

  // Payment modal state
  const [payingInvoice, setPayingInvoice] = useState<PortalInvoiceSummary | null>(null)
  const [selectedMethodId, setSelectedMethodId] = useState<string>('')
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [processing, setProcessing] = useState(false)

  // Add card modal
  const [showAddCard, setShowAddCard] = useState(false)
  const [addingCard, setAddingCard] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [invRes, methRes, histRes] = await Promise.all([
        fetch('/api/portal/billing/invoices'),
        fetch('/api/portal/billing/payment-methods'),
        fetch('/api/portal/billing/history'),
      ])

      if (invRes.status === 401) {
        router.push('/portal/login')
        return
      }

      const [invData, methData, histData] = await Promise.all([
        invRes.json(),
        methRes.json(),
        histRes.json(),
      ])

      setInvoices(invData.data || [])
      setPaymentMethods(methData.data || [])
      setPaymentHistory(histData.data || [])

      // Set default payment method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const defaultMethod = (methData.data || []).find((m: any) => m.is_default)
      if (defaultMethod) setSelectedMethodId(defaultMethod.id)
    } catch (err) {
      console.error('Billing fetch error:', err)
      setError('Unable to load billing information.')
    } finally {
      setLoading(false)
    }
  }

  const outstandingInvoices = invoices.filter(inv =>
    ['sent', 'overdue', 'partially_paid'].includes(inv.status)
  )
  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + (inv.balance_due || 0),
    0
  )

  const handleStartPayment = (invoice: PortalInvoiceSummary) => {
    setPayingInvoice(invoice)
    setPaymentAmount((invoice.balance_due || 0).toString())
    setError(null)
  }

  const handlePay = async () => {
    if (!payingInvoice || !selectedMethodId || !paymentAmount) return
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch('/api/portal/billing/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: payingInvoice.id,
          paymentMethodId: selectedMethodId,
          amount: parseFloat(paymentAmount),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Payment failed')
      }
      setPayingInvoice(null)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleSetDefault = async (methodId: string) => {
    try {
      await fetch(`/api/portal/billing/payment-methods/${methodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setDefault: true }),
      })
      fetchData()
    } catch (err) {
      console.error('Set default error:', err)
    }
  }

  const handleDeleteMethod = async (methodId: string) => {
    try {
      await fetch(`/api/portal/billing/payment-methods/${methodId}`, {
        method: 'DELETE',
      })
      fetchData()
    } catch (err) {
      console.error('Delete method error:', err)
    }
  }

  const handleAddCard = async () => {
    setAddingCard(true)
    setError(null)
    try {
      const setupRes = await fetch('/api/portal/billing/payment-methods/setup', {
        method: 'POST',
      })
      const setupData = await setupRes.json()
      if (!setupRes.ok) {
        throw new Error(setupData.error || 'Setup failed')
      }
      // In a real implementation, this would use Stripe Elements
      // For now, show info that Stripe Elements is needed
      setError('Stripe Elements integration required for card entry. Setup intent created successfully.')
      setShowAddCard(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup payment method')
    } finally {
      setAddingCard(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-600 mt-1">View invoices, make payments, and manage payment methods</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 text-sm underline mt-1">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Outstanding balance summary */}
      <div className={`mb-6 p-6 rounded-xl border-2 ${
        totalOutstanding > 0 ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Balance Due</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalOutstanding)}</p>
            {outstandingInvoices.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {outstandingInvoices.length} outstanding invoice{outstandingInvoices.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {totalOutstanding > 0 && paymentMethods.length > 0 && (
            <button
              onClick={() => handleStartPayment(outstandingInvoices[0])}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <CreditCard className="w-5 h-5" />
              Make Payment
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {[
          { key: 'invoices' as const, label: `Invoices (${invoices.length})` },
          { key: 'methods' as const, label: `Payment Methods (${paymentMethods.length})` },
          { key: 'history' as const, label: 'Payment History' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No invoices</p>
              <p className="text-sm mt-1">Your invoices will appear here.</p>
            </div>
          ) : (
            invoices.map(inv => {
              const statusConfig = INVOICE_STATUS_CONFIG[inv.status] || INVOICE_STATUS_CONFIG.sent
              const isOverdue = inv.status === 'overdue'
              const isPaid = inv.status === 'paid'
              const canPay = !isPaid && inv.status !== 'void' && inv.status !== 'draft'

              return (
                <div key={inv.id} className={`bg-white border rounded-lg p-4 ${
                  isOverdue ? 'border-red-200' : 'border-gray-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">Invoice #{inv.invoice_number}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      {inv.case_number && (
                        <p className="text-sm text-gray-500 mt-0.5">Case #{inv.case_number}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span>Issued: {formatDate(inv.issue_date)}</span>
                        <span>Due: {formatDate(inv.due_date)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(inv.balance_due || 0)}
                      </p>
                      {inv.amount_paid > 0 && (
                        <p className="text-sm text-green-600">{formatCurrency(inv.amount_paid)} paid</p>
                      )}
                      {canPay && paymentMethods.length > 0 && (
                        <button
                          onClick={() => handleStartPayment(inv)}
                          className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium ml-auto"
                        >
                          Pay Now <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <div className="space-y-3">
          {paymentMethods.map(method => {
            const brandColor = CARD_BRAND_COLORS[method.card_brand || ''] || 'text-gray-500'
            const isExpired = method.card_exp_year !== null && method.card_exp_month !== null && (
              method.card_exp_year < new Date().getFullYear() ||
              (method.card_exp_year === new Date().getFullYear() &&
               method.card_exp_month < new Date().getMonth() + 1)
            )

            return (
              <div key={method.id} className={`bg-white border rounded-lg p-4 ${
                isExpired ? 'border-red-200' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <CreditCard className={`w-6 h-6 ${brandColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 capitalize">
                          {method.card_brand || 'Card'} {method.card_last_four ? `•••• ${method.card_last_four}` : ''}
                        </p>
                        {method.is_default && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            Default
                          </span>
                        )}
                        {isExpired && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {method.card_exp_month && method.card_exp_year
                          ? `Expires ${method.card_exp_month}/${method.card_exp_year}`
                          : 'No expiry info'}
                      </p>
                      {method.nickname && (
                        <p className="text-xs text-gray-400">{method.nickname}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.is_default && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMethod(method.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          <button
            onClick={() => setShowAddCard(true)}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Payment Method
          </button>
        </div>
      )}

      {/* Payment History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {paymentHistory.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No payment history</p>
              <p className="text-sm mt-1">Your payments will appear here.</p>
            </div>
          ) : (
            paymentHistory.map(payment => {
              const statusConfig = PAYMENT_STATUS_LABELS[payment.status as keyof typeof PAYMENT_STATUS_LABELS]
                || PAYMENT_STATUS_LABELS.pending

              return (
                <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-gray-500">
                        {payment.invoice_number && (
                          <span>Invoice #{payment.invoice_number}</span>
                        )}
                        <span>{formatDate(payment.payment_date)}</span>
                        <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                      </div>
                    </div>
                    {payment.status === 'succeeded' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Make Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Make Payment</h2>
              <button
                onClick={() => setPayingInvoice(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Invoice summary */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Invoice #{payingInvoice.invoice_number}</p>
                    <p className="text-sm text-gray-500">Due {formatDate(payingInvoice.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(payingInvoice.balance_due || 0)}</p>
                    <p className="text-xs text-gray-500">Balance due</p>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min="0"
                      max={payingInvoice.balance_due || 0}
                      step="0.01"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setPaymentAmount((payingInvoice.balance_due || 0).toString())}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Full Balance
                  </button>
                </div>
              </div>

              {/* Payment method selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="space-y-2">
                  {paymentMethods.map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                        selectedMethodId === method.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedMethodId === method.id ? 'border-blue-600' : 'border-gray-300'
                      }`}>
                        {selectedMethodId === method.id && (
                          <div className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <CreditCard className="w-5 h-5 text-gray-500" />
                      <span className="text-sm capitalize">
                        {method.card_brand || 'Card'} •••• {method.card_last_four || '****'}
                      </span>
                      {method.is_default && (
                        <span className="ml-auto text-xs text-blue-600 font-medium">Default</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPayingInvoice(null)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePay}
                  disabled={processing || !selectedMethodId || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${paymentAmount ? formatCurrency(parseFloat(paymentAmount)) : '$0.00'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Payment Method</h2>
              <button
                onClick={() => setShowAddCard(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Add a credit or debit card for making payments. Your card information is securely processed by Stripe.
              </p>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 mb-4">
                <p className="text-sm text-gray-500 text-center">
                  Stripe Elements card form will appear here when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is configured.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddCard(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCard}
                  disabled={addingCard}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {addingCard ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    'Add Card'
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">
                Your card information is securely processed by Stripe
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
