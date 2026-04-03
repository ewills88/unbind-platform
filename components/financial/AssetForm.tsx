'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/supabase/auth-fetch'
import { X, DollarSign, Calendar, FileText } from 'lucide-react'
import {
  Asset,
  AssetFormData,
  AssetCategory,
  OwnershipType,
  ASSET_CATEGORY_CONFIG,
  OWNERSHIP_CONFIG,
} from '@/types/financial'

interface AssetFormProps {
  caseId: string
  asset?: Asset
  onSuccess: (asset: Asset) => void
  onCancel: () => void
}

export default function AssetForm({ caseId, asset, onSuccess, onCancel }: AssetFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<AssetFormData>({
    category: asset?.category || 'other',
    name: asset?.name || '',
    description: asset?.description || '',
    estimated_value: asset?.estimated_value || 0,
    date_acquired: asset?.date_acquired || '',
    ownership: asset?.ownership || 'joint',
    notes: asset?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = `/api/cases/${caseId}/assets`
      const method = asset ? 'PATCH' : 'POST'
      const body = asset ? { id: asset.id, ...formData } : formData

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save asset')
      }

      const data = await response.json()
      onSuccess(data.asset)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save asset')
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
            {asset ? 'Edit Asset' : 'Add Asset'}
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
              onChange={(e) => setFormData({ ...formData, category: e.target.value as AssetCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {Object.entries(ASSET_CATEGORY_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Family Home, 2022 Toyota Camry"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about the asset..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Estimated Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Value
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.estimated_value || ''}
                onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
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

          {/* Date Acquired */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Acquired (Optional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={formData.date_acquired || ''}
                onChange={(e) => setFormData({ ...formData, date_acquired: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

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
              {loading ? 'Saving...' : asset ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
