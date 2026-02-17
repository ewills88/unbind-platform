'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  FileText, Loader2, ExternalLink, Download, Eye,
  Wand2, Search, ChevronDown, ChevronUp, Package,
} from 'lucide-react'
import {
  FORM_CATEGORY_INFO,
  FILLED_FORM_STATUS_INFO,
  type CourtForm,
  type FilledForm,
  type FormPacket,
  type FormCategory,
} from '@/types/court-forms'

interface Props {
  caseId: string
  stateCode: string
}

export default function FormFiller({ caseId, stateCode }: Props) {
  const [forms, setForms] = useState<CourtForm[]>([])
  const [filledForms, setFilledForms] = useState<FilledForm[]>([])
  const [packets, setPackets] = useState<FormPacket[]>([])
  const [loading, setLoading] = useState(true)
  const [filling, setFilling] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showPackets, setShowPackets] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['petition', 'financial', 'disclosure']))

  useEffect(() => {
    async function load() {
      try {
        const [formsRes, filledRes, packetsRes] = await Promise.all([
          fetch(`/api/forms?state_code=${stateCode}`),
          fetch(`/api/cases/${caseId}/filled-forms`),
          fetch(`/api/forms/packets?state_code=${stateCode}`),
        ])

        if (formsRes.ok) {
          const json = await formsRes.json()
          setForms(json.data || [])
        }
        if (filledRes.ok) {
          const json = await filledRes.json()
          setFilledForms(json.data || [])
        }
        if (packetsRes.ok) {
          const json = await packetsRes.json()
          setPackets(json.data || [])
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId, stateCode])

  async function handleFillForm(formId: string) {
    setFilling(formId)
    try {
      const res = await fetch('/api/forms/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          case_id: caseId,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setFilledForms(prev => [json.data, ...prev])
      }
    } catch {
      // Ignore
    } finally {
      setFilling(null)
    }
  }

  const groupedForms = useMemo(() => {
    const filtered = forms.filter(f => {
      if (search) {
        const q = search.toLowerCase()
        return f.form_number.toLowerCase().includes(q) || f.form_name.toLowerCase().includes(q)
      }
      return true
    })

    const groups: Record<string, CourtForm[]> = {}
    for (const form of filtered) {
      const cat = form.form_category
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(form)
    }
    return groups
  }, [forms, search])

  const categories = useMemo(() => {
    if (activeCategory !== 'all') {
      return Object.entries(groupedForms).filter(([cat]) => cat === activeCategory)
    }
    return Object.entries(groupedForms)
  }, [groupedForms, activeCategory])

  function toggleCategory(cat: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Court Forms</h2>
          <p className="text-sm text-gray-500 mt-0.5">Auto-fill court forms from case data</p>
        </div>
      </div>

      {/* Recently filled forms */}
      {filledForms.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recently Filled Forms</h3>
          <div className="space-y-2">
            {filledForms.slice(0, 5).map(ff => {
              const statusInfo = FILLED_FORM_STATUS_INFO[ff.status as keyof typeof FILLED_FORM_STATUS_INFO]
              return (
                <div key={ff.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ff.form_number} - {ff.form_name}</p>
                      <p className="text-xs text-gray-500">
                        Generated {ff.generated_at ? new Date(ff.generated_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                      {statusInfo?.label || ff.status}
                    </span>
                    {ff.filled_pdf_url && (
                      <>
                        <a
                          href={ff.filled_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={ff.filled_pdf_url}
                          download
                          className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Form Packets */}
      {packets.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <button
            onClick={() => setShowPackets(!showPackets)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-900">Form Packets</h3>
              <span className="text-xs text-gray-500">({packets.length})</span>
            </div>
            {showPackets ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showPackets && (
            <div className="px-4 pb-4 space-y-3">
              {packets.map(packet => (
                <div key={packet.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{packet.packet_name}</p>
                        {packet.is_mandatory && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Required</span>
                        )}
                      </div>
                      {packet.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{packet.description}</p>
                      )}
                      {packet.forms && packet.forms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {packet.forms.map(f => (
                            <span key={f.id} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
                              {f.form_number}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search forms by number or name..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={activeCategory}
          onChange={e => setActiveCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {Object.entries(FORM_CATEGORY_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>
      </div>

      {/* Form Library */}
      <div className="space-y-3">
        {categories.map(([category, categoryForms]) => {
          const catInfo = FORM_CATEGORY_INFO[category as FormCategory]
          const isExpanded = expandedCategories.has(category)

          return (
            <div key={category} className="bg-white border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                    {catInfo?.label || category}
                  </span>
                  <span className="text-sm text-gray-500">{categoryForms.length} forms</span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {categoryForms.map(form => (
                      <div key={form.id} className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                                {form.form_number}
                              </span>
                              {form.is_mandatory && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Required</span>
                              )}
                              {form.page_count && (
                                <span className="text-xs text-gray-400">{form.page_count}p</span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">{form.form_name}</p>
                            {form.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.description}</p>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 ml-3">
                            {form.fillable && (
                              <button
                                onClick={() => handleFillForm(form.id)}
                                disabled={filling === form.id}
                                className="px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {filling === form.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Wand2 className="w-3 h-3" />
                                )}
                                Fill
                              </button>
                            )}
                            {form.pdf_template_url && (
                              <a
                                href={form.pdf_template_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 border border-gray-200 rounded text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Blank
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {forms.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No Court Forms Available</h3>
          <p className="text-sm text-gray-500">
            Court forms for {stateCode} have not been configured yet.
          </p>
        </div>
      )}
    </div>
  )
}
