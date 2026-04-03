'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/types/billing'
import { REVENUE_SHARE_TYPE_INFO, CreateRevenueShareRequest } from '@/types/analytics'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface TeamMember {
  user_id: string
  full_name: string
}

interface ExistingShare {
  id: string
  user_id: string
  user_name: string
  share_type: string
  share_percentage: number
  fixed_amount: number
  total_allocated: number
}

interface RevenueSharingModalProps {
  caseId: string
  isOpen: boolean
  onClose: () => void
}

export default function RevenueSharingModal({ caseId, isOpen, onClose }: RevenueSharingModalProps) {
  const [caseTeam, setCaseTeam] = useState<TeamMember[]>([])
  const [currentShares, setCurrentShares] = useState<ExistingShare[]>([])
  const [shares, setShares] = useState<CreateRevenueShareRequest[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, caseId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [teamRes, sharesRes] = await Promise.all([
        authFetch('/api/firms/members'),
        authFetch(`/api/cases/${caseId}/revenue-shares`),
      ])

      const teamData = await teamRes.json()
      const sharesData = await sharesRes.json()

      const members = (teamData.members || [])
        .filter((m: { status: string; role: string }) =>
          m.status === 'active' && ['owner', 'senior_attorney', 'attorney'].includes(m.role)
        )
        .map((m: { user_id: string; profile?: { full_name?: string; email?: string } }) => ({
          user_id: m.user_id,
          full_name: m.profile?.full_name || m.profile?.email || 'Unknown',
        }))

      setCaseTeam(members)
      setCurrentShares(sharesData.shares || [])

      // Pre-populate form from existing shares
      if (sharesData.shares?.length > 0) {
        setShares(sharesData.shares.map((s: ExistingShare) => ({
          user_id: s.user_id,
          share_type: s.share_type as CreateRevenueShareRequest['share_type'],
          share_percentage: s.share_percentage,
          fixed_amount: s.fixed_amount,
          applies_to: 'all_revenue' as const,
        })))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddShare = () => {
    setShares([
      ...shares,
      {
        user_id: '',
        share_type: 'percentage',
        share_percentage: 0,
        applies_to: 'all_revenue',
      },
    ])
  }

  const updateShare = (index: number, field: string, value: string | number) => {
    const newShares = [...shares]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(newShares[index] as any)[field] = value
    setShares(newShares)
  }

  const removeShare = (index: number) => {
    setShares(shares.filter((_, i) => i !== index))
  }

  const totalPercentage = shares
    .filter(s => s.share_type === 'percentage')
    .reduce((sum, s) => sum + (s.share_percentage || 0), 0)

  const handleSave = async () => {
    if (totalPercentage > 100) return
    setSaving(true)
    try {
      const res = await authFetch(`/api/cases/${caseId}/revenue-shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shares }),
      })

      if (res.ok) {
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Revenue Sharing</DialogTitle>
          <DialogDescription>
            Define how revenue is split among attorneys working on this case
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Current configuration info */}
            {currentShares.length > 0 && shares.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Current Configuration</p>
                    <ul className="mt-2 space-y-1">
                      {currentShares.map(share => (
                        <li key={share.id} className="text-sm text-blue-700">
                          <strong>{share.user_name}</strong>: {share.share_percentage}%
                          ({formatCurrency(share.total_allocated)} allocated so far)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Share rows */}
            <div className="space-y-3">
              {shares.map((share, index) => (
                <div key={index} className="flex gap-3 items-start p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Attorney</Label>
                      <select
                        value={share.user_id}
                        onChange={(e) => updateShare(index, 'user_id', e.target.value)}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select...</option>
                        {caseTeam.map(member => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs">Share Type</Label>
                      <select
                        value={share.share_type}
                        onChange={(e) => updateShare(index, 'share_type', e.target.value)}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Object.entries(REVENUE_SHARE_TYPE_INFO).map(([type, info]) => (
                          <option key={type} value={type}>{info.label}</option>
                        ))}
                      </select>
                    </div>

                    {share.share_type === 'percentage' && (
                      <div>
                        <Label className="text-xs">Percentage (%)</Label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={share.share_percentage || ''}
                          onChange={(e) => updateShare(index, 'share_percentage', parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {(share.share_type === 'fixed_amount' || share.share_type === 'referral_fee') && (
                      <div>
                        <Label className="text-xs">Amount ($)</Label>
                        <input
                          type="number"
                          min="0"
                          value={share.fixed_amount || ''}
                          onChange={(e) => updateShare(index, 'fixed_amount', parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeShare(index)}
                    className="mt-6 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddShare}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Revenue Share
            </button>

            {/* Validation warnings */}
            {totalPercentage > 100 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  Total percentage ({totalPercentage}%) exceeds 100%. Please adjust.
                </p>
              </div>
            )}

            {shares.length > 0 && totalPercentage > 0 && totalPercentage < 100 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  Only {totalPercentage}% allocated. Remaining {100 - totalPercentage}% will go to the lead attorney.
                </p>
              </div>
            )}

            {/* Preview */}
            {shares.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Revenue Distribution Preview</h4>
                <p className="text-xs text-gray-600 mb-2">Example: $10,000 invoice</p>
                <div className="space-y-2">
                  {shares.map((share, index) => {
                    const amount = share.share_type === 'percentage'
                      ? 10000 * ((share.share_percentage || 0) / 100)
                      : share.fixed_amount || 0
                    const attorney = caseTeam.find(m => m.user_id === share.user_id)

                    return (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">{attorney?.full_name || 'Select attorney'}</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(amount)}
                          {share.share_type === 'percentage' && ` (${share.share_percentage}%)`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={totalPercentage > 100 || shares.length === 0 || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Configuration
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
