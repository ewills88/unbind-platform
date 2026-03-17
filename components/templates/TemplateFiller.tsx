'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowLeft,
  Download,
  Save,
  Loader2,
  User,
  Users,
  Briefcase,
  Scale,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type { DocumentTemplate, FilledDocumentData } from '@/types/document-templates'
import { getFieldDisplayName } from '@/types/document-templates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface TemplatFillerProps {
  template: DocumentTemplate
  onBack: () => void
}

interface CaseOption {
  id: string
  case_number: string | null
  client_name: string
  spouse_name: string
  state: string | null
  has_children: boolean
  filing_date: string | null
  case_type: string | null
  status: string
}

// Group field paths by section for the form
const FIELD_SECTIONS: { key: string; label: string; icon: typeof User; fields: { path: string; type: 'text' | 'date' | 'email' | 'tel' | 'number' | 'checkbox' }[] }[] = [
  {
    key: 'client',
    label: 'Petitioner / Client',
    icon: User,
    fields: [
      { path: 'client.full_name', type: 'text' },
      { path: 'client.first_name', type: 'text' },
      { path: 'client.last_name', type: 'text' },
      { path: 'client.address', type: 'text' },
      { path: 'client.city_state_zip', type: 'text' },
      { path: 'client.phone', type: 'tel' },
      { path: 'client.email', type: 'email' },
      { path: 'client.dob', type: 'date' },
    ],
  },
  {
    key: 'spouse',
    label: 'Respondent / Spouse',
    icon: Users,
    fields: [
      { path: 'spouse.full_name', type: 'text' },
      { path: 'spouse.first_name', type: 'text' },
      { path: 'spouse.last_name', type: 'text' },
      { path: 'spouse.address', type: 'text' },
      { path: 'spouse.city_state_zip', type: 'text' },
      { path: 'spouse.phone', type: 'tel' },
      { path: 'spouse.email', type: 'email' },
      { path: 'spouse.dob', type: 'date' },
    ],
  },
  {
    key: 'case',
    label: 'Case Information',
    icon: Briefcase,
    fields: [
      { path: 'case.case_number', type: 'text' },
      { path: 'case.court_name', type: 'text' },
      { path: 'case.court_address', type: 'text' },
      { path: 'case.county', type: 'text' },
      { path: 'case.state_code', type: 'text' },
      { path: 'case.marriage_date', type: 'date' },
      { path: 'case.separation_date', type: 'date' },
      { path: 'case.filing_date', type: 'date' },
      { path: 'case.has_children', type: 'checkbox' },
    ],
  },
  {
    key: 'attorney',
    label: 'Attorney Information',
    icon: Scale,
    fields: [
      { path: 'attorney.full_name', type: 'text' },
      { path: 'attorney.bar_number', type: 'text' },
      { path: 'attorney.firm_name', type: 'text' },
      { path: 'attorney.address', type: 'text' },
      { path: 'attorney.phone', type: 'tel' },
      { path: 'attorney.email', type: 'email' },
    ],
  },
]

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.')
  const result = { ...obj }
  let current = result

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {}
    } else {
      current[part] = { ...(current[part] as Record<string, unknown>) }
    }
    current = current[part] as Record<string, unknown>
  }

  current[parts[parts.length - 1]] = value
  return result
}

export default function TemplateFiller({ template, onBack }: TemplatFillerProps) {
  const [filledData, setFilledData] = useState<Record<string, unknown>>({})
  const [cases, setCases] = useState<CaseOption[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [loadingCases, setLoadingCases] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['client', 'case']))
  const [savingToCase, setSavingToCase] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Determine which fields this template uses
  const templateFields = useMemo(() => {
    const fields = new Set<string>()

    // From field_mappings: values are data paths like "client.full_name"
    if (template.field_mappings) {
      for (const dataPath of Object.values(template.field_mappings)) {
        fields.add(dataPath as string)
      }
    }

    // From required_data_fields
    if (template.required_data_fields) {
      for (const field of template.required_data_fields) {
        fields.add(field)
      }
    }

    // If no fields defined, show all common fields
    if (fields.size === 0) {
      return null // Show all sections
    }

    return fields
  }, [template])

  // Filter sections to only show relevant fields
  const visibleSections = useMemo(() => {
    if (!templateFields) return FIELD_SECTIONS

    return FIELD_SECTIONS.map(section => ({
      ...section,
      fields: section.fields.filter(f => templateFields.has(f.path)),
    })).filter(section => section.fields.length > 0)
  }, [templateFields])

  // Check which required fields are filled
  const requiredStatus = useMemo(() => {
    const required = template.required_data_fields || []
    const filled = required.filter(f => {
      const val = getNestedValue(filledData, f)
      return val !== undefined && val !== null && val !== ''
    })
    return { total: required.length, filled: filled.length }
  }, [template.required_data_fields, filledData])

  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('cases')
        .select('id, case_number, client_name, spouse_name, state, has_children, filing_date, case_type, status')
        .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (data) setCases(data)
    } catch (err) {
      console.error('Error loading cases:', err)
    } finally {
      setLoadingCases(false)
    }
  }

  const populateFromCase = async (caseId: string) => {
    if (!caseId) {
      setSelectedCaseId('')
      return
    }

    setSelectedCaseId(caseId)

    try {
      // Load case data
      const { data: caseData } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single()

      if (!caseData) return

      // Load attorney profile
      const { data: { user } } = await supabase.auth.getUser()
      let attorneyProfile = null
      let firmData = null

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, phone, firm_id')
          .eq('id', user.id)
          .single()
        attorneyProfile = profile

        if (profile?.firm_id) {
          const { data: firm } = await supabase
            .from('firms')
            .select('name, address, phone, bar_number')
            .eq('id', profile.firm_id)
            .single()
          firmData = firm
        }
      }

      // Build auto-populated data
      const autoData: Record<string, unknown> = {
        client: {
          full_name: caseData.client_name || '',
        },
        spouse: {
          full_name: caseData.spouse_name || '',
        },
        case: {
          case_number: caseData.case_number || '',
          state_code: caseData.state || '',
          has_children: caseData.has_children || false,
          filing_date: caseData.filing_date || '',
          marriage_date: caseData.marriage_date || '',
          separation_date: caseData.separation_date || '',
        },
        attorney: {
          full_name: attorneyProfile?.full_name || '',
          email: attorneyProfile?.email || '',
          phone: attorneyProfile?.phone || '',
          firm_name: firmData?.name || '',
          address: firmData?.address || '',
          bar_number: firmData?.bar_number || '',
        },
      }

      // Merge with existing data (don't overwrite manual edits)
      setFilledData(prev => {
        const merged = { ...autoData }
        // Preserve any manually entered values
        for (const section of FIELD_SECTIONS) {
          for (const field of section.fields) {
            const prevVal = getNestedValue(prev, field.path)
            if (prevVal !== undefined && prevVal !== null && prevVal !== '') {
              merged[field.path.split('.')[0]] = merged[field.path.split('.')[0]] || {}
            }
          }
        }
        return merged
      })
    } catch (err) {
      console.error('Error populating from case:', err)
    }
  }

  const handleFieldChange = (path: string, value: unknown) => {
    setFilledData(prev => setNestedValue(prev, path, value))
  }

  const handleGenerate = async () => {
    setGenerating(true)

    try {
      // Import docx dynamically (client-side)
      const { Document, Paragraph, TextRun, AlignmentType, Packer, HeadingLevel, BorderStyle } = await import('docx')

      const data = filledData as FilledDocumentData

      // Resolve field values
      const values: Record<string, string> = {}
      if (template.field_mappings) {
        for (const [placeholder, dataPath] of Object.entries(template.field_mappings)) {
          const val = getNestedValue(filledData, dataPath as string)
          values[placeholder] = val != null ? String(val) : ''
        }
      }

      // Also add direct dotted paths
      for (const section of FIELD_SECTIONS) {
        for (const field of section.fields) {
          const val = getNestedValue(filledData, field.path)
          if (val != null) {
            values[field.path] = String(val)
            // Also add without dots (e.g., client_full_name)
            values[field.path.replace('.', '_')] = String(val)
          }
        }
      }

      // Build court header
      const headerParagraphs: InstanceType<typeof Paragraph>[] = []

      const courtName = values['case.court_name'] || values['court_name'] || ''
      if (courtName) {
        headerParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: courtName.toUpperCase(), bold: true, size: 24 })],
          })
        )
      }

      const county = values['case.county'] || values['county'] || ''
      const stateCode = values['case.state_code'] || values['state_code'] || ''
      if (county || stateCode) {
        headerParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `${county ? `County of ${county}` : ''}${county && stateCode ? ', ' : ''}${stateCode ? `State of ${stateCode}` : ''}`,
                size: 22,
              }),
            ],
          })
        )
      }

      // Case caption
      const clientName = values['client.full_name'] || values['client_full_name'] || 'PETITIONER'
      const spouseName = values['spouse.full_name'] || values['spouse_full_name'] || 'RESPONDENT'
      const caseNumber = values['case.case_number'] || values['case_number'] || ''

      headerParagraphs.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({ text: clientName.toUpperCase(), bold: true, size: 22 }),
            new TextRun({ text: ',', size: 22 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 720 },
          children: [new TextRun({ text: 'Petitioner,', italics: true, size: 22 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [
            new TextRun({ text: 'v.', size: 22 }),
            ...(caseNumber ? [new TextRun({ text: `          Case No. ${caseNumber}`, bold: true, size: 22 })] : []),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: spouseName.toUpperCase(), bold: true, size: 22 }),
            new TextRun({ text: ',', size: 22 }),
          ],
        }),
        new Paragraph({
          indent: { left: 720 },
          spacing: { after: 200 },
          children: [new TextRun({ text: 'Respondent.', italics: true, size: 22 })],
        }),
        new Paragraph({
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
          children: [],
        })
      )

      // Document title
      const docTitle = template.template_name || 'LEGAL DOCUMENT'
      const titleParagraphs = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: docTitle.toUpperCase(), bold: true, size: 26, underline: {} })],
        }),
      ]

      if (template.form_number) {
        titleParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: `(Form ${template.form_number})`, size: 20, italics: true })],
          })
        )
      }

      // Body - build info sections from filled data
      const bodyParagraphs: InstanceType<typeof Paragraph>[] = []

      const addInfoSection = (title: string, items: { label: string; value: string }[]) => {
        const filledItems = items.filter(i => i.value)
        if (filledItems.length === 0) return

        bodyParagraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: title, bold: true, size: 24 })],
          })
        )

        for (const item of filledItems) {
          bodyParagraphs.push(
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({ text: `${item.label}: `, bold: true, size: 22 }),
                new TextRun({ text: item.value, size: 22 }),
              ],
            })
          )
        }
      }

      addInfoSection('PETITIONER INFORMATION', [
        { label: 'Name', value: values['client.full_name'] || '' },
        { label: 'Address', value: values['client.address'] || '' },
        { label: 'City, State, ZIP', value: values['client.city_state_zip'] || '' },
        { label: 'Phone', value: values['client.phone'] || '' },
        { label: 'Email', value: values['client.email'] || '' },
        { label: 'Date of Birth', value: values['client.dob'] || '' },
      ])

      addInfoSection('RESPONDENT INFORMATION', [
        { label: 'Name', value: values['spouse.full_name'] || '' },
        { label: 'Address', value: values['spouse.address'] || '' },
        { label: 'City, State, ZIP', value: values['spouse.city_state_zip'] || '' },
        { label: 'Phone', value: values['spouse.phone'] || '' },
        { label: 'Email', value: values['spouse.email'] || '' },
      ])

      addInfoSection('CASE INFORMATION', [
        { label: 'Case Number', value: caseNumber },
        { label: 'Date of Marriage', value: values['case.marriage_date'] || '' },
        { label: 'Date of Separation', value: values['case.separation_date'] || '' },
        { label: 'Filing Date', value: values['case.filing_date'] || '' },
        { label: 'Minor Children', value: data.case?.has_children ? 'Yes' : 'No' },
      ])

      addInfoSection('ATTORNEY INFORMATION', [
        { label: 'Name', value: values['attorney.full_name'] || '' },
        { label: 'Bar Number', value: values['attorney.bar_number'] || '' },
        { label: 'Firm', value: values['attorney.firm_name'] || '' },
        { label: 'Phone', value: values['attorney.phone'] || '' },
        { label: 'Email', value: values['attorney.email'] || '' },
      ])

      // Signature block
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })

      const signatureParagraphs = [
        new Paragraph({ spacing: { before: 600 }, children: [] }),
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: `Date: ${today}`, size: 22 })],
        }),
        new Paragraph({ spacing: { before: 400 }, children: [] }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: '____________________________________', size: 22 })],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: values['attorney.full_name'] || 'Attorney for Petitioner',
              size: 22,
            }),
          ],
        }),
      ]

      if (values['attorney.bar_number']) {
        signatureParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `State Bar No. ${values['attorney.bar_number']}`, size: 20, italics: true }),
            ],
          })
        )
      }

      const doc = new Document({
        creator: 'Unbind Legal Platform',
        title: template.template_name,
        description: template.description || undefined,
        styles: {
          default: {
            document: {
              run: { font: 'Times New Roman', size: 24 },
            },
          },
        },
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
              },
            },
            children: [
              ...headerParagraphs,
              ...titleParagraphs,
              ...bodyParagraphs,
              ...signatureParagraphs,
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.template_name.replace(/\s+/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating document:', err)
      alert('Failed to generate document. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveToCase = async () => {
    if (!selectedCaseId) return

    setSavingToCase(true)
    setSaveSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('generated_documents').insert({
        case_id: selectedCaseId,
        template_id: template.id,
        document_type: template.template_type,
        document_title: template.template_name,
        description: template.description,
        status: 'draft',
        filled_data: filledData,
        custom_content: {},
        version: 1,
        created_by: user.id,
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving to case:', err)
    } finally {
      setSavingToCase(false)
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Show all sections if template has no specific field mappings
  const sectionsToRender = visibleSections.length > 0 ? visibleSections : FIELD_SECTIONS

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{template.template_name}</h2>
            {template.description && (
              <p className="text-sm text-gray-500">{template.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedCaseId && (
            <button
              onClick={handleSaveToCase}
              disabled={savingToCase}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {savingToCase ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saveSuccess ? 'Saved!' : 'Save to Case'}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {generating ? 'Generating...' : 'Download .docx'}
          </button>
        </div>
      </div>

      {/* Case Selector */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-blue-900 mb-2">
          Auto-populate from case
        </label>
        <select
          value={selectedCaseId}
          onChange={(e) => populateFromCase(e.target.value)}
          disabled={loadingCases}
          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
        >
          <option value="">Select a case to auto-fill fields...</option>
          {cases.map(c => (
            <option key={c.id} value={c.id}>
              {c.client_name} v. {c.spouse_name} {c.case_number ? `(${c.case_number})` : ''} — {c.status}
            </option>
          ))}
        </select>
        <p className="text-xs text-blue-700 mt-1">
          Selecting a case will populate known fields. You can override any value manually.
        </p>
      </div>

      {/* Required Fields Status */}
      {requiredStatus.total > 0 && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
          requiredStatus.filled === requiredStatus.total
            ? 'bg-green-50 text-green-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {requiredStatus.filled === requiredStatus.total ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {requiredStatus.filled}/{requiredStatus.total} required fields completed
        </div>
      )}

      {/* Field Sections */}
      <div className="space-y-3">
        {sectionsToRender.map(section => {
          const Icon = section.icon
          const isExpanded = expandedSections.has(section.key)
          const filledCount = section.fields.filter(f => {
            const val = getNestedValue(filledData, f.path)
            return val !== undefined && val !== null && val !== ''
          }).length

          return (
            <div key={section.key} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900">{section.label}</span>
                  <span className="text-xs text-gray-400">
                    {filledCount}/{section.fields.length} filled
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map(field => {
                      const value = getNestedValue(filledData, field.path)
                      const displayName = getFieldDisplayName(field.path)
                      const isRequired = template.required_data_fields?.includes(field.path)

                      if (field.type === 'checkbox') {
                        return (
                          <label key={field.path} className="flex items-center gap-2 col-span-2">
                            <input
                              type="checkbox"
                              checked={!!value}
                              onChange={(e) => handleFieldChange(field.path, e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{displayName}</span>
                          </label>
                        )
                      }

                      return (
                        <div key={field.path}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {displayName}
                            {isRequired && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type={field.type}
                            value={value != null ? String(value) : ''}
                            onChange={(e) => handleFieldChange(field.path, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                              isRequired && !value ? 'border-amber-300' : 'border-gray-300'
                            }`}
                            placeholder={`Enter ${displayName.toLowerCase()}...`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Template Info Footer */}
      {template.instructions && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Instructions</h4>
          <p className="text-sm text-gray-600">{template.instructions}</p>
        </div>
      )}
    </div>
  )
}
