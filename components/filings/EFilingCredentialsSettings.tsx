'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Plus, RefreshCw, Loader2, X,
  CheckCircle2, AlertTriangle, Lock,
} from 'lucide-react'
import {
  EFILING_PROVIDER_INFO,
  type EFilingProvider,
  type EFilingPaymentAccount,
} from '@/types/efiling'

interface CredentialInfo {
  id: string
  provider: string
  environment: string
  display_name: string | null
  firm_id: string
  firm_id_at_provider: string | null
  is_active: boolean
  last_verified_at: string | null
  last_error: string | null
  settings: Record<string, unknown>
  created_at: string
  payment_accounts: EFilingPaymentAccount[]
}

interface Props {
  firmId: string
}

export default function EFilingCredentialsSettings({ firmId }: Props) {
  const [credentials, setCredentials] = useState<CredentialInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)

  async function loadCredentials() {
    try {
      const res = await fetch(`/api/efiling/credentials?firm_id=${firmId}`)
      if (res.ok) {
        const json = await res.json()
        setCredentials(json.data || [])
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCredentials()
  }, [firmId])

  async function handleVerify(credentialId: string) {
    setVerifying(credentialId)
    try {
      const res = await fetch(`/api/efiling/credentials/${credentialId}/verify`, {
        method: 'POST',
      })
      const json = await res.json()
      if (json.data?.success) {
        // Refresh list
        await loadCredentials()
      }
    } catch {
      // Ignore
    } finally {
      setVerifying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">E-Filing Credentials</h2>
          <p className="text-sm text-gray-500 mt-0.5">Connect to court e-filing systems</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Credentials
        </button>
      </div>

      {credentials.length > 0 ? (
        <div className="space-y-3">
          {credentials.map(cred => {
            const providerInfo = EFILING_PROVIDER_INFO[cred.provider as EFilingProvider]

            return (
              <div key={cred.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      cred.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <FileText className={`w-5 h-5 ${cred.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {cred.display_name || providerInfo?.label || cred.provider}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          cred.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {cred.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {cred.environment}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-0.5">
                        Provider: {providerInfo?.label || cred.provider}
                        {cred.firm_id_at_provider && ` · Firm ID: ${cred.firm_id_at_provider}`}
                      </p>

                      {cred.last_verified_at && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Verified: {new Date(cred.last_verified_at).toLocaleDateString()}
                        </p>
                      )}

                      {cred.last_error && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {cred.last_error}
                        </p>
                      )}

                      {/* Payment accounts */}
                      {cred.payment_accounts.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Payment Accounts:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cred.payment_accounts.map(acc => (
                              <span
                                key={acc.id}
                                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                              >
                                {acc.account_name || acc.account_type}
                                {acc.last_four && ` ****${acc.last_four}`}
                                {acc.is_default && ' (default)'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerify(cred.id)}
                      disabled={verifying === cred.id}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
                    >
                      {verifying === cred.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No E-Filing Credentials</h3>
          <p className="text-sm text-gray-500 mb-4">
            Connect to Tyler Technologies, File &amp; ServeXpress, or other e-filing providers
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Add Credentials
          </button>
        </div>
      )}

      {showAddModal && (
        <AddCredentialModal
          firmId={firmId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false)
            loadCredentials()
          }}
        />
      )}
    </div>
  )
}

// Add Credential Modal
function AddCredentialModal({
  firmId,
  onClose,
  onAdded,
}: {
  firmId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const [provider, setProvider] = useState('tyler')
  const [environment, setEnvironment] = useState('production')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [clientToken, setClientToken] = useState('')
  const [firmIdAtProvider, setFirmIdAtProvider] = useState('')

  const providers = Object.entries(EFILING_PROVIDER_INFO).map(([key, info]) => ({
    value: key,
    label: info.label,
    description: info.description,
    states: info.states,
  }))

  async function handleSubmit() {
    if (!username || !password) {
      setError('Username and password are required')
      return
    }

    setSubmitting(true)
    setError(null)
    setWarning(null)

    try {
      const res = await fetch('/api/efiling/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firm_id: firmId,
          provider,
          environment,
          display_name: displayName || null,
          username,
          password,
          client_token: clientToken || null,
          firm_id_at_provider: firmIdAtProvider || null,
        }),
      })

      const json = await res.json()

      if (json.error) {
        setError(json.error)
        return
      }

      if (json.warning) {
        setWarning(json.warning)
        // Still proceed - credentials were saved
        setTimeout(() => onAdded(), 2000)
        return
      }

      onAdded()
    } catch {
      setError('Failed to add credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add E-Filing Credentials</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {providers.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              States: {providers.find(p => p.value === provider)?.states.join(', ')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g., California E-Filing"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email *</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Token / API Key</label>
            <input
              type="text"
              value={clientToken}
              onChange={e => setClientToken(e.target.value)}
              placeholder="Provided by e-filing service"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firm ID at Provider</label>
            <input
              type="text"
              value={firmIdAtProvider}
              onChange={e => setFirmIdAtProvider(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="production">Production</option>
              <option value="staging">Staging / Test</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-600">
              Credentials are encrypted at rest using AES-256-GCM and never shared.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {warning && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <p className="text-sm text-yellow-700">{warning}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Add &amp; Verify
          </button>
        </div>
      </div>
    </div>
  )
}
