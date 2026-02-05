// Document Template System Types
// Session 10: Automated Legal Document Generation

// Template type enum - matches database enum
export type DocumentTemplateType =
  | 'petition'
  | 'response'
  | 'summons'
  | 'financial_disclosure'
  | 'income_expense_declaration'
  | 'property_declaration'
  | 'custody_declaration'
  | 'spousal_support_request'
  | 'settlement_agreement'
  | 'judgment'
  | 'proof_of_service'
  | 'request_for_order'
  | 'stipulation'
  | 'declaration'
  | 'motion'

// Generated document status enum
export type GeneratedDocumentStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'filed'
  | 'rejected'

// Document category for organization
export type DocumentCategory =
  | 'initial_filing'
  | 'discovery'
  | 'custody'
  | 'financial'
  | 'final'
  | 'motion'
  | 'response'

// Field mapping structure - maps template placeholders to data paths
export interface FieldMapping {
  [templateField: string]: string // e.g., "{{petitioner_name}}": "client.full_name"
}

// Conditional section configuration
export interface ConditionalSection {
  condition: string // Data path to check, e.g., "case.has_children"
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'exists' | 'not_exists'
  value?: unknown // Value to compare against
}

export interface ConditionalSections {
  [sectionName: string]: ConditionalSection
}

// Document Template from database
export interface DocumentTemplate {
  id: string
  template_name: string
  template_code: string | null
  template_type: DocumentTemplateType
  description: string | null

  // Jurisdiction
  state_code: string | null
  county_code: string | null
  court_type: string | null
  form_number: string | null

  // Template file
  template_file_path: string
  preview_image_path: string | null

  // Field configuration
  field_mappings: FieldMapping
  required_data_fields: string[]
  conditional_sections: ConditionalSections
  default_values: Record<string, unknown>

  // Version management
  version: number
  is_active: boolean
  effective_date: string | null
  superseded_by: string | null

  // Metadata
  category: DocumentCategory | null
  estimated_prep_time: number | null
  instructions: string | null

  // Audit
  created_by: string | null
  created_at: string
  updated_at: string
}

// Generated Document from database
export interface GeneratedDocument {
  id: string
  case_id: string
  template_id: string

  document_type: DocumentTemplateType
  document_title: string
  description: string | null

  status: GeneratedDocumentStatus

  // Data
  filled_data: FilledDocumentData
  custom_content: CustomDocumentContent

  // Files
  file_path: string | null
  pdf_path: string | null
  preview_url: string | null

  // Version
  version: number
  parent_version_id: string | null

  // Workflow
  submitted_for_review_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null

  approved_by: string | null
  approved_at: string | null

  filed_date: string | null
  filing_confirmation_number: string | null

  // Audit
  created_by: string
  created_at: string
  updated_at: string

  // Joined relations (optional)
  template?: DocumentTemplate
}

// Filled data snapshot structure
export interface FilledDocumentData {
  // Client/Petitioner info
  client?: {
    full_name?: string
    first_name?: string
    last_name?: string
    address?: string
    city_state_zip?: string
    phone?: string
    email?: string
    dob?: string
  }

  // Spouse/Respondent info
  spouse?: {
    full_name?: string
    first_name?: string
    last_name?: string
    address?: string
    city_state_zip?: string
    phone?: string
    email?: string
    dob?: string
  }

  // Case info
  case?: {
    case_number?: string
    court_name?: string
    court_address?: string
    county?: string
    state_code?: string
    marriage_date?: string
    separation_date?: string
    has_children?: boolean
    filing_date?: string
    spouse_name?: string
  }

  // Attorney info
  attorney?: {
    full_name?: string
    bar_number?: string
    firm_name?: string
    address?: string
    phone?: string
    email?: string
  }

  // Children info
  children?: {
    count?: number
    names?: string[]
    ages?: number[]
    birthdates?: string[]
  }

  // Financial info
  income?: {
    employer_name?: string
    employer_address?: string
    job_title?: string
    gross_monthly?: number
    net_monthly?: number
    gross_annual?: number
  }

  expenses?: {
    housing?: number
    food?: number
    utilities?: number
    transportation?: number
    insurance?: number
    childcare?: number
    total?: number
  }

  assets?: {
    total_value?: number
    real_estate?: AssetItem[]
    vehicles?: AssetItem[]
    bank_accounts?: AssetItem[]
    retirement?: AssetItem[]
    investments?: AssetItem[]
    other?: AssetItem[]
  }

  debts?: {
    total_balance?: number
    mortgage?: DebtItem[]
    auto_loans?: DebtItem[]
    credit_cards?: DebtItem[]
    student_loans?: DebtItem[]
    other?: DebtItem[]
  }

  // Settlement terms (for MSA)
  settlement?: {
    property_terms?: string
    support_terms?: string
    custody_terms?: string
    child_support_terms?: string
  }

  // Raw values for any unmapped fields
  [key: string]: unknown
}

export interface AssetItem {
  description: string
  value: number
  ownership: 'client' | 'spouse' | 'joint'
}

export interface DebtItem {
  description: string
  balance: number
  monthly_payment?: number
  responsibility: 'client' | 'spouse' | 'joint'
}

// Custom content added by user (narrative sections, etc.)
export interface CustomDocumentContent {
  narratives?: {
    [sectionId: string]: string // Custom text for narrative sections
  }
  exhibits?: {
    id: string
    title: string
    document_id?: string
    description?: string
  }[]
  notes?: string // Internal notes
  attorney_edits?: {
    field: string
    original_value: string
    edited_value: string
    edited_at: string
  }[]
}

// Document Clause from database
export interface DocumentClause {
  id: string
  clause_type: string
  clause_name: string
  clause_text: string

  state_code: string | null
  category: string
  subcategory: string | null

  usage_context: string[] | null
  compatible_template_types: DocumentTemplateType[] | null

  usage_count: number
  is_active: boolean

  created_by: string | null
  created_at: string
  updated_at: string
}

// Document Generation History
export interface DocumentGenerationHistory {
  id: string
  document_id: string
  version: number
  action: 'created' | 'edited' | 'regenerated' | 'approved' | 'filed'
  changes_summary: string | null

  filled_data_snapshot: FilledDocumentData | null
  file_path_snapshot: string | null

  performed_by: string
  performed_at: string
  notes: string | null
}

// API Request/Response types

// List templates request
export interface ListTemplatesParams {
  template_type?: DocumentTemplateType
  state_code?: string
  category?: DocumentCategory
  search?: string
}

// Generate document request
export interface GenerateDocumentRequest {
  template_id: string
  document_title?: string
  description?: string

  // Override auto-populated data
  data_overrides?: Partial<FilledDocumentData>

  // Custom content
  custom_content?: CustomDocumentContent
}

// Generate document response
export interface GenerateDocumentResponse {
  document: GeneratedDocument
  preview_url?: string
  warnings?: DataValidationWarning[]
}

// Data validation warning
export interface DataValidationWarning {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
  suggestion?: string
}

// Update document request
export interface UpdateDocumentRequest {
  document_title?: string
  description?: string
  filled_data?: Partial<FilledDocumentData>
  custom_content?: Partial<CustomDocumentContent>
  status?: GeneratedDocumentStatus
  review_notes?: string
}

// Template preview data - for showing what data is available
export interface TemplatePreviewData {
  template: DocumentTemplate
  available_fields: {
    field_path: string
    current_value: unknown
    is_required: boolean
    is_filled: boolean
  }[]
  missing_required: string[]
  conditional_sections_status: {
    section_name: string
    will_show: boolean
    reason: string
  }[]
}

// Document type display info
export const DOCUMENT_TYPE_INFO: Record<DocumentTemplateType, {
  label: string
  description: string
  icon: string
  category: DocumentCategory
}> = {
  petition: {
    label: 'Petition for Dissolution',
    description: 'Initial filing to start divorce proceedings',
    icon: 'FileText',
    category: 'initial_filing'
  },
  response: {
    label: 'Response to Petition',
    description: 'Responding party\'s answer to the petition',
    icon: 'Reply',
    category: 'response'
  },
  summons: {
    label: 'Summons',
    description: 'Notice to appear served with petition',
    icon: 'Bell',
    category: 'initial_filing'
  },
  financial_disclosure: {
    label: 'Financial Disclosure',
    description: 'Required disclosure of financial information',
    icon: 'DollarSign',
    category: 'financial'
  },
  income_expense_declaration: {
    label: 'Income & Expense Declaration',
    description: 'Detailed income and expense statement',
    icon: 'Receipt',
    category: 'financial'
  },
  property_declaration: {
    label: 'Property Declaration',
    description: 'Declaration of assets and debts',
    icon: 'Home',
    category: 'financial'
  },
  custody_declaration: {
    label: 'Custody Declaration',
    description: 'Declaration regarding child custody',
    icon: 'Users',
    category: 'custody'
  },
  spousal_support_request: {
    label: 'Spousal Support Request',
    description: 'Request for spousal support/alimony',
    icon: 'Heart',
    category: 'financial'
  },
  settlement_agreement: {
    label: 'Marital Settlement Agreement',
    description: 'Comprehensive settlement of all issues',
    icon: 'Handshake',
    category: 'final'
  },
  judgment: {
    label: 'Judgment of Dissolution',
    description: 'Final judgment ending the marriage',
    icon: 'Gavel',
    category: 'final'
  },
  proof_of_service: {
    label: 'Proof of Service',
    description: 'Proof that documents were served',
    icon: 'CheckCircle',
    category: 'initial_filing'
  },
  request_for_order: {
    label: 'Request for Order',
    description: 'Motion requesting court order',
    icon: 'FileQuestion',
    category: 'motion'
  },
  stipulation: {
    label: 'Stipulation',
    description: 'Agreement between parties',
    icon: 'FileCheck',
    category: 'final'
  },
  declaration: {
    label: 'Declaration',
    description: 'Sworn statement of facts',
    icon: 'FileSignature',
    category: 'motion'
  },
  motion: {
    label: 'Motion',
    description: 'Request to the court for action',
    icon: 'Send',
    category: 'motion'
  }
}

// State code display info
export const STATE_INFO: Record<string, { name: string; abbreviation: string }> = {
  CA: { name: 'California', abbreviation: 'CA' },
  TX: { name: 'Texas', abbreviation: 'TX' },
  FL: { name: 'Florida', abbreviation: 'FL' },
  NY: { name: 'New York', abbreviation: 'NY' },
  // Add more states as needed
}

// Status display info
export const DOCUMENT_STATUS_INFO: Record<GeneratedDocumentStatus, {
  label: string
  color: string
  icon: string
}> = {
  draft: {
    label: 'Draft',
    color: 'gray',
    icon: 'Edit'
  },
  in_review: {
    label: 'In Review',
    color: 'yellow',
    icon: 'Eye'
  },
  approved: {
    label: 'Approved',
    color: 'green',
    icon: 'CheckCircle'
  },
  filed: {
    label: 'Filed',
    color: 'blue',
    icon: 'Archive'
  },
  rejected: {
    label: 'Rejected',
    color: 'red',
    icon: 'XCircle'
  }
}

// Helper to get human-readable field name from path
export function getFieldDisplayName(fieldPath: string): string {
  const fieldNames: Record<string, string> = {
    'client.full_name': 'Client Name',
    'client.address': 'Client Address',
    'spouse.full_name': 'Spouse Name',
    'case.case_number': 'Case Number',
    'case.marriage_date': 'Marriage Date',
    'case.separation_date': 'Separation Date',
    'case.court_name': 'Court Name',
    'attorney.full_name': 'Attorney Name',
    'attorney.bar_number': 'Bar Number',
    'income.gross_monthly': 'Gross Monthly Income',
    'expenses.total': 'Total Monthly Expenses',
    'assets.total_value': 'Total Assets',
    'debts.total_balance': 'Total Debts',
    // Add more as needed
  }

  return fieldNames[fieldPath] || fieldPath.split('.').pop()?.replace(/_/g, ' ') || fieldPath
}

// Helper to resolve a data path from filled data
export function resolveDataPath(data: FilledDocumentData, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = data

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

// Helper to format a value for display in a document
export function formatValueForDocument(value: unknown, fieldPath: string): string {
  if (value === null || value === undefined) {
    return ''
  }

  // Currency formatting
  if (fieldPath.includes('income') || fieldPath.includes('expense') ||
      fieldPath.includes('value') || fieldPath.includes('balance')) {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value)
    }
  }

  // Date formatting
  if (fieldPath.includes('date')) {
    if (typeof value === 'string') {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    }
  }

  // Boolean formatting
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  // Array formatting
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return String(value)
}
