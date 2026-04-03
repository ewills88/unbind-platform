'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, ChevronRight, ChevronLeft, Check, Download,
  AlertCircle, Loader2,
} from 'lucide-react'
import type {
  SettlementProposal,
  SettlementTemplateSection,
  DocumentGenerationState,
} from '@/types/settlement'
import { SETTLEMENT_SECTIONS, formatCurrency } from '@/types/settlement'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface Props {
  caseId: string
  onGenerated?: (docId: string) => void
}

export default function DocumentGenerator({ caseId, onGenerated }: Props) {
  const [proposals, setProposals] = useState<SettlementProposal[]>([])
  const [templates, setTemplates] = useState<SettlementTemplateSection[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [state, setState] = useState<DocumentGenerationState>({
    step: 1,
    proposalId: null,
    stateCode: 'CA',
    selectedSections: SETTLEMENT_SECTIONS.filter(s => s.required).map(s => s.key),
    variables: {},
    sectionOverrides: {},
    documentTitle: '',
    includeSignatureBlock: true,
  })

  const [_previewSections, _setPreviewSections] = useState<{ key: string; title: string; content: string }[]>([])

  // Fetch proposals
  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`/api/cases/${caseId}/proposals`)
        if (res.ok) {
          const json = await res.json()
          setProposals(json.data || [])
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId])

  // Fetch templates when state changes
  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await authFetch(`/api/settlement-templates?state_code=${state.stateCode}`)
        if (res.ok) {
          const json = await res.json()
          setTemplates(json.data || [])
        }
      } catch {
        // Ignore
      }
    }
    loadTemplates()
  }, [state.stateCode])

  const selectedProposal = proposals.find(p => p.id === state.proposalId)

  const handleGenerate = useCallback(async () => {
    if (!state.proposalId) return
    setGenerating(true)
    setError(null)

    try {
      const res = await authFetch(`/api/cases/${caseId}/settlement-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: state.proposalId,
          document_title: state.documentTitle || undefined,
          selected_sections: state.selectedSections,
          section_overrides: Object.keys(state.sectionOverrides).length > 0
            ? state.sectionOverrides : undefined,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to generate document')
      }

      const json = await res.json()
      onGenerated?.(json.data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }, [caseId, state, onGenerated])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(step => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              state.step === step
                ? 'bg-blue-600 text-white'
                : state.step > step
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
            }`}>
              {state.step > step ? <Check className="w-4 h-4" /> : step}
            </div>
            <span className={`ml-2 text-sm ${
              state.step === step ? 'font-medium text-gray-900' : 'text-gray-500'
            }`}>
              {step === 1 ? 'Select Proposal' :
               step === 2 ? 'Choose Sections' :
               step === 3 ? 'Review & Edit' : 'Generate'}
            </span>
            {step < 4 && <ChevronRight className="w-4 h-4 text-gray-300 mx-3" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Select Proposal */}
      {state.step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Select a Proposal</h3>
          <p className="text-sm text-gray-600">
            Choose an accepted or finalized proposal to generate the settlement agreement from.
          </p>

          {proposals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No proposals found. Create a settlement proposal first.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {proposals.map(p => (
                <button
                  key={p.id}
                  onClick={() => setState(s => ({
                    ...s,
                    proposalId: p.id,
                    documentTitle: `Settlement Agreement - ${p.title}`,
                  }))}
                  className={`text-left p-4 rounded-lg border-2 transition-colors ${
                    state.proposalId === p.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{p.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Proposal #{p.proposal_number} &middot; {p.status}
                        {p.created_at && ` &middot; ${new Date(p.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-600">
                        H: {formatCurrency(p.total_to_husband)} / W: {formatCurrency(p.total_to_wife)}
                      </p>
                      {p.equalization_payment > 0 && (
                        <p className="text-gray-500">
                          Eq: {formatCurrency(p.equalization_payment)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setState(s => ({ ...s, step: 2 }))}
              disabled={!state.proposalId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Sections */}
      {state.step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Document Sections</h3>
          <p className="text-sm text-gray-600">
            Select which sections to include. Required sections cannot be unchecked.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
            <input
              type="text"
              value={state.documentTitle}
              onChange={e => setState(s => ({ ...s, documentTitle: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Settlement Agreement"
            />
          </div>

          <div className="space-y-2">
            {SETTLEMENT_SECTIONS.map(section => (
              <label
                key={section.key}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  state.selectedSections.includes(section.key)
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={state.selectedSections.includes(section.key)}
                  disabled={section.required}
                  onChange={e => {
                    if (section.required) return
                    setState(s => ({
                      ...s,
                      selectedSections: e.target.checked
                        ? [...s.selectedSections, section.key]
                        : s.selectedSections.filter(k => k !== section.key),
                    }))
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">{section.label}</span>
                {section.required && (
                  <span className="text-xs text-gray-400 ml-auto">Required</span>
                )}
              </label>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setState(s => ({ ...s, step: 1 }))}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setState(s => ({ ...s, step: 3 }))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Edit */}
      {state.step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Review Document</h3>
          <p className="text-sm text-gray-600">
            Preview the rendered sections. Click any section to edit its content before generation.
          </p>

          {selectedProposal && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">
                Generating from: {selectedProposal.title}
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Petitioner Receives</p>
                  <p className="font-medium">{formatCurrency(selectedProposal.total_to_husband)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Respondent Receives</p>
                  <p className="font-medium">{formatCurrency(selectedProposal.total_to_wife)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Equalization</p>
                  <p className="font-medium">
                    {selectedProposal.equalization_payment > 0
                      ? formatCurrency(selectedProposal.equalization_payment)
                      : 'None'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {templates
              .filter(t => state.selectedSections.includes(t.section_key))
              .sort((a, b) => a.section_order - b.section_order)
              .map(section => {
                const hasOverride = !!state.sectionOverrides[section.section_key]
                return (
                  <div key={section.section_key} className="border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {section.section_title}
                        </span>
                        {hasOverride && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                            Modified
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const current = state.sectionOverrides[section.section_key] || section.content_template
                          const edited = prompt('Edit section content:', current)
                          if (edited !== null && edited !== section.content_template) {
                            setState(s => ({
                              ...s,
                              sectionOverrides: {
                                ...s.sectionOverrides,
                                [section.section_key]: edited,
                              },
                            }))
                          } else if (edited === section.content_template) {
                            setState(s => {
                              const overrides = { ...s.sectionOverrides }
                              delete overrides[section.section_key]
                              return { ...s, sectionOverrides: overrides }
                            })
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="p-3 text-sm text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {(state.sectionOverrides[section.section_key] || section.content_template).slice(0, 300)}
                      {(state.sectionOverrides[section.section_key] || section.content_template).length > 300 && '...'}
                    </div>
                  </div>
                )
              })}
          </div>

          {templates.filter(t => state.selectedSections.includes(t.section_key)).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No template sections loaded. Templates may not exist for this state.</p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setState(s => ({ ...s, step: 2 }))}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setState(s => ({ ...s, step: 4 }))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Generate */}
      {state.step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Generate Agreement</h3>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Document Title</p>
                <p className="font-medium">{state.documentTitle || 'Settlement Agreement'}</p>
              </div>
              <div>
                <p className="text-gray-500">Source Proposal</p>
                <p className="font-medium">{selectedProposal?.title || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-500">Sections Included</p>
                <p className="font-medium">{state.selectedSections.length} sections</p>
              </div>
              <div>
                <p className="text-gray-500">Custom Edits</p>
                <p className="font-medium">
                  {Object.keys(state.sectionOverrides).length} sections modified
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              This will generate a DOCX settlement agreement document. The document will be created in
              &quot;Draft&quot; status and can be reviewed, edited, and sent for signatures before filing.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setState(s => ({ ...s, step: 3 }))}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate Document
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
