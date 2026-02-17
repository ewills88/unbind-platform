// Court Forms, Filing Checklists & Hearings Types
// Session 18 CP3

// ============================================================
// FORM TYPES
// ============================================================

export type FormCategory =
  | 'petition'
  | 'response'
  | 'financial'
  | 'custody'
  | 'support'
  | 'disclosure'
  | 'motion'
  | 'judgment'
  | 'other'

export type FilledFormStatus = 'draft' | 'review' | 'finalized' | 'filed'

export type ChecklistItemStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'not_applicable'
  | 'waived'

export type ChecklistPhase =
  | 'filing'
  | 'response'
  | 'disclosure'
  | 'discovery'
  | 'settlement'
  | 'trial'
  | 'judgment'
  | 'post_judgment'

export type CaseType = 'dissolution' | 'legal_separation' | 'nullity' | 'paternity'

export type HearingType =
  | 'status_conference'
  | 'cmc'
  | 'rfo'
  | 'motion'
  | 'osc'
  | 'settlement_conference'
  | 'msc'
  | 'trial'
  | 'prove_up'
  | 'default'
  | 'other'

export type HearingStatus = 'scheduled' | 'confirmed' | 'continued' | 'vacated' | 'completed'

export type AppearanceType = 'in_person' | 'remote' | 'telephonic' | 'hybrid'

export type HearingPrepTaskType =
  | 'document_prep'
  | 'client_prep'
  | 'witness_prep'
  | 'exhibit_prep'
  | 'brief'
  | 'other'

export type HearingPrepTaskStatus = 'pending' | 'in_progress' | 'complete'

// ============================================================
// INTERFACES
// ============================================================

export interface CourtForm {
  id: string
  state_code: string
  county: string | null
  form_number: string
  form_name: string
  form_category: FormCategory
  description: string | null
  pdf_template_url: string | null
  pdf_template_path: string | null
  fillable: boolean
  field_mappings: Record<string, string>
  instructions_url: string | null
  effective_date: string | null
  superseded_date: string | null
  superseded_by: string | null
  version: string | null
  page_count: number | null
  is_mandatory: boolean
  related_forms: string[]
  filing_types: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FormPacket {
  id: string
  state_code: string
  packet_name: string
  description: string | null
  form_ids: string[]
  filing_type_code: string | null
  case_phase: string | null
  is_mandatory: boolean
  display_order: number
  notes: string | null
  created_at: string
  // Joined
  forms?: CourtForm[]
}

export interface FilledForm {
  id: string
  case_id: string
  firm_id: string
  form_id: string
  form_number: string
  form_name: string
  field_values: Record<string, unknown>
  overrides: Record<string, unknown>
  filled_pdf_path: string | null
  filled_pdf_url: string | null
  status: FilledFormStatus
  version: number
  generated_at: string | null
  generated_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  filed_with_filing_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  name: string
  description: string
  forms?: string[]
  filing_type?: string
  is_mandatory: boolean
  condition?: string
  prerequisites: string[]
  deadline_rule?: { days: number; from: string }
  tips?: string[]
  // Progress (merged from case_checklist_progress)
  status?: ChecklistItemStatus
  filing_id?: string | null
  completed_date?: string | null
  deadline_date?: string | null
  notes?: string | null
}

export interface FilingChecklist {
  id: string
  state_code: string
  case_type: CaseType
  checklist_name: string
  phase: ChecklistPhase
  description: string | null
  items: ChecklistItem[]
  estimated_days: number | null
  display_order: number
  created_at: string
}

export interface CaseChecklistProgress {
  id: string
  case_id: string
  checklist_id: string
  item_id: string
  item_name: string | null
  status: ChecklistItemStatus
  filing_id: string | null
  deadline_date: string | null
  completed_date: string | null
  completed_by: string | null
  waiver_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CourtHearing {
  id: string
  case_id: string
  firm_id: string
  hearing_type: HearingType
  hearing_name: string
  hearing_date: string
  hearing_time: string | null
  estimated_duration: string | null
  court_id: string | null
  department: string | null
  judge_name: string | null
  appearance_type: AppearanceType
  remote_link: string | null
  remote_phone: string | null
  remote_access_code: string | null
  related_filing_id: string | null
  issues_to_be_heard: string[]
  our_position: string | null
  their_position: string | null
  status: HearingStatus
  continued_to_date: string | null
  continued_to_hearing_id: string | null
  continuance_reason: string | null
  outcome: string | null
  outcome_details: string | null
  orders_issued: string | null
  order_document_id: string | null
  minutes_document_id: string | null
  next_hearing_date: string | null
  tentative_ruling: string | null
  tentative_ruling_url: string | null
  prep_notes: string | null
  client_prep_complete: boolean
  documents_prepared: boolean
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  court?: { court_name: string; county: string } | null
  related_filing?: { id: string; filing_name: string } | null
  prep_tasks?: HearingPrepTask[]
  exhibits?: HearingExhibit[]
}

export interface HearingPrepTask {
  id: string
  hearing_id: string
  task_title: string
  task_description: string | null
  task_type: HearingPrepTaskType
  due_date: string | null
  assigned_to: string | null
  status: HearingPrepTaskStatus
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  created_at: string
}

export interface HearingExhibit {
  id: string
  hearing_id: string
  exhibit_number: string | null
  document_id: string | null
  description: string | null
  offered_by: 'petitioner' | 'respondent' | null
  admitted: boolean | null
  objection: string | null
  ruling: string | null
  notes: string | null
  display_order: number
  created_at: string
}

// ============================================================
// CONSTANTS
// ============================================================

export const FORM_CATEGORY_INFO: Record<FormCategory, { label: string; color: string }> = {
  petition: { label: 'Petition', color: 'bg-blue-100 text-blue-700' },
  response: { label: 'Response', color: 'bg-purple-100 text-purple-700' },
  financial: { label: 'Financial', color: 'bg-green-100 text-green-700' },
  custody: { label: 'Custody', color: 'bg-orange-100 text-orange-700' },
  support: { label: 'Support', color: 'bg-yellow-100 text-yellow-700' },
  disclosure: { label: 'Disclosure', color: 'bg-indigo-100 text-indigo-700' },
  motion: { label: 'Motion', color: 'bg-red-100 text-red-700' },
  judgment: { label: 'Judgment', color: 'bg-emerald-100 text-emerald-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
}

export const FILLED_FORM_STATUS_INFO: Record<FilledFormStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  review: { label: 'In Review', color: 'bg-yellow-100 text-yellow-700' },
  finalized: { label: 'Finalized', color: 'bg-green-100 text-green-700' },
  filed: { label: 'Filed', color: 'bg-blue-100 text-blue-700' },
}

export const CHECKLIST_ITEM_STATUS_INFO: Record<ChecklistItemStatus, { label: string; color: string; icon: string }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-600', icon: 'circle' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: 'clock' },
  complete: { label: 'Complete', color: 'bg-green-100 text-green-700', icon: 'check-circle' },
  not_applicable: { label: 'N/A', color: 'bg-gray-100 text-gray-500', icon: 'minus-circle' },
  waived: { label: 'Waived', color: 'bg-orange-100 text-orange-700', icon: 'x-circle' },
}

export const CHECKLIST_PHASE_INFO: Record<ChecklistPhase, { label: string; description: string; color: string }> = {
  filing: { label: 'Filing', description: 'Initiate proceedings', color: 'bg-blue-100 text-blue-700' },
  response: { label: 'Response', description: 'Respond to petition', color: 'bg-purple-100 text-purple-700' },
  disclosure: { label: 'Disclosure', description: 'Financial disclosures', color: 'bg-indigo-100 text-indigo-700' },
  discovery: { label: 'Discovery', description: 'Discovery phase', color: 'bg-cyan-100 text-cyan-700' },
  settlement: { label: 'Settlement', description: 'Settlement negotiations', color: 'bg-green-100 text-green-700' },
  trial: { label: 'Trial', description: 'Trial preparation', color: 'bg-red-100 text-red-700' },
  judgment: { label: 'Judgment', description: 'Finalize judgment', color: 'bg-emerald-100 text-emerald-700' },
  post_judgment: { label: 'Post-Judgment', description: 'After judgment entered', color: 'bg-gray-100 text-gray-700' },
}

export const HEARING_TYPE_INFO: Record<HearingType, { label: string; description: string }> = {
  status_conference: { label: 'Status Conference', description: 'Review case progress' },
  cmc: { label: 'Case Management Conference', description: 'Set case timeline and procedures' },
  rfo: { label: 'Request for Order', description: 'Hearing on temporary orders' },
  motion: { label: 'Motion Hearing', description: 'Hearing on filed motion' },
  osc: { label: 'Order to Show Cause', description: 'Show cause hearing' },
  settlement_conference: { label: 'Settlement Conference', description: 'Court-facilitated settlement discussion' },
  msc: { label: 'Mandatory Settlement Conference', description: 'Required pre-trial settlement conference' },
  trial: { label: 'Trial', description: 'Full trial hearing' },
  prove_up: { label: 'Prove-Up Hearing', description: 'Default or uncontested prove-up' },
  default: { label: 'Default Hearing', description: 'Default judgment hearing' },
  other: { label: 'Other', description: 'Other hearing type' },
}

export const HEARING_STATUS_INFO: Record<HearingStatus, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
  continued: { label: 'Continued', color: 'bg-yellow-100 text-yellow-700' },
  vacated: { label: 'Vacated', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600' },
}

export const APPEARANCE_TYPE_INFO: Record<AppearanceType, { label: string; icon: string }> = {
  in_person: { label: 'In Person', icon: 'building' },
  remote: { label: 'Remote / Video', icon: 'video' },
  telephonic: { label: 'Telephonic', icon: 'phone' },
  hybrid: { label: 'Hybrid', icon: 'monitor' },
}

export const HEARING_PREP_TASK_TYPE_INFO: Record<HearingPrepTaskType, { label: string }> = {
  document_prep: { label: 'Document Preparation' },
  client_prep: { label: 'Client Preparation' },
  witness_prep: { label: 'Witness Preparation' },
  exhibit_prep: { label: 'Exhibit Preparation' },
  brief: { label: 'Brief / Memorandum' },
  other: { label: 'Other' },
}

// ============================================================
// HELPERS
// ============================================================

export function getHearingUrgency(hearingDate: string): 'today' | 'tomorrow' | 'this_week' | 'upcoming' | 'past' {
  const now = new Date()
  const date = new Date(hearingDate)
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'past'
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays <= 7) return 'this_week'
  return 'upcoming'
}

export function formatHearingCountdown(hearingDate: string): string {
  const now = new Date()
  const date = new Date(hearingDate)
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `In ${diffDays} days`
}

export function getChecklistProgress(items: ChecklistItem[]): {
  complete: number
  total: number
  mandatoryComplete: number
  mandatoryTotal: number
  percentage: number
} {
  const mandatoryItems = items.filter(i => i.is_mandatory)
  const complete = items.filter(i => i.status === 'complete').length
  const mandatoryComplete = mandatoryItems.filter(i => i.status === 'complete').length
  const mandatoryTotal = mandatoryItems.length

  return {
    complete,
    total: items.length,
    mandatoryComplete,
    mandatoryTotal,
    percentage: mandatoryTotal > 0 ? Math.round((mandatoryComplete / mandatoryTotal) * 100) : 0,
  }
}
