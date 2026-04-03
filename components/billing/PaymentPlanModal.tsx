'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { X, Info, AlertTriangle, Calendar, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/types/billing'
import {
  PaymentPlanFrequency,
  PAYMENT_PLAN_FREQUENCY_INFO,
  SavedPaymentMethod,
  formatCardBrand,
  formatCardExpiry,
} from '@/types/payments'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PaymentPlanModalProps {
  invoice: {
    id: string
    invoice_number: string
    total_amount: number
    balance_due: number
  }
  caseId: string
  onClose: () => void
  onSuccess: () => void
}

export default function PaymentPlanModal({ invoice, caseId, onClose, onSuccess }: PaymentPlanModalProps) {
  const [installmentCount, setInstallmentCount] = useState(3)
  const [frequency, setFrequency] = useState<PaymentPlanFrequency>('monthly')
  const [firstPaymentDate, setFirstPaymentDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const [autoCharge, setAutoCharge] = useState(false)
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const installmentAmount = Math.ceil((invoice.balance_due / installmentCount) * 100) / 100

  useEffect(() => {
    loadSavedPaymentMethods()
  }, [])

  const loadSavedPaymentMethods = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('saved_payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })

    if (data) {
      setSavedMethods(data)
      const defaultMethod = data.find((m) => m.is_default) || data[0]
      if (defaultMethod) setSelectedMethodId(defaultMethod.id)
    }
  }

  const calculateEndDate = () => {
    const start = new Date(firstPaymentDate)
    for (let i = 1; i < installmentCount; i++) {
      switch (frequency) {
        case 'weekly': start.setDate(start.getDate() + 7); break
        case 'biweekly': start.setDate(start.getDate() + 14); break
        case 'monthly': start.setMonth(start.getMonth() + 1); break
      }
    }
    return start.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await authFetch('/api/payment-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          case_id: caseId,
          installment_count: installmentCount,
          frequency,
          first_payment_date: firstPaymentDate,
          auto_charge: autoCharge,
          saved_payment_method_id: autoCharge ? selectedMethodId : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create payment plan')
      }

      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = firstPaymentDate && installmentCount > 0 && (!autoCharge || selectedMethodId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Set Up Payment Plan</h3>
            <p className="text-sm text-gray-500">Invoice #{invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Total */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-700">Total Amount</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(invoice.balance_due)}</p>
          </div>

          {/* Number of Payments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Payments</label>
            <select
              value={installmentCount}
              onChange={(e) => setInstallmentCount(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2}>2 payments</option>
              <option value={3}>3 payments</option>
              <option value={4}>4 payments</option>
              <option value={6}>6 payments</option>
              <option value={12}>12 payments</option>
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as PaymentPlanFrequency)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(PAYMENT_PLAN_FREQUENCY_INFO).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

          {/* First Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Payment Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={firstPaymentDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFirstPaymentDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p>
                  You will be charged <span className="font-semibold">{formatCurrency(installmentAmount)}</span>{' '}
                  {PAYMENT_PLAN_FREQUENCY_INFO[frequency].label.toLowerCase()} starting on{' '}
                  <span className="font-semibold">
                    {new Date(firstPaymentDate).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>.
                </p>
                <p className="mt-1">
                  {installmentCount} payments total, ending approximately {calculateEndDate()}.
                </p>
              </div>
            </div>
          </div>

          {/* Auto-charge */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCharge}
                onChange={(e) => setAutoCharge(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Automatically charge my saved payment method
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Payments will be processed automatically on each due date
                </p>
              </div>
            </label>
          </div>

          {/* Saved Payment Method Selection */}
          {autoCharge && (
            <div>
              {savedMethods.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">No Saved Payment Method</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Please make a payment first to save a payment method, then set up auto-charge.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  {savedMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedMethodId === method.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={method.id}
                        checked={selectedMethodId === method.id}
                        onChange={() => setSelectedMethodId(method.id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">
                        {formatCardBrand(method.card_brand || 'card')} ending in {method.card_last_four}
                        {method.card_exp_month && method.card_exp_year && (
                          <span className="text-gray-500 ml-1">
                            (exp {formatCardExpiry(method.card_exp_month, method.card_exp_year)})
                          </span>
                        )}
                      </span>
                      {method.is_default && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting Up...' : 'Set Up Payment Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
