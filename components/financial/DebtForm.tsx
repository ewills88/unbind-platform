'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, Percent, FileText } from 'lucide-react'
import {
  Debt,
  DebtFormData,
  DebtCategory,
  OwnershipType,
  Asset,
  DEBT_CATEGORY_CONFIG,
  OWNERSHIP_CONFIG,
} from '@/types/financial'

interface DebtFormProps {
  caseId: string
  debt?: Debt
  onSuccess: (debt: Debt) => void
  onCancel: () => void
}

export default function DebtForm({ caseId, debt, onSuccess, onCancel }: DebtFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])

  const [formData, setFormData] = useState<DebtFormData>({
    category: debt?.category || 'other',
    creditor_name: debt?.creditor_name || '',
    account_number: debt?.account_number || '',
    original_amount: debt?.original_amount || 0,
    current_balance: debt?.current_balance || 0,
    monthly_payment: debt?.monthly_payment || undefined,
    interest_rate: debt?.interest_rate || undefined,
    ownership: debt?.ownership || 'joint',
    is_secured: debt?.is_secured || false,
    secured_asset_id: debt?.secured_asset_id || undefined,
    notes: debt?.notes || '',
  })

  // Load assets for secured debt linking
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}/assets`)
        if (response.ok) {
          const data = await response.json()
          setAssets(data.assets || [])
        }
      } catch (err) {
        console.error('Error loading assets:', err)
      }
    }
    loadAssets()
  }, [caseId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = `/api/cases/${caseId}/debts`
      const method = debt ? 'PATCH' : 'POST'
      const body = debt ? { id: debt.id, ...formData } : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save debt')
      }

      const data = await response.json()
      onSuccess(data.debt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save debt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {debt ? 'Edit Debt' : 'Add Debt'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as DebtCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {Object.entries(DEBT_CATEGORY_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Creditor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Creditor Name
            </label>
            <input
              type="text"
              value={formData.creditor_name}
              onChange={(e) => setFormData({ ...formData, creditor_name: e.target.value })}
              placeholder="e.g., Chase Bank, Discover"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number (Optional)
            </label>
            <input
              type="text"
              value={formData.account_number || ''}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              placeholder="Last 4 digits or full number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Amounts Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Original Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.original_amount || ''}
                  onChange={(e) => setFormData({ ...formData, original_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Current Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Balance
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.current_balance || ''}
                  onChange={(e) => setFormData({ ...formData, current_balance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment & Interest Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Monthly Payment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Payment
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.monthly_payment || ''}
                  onChange={(e) => setFormData({ ...formData, monthly_payment: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.interest_rate || ''}
                  onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Ownership */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ownership
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(OWNERSHIP_CONFIG).map(([value, config]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, ownership: value as OwnershipType })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formData.ownership === value
                      ? `${config.bgColor} ${config.color} border-transparent`
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secured Debt */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_secured}
                onChange={(e) => setFormData({ ...formData, is_secured: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">This is a secured debt</span>
            </label>
          </div>

          {/* Secured Asset Selection */}
          {formData.is_secured && assets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secured By Asset
              </label>
              <select
                value={formData.secured_asset_id || ''}
                onChange={(e) => setFormData({ ...formData, secured_asset_id: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an asset...</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} (${asset.estimated_value.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : debt ? 'Update Debt' : 'Add Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
