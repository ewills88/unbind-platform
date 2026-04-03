'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import FirmTemplateLibrary from '@/components/firm/FirmTemplateLibrary'
import TemplateFiller from '@/components/templates/TemplateFiller'
import {
  FileText,
  Search,
  Filter,
  Loader2,
  Users,
  DollarSign,
  Gavel,
  Send,
  Receipt,
  Library,
  FilePlus,
} from 'lucide-react'
import type { DocumentTemplate } from '@/types/document-templates'
import { authFetch } from '@/lib/supabase/auth-fetch'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Built-in templates when document_templates table is empty / unavailable
const BUILT_IN_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'builtin-petition',
    template_name: 'Petition for Dissolution of Marriage',
    template_code: 'PETITION',
    template_type: 'petition',
    description: 'Initial filing to start divorce proceedings. Includes party information, marriage details, and relief requested.',
    state_code: null, county_code: null, court_type: null, form_number: null,
    template_file_path: '', preview_image_path: null,
    field_mappings: {
      client_full_name: 'client.full_name', client_address: 'client.address',
      client_city_state_zip: 'client.city_state_zip', client_phone: 'client.phone',
      client_email: 'client.email', client_dob: 'client.dob',
      spouse_full_name: 'spouse.full_name', spouse_address: 'spouse.address',
      spouse_city_state_zip: 'spouse.city_state_zip',
      case_number: 'case.case_number', court_name: 'case.court_name',
      county: 'case.county', state_code: 'case.state_code',
      marriage_date: 'case.marriage_date', separation_date: 'case.separation_date',
      has_children: 'case.has_children',
      attorney_full_name: 'attorney.full_name', attorney_bar_number: 'attorney.bar_number',
      attorney_firm_name: 'attorney.firm_name', attorney_phone: 'attorney.phone',
    },
    required_data_fields: ['client.full_name', 'spouse.full_name', 'case.state_code'],
    conditional_sections: {}, default_values: {},
    version: 1, is_active: true, effective_date: null, superseded_by: null,
    category: 'initial_filing', estimated_prep_time: 30,
    instructions: 'Complete all petitioner and respondent information. Ensure the court name and county match the filing jurisdiction.',
    created_by: null, created_at: '', updated_at: '',
  },
  {
    id: 'builtin-response',
    template_name: 'Response to Petition',
    template_code: 'RESPONSE',
    template_type: 'response',
    description: 'Responding party\'s answer to the petition for dissolution.',
    state_code: null, county_code: null, court_type: null, form_number: null,
    template_file_path: '', preview_image_path: null,
    field_mappings: {
      client_full_name: 'client.full_name', spouse_full_name: 'spouse.full_name',
      case_number: 'case.case_number', court_name: 'case.court_name',
      county: 'case.county', state_code: 'case.state_code',
      filing_date: 'case.filing_date',
      attorney_full_name: 'attorney.full_name', attorney_bar_number: 'attorney.bar_number',
    },
    required_data_fields: ['client.full_name', 'spouse.full_name', 'case.case_number'],
    conditional_sections: {}, default_values: {},
    version: 1, is_active: true, effective_date: null, superseded_by: null,
    category: 'response', estimated_prep_time: 25,
    instructions: 'Ensure the case number matches the original petition.',
    created_by: null, created_at: '', updated_at: '',
  },
  {
    id: 'builtin-summons',
    template_name: 'Summons',
    template_code: 'SUMMONS',
    template_type: 'summons',
    description: 'Notice served on the respondent along with the petition.',
    state_code: null, county_code: null, court_type: null, form_number: null,
    template_file_path: '', preview_image_path: null,
    field_mappings: {
      client_full_name: 'client.full_name', spouse_full_name: 'spouse.full_name',
      spouse_address: 'spouse.address',
      case_number: 'case.case_number', court_name: 'case.court_name',
      county: 'case.county', state_code: 'case.state_code',
      attorney_full_name: 'attorney.full_name',
    },
    required_data_fields: ['spouse.full_name', 'spouse.address', 'case.court_name'],
    conditional_sections: {}, default_values: {},
    version: 1, is_active: true, effective_date: null, superseded_by: null,
    category: 'initial_filing', estimated_prep_time: 15,
    instructions: 'Respondent address is required for service of process.',
    created_by: null, created_at: '', updated_at: '',
  },
  {
    id: 'builtin-financial',
    template_name: 'Financial Disclosure Statement',
    template_code: 'FINANCIAL',
    template_type: 'financial_disclosure',
    description: 'Required disclosure of income, expenses, assets, and debts.',
    state_code: null, county_code: null, court_type: null, form_number: null,
    template_file_path: '', preview_image_path: null,
    field_mappings: {
      client_full_name: 'client.full_name', client_address: 'client.address',
      client_email: 'client.email', client_dob: 'client.dob',
      case_number: 'case.case_number', court_name: 'case.court_name',
      state_code: 'case.state_code',
      attorney_full_name: 'attorney.full_name', attorney_bar_number: 'attorney.bar_number',
    },
    required_data_fields: ['client.full_name', 'case.case_number'],
    conditional_sections: {}, default_values: {},
    version: 1, is_active: true, effective_date: null, superseded_by: null,
    category: 'financial', estimated_prep_time: 45,
    instructions: 'Gather all financial records before completing. Include bank statements, pay stubs, and tax returns.',
    created_by: null, created_at: '', updated_at: '',
  },
  {
    id: 'builtin-custody',
    template_name: 'Custody Declaration',
    template_code: 'CUSTODY',
    template_type: 'custody_declaration',
    description: 'Declaration regarding child custody arrangements and parenting plan.',
    state_code: null, county_code: null, court_type: null, form_number: null,
    template_file_path: '', preview_image_path: null,
    field_mappings: {
      client_full_name: 'client.full_name', client_address: 'client.address',
      spouse_full_name: 'spouse.full_name',
      case_number: 'case.case_number', court_name: 'case.court_name',
      state_code: 'case.state_code', has_children: 'case.has_children',
      attorney_full_name: 'attorney.full_name', attorney_bar_number: 'attorney.bar_number',
    },
    required_data_fields: ['client.full_name', 'spouse.full_name', 'case.case_number'],
    conditional_sections: {}, default_values: {},
    version: 1, is_active: true, effective_date: null, superseded_by: null,
    category: 'custody', estimated_prep_time: 40,
    instructions: 'Include details about current living arrangements, schooling, and proposed custody schedule.',
    created_by: null, created_at: '', updated_at: '',
  },
  {
    id: 'builtin-settlement',
    template_name: 'Marital Settlement Agreement',
    template_code: 'MSA',
    template_type: 'settlement_agreement',
    description: 'Comprehensive settlement agreement covering property, support, custody, and other terms.',
    state_code: null, county_code: null, court_type: null, form_number: null,
    template_file_path: '', preview_image_path: null,
    field_mappings: {
      client_full_name: 'client.full_name', client_address: 'client.address',
      spouse_full_name: 'spouse.full_name', spouse_address: 'spouse.address',
      case_number: 'case.case_number', court_name: 'case.court_name',
      county: 'case.county', state_code: 'case.state_code',
      marriage_date: 'case.marriage_date', separation_date: 'case.separation_date',
      has_children: 'case.has_children',
      attorney_full_name: 'attorney.full_name', attorney_bar_number: 'attorney.bar_number',
      attorney_firm_name: 'attorney.firm_name',
    },
    required_data_fields: ['client.full_name', 'spouse.full_name', 'case.case_number', 'case.marriage_date'],
    conditional_sections: {}, default_values: {},
    version: 1, is_active: true, effective_date: null, superseded_by: null,
    category: 'final', estimated_prep_time: 60,
    instructions: 'This is the most important document in the case. Review all terms carefully with your client before finalizing.',
    created_by: null, created_at: '', updated_at: '',
  },
  {
    id: 'builtin-proof-of-service',
    template_name: 'Proof of Service',
    template_code: 'POS',
    template_type: 'proof_of_service',
    description: 'Documentation that legal documents were properly served on the other party.',
    state_code: null, county_code: null, court_type: null, form_number: null,
    template_file_path: '', preview_image_path: null,
    field_mappings: {
      client_full_name: 'client.full_name', spouse_full_name: 'spouse.full_name',
      spouse_address: 'spouse.address',
      case_number: 'case.case_number', court_name: 'case.court_name',
      state_code: 'case.state_code',
    },
    required_data_fields: ['spouse.full_name', 'spouse.address', 'case.case_number'],
    conditional_sections: {}, default_values: {},
    version: 1, is_active: true, effective_date: null, superseded_by: null,
    category: 'initial_filing', estimated_prep_time: 10,
    instructions: 'Complete after service has been accomplished. Include method of service and date served.',
    created_by: null, created_at: '', updated_at: '',
  },
  {
    id: 'builtin-spousal-support',
    template_name: 'Spousal Support Request',
    template_code: 'SPOUSAL',
    template_type: 'spousal_support_request',
    description: 'Request for spousal support/alimony including income and needs analysis.',
    state_code: null, county_code: null, court_type: null, form_number: null,
    template_file_path: '', preview_image_path: null,
    field_mappings: {
      client_full_name: 'client.full_name', client_address: 'client.address',
      spouse_full_name: 'spouse.full_name',
      case_number: 'case.case_number', court_name: 'case.court_name',
      state_code: 'case.state_code', marriage_date: 'case.marriage_date',
      attorney_full_name: 'attorney.full_name', attorney_bar_number: 'attorney.bar_number',
    },
    required_data_fields: ['client.full_name', 'spouse.full_name', 'case.case_number'],
    conditional_sections: {}, default_values: {},
    version: 1, is_active: true, effective_date: null, superseded_by: null,
    category: 'financial', estimated_prep_time: 35,
    instructions: 'Include income documentation for both parties and a detailed needs statement.',
    created_by: null, created_at: '', updated_at: '',
  },
  {
    id: 'builtin-judgment',
    template_name: 'Judgment of Dissolution',
    template_code: 'JUDGMENT',
    template_type: 'judgment',
    description: 'Final judgment ending the marriage. Incorporates all agreed-upon terms.',
    state_code: null, county_code: null, court_type: null, form_number: null,
    template_file_path: '', preview_image_path: null,
    field_mappings: {
      client_full_name: 'client.full_name', spouse_full_name: 'spouse.full_name',
      case_number: 'case.case_number', court_name: 'case.court_name',
      county: 'case.county', state_code: 'case.state_code',
      marriage_date: 'case.marriage_date', separation_date: 'case.separation_date',
      filing_date: 'case.filing_date', has_children: 'case.has_children',
      attorney_full_name: 'attorney.full_name', attorney_bar_number: 'attorney.bar_number',
    },
    required_data_fields: ['client.full_name', 'spouse.full_name', 'case.case_number', 'case.court_name'],
    conditional_sections: {}, default_values: {},
    version: 1, is_active: true, effective_date: null, superseded_by: null,
    category: 'final', estimated_prep_time: 30,
    instructions: 'Ensure all settlement terms are finalized before preparing the judgment.',
    created_by: null, created_at: '', updated_at: '',
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  initial_filing: 'Initial Filing',
  discovery: 'Discovery',
  custody: 'Custody',
  financial: 'Financial',
  final: 'Final Orders',
  motion: 'Motions',
  response: 'Responses',
}

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  initial_filing: FileText,
  custody: Users,
  financial: DollarSign,
  final: Gavel,
  motion: Send,
  response: Receipt,
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  initial_filing: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200 hover:border-blue-400' },
  response: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200 hover:border-indigo-400' },
  financial: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200 hover:border-green-400' },
  custody: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200 hover:border-purple-400' },
  final: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200 hover:border-amber-400' },
  motion: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200 hover:border-red-400' },
}

type PageTab = 'generate' | 'library'

export default function TemplatesPage() {
  const [tab, setTab] = useState<PageTab>('generate')
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTemplates(BUILT_IN_TEMPLATES)
        setLoading(false)
        return
      }

      const response = await authFetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates)
        } else {
          setTemplates(BUILT_IN_TEMPLATES)
        }
      } else {
        setTemplates(BUILT_IN_TEMPLATES)
      }
    } catch {
      setTemplates(BUILT_IN_TEMPLATES)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matches =
        t.template_name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.template_code?.toLowerCase().includes(q)
      if (!matches) return false
    }
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    return true
  })

  const groupedTemplates = filteredTemplates.reduce((acc, t) => {
    const cat = t.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {} as Record<string, DocumentTemplate[]>)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab Navigation */}
          {!selectedTemplate && (
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
              <button
                onClick={() => setTab('generate')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'generate'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FilePlus className="w-4 h-4" />
                Generate Document
              </button>
              <button
                onClick={() => setTab('library')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'library'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Library className="w-4 h-4" />
                Firm Library
              </button>
            </div>
          )}

          {/* Firm Library Tab */}
          {tab === 'library' && !selectedTemplate && <FirmTemplateLibrary />}

          {/* Generate Document Tab */}
          {tab === 'generate' && (
            <>
              {selectedTemplate ? (
                <TemplateFiller
                  template={selectedTemplate}
                  onBack={() => setSelectedTemplate(null)}
                />
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Generate Document</h1>
                    <p className="mt-2 text-gray-600">
                      Select a template, fill in the details, and download a formatted .docx document.
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <>
                      {/* Search & Filter */}
                      <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-gray-500" />
                          <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="all">All Categories</option>
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <p className="text-sm text-gray-500 mb-4">
                        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
                      </p>

                      {filteredTemplates.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                          <p className="text-gray-600">Try adjusting your search or filter.</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
                            const Icon = CATEGORY_ICONS[category] || FileText
                            const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.initial_filing

                            return (
                              <div key={category}>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className={`p-1.5 rounded-md ${colors.bg}`}>
                                    <Icon className={`w-4 h-4 ${colors.text}`} />
                                  </div>
                                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                    {CATEGORY_LABELS[category] || category}
                                  </h3>
                                  <span className="text-xs text-gray-400">({categoryTemplates.length})</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {categoryTemplates.map(template => (
                                    <button
                                      key={template.id}
                                      onClick={() => setSelectedTemplate(template)}
                                      className={`bg-white rounded-xl border ${colors.border} p-5 text-left hover:shadow-md transition-all group`}
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2.5 rounded-lg ${colors.bg}`}>
                                          <Icon className={`w-5 h-5 ${colors.text}`} />
                                        </div>
                                        {template.estimated_prep_time && (
                                          <span className="text-xs text-gray-400">
                                            ~{template.estimated_prep_time} min
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                        {template.template_name}
                                      </h4>
                                      {template.form_number && (
                                        <p className="text-xs font-mono text-gray-400 mb-2">
                                          Form {template.form_number}
                                        </p>
                                      )}
                                      <p className="text-sm text-gray-600 line-clamp-2">
                                        {template.description}
                                      </p>
                                      {template.required_data_fields && template.required_data_fields.length > 0 && (
                                        <p className="text-xs text-gray-400 mt-3">
                                          {template.required_data_fields.length} required field{template.required_data_fields.length !== 1 ? 's' : ''}
                                        </p>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
