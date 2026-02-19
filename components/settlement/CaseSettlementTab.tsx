'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Plus, Loader2, Send, Copy,
  CheckCircle, XCircle, Trash2, BarChart3,
} from 'lucide-react'
import type { SettlementProposal, ProposalStatus } from '@/types/settlement'
import { PROPOSAL_STATUS_INFO, formatCurrency } from '@/types/settlement'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface Props {
  caseId: string
}

export default function CaseSettlementTab({ caseId }: Props) {
  const router = useRouter()
  const [proposals, setProposals] = useState<SettlementProposal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/proposals`)
      if (res.ok) {
        const d = await res.json()
        setProposals(d.data || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  async function handleStatusChange(id: string, status: ProposalStatus) {
    try {
      if (status === 'sent') {
        await fetch(`/api/proposals/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _action: 'send' }),
        })
      } else {
        await fetch(`/api/proposals/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      }
      fetchProposals()
    } catch { /* silently handle */ }
  }

  async function handleCounter(id: string) {
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'counter' }),
      })
      if (res.ok) {
        const _d = await res.json()
        router.push(`/dashboard/cases/${caseId}/settlement/new`)
        fetchProposals()
      }
    } catch { /* silently handle */ }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this proposal?')) return
    try {
      await fetch(`/api/proposals/${id}`, { method: 'DELETE' })
      fetchProposals()
    } catch { /* silently handle */ }
  }

  const ourProposals = proposals.filter(p => p.created_by_party === 'our_client')
  const theirProposals = proposals.filter(p => p.created_by_party === 'opposing')
  const accepted = proposals.find(p => p.status === 'accepted')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Settlement Proposals</h2>
          <p className="text-sm text-gray-500">{proposals.length} proposals</p>
        </div>
        <div className="flex items-center gap-2">
          {proposals.length >= 2 && (
            <button
              onClick={() => router.push(`/dashboard/cases/${caseId}/settlement/compare`)}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <BarChart3 className="w-4 h-4" /> Compare
            </button>
          )}
          <button
            onClick={() => router.push(`/dashboard/cases/${caseId}/settlement/new`)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Proposal
          </button>
        </div>
      </div>

      {/* Accepted banner */}
      {accepted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Settlement Reached</p>
            <p className="text-sm text-green-700">{accepted.title} was accepted on {accepted.sent_date ? formatDate(accepted.sent_date) : 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Our Proposals */}
      {ourProposals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Our Proposals ({ourProposals.length})</h3>
          <div className="space-y-3">
            {ourProposals.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                caseId={caseId}
                onStatusChange={handleStatusChange}
                onCounter={() => handleCounter(p.id)}
                onDelete={() => handleDelete(p.id)}
                onView={() => router.push(`/dashboard/cases/${caseId}/settlement/new`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Their Proposals */}
      {theirProposals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Opposing Proposals ({theirProposals.length})</h3>
          <div className="space-y-3">
            {theirProposals.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                caseId={caseId}
                onStatusChange={handleStatusChange}
                onCounter={() => handleCounter(p.id)}
                onDelete={() => handleDelete(p.id)}
                onView={() => router.push(`/dashboard/cases/${caseId}/settlement/new`)}
              />
            ))}
          </div>
        </div>
      )}

      {proposals.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No settlement proposals yet</p>
          <p className="text-sm mt-1">Create your first proposal to start the negotiation process.</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ProposalCard
// ============================================================================
function ProposalCard({
  proposal, caseId: _caseId, onStatusChange, onCounter, onDelete, onView: _onView,
}: {
  proposal: SettlementProposal
  caseId: string
  onStatusChange: (id: string, status: ProposalStatus) => void
  onCounter: () => void
  onDelete: () => void
  onView: () => void
}) {
  const statusInfo = PROPOSAL_STATUS_INFO[proposal.status]
  const _support = proposal.spousal_support?.[0]
  const custody = proposal.custody?.[0]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{proposal.title}</h4>
          <p className="text-xs text-gray-500">
            #{proposal.proposal_number} &middot; {formatDate(proposal.created_at)}
            {proposal.parent_proposal_id && ' (counter-offer)'}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-4 gap-3 text-center text-sm mb-3">
        <div className="bg-gray-50 rounded p-2">
          <p className="text-xs text-gray-500">H Property</p>
          <p className="font-semibold text-blue-600">{formatCurrency(proposal.total_to_husband)}</p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-xs text-gray-500">W Property</p>
          <p className="font-semibold text-pink-600">{formatCurrency(proposal.total_to_wife)}</p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-xs text-gray-500">Support/mo</p>
          <p className="font-semibold">
            {proposal.monthly_support_husband_pays > 0
              ? formatCurrency(proposal.monthly_support_husband_pays)
              : proposal.monthly_support_wife_pays > 0
                ? formatCurrency(proposal.monthly_support_wife_pays)
                : '$0'}
          </p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-xs text-gray-500">Custody</p>
          <p className="font-semibold">
            {custody ? `${custody.husband_percentage}/${custody.wife_percentage}` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        {proposal.status === 'draft' && (
          <button onClick={() => onStatusChange(proposal.id, 'sent')}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <Send className="w-3 h-3" /> Send
          </button>
        )}
        {(proposal.status === 'received' || proposal.status === 'sent') && (
          <>
            <button onClick={() => onStatusChange(proposal.id, 'accepted')}
              className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Accept
            </button>
            <button onClick={() => onStatusChange(proposal.id, 'rejected')}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Reject
            </button>
            <button onClick={onCounter}
              className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1">
              <Copy className="w-3 h-3" /> Counter
            </button>
          </>
        )}
        <div className="flex-1" />
        <select value={proposal.status}
          onChange={e => onStatusChange(proposal.id, e.target.value as ProposalStatus)}
          className="text-xs border border-gray-300 rounded px-2 py-1">
          {Object.entries(PROPOSAL_STATUS_INFO).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button onClick={onDelete} className="text-xs text-gray-400 hover:text-red-500">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
