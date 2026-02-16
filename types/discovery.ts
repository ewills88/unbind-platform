// Session 16: Discovery Management Types
// Discovery request tracking, deadline calculation, extensions

// Discovery types
export type DiscoveryType =
  | 'interrogatory_form'
  | 'interrogatory_special'
  | 'rfp'
  | 'rfa'
  | 'subpoena'
  | 'deposition_notice'

// Direction of discovery
export type DiscoveryDirection = 'outgoing' | 'incoming'

// Service method
export type ServiceMethod = 'personal' | 'mail' | 'electronic' | 'email'

// Discovery status
export type DiscoveryStatus =
  | 'pending'
  | 'in_progress'
  | 'responded'
  | 'overdue'
  | 'objected'
  | 'motion_filed'

// Urgency level for deadline display
export type DeadlineUrgency = 'normal' | 'warning' | 'urgent' | 'overdue'

// Discovery request record
export interface DiscoveryRequest {
  id: string
  case_id: string
  firm_id: string | null
  discovery_type: DiscoveryType
  direction: DiscoveryDirection
  set_number: string
  title: string
  propounding_party: string | null
  responding_party: string | null
  served_date: string | null
  service_method: ServiceMethod | null
  response_due_date: string | null
  extended_due_date: string | null
  actual_response_date: string | null
  status: DiscoveryStatus
  item_count: number
  notes: string | null
  reminder_sent: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  extensions?: DiscoveryExtension[]
  // Computed (added by API)
  days_until_due?: number
  urgency?: DeadlineUrgency
  effective_due_date?: string
}

// State discovery rule
export interface StateDiscoveryRule {
  id: string
  state_code: string
  discovery_type: string
  base_response_days: number
  mail_additional_days: number
  electronic_additional_days: number
  personal_service_days: number
  deemed_admitted: boolean
  max_interrogatories: number | null
  statutory_reference: string | null
  notes: string | null
}

// Discovery extension
export interface DiscoveryExtension {
  id: string
  discovery_request_id: string
  original_due_date: string
  requested_extension_days: number
  new_due_date: string
  requested_date: string | null
  granted_date: string | null
  granted_by: string | null
  reason: string | null
  stipulation_document_id: string | null
  created_by: string | null
  created_at: string
}

// Deadline calculation result
export interface DeadlineResult {
  dueDate: string
  baseDays: number
  additionalDays: number
  totalDays: number
  statutoryReference: string
  warnings: string[]
  isRFADeemedAdmitted: boolean
}

// Create discovery request payload
export interface CreateDiscoveryRequest {
  discovery_type: DiscoveryType
  direction: DiscoveryDirection
  set_number: string
  title?: string
  propounding_party?: string
  responding_party?: string
  served_date: string
  service_method: ServiceMethod
  item_count?: number
  notes?: string
}

// Extension request payload
export interface CreateExtensionRequest {
  extension_days: number
  reason: string
  granted: boolean
  granted_by?: string
  stipulation_document_id?: string
}

// Discovery type metadata
export const DISCOVERY_TYPE_INFO: Record<DiscoveryType, {
  label: string
  shortLabel: string
  description: string
}> = {
  interrogatory_form: {
    label: 'Form Interrogatories',
    shortLabel: 'Form Interrog.',
    description: 'Standard pre-approved questions from the court',
  },
  interrogatory_special: {
    label: 'Special Interrogatories',
    shortLabel: 'Special Interrog.',
    description: 'Custom questions specific to the case',
  },
  rfp: {
    label: 'Request for Production (RFP)',
    shortLabel: 'RFP',
    description: 'Request to produce documents, records, or tangible items',
  },
  rfa: {
    label: 'Request for Admissions (RFA)',
    shortLabel: 'RFA',
    description: 'Request to admit or deny specific facts',
  },
  subpoena: {
    label: 'Subpoena Duces Tecum',
    shortLabel: 'Subpoena',
    description: 'Third-party subpoena for documents or testimony',
  },
  deposition_notice: {
    label: 'Notice of Deposition',
    shortLabel: 'Depo Notice',
    description: 'Notice scheduling a deposition',
  },
}

// Service method metadata
export const SERVICE_METHOD_INFO: Record<ServiceMethod, {
  label: string
  description: string
}> = {
  personal: { label: 'Personal Service', description: 'Hand-delivered to party' },
  mail: { label: 'U.S. Mail', description: 'Sent via standard mail' },
  electronic: { label: 'Electronic Service', description: 'Filed electronically via court system' },
  email: { label: 'Email', description: 'Served via email' },
}

// Discovery status metadata
export const DISCOVERY_STATUS_INFO: Record<DiscoveryStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  responded: { label: 'Responded', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  overdue: { label: 'OVERDUE', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  objected: { label: 'Objected', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  motion_filed: { label: 'Motion Filed', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
}

// Set number options
export const SET_NUMBER_OPTIONS = [
  'Set One',
  'Set Two',
  'Set Three',
  'Set Four',
  'Set Five',
  'Supplemental',
]

// Helper to generate a title from type, set number, and direction
export function generateDiscoveryTitle(
  type: DiscoveryType,
  setNumber: string,
  direction: DiscoveryDirection
): string {
  const typeName = DISCOVERY_TYPE_INFO[type]?.label || type
  const prefix = direction === 'outgoing' ? 'Our ' : ''
  return `${prefix}${typeName}, ${setNumber}`
}

// ============================================================================
// Discovery Items (Checkpoint 2)
// ============================================================================

// Item status
export type DiscoveryItemStatus =
  | 'pending'
  | 'drafted'
  | 'reviewed'
  | 'finalized'
  | 'objected'

// Objection type
export type ObjectionType =
  | 'overbroad'
  | 'vague'
  | 'attorney_client'
  | 'work_product'
  | 'compound'
  | 'burdensome'
  | 'assumes_facts'
  | 'not_reasonably_particular'

// Discovery item record
export interface DiscoveryItem {
  id: string
  discovery_request_id: string
  item_number: number
  request_text: string
  response_text: string
  objection_text: string
  objection_type: string[]
  status: DiscoveryItemStatus
  assigned_to: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  documents_produced: string[]
  privilege_claimed: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

// Discovery item history entry
export interface DiscoveryItemHistory {
  id: string
  discovery_item_id: string
  field_changed: string
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  changed_at: string
}

// Objection template
export interface ObjectionTemplate {
  id: string
  objection_type: string
  state_code: string
  objection_text: string
  statutory_reference: string | null
  notes: string | null
}

// Item status metadata
export const ITEM_STATUS_INFO: Record<DiscoveryItemStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  pending: { label: 'Pending', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  drafted: { label: 'Drafted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  reviewed: { label: 'Reviewed', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  finalized: { label: 'Finalized', color: 'text-green-700', bgColor: 'bg-green-100' },
  objected: { label: 'Objected', color: 'text-red-700', bgColor: 'bg-red-100' },
}

// Objection type labels
export const OBJECTION_TYPE_LABELS: Record<string, string> = {
  overbroad: 'Overbroad',
  vague: 'Vague & Ambiguous',
  attorney_client: 'Attorney-Client Privilege',
  work_product: 'Work Product',
  compound: 'Compound',
  burdensome: 'Unduly Burdensome',
  assumes_facts: 'Assumes Facts',
  not_reasonably_particular: 'Not Reasonably Particular',
}

// Helper: get item type label for document
export function getItemTypeLabel(discoveryType: DiscoveryType): string {
  const labels: Record<string, string> = {
    interrogatory_form: 'FORM INTERROGATORY',
    interrogatory_special: 'SPECIAL INTERROGATORY',
    rfp: 'REQUEST FOR PRODUCTION',
    rfa: 'REQUEST FOR ADMISSION',
    subpoena: 'SUBPOENA REQUEST',
    deposition_notice: 'DEPOSITION NOTICE',
  }
  return labels[discoveryType] || 'REQUEST'
}

// ============================================================================
// Depositions (Checkpoint 3)
// ============================================================================

// Deponent type
export type DeponentType = 'party' | 'expert' | 'fact_witness' | 'corporate_representative'

// Deposition location type
export type DepositionLocationType = 'in_person' | 'remote' | 'hybrid'

// Deposition status
export type DepositionStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed'

// Testimony note type
export type TestimonyNoteType =
  | 'general'
  | 'key_admission'
  | 'impeachment'
  | 'follow_up'
  | 'objection'
  | 'exhibit_reference'

// Deposition record
export interface Deposition {
  id: string
  case_id: string
  discovery_request_id: string | null
  deponent_name: string
  deponent_type: DeponentType
  deponent_role: string | null
  scheduled_date: string | null
  scheduled_end_time: string | null
  location: string | null
  location_type: DepositionLocationType
  video_link: string | null
  court_reporter: string | null
  court_reporter_contact: string | null
  videographer: string | null
  status: DepositionStatus
  cancellation_reason: string | null
  duration_hours: number | null
  transcript_received: boolean
  transcript_date: string | null
  summary: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  topics?: DepositionTopic[]
  exhibits?: DepositionExhibit[]
  testimony_notes?: DepositionTestimonyNote[]
}

// Deposition exhibit
export interface DepositionExhibit {
  id: string
  deposition_id: string
  exhibit_number: string
  description: string
  document_id: string | null
  marked_by: string | null
  page_reference: string | null
  notes: string | null
  created_at: string
}

// Deposition prep topic
export interface DepositionTopic {
  id: string
  deposition_id: string
  topic: string
  priority: 'high' | 'medium' | 'low'
  estimated_minutes: number | null
  key_documents: string | null
  sample_questions: string | null
  covered: boolean
  notes: string | null
  sort_order: number
  created_at: string
}

// Deposition testimony note
export interface DepositionTestimonyNote {
  id: string
  deposition_id: string
  timestamp_marker: string | null
  page_line: string | null
  note_text: string
  note_type: TestimonyNoteType
  importance: 'high' | 'normal' | 'low'
  created_by: string | null
  created_at: string
}

// Deposition status metadata
export const DEPOSITION_STATUS_INFO: Record<DepositionStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  scheduled: { label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  confirmed: { label: 'Confirmed', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  in_progress: { label: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
  completed: { label: 'Completed', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  postponed: { label: 'Postponed', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
}

// Deponent type labels
export const DEPONENT_TYPE_INFO: Record<DeponentType, {
  label: string
  description: string
}> = {
  party: { label: 'Party', description: 'Petitioner or respondent in the case' },
  expert: { label: 'Expert Witness', description: 'Retained expert witness' },
  fact_witness: { label: 'Fact Witness', description: 'Non-party witness with relevant knowledge' },
  corporate_representative: { label: 'Corporate Rep (PMK)', description: 'Person most knowledgeable / corporate designee' },
}

// Location type labels
export const LOCATION_TYPE_INFO: Record<DepositionLocationType, {
  label: string
}> = {
  in_person: { label: 'In Person' },
  remote: { label: 'Remote (Video)' },
  hybrid: { label: 'Hybrid' },
}

// Testimony note type labels
export const NOTE_TYPE_INFO: Record<TestimonyNoteType, {
  label: string
  color: string
}> = {
  general: { label: 'General', color: 'text-gray-700' },
  key_admission: { label: 'Key Admission', color: 'text-green-700' },
  impeachment: { label: 'Impeachment', color: 'text-red-700' },
  follow_up: { label: 'Follow Up', color: 'text-blue-700' },
  objection: { label: 'Objection', color: 'text-orange-700' },
  exhibit_reference: { label: 'Exhibit Ref', color: 'text-purple-700' },
}

// ============================================================================
// Privilege Log (Checkpoint 3)
// ============================================================================

// Privilege type
export type PrivilegeType =
  | 'attorney_client'
  | 'work_product'
  | 'joint_defense'
  | 'spousal'
  | 'therapist_patient'
  | 'other'

// Privilege log entry
export interface PrivilegeLogEntry {
  id: string
  case_id: string
  discovery_request_id: string | null
  discovery_item_id: string | null
  entry_number: number
  document_date: string | null
  document_description: string
  document_type: string | null
  author: string
  recipients: string | null
  privilege_type: PrivilegeType
  privilege_basis: string
  redacted: boolean
  produced_in_redacted_form: boolean
  bates_begin: string | null
  bates_end: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// Privilege type labels
export const PRIVILEGE_TYPE_INFO: Record<PrivilegeType, {
  label: string
  description: string
}> = {
  attorney_client: { label: 'Attorney-Client', description: 'Privileged attorney-client communication' },
  work_product: { label: 'Work Product', description: 'Attorney work product doctrine' },
  joint_defense: { label: 'Joint Defense', description: 'Joint defense / common interest privilege' },
  spousal: { label: 'Spousal', description: 'Spousal privilege / marital communications' },
  therapist_patient: { label: 'Therapist-Patient', description: 'Psychotherapist-patient privilege' },
  other: { label: 'Other', description: 'Other applicable privilege' },
}
