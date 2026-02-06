// Document Collaboration Types
// Session 10 Checkpoint 3: Version Control, Collaboration, Multi-State Support

import { FilledDocumentData, CustomDocumentContent } from './document-templates'

// Document Version
export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  is_major_version: boolean

  content_snapshot: {
    title: string
    status: string
    file_path?: string
  }
  filled_data_snapshot?: FilledDocumentData
  custom_content_snapshot?: CustomDocumentContent

  changes_summary?: string
  changes_diff?: Record<string, unknown>

  created_by: string
  created_at: string

  // Joined
  created_by_user?: {
    id: string
    full_name: string
  }
}

// Document Comment
export interface DocumentComment {
  id: string
  document_id: string

  content: string
  position_start?: number
  position_end?: number
  section_id?: string

  parent_comment_id?: string

  resolved: boolean
  resolved_by?: string
  resolved_at?: string

  mentioned_users?: string[]

  created_by: string
  created_at: string
  updated_at: string

  // Joined
  created_by_user?: {
    id: string
    full_name: string
    email: string
  }
  resolved_by_user?: {
    id: string
    full_name: string
  }
  replies?: DocumentComment[]
}

// Document Assignment
export interface DocumentAssignment {
  id: string
  document_id: string

  assigned_to: string
  assigned_by: string

  role: 'reviewer' | 'approver' | 'signer'
  status: 'pending' | 'in_progress' | 'completed' | 'declined'

  due_date?: string
  completed_at?: string
  notes?: string

  created_at: string

  // Joined
  assigned_to_user?: {
    id: string
    full_name: string
    email: string
  }
  assigned_by_user?: {
    id: string
    full_name: string
  }
}

// Document Signature
export interface DocumentSignature {
  id: string
  document_id: string

  signer_id?: string
  signer_name: string
  signer_email?: string

  signature_image_path?: string
  signature_data?: string

  signed_at: string
  ip_address?: string
  user_agent?: string

  external_signature_id?: string
  external_service?: 'docusign' | 'hellosign' | 'native'

  status: 'pending' | 'signed' | 'declined' | 'expired'

  created_at: string
}

// State Requirements
export interface StateRequirements {
  id: string
  state_code: string
  state_name: string

  residency_months: number
  county_residency_months: number
  waiting_period_days: number

  community_property: boolean
  equitable_distribution: boolean

  required_forms: string[]
  optional_forms: string[]

  filing_portal_url?: string
  filing_instructions?: string

  is_active: boolean
  last_updated: string
}

// Document Package (for bulk generation)
export interface DocumentPackage {
  id: string
  case_id: string

  package_name: string
  package_type?: 'initial_filing' | 'discovery' | 'trial_prep' | 'final_judgment'

  status: 'pending' | 'generating' | 'completed' | 'failed'

  document_ids: string[]

  zip_file_path?: string
  cover_sheet_path?: string

  created_by: string
  created_at: string
  completed_at?: string
}

// Document Analytics
export interface DocumentAnalytics {
  id: string
  period_start: string
  period_end: string

  template_id?: string
  template_code?: string

  documents_generated: number
  avg_generation_time_seconds?: number
  avg_edits_per_document?: number
  success_rate?: number

  generated_by_attorneys: number
  generated_by_paralegals: number

  created_at: string
}

// Workflow Status
export type WorkflowStatus =
  | 'draft'
  | 'paralegal_review'
  | 'attorney_review'
  | 'client_review'
  | 'pending_signature'
  | 'final_approval'
  | 'filed'

// Workflow Action
export interface WorkflowAction {
  action: 'submit_for_review' | 'request_changes' | 'approve' | 'reject' | 'request_signature' | 'mark_filed'
  from_status: WorkflowStatus
  to_status: WorkflowStatus
  allowed_roles: ('attorney' | 'paralegal' | 'client')[]
}

// Workflow transitions
export const WORKFLOW_TRANSITIONS: WorkflowAction[] = [
  { action: 'submit_for_review', from_status: 'draft', to_status: 'attorney_review', allowed_roles: ['attorney', 'paralegal'] },
  { action: 'request_changes', from_status: 'attorney_review', to_status: 'draft', allowed_roles: ['attorney'] },
  { action: 'approve', from_status: 'attorney_review', to_status: 'final_approval', allowed_roles: ['attorney'] },
  { action: 'request_signature', from_status: 'final_approval', to_status: 'pending_signature', allowed_roles: ['attorney'] },
  { action: 'mark_filed', from_status: 'final_approval', to_status: 'filed', allowed_roles: ['attorney'] },
  { action: 'mark_filed', from_status: 'pending_signature', to_status: 'filed', allowed_roles: ['attorney'] },
]

// Package Template
export interface PackageTemplate {
  id: string
  name: string
  description: string
  package_type: string
  state_code: string
  template_codes: string[]
  instructions: string
}

// Common package templates
export const PACKAGE_TEMPLATES: PackageTemplate[] = [
  {
    id: 'ca-initial-filing',
    name: 'California Initial Filing Package',
    description: 'All documents needed to file for divorce in California',
    package_type: 'initial_filing',
    state_code: 'CA',
    template_codes: ['CA-FL100', 'CA-FL110', 'CA-FL150'],
    instructions: 'File the Petition (FL-100) and Summons (FL-110) together. The Income & Expense Declaration (FL-150) must be served within 60 days.'
  },
  {
    id: 'ca-financial-disclosure',
    name: 'California Financial Disclosure Package',
    description: 'Required financial disclosure forms',
    package_type: 'discovery',
    state_code: 'CA',
    template_codes: ['CA-FL150', 'CA-FL160'],
    instructions: 'Both parties must exchange these disclosures. Keep proof of service.'
  },
  {
    id: 'tx-initial-filing',
    name: 'Texas Initial Filing Package',
    description: 'All documents needed to file for divorce in Texas',
    package_type: 'initial_filing',
    state_code: 'TX',
    template_codes: ['TX-PETITION', 'TX-WAIVER'],
    instructions: 'File the Original Petition. If spouse agrees, use Waiver of Citation instead of formal service.'
  },
  {
    id: 'fl-initial-filing',
    name: 'Florida Initial Filing Package',
    description: 'All documents needed to file for divorce in Florida',
    package_type: 'initial_filing',
    state_code: 'FL',
    template_codes: ['FL-12901A', 'FL-12902B'],
    instructions: 'File the Petition (12.901a) with the Financial Affidavit. Use Short Form (12.902b) if income under $50k.'
  }
]

// Analytics summary for dashboard
export interface AnalyticsSummary {
  total_documents_generated: number
  documents_this_month: number
  month_over_month_change: number

  avg_generation_time_minutes: number
  time_saved_vs_manual_hours: number

  most_used_template: {
    template_code: string
    template_name: string
    usage_count: number
  }

  by_document_type: {
    type: string
    count: number
    percentage: number
  }[]

  by_state: {
    state_code: string
    count: number
  }[]

  recent_documents: {
    id: string
    title: string
    template_code: string
    created_at: string
    status: string
  }[]
}

// API Request/Response types

export interface CreateVersionRequest {
  changes_summary?: string
  is_major_version?: boolean
}

export interface CreateCommentRequest {
  content: string
  position_start?: number
  position_end?: number
  section_id?: string
  parent_comment_id?: string
  mentioned_users?: string[]
}

export interface CreateAssignmentRequest {
  assigned_to: string
  role: 'reviewer' | 'approver' | 'signer'
  due_date?: string
  notes?: string
}

export interface RequestSignatureRequest {
  signer_name: string
  signer_email: string
  service?: 'docusign' | 'hellosign' | 'native'
}

export interface GeneratePackageRequest {
  package_name: string
  package_type?: string
  template_codes: string[]
}

// Helper functions

export function canTransition(
  currentStatus: WorkflowStatus,
  action: WorkflowAction['action'],
  userRole: 'attorney' | 'paralegal' | 'client'
): boolean {
  const transition = WORKFLOW_TRANSITIONS.find(
    t => t.from_status === currentStatus && t.action === action
  )

  if (!transition) return false

  return transition.allowed_roles.includes(userRole)
}

export function getAvailableActions(
  currentStatus: WorkflowStatus,
  userRole: 'attorney' | 'paralegal' | 'client'
): WorkflowAction[] {
  return WORKFLOW_TRANSITIONS.filter(
    t => t.from_status === currentStatus && t.allowed_roles.includes(userRole)
  )
}

export function formatVersionDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}
