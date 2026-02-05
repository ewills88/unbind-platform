// Session 9 Checkpoint 2: Document Collection Types

// Document category enum
export type DocumentCategory = 'required' | 'recommended' | 'optional'

// Document upload status enum
export type DocumentUploadStatus = 'pending' | 'uploaded' | 'processing' | 'verified' | 'rejected'

// Document type configuration
export interface DocumentTypeConfig {
  name: string
  category: DocumentCategory
  description: string
  acceptableFormats: string[]
  whyNeeded: string
  exampleImage?: string
  maxSizeMB?: number
}

// All document types with metadata
export const DOCUMENT_TYPES: Record<string, DocumentTypeConfig> = {
  // Identity Documents
  drivers_license: {
    name: "Driver's License or State ID",
    category: 'required',
    description: 'Valid government-issued photo identification',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Required for identity verification and court filings',
    maxSizeMB: 10,
  },

  // Marriage Documents
  marriage_certificate: {
    name: 'Marriage Certificate',
    category: 'required',
    description: 'Official document proving legal marriage',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Required to file for divorce - must be certified copy',
    maxSizeMB: 10,
  },
  prenup_agreement: {
    name: 'Prenuptial Agreement',
    category: 'optional',
    description: 'Pre-marriage agreement regarding property and finances',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Affects property division if one exists',
    maxSizeMB: 25,
  },

  // Tax Documents
  tax_return_current: {
    name: 'Current Year Tax Return (Form 1040)',
    category: 'required',
    description: 'Complete federal tax return from the most recent year',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Proves income and assets for financial disclosure',
    maxSizeMB: 25,
  },
  tax_return_prior: {
    name: 'Prior Year Tax Return',
    category: 'required',
    description: 'Complete federal tax return from the previous year',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Shows income history for support calculations',
    maxSizeMB: 25,
  },
  tax_return_2_years_prior: {
    name: 'Tax Return (2 Years Prior)',
    category: 'recommended',
    description: 'Tax return from two years ago',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Provides additional income history for complex cases',
    maxSizeMB: 25,
  },

  // Income Documents
  pay_stubs: {
    name: 'Recent Pay Stubs (Last 3 Months)',
    category: 'required',
    description: 'Pay stubs showing current income',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Documents current income for support calculations',
    maxSizeMB: 15,
  },
  w2_forms: {
    name: 'W-2 Forms (Last 2 Years)',
    category: 'recommended',
    description: 'Wage and tax statements from employers',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Verifies employment income history',
    maxSizeMB: 15,
  },

  // Bank & Financial Accounts
  bank_statements: {
    name: 'Bank Statements (Last 3 Months)',
    category: 'required',
    description: 'Statements for all checking and savings accounts',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents liquid assets and spending patterns',
    maxSizeMB: 50,
  },
  credit_card_statements: {
    name: 'Credit Card Statements (Last 3 Months)',
    category: 'recommended',
    description: 'Statements for all credit cards',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents debts and spending patterns',
    maxSizeMB: 50,
  },
  investment_statements: {
    name: 'Investment Account Statements',
    category: 'recommended',
    description: 'Brokerage and investment account statements',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents investment assets for division',
    maxSizeMB: 25,
  },
  retirement_statements: {
    name: 'Retirement Account Statements (401k, IRA, Pension)',
    category: 'recommended',
    description: 'Statements for all retirement accounts',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents retirement assets - often require QDRO for division',
    maxSizeMB: 25,
  },
  stock_options: {
    name: 'Stock Options/RSU Documentation',
    category: 'optional',
    description: 'Documentation of unvested stock options or RSUs',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Unvested options may be marital property',
    maxSizeMB: 15,
  },

  // Real Estate
  property_deed: {
    name: 'Property Deed',
    category: 'recommended',
    description: 'Deed for any real estate owned',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Proves ownership and how title is held',
    maxSizeMB: 15,
  },
  mortgage_statement: {
    name: 'Mortgage Statement (Current)',
    category: 'recommended',
    description: 'Most recent mortgage statement',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Shows current balance and payment amount',
    maxSizeMB: 10,
  },
  property_appraisal: {
    name: 'Property Appraisal',
    category: 'optional',
    description: 'Recent appraisal of real estate',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Determines property value for division',
    maxSizeMB: 25,
  },
  property_tax_bill: {
    name: 'Property Tax Bill',
    category: 'optional',
    description: 'Most recent property tax statement',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Shows assessed value and tax obligations',
    maxSizeMB: 10,
  },

  // Vehicles
  vehicle_titles: {
    name: 'Vehicle Titles',
    category: 'optional',
    description: 'Titles for all owned vehicles',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Proves vehicle ownership for division',
    maxSizeMB: 10,
  },
  vehicle_loan_statements: {
    name: 'Vehicle Loan Statements',
    category: 'optional',
    description: 'Loan statements for financed vehicles',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents vehicle debt',
    maxSizeMB: 10,
  },

  // Business Documents
  business_tax_returns: {
    name: 'Business Tax Returns (Last 2 Years)',
    category: 'required',
    description: 'Tax returns for any owned business',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents business income and value',
    maxSizeMB: 50,
  },
  business_financial_statements: {
    name: 'Business Financial Statements',
    category: 'recommended',
    description: 'Profit & loss statements, balance sheets',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Needed for business valuation',
    maxSizeMB: 50,
  },
  business_bank_statements: {
    name: 'Business Bank Statements',
    category: 'recommended',
    description: 'Bank statements for business accounts',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents business cash flow',
    maxSizeMB: 50,
  },

  // Children Documents
  birth_certificates: {
    name: 'Children Birth Certificates',
    category: 'required',
    description: 'Birth certificates for all minor children',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Required for custody determinations',
    maxSizeMB: 10,
  },
  school_records: {
    name: 'School Records/Report Cards',
    category: 'recommended',
    description: 'Recent school records for children',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Documents children educational needs',
    maxSizeMB: 25,
  },
  childcare_expenses: {
    name: 'Childcare Expense Documentation',
    category: 'recommended',
    description: 'Receipts or statements for daycare, after-school care',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Used in child support calculations',
    maxSizeMB: 25,
  },
  medical_records_children: {
    name: "Children's Medical Records",
    category: 'optional',
    description: 'Medical records for children with special needs',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents special medical needs and expenses',
    maxSizeMB: 50,
  },
  extracurricular_expenses: {
    name: 'Extracurricular Activity Expenses',
    category: 'optional',
    description: 'Documentation of sports, lessons, activities',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'May be included in support calculations',
    maxSizeMB: 25,
  },
  current_custody_order: {
    name: 'Current Custody Order',
    category: 'required',
    description: 'Existing court orders regarding custody',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Required for custody modification cases',
    maxSizeMB: 25,
  },

  // Insurance
  health_insurance_cards: {
    name: 'Health Insurance Cards',
    category: 'optional',
    description: 'Health insurance cards for family',
    acceptableFormats: ['PDF', 'JPG', 'PNG'],
    whyNeeded: 'Documents current coverage',
    maxSizeMB: 5,
  },
  life_insurance_policies: {
    name: 'Life Insurance Policies',
    category: 'optional',
    description: 'Life insurance policy documents',
    acceptableFormats: ['PDF'],
    whyNeeded: 'May have cash value or beneficiary considerations',
    maxSizeMB: 25,
  },

  // Debt Documents
  student_loan_statements: {
    name: 'Student Loan Statements',
    category: 'optional',
    description: 'Statements showing student loan balances',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents educational debt',
    maxSizeMB: 25,
  },
  other_loan_documents: {
    name: 'Other Loan Documents',
    category: 'optional',
    description: 'Personal loans, lines of credit, etc.',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Documents other debts for division',
    maxSizeMB: 25,
  },

  // Trust & Estate
  trust_documents: {
    name: 'Trust Documents',
    category: 'optional',
    description: 'Any trust agreements where spouse is beneficiary or trustee',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Trust assets may be marital or separate property',
    maxSizeMB: 50,
  },
  inheritance_documents: {
    name: 'Inheritance Documentation',
    category: 'optional',
    description: 'Documentation of any inheritance received',
    acceptableFormats: ['PDF'],
    whyNeeded: 'Inheritance may be separate property',
    maxSizeMB: 25,
  },
}

// Document type keys
export type DocumentType = keyof typeof DOCUMENT_TYPES

// Intake document record
export interface IntakeDocument {
  id: string
  intake_id: string
  document_type: DocumentType
  document_category: DocumentCategory
  file_path?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  upload_status: DocumentUploadStatus
  ai_verification: AIVerificationResult
  ai_extracted_data: Record<string, unknown>
  ai_confidence?: number
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  rejection_reason?: string
  upload_date?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
}

// AI verification result
export interface AIVerificationResult {
  verified: boolean
  confidence: number
  document_type_match: boolean
  extracted_data: Record<string, unknown>
  issues: string[]
  quality_score: number
  processing_time_ms?: number
}

// Document checklist item
export interface DocumentChecklistItem {
  type: DocumentType
  config: DocumentTypeConfig
  status: DocumentUploadStatus
  document?: IntakeDocument
}

// Generated document checklist
export interface DocumentChecklist {
  required: DocumentChecklistItem[]
  recommended: DocumentChecklistItem[]
  optional: DocumentChecklistItem[]
  totalRequired: number
  totalRecommended: number
  totalOptional: number
  uploadedRequired: number
  uploadedRecommended: number
  uploadedOptional: number
  progressPercentage: number
}

// AI analysis result
export interface IntakeAIAnalysis {
  id: string
  intake_id: string
  complexity_score: number
  flags: AIFlag[]
  recommendations: string[]
  missing_information: MissingInfo[]
  data_inconsistencies: DataInconsistency[]
  document_data_matches: Record<string, boolean>
  analyzed_at: string
  analysis_version: string
}

// AI flag
export interface AIFlag {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  field?: string
  details?: Record<string, unknown>
}

// Missing information
export interface MissingInfo {
  field: string
  section: string
  description: string
  importance: 'required' | 'recommended'
}

// Data inconsistency
export interface DataInconsistency {
  field1: string
  field2: string
  description: string
  values: [unknown, unknown]
}

// Document template
export interface DocumentTemplate {
  id: string
  template_name: string
  display_name: string
  description?: string
  document_types_json: Array<{ type: DocumentType; category: DocumentCategory }>
  case_type?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Checklist generation request
export interface GenerateChecklistRequest {
  intake_id: string
  template_override?: string
}

// Document upload request
export interface DocumentUploadRequest {
  intake_id: string
  document_type: DocumentType
  file: File
}

// Progress summary
export interface IntakeProgressSummary {
  intake_submitted: boolean
  intake_submitted_at?: string
  documents_required: number
  documents_uploaded: number
  documents_verified: number
  documents_rejected: number
  ai_analysis_complete: boolean
  ai_complexity_score?: number
  attorney_review_status: 'pending' | 'in_progress' | 'complete'
  case_created: boolean
  next_action?: string
}
