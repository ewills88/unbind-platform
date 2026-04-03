'use client'

import { useState } from 'react'
import {
  X, DollarSign, AlertCircle, Calendar, FileText,
  CreditCard, Building, Banknote, Check
} from 'lucide-react'
import { formatCurrency } from '@/types/billing'
import { PaymentMethod, PAYMENT_METHOD_INFO } from '@/types/payments'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface RecordPaymentModalProps {
  caseId: string
  invoice: {
    id: string
    invoice_number: string
    total_amount: number
    balance_due: number
  }
  onClose: () => void
  onSuccess: () => void
}

export default function RecordPaymentModal({
  caseId,
  invoice,
  onClose,
  onSuccess
}: RecordPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('check')
  const [amount, setAmount] = useState(invoice.balance_due.toString())
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [checkNumber, setCheckNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [notes, setNotes] = useState('')

  const parsedAmount = parseFloat(amount) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (parsedAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    if (parsedAmount > invoice.balance_due) {
      setError(`Amount cannot exceed balance due of ${formatCurrency(invoice.balance_due)}`)
      return
    }

    if (paymentMethod === 'check' && !checkNumber) {
      setError('Check number is required for check payments')
      return
    }

    try {
      setLoading(true)

      const response = await authFetch(`/api/cases/${caseId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          payment_method: paymentMethod,
          amount: parsedAmount,
          payment_date: paymentDate,
          check_number: checkNumber || null,
          bank_name: bankName || null,
          notes: notes || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record payment')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  const paymentMethods: { value: PaymentMethod; icon: typeof Check }[] = [
    { value: 'check', icon: FileText },
    { value: 'cash', icon: Banknote },
    { value: 'ach', icon: Building },
    { value: 'wire', icon: CreditCard },
    { value: 'other', icon: DollarSign }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-gray-900">Record Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Invoice info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Invoice</p>
                <p className="font-medium text-gray-900">
                  #{invoice.invoice_number}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Balance Due</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(invoice.balance_due)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-5 gap-2">
              {paymentMethods.map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm ${
                    paymentMethod === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{PAYMENT_METHOD_INFO[value].label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={invoice.balance_due}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            {parsedAmount > 0 && parsedAmount < invoice.balance_due && (
              <p className="mt-1 text-sm text-gray-500">
                Remaining after payment: {formatCurrency(invoice.balance_due - parsedAmount)}
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Check-specific fields */}
          {paymentMethod === 'check' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Number *
                </label>
                <input
                  type="text"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="e.g., 1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., Chase"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* ACH/Wire fields */}
          {(paymentMethod === 'ach' || paymentMethod === 'wire') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank/Institution Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., Wells Fargo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this payment..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Amount preview */}
          {parsedAmount > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Recording payment of:</span>
                <span className="text-lg font-semibold text-green-700">
                  {formatCurrency(parsedAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg
                       hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || parsedAmount <= 0}
              className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg
                       hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
