'use client'

import { useState } from 'react'
import { X, DollarSign, Loader2 } from 'lucide-react'
import {
  IncomeSource,
  IncomeFormData,
  IncomeType,
  IncomeFrequency,
  INCOME_TYPE_CONFIG,
  FREQUENCY_CONFIG,
  calculateMonthlyAmount,
  formatCurrency,
} from '@/types/financial'

interface IncomeFormProps {
  caseId: string
  income?: IncomeSource
  onSuccess: (income: IncomeSource) => void
  onCancel: () => void
}

export default function IncomeForm({ caseId, income, onSuccess, onCancel }: IncomeFormProps) {
  const [formData, setFormData] = useState<IncomeFormData>({
    party: income?.party || 'client',
    income_type: income?.income_type || 'salary',
    source_name: income?.source_name || '',
    gross_amount: income?.gross_amount || 0,
    net_amount: income?.net_amount || undefined,
    frequency: income?.frequency || 'monthly',
    is_variable: income?.is_variable || false,
    start_date: income?.start_date || undefined,
    end_date: income?.end_date || undefined,
    notes: income?.notes || undefined,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const url = income
        ? `/api/cases/${caseId}/income?id=${income.id}`
        : `/api/cases/${caseId}/income`

      const response = await fetch(url, {
        method: income ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save income')
      }

      const data = await response.json()
      onSuccess(data.income)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const monthlyAmount = calculateMonthlyAmount(formData.gross_amount, formData.frequency)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {income ? 'Edit Income Source' : 'Add Income Source'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Party Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who receives this income?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['client', 'spouse'] as const).map((party) => (
                <button
                  key={party}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, party }))}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    formData.party === party
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium capitalize">{party}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Income Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Income Type
            </label>
            <select
              value={formData.income_type}
              onChange={(e) => setFormData(prev => ({ ...prev, income_type: e.target.value as IncomeType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {Object.entries(INCOME_TYPE_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Name
            </label>
            <input
              type="text"
              value={formData.source_name}
              onChange={(e) => setFormData(prev => ({ ...prev, source_name: e.target.value }))}
              placeholder="e.g., ABC Company, Rental Property on Main St"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Amounts Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gross Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.gross_amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, gross_amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Net Amount (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.net_amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, net_amount: parseFloat(e.target.value) || undefined }))}
                  placeholder="After taxes"
                  min="0"
                  step="0.01"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Frequency
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as IncomeFrequency }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {Object.entries(FREQUENCY_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly Equivalent Display */}
          {formData.gross_amount > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                <span className="font-medium">Monthly equivalent:</span>{' '}
                {formatCurrency(monthlyAmount)}
              </p>
            </div>
          )}

          {/* Variable Income Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_variable"
              checked={formData.is_variable}
              onChange={(e) => setFormData(prev => ({ ...prev, is_variable: e.target.checked }))}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="is_variable" className="text-sm text-gray-700">
              This income is variable (bonuses, commissions, tips, etc.)
            </label>
          </div>

          {/* Date Range (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || undefined }))}
              placeholder="Any additional details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.source_name || formData.gross_amount <= 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {income ? 'Update Income' : 'Add Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
