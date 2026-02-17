// Court Filing System Types
// Session 18: Court Filing & E-Filing Integration

// ============================================================
// STATUS & CATEGORY TYPES
// ============================================================

export type FilingStatus =
  | 'draft'
  | 'ready'
  | 'filed'
  | 'served'
  | 'completed'
  | 'rejected'
  | 'withdrawn'

export type FilingCategory =
  | 'petition'
  | 'response'
  | 'motion'
  | 'discovery'
  | 'financial'
  | 'custody'
  | 'settlement'
  | 'other'

export type FilingMethod =
  | 'in_person'
  | 'efiling'
  | 'mail'
  | 'drop_box'

export type ServiceMethod =
  | 'personal'
  | 'substituted'
  | 'mail'
  | 'electronic'
  | 'publication'
  | 'posting'

export type ServiceStatus =
  | 'pending'
  | 'attempted'
  | 'completed'
  | 'failed'

export type DeadlineStatus =
  | 'upcoming'
  | 'completed'
  | 'overdue'
  | 'waived'
  | 'extended'

export type DeadlineType =
  | 'filing'
  | 'response'
  | 'hearing'
  | 'service'
  | 'court_order'
  | 'statute'

export type DeadlinePriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical'

export type FilingPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'

export type CourtType =
  | 'superior'
  | 'family'
  | 'district'
  | 'circuit'

export type DocumentType =
  | 'primary'
  | 'exhibit'
  | 'attachment'
  | 'proof_of_service'
  | 'proposed_order'

// ============================================================
// INTERFACES
// ============================================================

export interface Court {
  id: string
  state_code: string
  county: string
  court_name: string
  court_type: CourtType
  address: string | null
  city: string | null
  zip: string | null
  phone: string | null
  website: string | null
  efiling_url: string | null
  efiling_provider: string | null
  efiling_enabled: boolean
  local_rules_url: string | null
  clerk_email: string | null
  filing_hours: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AutoDeadlineRule {
  name: string
  days: number
  is_working_days: boolean
  description: string
}

export interface FilingType {
  id: string
  state_code: string
  category: FilingCategory
  filing_code: string
  filing_name: string
  description: string | null
  fee_amount: number
  fee_waiver_eligible: boolean
  response_days: number | null
  is_working_days: boolean
  requires_service: boolean
  service_methods: ServiceMethod[]
  requires_hearing: boolean
  hearing_days_after: number | null
  auto_deadlines: AutoDeadlineRule[]
  form_url: string | null
  instructions: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface CaseFiling {
  id: string
  case_id: string
  filing_type_id: string | null
  court_id: string | null
  firm_id: string | null
  filing_code: string | null
  filing_name: string
  description: string | null
  category: FilingCategory
  status: FilingStatus
  filed_date: string | null
  filed_by: string | null
  rejection_reason: string | null
  case_number: string | null
  filing_number: string | null
  confirmation_number: string | null
  filing_method: FilingMethod
  filing_fee: number
  fee_paid: boolean
  fee_waiver_requested: boolean
  fee_waiver_granted: boolean | null
  hearing_date: string | null
  hearing_location: string | null
  hearing_notes: string | null
  notes: string | null
  priority: FilingPriority
  created_by: string
  created_at: string
  updated_at: string
  // Joined
  filing_type?: FilingType
  court?: Court
  documents?: FilingDocument[]
  service_records?: ServiceRecord[]
  deadlines?: FilingDeadline[]
}

export interface FilingDocument {
  id: string
  filing_id: string
  document_name: string
  document_type: DocumentType
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  page_count: number | null
  is_conformed: boolean
  conformed_file_path: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface ServiceRecord {
  id: string
  filing_id: string
  case_id: string
  served_party_name: string
  served_party_role: string
  served_party_address: string | null
  served_party_email: string | null
  service_method: ServiceMethod
  service_status: ServiceStatus
  service_date: string | null
  service_attempts: number
  server_name: string | null
  server_company: string | null
  server_license: string | null
  server_fee: number
  proof_filed: boolean
  proof_file_path: string | null
  proof_filed_date: string | null
  response_due_date: string | null
  response_received: boolean
  response_date: string | null
  default_eligible_date: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface FilingDeadline {
  id: string
  case_id: string
  filing_id: string | null
  firm_id: string | null
  deadline_name: string
  description: string | null
  deadline_date: string
  deadline_type: DeadlineType
  priority: DeadlinePriority
  status: DeadlineStatus
  source_type: string | null
  source_filing_id: string | null
  calculation_rule: string | null
  is_working_days: boolean
  completed_date: string | null
  completed_by: string | null
  completed_filing_id: string | null
  reminder_days: number[]
  last_reminder_sent: string | null
  original_date: string | null
  extension_reason: string | null
  extension_granted_by: string | null
  assigned_to: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CourtHoliday {
  id: string
  state_code: string
  court_id: string | null
  holiday_date: string
  holiday_name: string
  is_federal: boolean
  year: number
  created_at: string
}

// ============================================================
// CONSTANTS
// ============================================================

export const FILING_STATUS_INFO: Record<FilingStatus, { label: string; color: string; description: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', description: 'Filing is being prepared' },
  ready: { label: 'Ready to File', color: 'bg-blue-100 text-blue-700', description: 'Filing is ready for submission' },
  filed: { label: 'Filed', color: 'bg-purple-100 text-purple-700', description: 'Filed with the court' },
  served: { label: 'Served', color: 'bg-indigo-100 text-indigo-700', description: 'Filed and served on opposing party' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', description: 'Filing process complete' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', description: 'Rejected by the court' },
  withdrawn: { label: 'Withdrawn', color: 'bg-yellow-100 text-yellow-700', description: 'Filing withdrawn' },
}

export const FILING_CATEGORY_INFO: Record<FilingCategory, { label: string; icon: string; description: string }> = {
  petition: { label: 'Petition', icon: 'FileText', description: 'Initial petitions and complaints' },
  response: { label: 'Response', icon: 'Reply', description: 'Answers and responses' },
  motion: { label: 'Motion', icon: 'Gavel', description: 'Motions and requests for orders' },
  discovery: { label: 'Discovery', icon: 'Search', description: 'Discovery requests and responses' },
  financial: { label: 'Financial', icon: 'DollarSign', description: 'Financial disclosures and declarations' },
  custody: { label: 'Custody', icon: 'Users', description: 'Custody and visitation filings' },
  settlement: { label: 'Settlement', icon: 'Handshake', description: 'Settlement agreements and judgments' },
  other: { label: 'Other', icon: 'File', description: 'Other court filings' },
}

export const SERVICE_METHOD_INFO: Record<ServiceMethod, { label: string; description: string }> = {
  personal: { label: 'Personal Service', description: 'Delivered directly to the individual' },
  substituted: { label: 'Substituted Service', description: 'Left with someone at home/work + mailed' },
  mail: { label: 'Service by Mail', description: 'Sent by certified or first-class mail' },
  electronic: { label: 'Electronic Service', description: 'Served electronically (email/e-service)' },
  publication: { label: 'Service by Publication', description: 'Published in newspaper (when party cannot be found)' },
  posting: { label: 'Service by Posting', description: 'Posted at court (when authorized)' },
}

export const SERVICE_STATUS_INFO: Record<ServiceStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  attempted: { label: 'Attempted', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
}

export const DEADLINE_STATUS_INFO: Record<DeadlineStatus, { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
  waived: { label: 'Waived', color: 'bg-gray-100 text-gray-500' },
  extended: { label: 'Extended', color: 'bg-orange-100 text-orange-700' },
}

export const DEADLINE_PRIORITY_INFO: Record<DeadlinePriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-600' },
}

export const FILING_METHOD_INFO: Record<FilingMethod, { label: string; description: string }> = {
  in_person: { label: 'In Person', description: 'Filed at court clerk counter' },
  efiling: { label: 'E-Filing', description: 'Filed electronically through court system' },
  mail: { label: 'By Mail', description: 'Mailed to court clerk' },
  drop_box: { label: 'Drop Box', description: 'Left in court drop box' },
}

export const FILING_PRIORITY_INFO: Record<FilingPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function formatFilingFee(amount: number): string {
  if (amount === 0) return 'No fee'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function getFilingStatusColor(status: FilingStatus): string {
  return FILING_STATUS_INFO[status]?.color || 'bg-gray-100 text-gray-600'
}

export function getDeadlineUrgency(deadlineDate: string): 'overdue' | 'critical' | 'soon' | 'normal' {
  const now = new Date()
  const deadline = new Date(deadlineDate)
  const diffMs = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'critical'
  if (diffDays <= 7) return 'soon'
  return 'normal'
}

export function getDeadlineUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'overdue': return 'text-red-600 bg-red-50 border-red-200'
    case 'critical': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'soon': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function getDaysUntilDeadline(deadlineDate: string): number {
  const now = new Date()
  const deadline = new Date(deadlineDate)
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDeadlineCountdown(deadlineDate: string): string {
  const days = getDaysUntilDeadline(deadlineDate)
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `${days} day${days !== 1 ? 's' : ''} remaining`
}
