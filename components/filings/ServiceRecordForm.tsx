'use client'

import { useState } from 'react'
import {
  Users, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import {
  SERVICE_METHOD_INFO,
  SERVICE_STATUS_INFO,
  type ServiceMethod,
  type ServiceRecord,
} from '@/types/filings'

interface Props {
  caseId: string
  filingId: string
  spouseName?: string
  existingRecords: ServiceRecord[]
  onCreated: () => void
}

export default function ServiceRecordForm({ caseId, filingId, spouseName, existingRecords, onCreated }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [servedPartyName, setServedPartyName] = useState(spouseName || '')
  const [servedPartyRole, setServedPartyRole] = useState('respondent')
  const [servedPartyAddress, setServedPartyAddress] = useState('')
  const [servedPartyEmail, setServedPartyEmail] = useState('')
  const [serviceMethod, setServiceMethod] = useState<ServiceMethod>('personal')
  const [serviceDate, setServiceDate] = useState('')
  const [serverName, setServerName] = useState('')
  const [serverCompany, setServerCompany] = useState('')
  const [serverFee, setServerFee] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!servedPartyName.trim()) {
      setError('Served party name is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/cases/${caseId}/filings/${filingId}/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          served_party_name: servedPartyName,
          served_party_role: servedPartyRole,
          served_party_address: servedPartyAddress || null,
          served_party_email: servedPartyEmail || null,
          service_method: serviceMethod,
          service_date: serviceDate || null,
          server_name: serverName || null,
          server_company: serverCompany || null,
          server_fee: serverFee ? parseFloat(serverFee) : 0,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Failed to create service record')
        return
      }

      // Reset form
      setShowForm(false)
      setServedPartyName(spouseName || '')
      setServedPartyAddress('')
      setServedPartyEmail('')
      setServiceDate('')
      setServerName('')
      setServerCompany('')
      setServerFee('')
      setNotes('')
      onCreated()
    } catch {
      setError('Failed to create service record')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateStatus(recordId: string, status: string) {
    try {
      await fetch(`/api/cases/${caseId}/filings/${filingId}/service`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: recordId,
          service_status: status,
          ...(status === 'completed' ? { service_date: new Date().toISOString() } : {}),
        }),
      })
      onCreated()
    } catch {
      // Ignore
    }
  }

  async function handleMarkProofFiled(recordId: string) {
    try {
      await fetch(`/api/cases/${caseId}/filings/${filingId}/service`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: recordId,
          proof_filed: true,
          proof_filed_date: new Date().toISOString(),
        }),
      })
      onCreated()
    } catch {
      // Ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4" /> Service of Process
        </h4>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Service Record
          </button>
        )}
      </div>

      {/* Existing records */}
      {existingRecords.length > 0 && (
        <div className="space-y-2">
          {existingRecords.map(record => {
            const statusInfo = SERVICE_STATUS_INFO[record.service_status as keyof typeof SERVICE_STATUS_INFO]
            const methodInfo = SERVICE_METHOD_INFO[record.service_method as ServiceMethod]

            return (
              <div key={record.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{record.served_party_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{record.served_party_role}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                    {statusInfo?.label || record.service_status}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{methodInfo?.label || record.service_method}</span>
                  {record.service_date && (
                    <span>Served: {new Date(record.service_date).toLocaleDateString()}</span>
                  )}
                  {record.response_due_date && (
                    <span className="text-orange-600 font-medium">
                      Response due: {new Date(record.response_due_date).toLocaleDateString()}
                    </span>
                  )}
                  {record.service_attempts > 0 && (
                    <span>{record.service_attempts} attempt{record.service_attempts > 1 ? 's' : ''}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-2 flex items-center gap-2">
                  {record.service_status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(record.id, 'completed')}
                        className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                      >
                        Mark Served
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(record.id, 'attempted')}
                        className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
                      >
                        Log Attempt
                      </button>
                    </>
                  )}
                  {record.service_status === 'attempted' && (
                    <button
                      onClick={() => handleUpdateStatus(record.id, 'completed')}
                      className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                    >
                      Mark Served
                    </button>
                  )}
                  {record.service_status === 'completed' && !record.proof_filed && (
                    <button
                      onClick={() => handleMarkProofFiled(record.id)}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      Proof of Service Filed
                    </button>
                  )}
                  {record.proof_filed && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Proof filed
                    </span>
                  )}
                  {record.response_received && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Response received
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New record form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Served Party Name *</label>
              <input
                type="text"
                value={servedPartyName}
                onChange={e => setServedPartyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Name of person being served"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={servedPartyRole}
                onChange={e => setServedPartyRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="respondent">Respondent</option>
                <option value="petitioner">Petitioner</option>
                <option value="attorney">Attorney</option>
                <option value="third_party">Third Party</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={servedPartyAddress}
                onChange={e => setServedPartyAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Service address"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={servedPartyEmail}
                onChange={e => setServedPartyEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email for e-service"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Service Method</label>
              <select
                value={serviceMethod}
                onChange={e => setServiceMethod(e.target.value as ServiceMethod)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(SERVICE_METHOD_INFO).map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Service Date</label>
              <input
                type="date"
                value={serviceDate}
                onChange={e => setServiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Process Server</label>
              <input
                type="text"
                value={serverName}
                onChange={e => setServerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Server name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={serverCompany}
                onChange={e => setServerCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Service company"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fee</label>
              <input
                type="number"
                step="0.01"
                value={serverFee}
                onChange={e => setServerFee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Service notes"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Add Service Record
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
