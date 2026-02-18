'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Columns3, Plus, Loader2, AlertCircle, Trash2, X, GripVertical,
} from 'lucide-react'
import type { CustomFieldDefinition, CustomFieldEntityType, CustomFieldType } from '@/types/admin'

const ENTITY_TYPES: { key: CustomFieldEntityType; label: string }[] = [
  { key: 'case', label: 'Cases' },
  { key: 'client', label: 'Clients' },
  { key: 'document', label: 'Documents' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'task', label: 'Tasks' },
]

const FIELD_TYPES: { key: CustomFieldType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'textarea', label: 'Long Text' },
  { key: 'number', label: 'Number' },
  { key: 'currency', label: 'Currency' },
  { key: 'date', label: 'Date' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'boolean', label: 'Yes/No' },
  { key: 'select', label: 'Dropdown' },
  { key: 'multiselect', label: 'Multi-select' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'url', label: 'URL' },
]

export default function AdminCustomFieldsPage() {
  const router = useRouter()
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entityType, setEntityType] = useState<CustomFieldEntityType>('case')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    field_name: '',
    field_type: 'text' as CustomFieldType,
    description: '',
    placeholder: '',
    is_required: false,
    is_visible_in_list: false,
    is_visible_in_portal: false,
    options: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchFields() }, [entityType])

  const fetchFields = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/custom-fields?entityType=${entityType}`)
      if (res.status === 401) { router.push('/login'); return }
      if (res.status === 403) { setError('Access denied'); setLoading(false); return }
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setFields(data.data || [])
    } catch { setError('Failed to load fields') }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!form.field_name || !form.field_type) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        entity_type: entityType,
        field_name: form.field_name,
        field_type: form.field_type,
        description: form.description || undefined,
        placeholder: form.placeholder || undefined,
        is_required: form.is_required,
        is_visible_in_list: form.is_visible_in_list,
        is_visible_in_portal: form.is_visible_in_portal,
      }

      if (['select', 'multiselect'].includes(form.field_type) && form.options) {
        body.options = form.options.split('\n').filter(Boolean).map(o => ({
          label: o.trim(),
          value: o.trim().toLowerCase().replace(/\s+/g, '_'),
        }))
      }

      const res = await fetch('/api/admin/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      setShowCreate(false)
      setForm({ field_name: '', field_type: 'text', description: '', placeholder: '', is_required: false, is_visible_in_list: false, is_visible_in_portal: false, options: '' })
      fetchFields()
    } catch { setError('Failed to create field') }
    finally { setSaving(false) }
  }

  const handleDelete = async (fieldId: string) => {
    if (!confirm('Delete this custom field?')) return
    try {
      await fetch('/api/admin/custom-fields', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId }),
      })
      fetchFields()
    } catch { setError('Failed to delete') }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-gray-600 mt-1">Add custom data fields to your entities</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Field
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /><p className="text-red-800 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4 text-red-600" /></button>
        </div>
      )}

      {/* Entity Type Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {ENTITY_TYPES.map(t => (
          <button key={t.key} onClick={() => setEntityType(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
              entityType === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Fields List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : fields.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Columns3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>No custom fields for {entityType}s</p>
          <p className="text-sm mt-1">Add a custom field to capture additional data.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {fields.map(field => (
            <div key={field.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{field.field_name}</p>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{field.field_type}</span>
                  {field.is_required && <span className="text-xs text-red-600">Required</span>}
                </div>
                {field.description && <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>}
                <p className="text-xs text-gray-400">Key: {field.field_key}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                {field.is_visible_in_list && <span>List</span>}
                {field.is_visible_in_portal && <span>Portal</span>}
              </div>
              <button onClick={() => handleDelete(field.id)}
                className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Custom Field</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
                <input type="text" value={form.field_name} onChange={e => setForm(p => ({ ...p, field_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Opposing Counsel" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Type *</label>
                <select value={form.field_type} onChange={e => setForm(p => ({ ...p, field_type: e.target.value as CustomFieldType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {FIELD_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              {['select', 'multiselect'].includes(form.field_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options (one per line)</label>
                  <textarea rows={4} value={form.options} onChange={e => setForm(p => ({ ...p, options: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Option 1\nOption 2\nOption 3" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Help text for this field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                <input type="text" value={form.placeholder} onChange={e => setForm(p => ({ ...p, placeholder: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="space-y-2">
                {[
                  { field: 'is_required', label: 'Required field' },
                  { field: 'is_visible_in_list', label: 'Show in list view' },
                  { field: 'is_visible_in_portal', label: 'Visible in client portal' },
                ].map(item => (
                  <label key={item.field} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={!!(form as Record<string, unknown>)[item.field]}
                      onChange={e => setForm(p => ({ ...p, [item.field]: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.field_name}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
