'use client'

import { useState, useEffect } from 'react'
import { Mail, Send, RefreshCw, XCircle, CheckCircle, Clock, AlertCircle, UserX } from 'lucide-react'
import type { InviteStatus } from '@/types/portal'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface InviteClientFormProps {
  caseId: string
}

export default function InviteClientForm({ caseId }: InviteClientFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [inviteStatus, setInviteStatus] = useState<InviteStatus | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadStatus()
  }, [caseId])

  const loadStatus = async () => {
    try {
      setStatusLoading(true)
      const res = await authFetch(`/api/clients/invite?caseId=${caseId}`)
      if (res.ok) {
        const data = await res.json()
        setInviteStatus(data)
      }
    } catch {
      // Silently handle — non-critical
    } finally {
      setStatusLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setMessage(null)

    try {
      const res = await authFetch('/api/clients/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, clientEmail: email.trim(), clientName: name.trim() || undefined }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setEmail('')
        setName('')
        await loadStatus()
      } else {
        setMessage({ type: 'error', text: data.message || data.error || 'Failed to send invitation' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const res = await authFetch('/api/clients/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, resend: true }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Invitation resent successfully' })
        await loadStatus()
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to resend' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this client\'s portal access?')) return

    setLoading(true)
    setMessage(null)

    try {
      const res = await authFetch('/api/clients/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Access revoked' })
        await loadStatus()
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to revoke' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (statusLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-10 bg-gray-200 rounded w-full" />
      </div>
    )
  }

  const hasExistingInvite = inviteStatus?.status && inviteStatus.status !== 'revoked'

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Mail className="w-5 h-5 text-blue-600" />
        Client Portal Access
      </h3>

      {/* Status badge */}
      {inviteStatus?.status && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            {inviteStatus.status === 'pending' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <Clock className="w-3.5 h-3.5" />
                Pending
              </span>
            )}
            {inviteStatus.status === 'accepted' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3.5 h-3.5" />
                Active
              </span>
            )}
            {inviteStatus.status === 'expired' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <AlertCircle className="w-3.5 h-3.5" />
                Expired
              </span>
            )}
            {inviteStatus.status === 'revoked' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                <UserX className="w-3.5 h-3.5" />
                Revoked
              </span>
            )}
          </div>

          {inviteStatus.clientEmail && (
            <p className="text-sm text-gray-600">
              Invited: <span className="font-medium">{inviteStatus.clientEmail}</span>
            </p>
          )}
          {inviteStatus.invitedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Sent: {new Date(inviteStatus.invitedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
              })}
            </p>
          )}
        </div>
      )}

      {/* Action buttons for existing invite */}
      {hasExistingInvite && (
        <div className="flex gap-2 mb-4">
          {inviteStatus?.status === 'pending' && (
            <button
              onClick={handleResend}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Resend Invite
            </button>
          )}
          {inviteStatus?.status === 'expired' && (
            <button
              onClick={handleResend}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Send New Invite
            </button>
          )}
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Revoke Access
          </button>
        </div>
      )}

      {/* Invite form — show when no existing invite or revoked */}
      {(!inviteStatus?.status || inviteStatus.status === 'revoked') && (
        <form onSubmit={handleInvite} className="space-y-3">
          <div>
            <label htmlFor="client-email" className="block text-sm font-medium text-gray-700 mb-1">
              Client Email
            </label>
            <input
              id="client-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 mb-1">
              Client Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="client-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Invitation
          </button>
        </form>
      )}

      {/* Message */}
      {message && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  )
}
