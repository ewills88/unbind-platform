'use client'

import { useState } from 'react'
import {
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  Edit2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  DocumentTemplate,
  FilledDocumentData,
  DataValidationWarning,
  getFieldDisplayName,
  formatValueForDocument
} from '@/types/document-templates'

interface FieldPreviewItem {
  template_field: string
  data_path: string
  value: unknown
  is_filled: boolean
}

interface DataMappingReviewProps {
  template: DocumentTemplate
  filledData: FilledDocumentData
  fieldPreview: Record<string, FieldPreviewItem>
  warnings: DataValidationWarning[]
  onOverride: (path: string, value: unknown) => void
  overrides: Partial<FilledDocumentData>
}

// Group fields by their data source category
const FIELD_GROUPS = [
  { key: 'client', label: 'Client Information', prefix: 'client.' },
  { key: 'spouse', label: 'Spouse Information', prefix: 'spouse.' },
  { key: 'case', label: 'Case Information', prefix: 'case.' },
  { key: 'attorney', label: 'Attorney Information', prefix: 'attorney.' },
  { key: 'children', label: 'Children Information', prefix: 'children.' },
  { key: 'income', label: 'Income Information', prefix: 'income.' },
  { key: 'expenses', label: 'Expense Information', prefix: 'expenses.' },
  { key: 'assets', label: 'Asset Information', prefix: 'assets.' },
  { key: 'debts', label: 'Debt Information', prefix: 'debts.' },
  { key: 'settlement', label: 'Settlement Terms', prefix: 'settlement.' },
]

export default function DataMappingReview({
  template,
  filledData: _filledData,
  fieldPreview,
  warnings,
  onOverride,
  overrides
}: DataMappingReviewProps) {
  void _filledData // Reserved for future use
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(FIELD_GROUPS.map(g => g.key))
  )
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const startEditing = (dataPath: string, currentValue: unknown) => {
    setEditingField(dataPath)
    setEditValue(String(currentValue || ''))
  }

  const saveEdit = () => {
    if (editingField) {
      onOverride(editingField, editValue)
      setEditingField(null)
      setEditValue('')
    }
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  // Group fields by category
  const groupedFields: Record<string, FieldPreviewItem[]> = {}

  for (const [, field] of Object.entries(fieldPreview)) {
    let groupKey = 'other'

    for (const group of FIELD_GROUPS) {
      if (field.data_path.startsWith(group.prefix)) {
        groupKey = group.key
        break
      }
    }

    if (!groupedFields[groupKey]) {
      groupedFields[groupKey] = []
    }
    groupedFields[groupKey].push(field)
  }

  // Get warning for a field
  const getFieldWarning = (dataPath: string): DataValidationWarning | undefined => {
    return warnings.find(w => w.field === dataPath)
  }

  // Check if field is required
  const isRequired = (dataPath: string): boolean => {
    return template.required_data_fields?.includes(dataPath) || false
  }

  // Get effective value (with override if present)
  const getEffectiveValue = (field: FieldPreviewItem): unknown => {
    // Check for override
    const parts = field.data_path.split('.')
    let current: unknown = overrides

    for (const part of parts) {
      if (current === null || current === undefined) break
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part]
      } else {
        current = undefined
        break
      }
    }

    return current !== undefined ? current : field.value
  }

  const filledCount = Object.values(fieldPreview).filter(f => f.is_filled || getEffectiveValue(f)).length
  const totalCount = Object.values(fieldPreview).length
  const requiredMissing = warnings.filter(w => w.severity === 'error').length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="font-medium text-gray-900">Data Mapping Summary</h4>
          <p className="text-sm text-gray-500 mt-1">
            {filledCount} of {totalCount} fields populated
          </p>
        </div>
        <div className="flex items-center gap-4">
          {requiredMissing > 0 ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{requiredMissing} required fields missing</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="font-medium">All required fields filled</span>
            </div>
          )}
        </div>
      </div>

      {/* Field Groups */}
      <div className="space-y-4">
        {FIELD_GROUPS.map(group => {
          const fields = groupedFields[group.key]
          if (!fields || fields.length === 0) return null

          const isExpanded = expandedGroups.has(group.key)
          const groupFilledCount = fields.filter(f => f.is_filled || getEffectiveValue(f)).length
          const groupHasError = fields.some(f => getFieldWarning(f.data_path)?.severity === 'error')

          return (
            <div key={group.key} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{group.label}</span>
                  <span className="text-sm text-gray-500">
                    {groupFilledCount}/{fields.length} filled
                  </span>
                  {groupHasError && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="divide-y">
                  {fields.map(field => {
                    const warning = getFieldWarning(field.data_path)
                    const required = isRequired(field.data_path)
                    const effectiveValue = getEffectiveValue(field)
                    const hasOverride = overrides && field.data_path in flattenObject(overrides)
                    const isEditing = editingField === field.data_path

                    return (
                      <div
                        key={field.template_field}
                        className={`px-4 py-3 ${
                          warning?.severity === 'error' ? 'bg-red-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {getFieldDisplayName(field.data_path)}
                              </span>
                              {required && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                                  Required
                                </span>
                              )}
                              {hasOverride && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  Modified
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">
                              {field.template_field}
                            </div>

                            {isEditing ? (
                              <div className="mt-2 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="flex-1 px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit()
                                    if (e.key === 'Escape') cancelEdit()
                                  }}
                                />
                                <button
                                  onClick={saveEdit}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="mt-1 flex items-center gap-2">
                                {effectiveValue ? (
                                  <span className="text-gray-700">
                                    {formatValueForDocument(effectiveValue, field.data_path)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">Not provided</span>
                                )}
                              </div>
                            )}

                            {warning && !isEditing && (
                              <div className={`mt-2 flex items-start gap-2 text-sm ${
                                warning.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                {warning.severity === 'error' ? (
                                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                )}
                                <span>{warning.message}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {effectiveValue ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <X className="w-5 h-5 text-gray-300" />
                            )}
                            {!isEditing && (
                              <button
                                onClick={() => startEditing(field.data_path, effectiveValue)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit value"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Other fields not in standard groups */}
        {groupedFields.other && groupedFields.other.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup('other')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">Other Fields</span>
                <span className="text-sm text-gray-500">
                  {groupedFields.other.filter(f => f.is_filled).length}/{groupedFields.other.length} filled
                </span>
              </div>
              {expandedGroups.has('other') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedGroups.has('other') && (
              <div className="divide-y">
                {groupedFields.other.map(field => (
                  <div key={field.template_field} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">
                          {getFieldDisplayName(field.data_path)}
                        </span>
                        <div className="text-xs text-gray-400 font-mono">
                          {field.template_field}
                        </div>
                        <div className="mt-1">
                          {field.value ? (
                            <span className="text-gray-700">
                              {formatValueForDocument(field.value, field.data_path)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Not provided</span>
                          )}
                        </div>
                      </div>
                      {field.is_filled ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper to flatten an object for checking if a path exists
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey))
    } else {
      result[newKey] = value
    }
  }

  return result
}
