'use client'

import { useState } from 'react'
import { FileText, Info, DollarSign, ExternalLink, ChevronRight } from 'lucide-react'
import { selectRequiredForms, calculateTotalFees } from '@/lib/formSelector'
import { CaseFacts, StateFormSeed, FORM_TYPE_INFO, STATE_NAMES } from '@/types/stateLaw'
import { formatCurrency } from '@/types/billing'

interface FormSelectorProps {
  stateCode: string
  initialFacts?: Partial<CaseFacts>
}

const DEFAULT_FACTS: CaseFacts = {
  has_children: false,
  has_property: false,
  case_type: 'uncontested',
  spousal_support_requested: false,
  has_prenup: false,
  military_member: false,
}

export default function FormSelector({ stateCode, initialFacts }: FormSelectorProps) {
  const [facts, setFacts] = useState<CaseFacts>({ ...DEFAULT_FACTS, ...initialFacts })
  const [forms, setForms] = useState<StateFormSeed[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)

  const stateName = STATE_NAMES[stateCode] || stateCode

  const handleGenerate = () => {
    const result = selectRequiredForms(stateCode, facts)
    setForms(result)
    setHasGenerated(true)
  }

  const updateFact = <K extends keyof CaseFacts>(key: K, value: CaseFacts[K]) => {
    setFacts((prev) => ({ ...prev, [key]: value }))
    setHasGenerated(false)
  }

  const totalFees = calculateTotalFees(forms)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Required Forms — {stateName}
        </h3>
      </div>

      {/* Case facts questionnaire */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Case Details</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Does this case involve children?
            </label>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="has_children"
                    checked={facts.has_children === val}
                    onChange={() => updateFact('has_children', val)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{val ? 'Yes' : 'No'}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contested or uncontested?
            </label>
            <div className="flex gap-3">
              {(['uncontested', 'contested'] as const).map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="case_type"
                    checked={facts.case_type === val}
                    onChange={() => updateFact('case_type', val)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{val}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Significant property to divide?
            </label>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="has_property"
                    checked={facts.has_property === val}
                    onChange={() => updateFact('has_property', val)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{val ? 'Yes' : 'No'}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spousal support requested?
            </label>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="spousal_support"
                    checked={facts.spousal_support_requested === val}
                    onChange={() => updateFact('spousal_support_requested', val)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{val ? 'Yes' : 'No'}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Military service member?
            </label>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="military"
                    checked={facts.military_member === val}
                    onChange={() => updateFact('military_member', val)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{val ? 'Yes' : 'No'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          Show Required Forms
        </button>
      </div>

      {/* Results */}
      {hasGenerated && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-800">
                Based on your case details, you will need <strong>{forms.length} forms</strong> to file in {stateName}.
              </p>
            </div>
          </div>

          {/* Forms table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Form</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Fee</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forms.map((form, idx) => {
                  const typeInfo = FORM_TYPE_INFO[form.form_type]
                  return (
                    <tr key={form.form_number} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-gray-900 font-medium">
                        {form.form_number}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{form.form_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {form.court_fee > 0 ? formatCurrency(form.court_fee) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {form.instructions_url && (
                          <a
                            href={form.instructions_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            Instructions <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Total fees */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Estimated Total Filing Fees</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFees)}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 italic">
            Disclaimer: This is an estimate based on standard filing requirements. Actual forms and fees
            may vary by county and specific case circumstances. Attorney review is required.
          </p>
        </div>
      )}
    </div>
  )
}
