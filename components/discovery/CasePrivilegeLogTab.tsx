'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Shield, Plus, Download, Loader2, X,
  Edit, Trash2, Search,
} from 'lucide-react'
import type { PrivilegeLogEntry, PrivilegeType } from '@/types/discovery'
import { PRIVILEGE_TYPE_INFO } from '@/types/discovery'
import { authFetch } from '@/lib/supabase/auth-fetch'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface Props {
  caseId: string
}

export default function CasePrivilegeLogTab({ caseId }: Props) {
  const [entries, setEntries] = useState<PrivilegeLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editEntry, setEditEntry] = useState<PrivilegeLogEntry | null>(null)
  const [filterType, setFilterType] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchEntries = useCallback(async () => {
    try {
      let url = `/api/cases/${caseId}/privilege-log`
      if (filterType) url += `?privilege_type=${filterType}`
      const res = await fetch(url)
      if (res.ok) {
        const d = await res.json()
        setEntries(d.data || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [caseId, filterType])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function handleDelete(id: string) {
    if (!confirm('Delete this privilege log entry?')) return
    try {
      await authFetch(`/api/cases/${caseId}/privilege-log?id=${id}`, { method: 'DELETE' })
      fetchEntries()
    } catch {
      // silently handle
    }
  }

  async function handleExport(format: 'csv' | 'docx') {
    try {
      const res = await authFetch(`/api/cases/${caseId}/privilege-log/export?format=${format}`)
      if (!res.ok) return

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Privilege Log.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      // silently handle
    }
  }

  const filtered = entries.filter(e => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      e.document_description.toLowerCase().includes(q) ||
      (e.author || '').toLowerCase().includes(q) ||
      (e.recipients || '').toLowerCase().includes(q) ||
      (e.privilege_basis || '').toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Privilege Log</h2>
          <p className="text-sm text-gray-500">{entries.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                const el = document.getElementById('export-dropdown')
                if (el) el.classList.toggle('hidden')
              }}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <div id="export-dropdown" className="hidden absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => { handleExport('csv'); document.getElementById('export-dropdown')?.classList.add('hidden') }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              >
                Export as CSV
              </button>
              <button
                onClick={() => { handleExport('docx'); document.getElementById('export-dropdown')?.classList.add('hidden') }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              >
                Export as Word (.docx)
              </button>
            </div>
          </div>
          <button
            onClick={() => { setEditEntry(null); setShowAddModal(true) }}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search entries..."
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Privileges</option>
          {Object.entries(PRIVILEGE_TYPE_INFO).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">#</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Date</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Description</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Author</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Privilege</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Bates</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => {
                const privInfo = PRIVILEGE_TYPE_INFO[entry.privilege_type]
                return (
                  <tr key={entry.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-3 py-2 font-mono text-gray-500">{entry.entry_number}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {entry.document_date ? formatDate(entry.document_date) : '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-900 max-w-xs truncate">{entry.document_description}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{entry.author || '-'}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 whitespace-nowrap">
                        {privInfo?.label || entry.privilege_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {entry.bates_begin && entry.bates_end
                        ? `${entry.bates_begin} - ${entry.bates_end}`
                        : entry.bates_begin || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditEntry(entry); setShowAddModal(true) }}
                          className="text-gray-400 hover:text-blue-600 p-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No privilege log entries</p>
          <p className="text-sm mt-1">Add entries for documents withheld on privilege grounds.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <PrivilegeLogEntryModal
          caseId={caseId}
          entry={editEntry}
          onClose={() => { setShowAddModal(false); setEditEntry(null) }}
          onSaved={() => { setShowAddModal(false); setEditEntry(null); fetchEntries() }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Add/Edit Privilege Log Entry Modal
// ============================================================================
function PrivilegeLogEntryModal({
  caseId, entry, onClose, onSaved,
}: {
  caseId: string
  entry: PrivilegeLogEntry | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!entry
  const [documentDate, setDocumentDate] = useState(entry?.document_date || '')
  const [documentDescription, setDocumentDescription] = useState(entry?.document_description || '')
  const [documentType, setDocumentType] = useState(entry?.document_type || '')
  const [author, setAuthor] = useState(entry?.author || '')
  const [recipients, setRecipients] = useState(entry?.recipients || '')
  const [privilegeType, setPrivilegeType] = useState<PrivilegeType>(entry?.privilege_type || 'attorney_client')
  const [privilegeBasis, setPrivilegeBasis] = useState(entry?.privilege_basis || '')
  const [batesBegin, setBatesBegin] = useState(entry?.bates_begin || '')
  const [batesEnd, setBatesEnd] = useState(entry?.bates_end || '')
  const [redacted, setRedacted] = useState(entry?.redacted || false)
  const [producedRedacted, setProducedRedacted] = useState(entry?.produced_in_redacted_form || false)
  const [notes, setNotes] = useState(entry?.notes || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!documentDescription.trim() || !privilegeBasis.trim()) return

    setSaving(true)
    try {
      if (isEdit) {
        await authFetch(`/api/cases/${caseId}/privilege-log`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: entry.id,
            document_date: documentDate || null,
            document_description: documentDescription.trim(),
            document_type: documentType || null,
            author: author || '',
            recipients: recipients || null,
            privilege_type: privilegeType,
            privilege_basis: privilegeBasis.trim(),
            bates_begin: batesBegin || null,
            bates_end: batesEnd || null,
            redacted,
            produced_in_redacted_form: producedRedacted,
            notes: notes || null,
          }),
        })
      } else {
        await authFetch(`/api/cases/${caseId}/privilege-log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_date: documentDate || null,
            document_description: documentDescription.trim(),
            document_type: documentType || null,
            author: author || '',
            recipients: recipients || null,
            privilege_type: privilegeType,
            privilege_basis: privilegeBasis.trim(),
            bates_begin: batesBegin || null,
            bates_end: batesEnd || null,
            redacted,
            produced_in_redacted_form: producedRedacted,
            notes: notes || null,
          }),
        })
      }
      onSaved()
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit' : 'Add'} Privilege Log Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Description *</label>
            <textarea
              value={documentDescription}
              onChange={e => setDocumentDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Date</label>
              <input
                type="date"
                value={documentDate}
                onChange={e => setDocumentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <input
                type="text"
                value={documentType}
                onChange={e => setDocumentType(e.target.value)}
                placeholder="e.g. Email, Letter, Memo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
              <input
                type="text"
                value={recipients}
                onChange={e => setRecipients(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Privilege Type *</label>
            <select
              value={privilegeType}
              onChange={e => setPrivilegeType(e.target.value as PrivilegeType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Object.entries(PRIVILEGE_TYPE_INFO).map(([k, v]) => (
                <option key={k} value={k}>{v.label} - {v.description}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Privilege Basis *</label>
            <textarea
              value={privilegeBasis}
              onChange={e => setPrivilegeBasis(e.target.value)}
              rows={2}
              placeholder="Describe the basis for withholding..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bates Begin</label>
              <input
                type="text"
                value={batesBegin}
                onChange={e => setBatesBegin(e.target.value)}
                placeholder="e.g. DOC-00001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bates End</label>
              <input
                type="text"
                value={batesEnd}
                onChange={e => setBatesEnd(e.target.value)}
                placeholder="e.g. DOC-00003"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={redacted}
                onChange={e => setRedacted(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Redacted</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={producedRedacted}
                onChange={e => setProducedRedacted(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Produced in Redacted Form</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !documentDescription.trim() || !privilegeBasis.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
