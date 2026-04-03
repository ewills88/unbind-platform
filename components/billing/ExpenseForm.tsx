'use client'

import { useState } from 'react'
import { X, Receipt, DollarSign, AlertCircle, Upload } from 'lucide-react'
import { ExpenseType, EXPENSE_TYPE_INFO, formatCurrency } from '@/types/billing'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface ExpenseFormProps {
  caseId: string
  onClose: () => void
  onSaved: (expense: unknown) => void
}

export default function ExpenseForm({ caseId, onClose, onSaved }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [expenseType, setExpenseType] = useState<ExpenseType>('other')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [billable, setBillable] = useState(true)
  const [markupPercentage, setMarkupPercentage] = useState(0)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  // Calculate billed amount
  const parsedAmount = parseFloat(amount) || 0
  const billedAmount = parsedAmount * (1 + markupPercentage / 100)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    if (parsedAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    try {
      setLoading(true)

      // TODO: Upload receipt file to Supabase Storage if present
      let receiptPath = null
      if (receiptFile) {
        // For now, just note that we would upload here
        receiptPath = `receipts/${caseId}/${Date.now()}-${receiptFile.name}`
      }

      const response = await authFetch(`/api/cases/${caseId}/billing/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_date: expenseDate,
          expense_type: expenseType,
          description: description.trim(),
          amount: parsedAmount,
          billable,
          markup_percentage: markupPercentage,
          receipt_path: receiptPath
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create expense')
      }

      const data = await response.json()
      onSaved(data.expense)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  // Common expense presets
  const expensePresets = [
    { type: 'court_filing', description: 'Court Filing Fee', amount: 435 },
    { type: 'service_of_process', description: 'Service of Process', amount: 75 },
    { type: 'copies', description: 'Document Copies', amount: 25 }
  ]

  function applyPreset(preset: typeof expensePresets[0]) {
    setExpenseType(preset.type as ExpenseType)
    setDescription(preset.description)
    setAmount(preset.amount.toString())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Add Expense</h3>
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

          {/* Quick presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Add
            </label>
            <div className="flex flex-wrap gap-2">
              {expensePresets.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg
                           hover:bg-gray-200"
                >
                  {preset.description} ({formatCurrency(preset.amount)})
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Expense Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense Type
            </label>
            <select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(EXPENSE_TYPE_INFO).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the expense..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
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
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receipt (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                id="receipt-upload"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="receipt-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="mt-2 text-sm text-gray-600">
                  {receiptFile ? receiptFile.name : 'Click to upload receipt'}
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  PNG, JPG, or PDF
                </span>
              </label>
            </div>
          </div>

          {/* Billing options */}
          <div className="p-3 bg-gray-50 rounded-lg space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded
                         focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Bill to client</span>
            </label>

            {billable && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Markup:</label>
                <select
                  value={markupPercentage}
                  onChange={(e) => setMarkupPercentage(parseInt(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0">No markup</option>
                  <option value="5">5%</option>
                  <option value="10">10%</option>
                  <option value="15">15%</option>
                  <option value="20">20%</option>
                </select>
              </div>
            )}
          </div>

          {/* Amount preview */}
          {billable && parsedAmount > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Will bill:</span>
                <span className="text-lg font-semibold text-green-700">
                  {formatCurrency(billedAmount)}
                </span>
              </div>
              {markupPercentage > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {formatCurrency(parsedAmount)} + {markupPercentage}% markup
                </p>
              )}
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
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
