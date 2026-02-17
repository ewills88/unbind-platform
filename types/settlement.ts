// Session 17: Settlement Negotiation Types
// Proposal builder, property division, support, custody, comparison

// Proposal status
export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'received'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'withdrawn'

// Which side created the proposal
export type ProposalParty = 'our_client' | 'opposing'

// Property allocation
export type PropertyAllocation = 'husband' | 'wife' | 'sell' | 'split'

// Property characterization
export type PropertyCharacterization = 'community' | 'separate_h' | 'separate_w' | 'mixed'

// Spousal support type
export type SpousalSupportType =
  | 'permanent'
  | 'rehabilitative'
  | 'bridge'
  | 'lump_sum'
  | 'none'
  | 'reserved'

// Legal/physical custody type
export type LegalCustodyType = 'joint' | 'sole_husband' | 'sole_wife'
export type PhysicalCustodyType = 'joint' | 'primary_husband' | 'primary_wife'

// Parenting schedule type
export type ScheduleType =
  | 'every_other_weekend'
  | '5_2_2_5'
  | 'week_on_week_off'
  | '2_2_3'
  | 'custom'

// Decision making allocation
export type DecisionType = 'joint' | 'husband' | 'wife'

// Other term category
export type OtherTermCategory =
  | 'name_change'
  | 'tax_filing'
  | 'insurance'
  | 'attorney_fees'
  | 'debts'
  | 'pets'
  | 'personal_property'
  | 'other'

// Negotiation event type (expanded in CP2)
export type NegotiationEventType =
  | 'proposal_sent'
  | 'proposal_received'
  | 'counter_offer'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'withdrawn'
  | 'mediation'
  | 'conference'
  | 'settlement_reached'
  | 'terms_accepted'
  | 'terms_rejected'
  | 'expiration'
  | 'extension_requested'
  | 'extension_granted'
  | 'mediation_scheduled'
  | 'mediation_completed'
  | 'negotiation_stalled'
  | 'attorney_conference'
  | 'client_meeting'

// Negotiation event party
export type NegotiationParty = 'our_client' | 'opposing' | 'both' | 'mediator'

// Mediation session status
export type MediationStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'continued'

// Mediation outcome
export type MediationOutcome = 'full_settlement' | 'partial_settlement' | 'no_agreement' | 'continued'

// Mediation location
export type MediationLocationType = 'in_person' | 'video' | 'hybrid'

// Mediation position priority
export type PositionPriority = 'critical' | 'high' | 'medium' | 'low' | 'tradeable'

// Mediation position category
export type PositionCategory = 'property' | 'spousal_support' | 'child_support' | 'custody' | 'other'

// Mediation offer response
export type OfferResponse = 'pending' | 'accepted' | 'rejected' | 'countered'

// Step-down entry for spousal support
export interface StepDownEntry {
  month: number
  amount: number
}

// ============================================================================
// Main interfaces
// ============================================================================

export interface SettlementProposal {
  id: string
  case_id: string
  firm_id: string | null
  proposal_number: number
  version: number
  title: string
  created_by_party: ProposalParty
  status: ProposalStatus
  sent_date: string | null
  received_date: string | null
  response_deadline: string | null
  expiration_date: string | null
  cover_letter: string | null
  total_to_husband: number
  total_to_wife: number
  equalization_payment: number
  equalization_payor: string | null
  monthly_support_husband_pays: number
  monthly_support_wife_pays: number
  support_duration_months: number | null
  summary: string | null
  parent_proposal_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  property_items?: ProposalPropertyItem[]
  spousal_support?: ProposalSpousalSupport[]
  child_support?: ProposalChildSupport[]
  custody?: ProposalCustody[]
  other_terms?: ProposalOtherTerm[]
}

export interface ProposalPropertyItem {
  id: string
  proposal_id: string
  item_type: 'asset' | 'debt'
  asset_id: string | null
  debt_id: string | null
  description: string
  category: string | null
  gross_value: number
  encumbrance: number
  net_value: number
  characterization: PropertyCharacterization
  separate_property_trace: string | null
  allocated_to: PropertyAllocation
  allocation_percentage: number
  husband_receives: number
  wife_receives: number
  notes: string | null
  display_order: number
}

export interface ProposalSpousalSupport {
  id: string
  proposal_id: string
  support_type: SpousalSupportType
  payor: 'husband' | 'wife' | 'none'
  monthly_amount: number
  start_date: string | null
  end_date: string | null
  duration_months: number | null
  duration_description: string | null
  step_down_schedule: StepDownEntry[]
  termination_events: string[]
  cola_provision: boolean
  cola_index: string | null
  tax_treatment: 'non_deductible' | 'deductible_pre_2019'
  security_type: 'none' | 'life_insurance' | 'bond'
  security_amount: number
  security_beneficiary: string | null
  modifiable: boolean
  jurisdiction_retained: boolean
  total_npv: number
  notes: string | null
}

export interface ProposalChildSupport {
  id: string
  proposal_id: string
  payor: 'husband' | 'wife'
  guideline_amount: number
  proposed_amount: number
  deviation_type: 'none' | 'upward' | 'downward'
  deviation_reason: string | null
  payment_frequency: 'monthly' | 'bi_weekly'
  children_covered: string[]
  health_insurance_provider: 'husband' | 'wife' | 'split'
  health_insurance_monthly_cost: number
  unreimbursed_medical_split: string
  childcare_provider: 'husband' | 'wife' | 'split'
  childcare_monthly_cost: number
  childcare_split: string
  extracurricular_annual_cap: number | null
  extracurricular_split: string
  private_school_provisions: string | null
  college_provisions: string | null
  tax_exemption_allocation: string
  notes: string | null
}

export interface ProposalCustody {
  id: string
  proposal_id: string
  legal_custody: LegalCustodyType
  physical_custody: PhysicalCustodyType
  husband_percentage: number
  wife_percentage: number
  schedule_type: ScheduleType
  schedule_description: string | null
  schedule_details: Record<string, unknown> | null
  holiday_schedule: Record<string, unknown> | null
  summer_schedule: string | null
  exchange_day: string | null
  exchange_location: string | null
  transportation_responsibility: string | null
  communication_schedule: string | null
  decision_education: DecisionType
  decision_medical: DecisionType
  decision_religious: DecisionType
  decision_extracurricular: DecisionType
  right_of_first_refusal_hours: number | null
  relocation_notice_days: number | null
  relocation_restriction_miles: number | null
  travel_provisions: string | null
  children_names: string[]
  notes: string | null
}

export interface ProposalOtherTerm {
  id: string
  proposal_id: string
  category: OtherTermCategory
  term_title: string
  term_description: string | null
  responsible_party: 'husband' | 'wife' | 'both' | 'na'
  amount: number | null
  notes: string | null
  display_order: number
}

export interface NegotiationEvent {
  id: string
  case_id: string
  firm_id: string | null
  event_type: NegotiationEventType
  event_date: string
  proposal_id: string | null
  title: string
  description: string | null
  participants: string[]
  from_party: NegotiationParty
  movement_summary: string | null
  key_changes: Record<string, unknown>
  documents: string[]
  next_steps: string | null
  deadline: string | null
  is_milestone: boolean
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface SettlementScenario {
  id: string
  case_id: string
  firm_id: string | null
  scenario_name: string
  scenario_description: string | null
  base_proposal_id: string | null
  property_allocation: ScenarioPropertyItem[]
  spousal_support: Record<string, unknown>
  child_support: Record<string, unknown>
  custody_terms: Record<string, unknown>
  other_terms: Record<string, unknown>[]
  calculated_totals: ScenarioTotals
  comparison_notes: string | null
  pros: string[]
  cons: string[]
  is_favorite: boolean
  is_archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ScenarioPropertyItem {
  item_type: 'asset' | 'debt'
  description: string
  category: string
  gross_value: number
  encumbrance: number
  net_value: number
  allocated_to: PropertyAllocation
  allocation_percentage: number
  husband_receives: number
  wife_receives: number
  asset_id?: string | null
  debt_id?: string | null
}

export interface ScenarioTotals {
  husband_property_net: number
  wife_property_net: number
  monthly_support: number
  support_payor: string | null
  support_npv: number
  husband_total: number
  wife_total: number
  total_estate: number
  husband_percentage: string
  wife_percentage: string
}

export interface MediationSession {
  id: string
  case_id: string
  firm_id: string | null
  session_number: number
  session_date: string
  session_start_time: string | null
  session_end_time: string | null
  mediator_name: string
  mediator_company: string | null
  mediator_email: string | null
  mediator_phone: string | null
  location_type: MediationLocationType
  location_address: string | null
  video_link: string | null
  status: MediationStatus
  cancellation_reason: string | null
  our_attendees: string[]
  their_attendees: string[]
  pre_session_notes: string | null
  session_notes: string | null
  agreements_reached: string[]
  open_issues: string[]
  next_steps: string | null
  follow_up_deadline: string | null
  outcome: MediationOutcome | null
  total_cost: number
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  positions?: MediationPosition[]
  offers?: MediationOffer[]
}

export interface MediationPosition {
  id: string
  mediation_id: string
  issue_category: PositionCategory
  issue_name: string
  our_starting_position: string | null
  our_target: string | null
  our_bottom_line: string | null
  their_known_position: string | null
  priority: PositionPriority
  flexibility_notes: string | null
  batna: string | null
  resolved: boolean
  final_resolution: string | null
  display_order: number
  created_at: string
}

export interface MediationOffer {
  id: string
  mediation_id: string
  offer_number: number
  offered_by: 'our_client' | 'opposing'
  offer_time: string
  offer_summary: string
  offer_details: Record<string, unknown>
  response: OfferResponse
  response_time: string | null
  response_notes: string | null
  created_at: string
}

// ============================================================================
// Constants
// ============================================================================

export const PROPOSAL_STATUS_INFO: Record<ProposalStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  sent: { label: 'Sent', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  received: { label: 'Received', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  countered: { label: 'Countered', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  accepted: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  expired: { label: 'Expired', color: 'text-gray-500', bgColor: 'bg-gray-50' },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-500', bgColor: 'bg-gray-50' },
}

export const SUPPORT_TYPE_INFO: Record<SpousalSupportType, {
  label: string
  description: string
}> = {
  none: { label: 'No Spousal Support', description: 'Each party waives support' },
  permanent: { label: 'Permanent Support', description: 'Continues indefinitely' },
  rehabilitative: { label: 'Rehabilitative Support', description: 'Fixed duration for transition' },
  bridge: { label: 'Bridge-the-Gap', description: 'Short-term transitional support' },
  lump_sum: { label: 'Lump Sum', description: 'One-time payment' },
  reserved: { label: 'Reserved', description: 'Court retains jurisdiction' },
}

export const SCHEDULE_TYPE_INFO: Record<ScheduleType, {
  label: string
  description: string
  husbandPct: number
  wifePct: number
}> = {
  every_other_weekend: { label: 'Every Other Weekend', description: 'Non-custodial gets alternate weekends', husbandPct: 20, wifePct: 80 },
  '5_2_2_5': { label: '5-2-2-5', description: 'Alternating 5/2 day blocks', husbandPct: 50, wifePct: 50 },
  week_on_week_off: { label: 'Week On/Week Off', description: 'Alternating full weeks', husbandPct: 50, wifePct: 50 },
  '2_2_3': { label: '2-2-3', description: 'Rotating 2-2-3 day pattern', husbandPct: 50, wifePct: 50 },
  custom: { label: 'Custom Schedule', description: 'Custom arrangement', husbandPct: 50, wifePct: 50 },
}

export const LEGAL_CUSTODY_INFO: Record<LegalCustodyType, { label: string }> = {
  joint: { label: 'Joint Legal Custody' },
  sole_husband: { label: 'Sole Legal - Husband' },
  sole_wife: { label: 'Sole Legal - Wife' },
}

export const PHYSICAL_CUSTODY_INFO: Record<PhysicalCustodyType, { label: string }> = {
  joint: { label: 'Joint Physical Custody' },
  primary_husband: { label: 'Primary Physical - Husband' },
  primary_wife: { label: 'Primary Physical - Wife' },
}

export const OTHER_TERM_CATEGORIES: Record<OtherTermCategory, { label: string }> = {
  name_change: { label: 'Name Change' },
  tax_filing: { label: 'Tax Filing' },
  insurance: { label: 'Insurance' },
  attorney_fees: { label: 'Attorney Fees' },
  debts: { label: 'Debt Allocation' },
  pets: { label: 'Pets' },
  personal_property: { label: 'Personal Property' },
  other: { label: 'Other' },
}

export const TERMINATION_EVENTS = [
  { value: 'payee_remarriage', label: 'Remarriage of recipient' },
  { value: 'payee_cohabitation', label: 'Cohabitation of recipient' },
  { value: 'death_either', label: 'Death of either party' },
  { value: 'payee_employment', label: 'Recipient gains employment' },
  { value: 'payor_retirement', label: 'Payor retirement' },
]

export const EVENT_TYPE_INFO: Record<NegotiationEventType, {
  label: string
  color: string
  bgColor: string
}> = {
  proposal_sent: { label: 'Proposal Sent', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  proposal_received: { label: 'Proposal Received', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  counter_offer: { label: 'Counter-Offer', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  accepted: { label: 'Accepted', color: 'text-green-600', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100' },
  expired: { label: 'Expired', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  mediation: { label: 'Mediation', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  conference: { label: 'Conference', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  settlement_reached: { label: 'Settlement Reached', color: 'text-green-700', bgColor: 'bg-green-100' },
  terms_accepted: { label: 'Terms Accepted', color: 'text-green-600', bgColor: 'bg-green-100' },
  terms_rejected: { label: 'Terms Rejected', color: 'text-red-600', bgColor: 'bg-red-100' },
  expiration: { label: 'Expiration', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  extension_requested: { label: 'Extension Requested', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  extension_granted: { label: 'Extension Granted', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  mediation_scheduled: { label: 'Mediation Scheduled', color: 'text-orange-500', bgColor: 'bg-orange-100' },
  mediation_completed: { label: 'Mediation Completed', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  negotiation_stalled: { label: 'Negotiation Stalled', color: 'text-red-500', bgColor: 'bg-red-50' },
  attorney_conference: { label: 'Attorney Conference', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  client_meeting: { label: 'Client Meeting', color: 'text-blue-400', bgColor: 'bg-blue-50' },
}

export const MEDIATION_STATUS_INFO: Record<MediationStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  scheduled: { label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  confirmed: { label: 'Confirmed', color: 'text-green-700', bgColor: 'bg-green-100' },
  in_progress: { label: 'In Progress', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  completed: { label: 'Completed', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
  continued: { label: 'Continued', color: 'text-purple-700', bgColor: 'bg-purple-100' },
}

export const MEDIATION_OUTCOME_INFO: Record<MediationOutcome, {
  label: string
  color: string
  bgColor: string
}> = {
  full_settlement: { label: 'Full Settlement', color: 'text-green-700', bgColor: 'bg-green-100' },
  partial_settlement: { label: 'Partial Settlement', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  no_agreement: { label: 'No Agreement', color: 'text-red-700', bgColor: 'bg-red-100' },
  continued: { label: 'Continued', color: 'text-blue-700', bgColor: 'bg-blue-100' },
}

export const POSITION_PRIORITY_INFO: Record<PositionPriority, {
  label: string
  color: string
  bgColor: string
}> = {
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  high: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  medium: { label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { label: 'Low', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  tradeable: { label: 'Tradeable', color: 'text-gray-600', bgColor: 'bg-gray-100' },
}

export const POSITION_CATEGORY_INFO: Record<PositionCategory, { label: string }> = {
  property: { label: 'Property' },
  spousal_support: { label: 'Spousal Support' },
  child_support: { label: 'Child Support' },
  custody: { label: 'Custody' },
  other: { label: 'Other' },
}

export const LOCATION_TYPE_OPTIONS = [
  { value: 'in_person', label: 'In Person' },
  { value: 'video', label: 'Video Conference' },
  { value: 'hybrid', label: 'Hybrid' },
] as const

// ============================================================================
// Settlement Document Types (CP3)
// ============================================================================

// Document generation status
export type SettlementDocStatus = 'draft' | 'in_review' | 'approved' | 'filed' | 'rejected'

// Signature status
export type SignatureStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired'

// Signature method
export type SignatureMethod = 'electronic' | 'wet_ink' | 'docusign' | 'notarized'

// Signer role
export type SignerRole =
  | 'petitioner'
  | 'respondent'
  | 'petitioner_attorney'
  | 'respondent_attorney'
  | 'mediator'
  | 'judge'
  | 'notary'
  | 'witness'

// Comment type
export type ReviewCommentType = 'comment' | 'suggestion' | 'approval' | 'rejection' | 'question'

// Template section with content
export interface SettlementTemplateSection {
  id: string
  state_code: string
  section_key: string
  section_title: string
  section_order: number
  content_template: string
  plain_text_template: string | null
  required_variables: string[]
  condition_field: string | null
  condition_value: string | null
  is_required: boolean
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Generated settlement document (extends generated_documents)
export interface SettlementDocument {
  id: string
  case_id: string
  template_id: string
  document_type: string
  document_title: string
  description: string | null
  status: SettlementDocStatus
  filled_data: Record<string, unknown>
  custom_content: Record<string, unknown>
  file_path: string | null
  pdf_path: string | null
  version: number
  parent_version_id: string | null
  submitted_for_review_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  approved_by: string | null
  approved_at: string | null
  filed_date: string | null
  filing_confirmation_number: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Joined
  signatures?: DocumentSignature[]
  comments?: DocumentReviewComment[]
  versions?: DocumentVersion[]
}

// Signature tracking
export interface DocumentSignature {
  id: string
  document_id: string
  signer_role: SignerRole
  signer_name: string
  signer_email: string | null
  status: SignatureStatus
  signed_at: string | null
  signature_method: SignatureMethod | null
  ip_address: string | null
  sign_order: number
  sent_at: string | null
  viewed_at: string | null
  reminder_sent_at: string | null
  expiration_date: string | null
  decline_reason: string | null
  created_at: string
  updated_at: string
}

// Review comment
export interface DocumentReviewComment {
  id: string
  document_id: string
  author_id: string
  author_name: string
  section_key: string | null
  comment_text: string
  comment_type: ReviewCommentType
  parent_comment_id: string | null
  is_resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

// Document version
export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  sections_content: Record<string, string>
  variables_snapshot: Record<string, unknown>
  change_summary: string | null
  changed_by: string
  created_at: string
}

// Document generation wizard state
export interface DocumentGenerationState {
  step: 1 | 2 | 3 | 4
  proposalId: string | null
  stateCode: string
  selectedSections: string[]
  variables: Record<string, string>
  sectionOverrides: Record<string, string>
  documentTitle: string
  includeSignatureBlock: boolean
}

// Settlement analytics data
export interface SettlementAnalytics {
  totalProposals: number
  activeProposals: number
  averageRounds: number
  daysInNegotiation: number
  totalPropertyValue: number
  husbandShare: number
  wifeShare: number
  monthlySupport: number
  supportPayor: string | null
  documentsGenerated: number
  documentsPending: number
  documentsApproved: number
  mediationSessions: number
  mediationOutcome: string | null
  timelineEvents: number
  lastActivity: string | null
}

// Constants for document workflow
export const SETTLEMENT_DOC_STATUS_INFO: Record<SettlementDocStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  in_review: { label: 'In Review', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
  filed: { label: 'Filed', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
}

export const SIGNATURE_STATUS_INFO: Record<SignatureStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  pending: { label: 'Pending', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  sent: { label: 'Sent', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  viewed: { label: 'Viewed', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  signed: { label: 'Signed', color: 'text-green-600', bgColor: 'bg-green-100' },
  declined: { label: 'Declined', color: 'text-red-600', bgColor: 'bg-red-100' },
  expired: { label: 'Expired', color: 'text-gray-500', bgColor: 'bg-gray-50' },
}

export const SIGNER_ROLE_INFO: Record<SignerRole, { label: string; order: number }> = {
  petitioner: { label: 'Petitioner', order: 1 },
  respondent: { label: 'Respondent', order: 2 },
  petitioner_attorney: { label: 'Petitioner\'s Attorney', order: 3 },
  respondent_attorney: { label: 'Respondent\'s Attorney', order: 4 },
  mediator: { label: 'Mediator', order: 5 },
  judge: { label: 'Judge', order: 6 },
  notary: { label: 'Notary', order: 7 },
  witness: { label: 'Witness', order: 8 },
}

export const COMMENT_TYPE_INFO: Record<ReviewCommentType, {
  label: string
  color: string
  bgColor: string
}> = {
  comment: { label: 'Comment', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  suggestion: { label: 'Suggestion', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  approval: { label: 'Approval', color: 'text-green-600', bgColor: 'bg-green-100' },
  rejection: { label: 'Rejection', color: 'text-red-600', bgColor: 'bg-red-100' },
  question: { label: 'Question', color: 'text-purple-600', bgColor: 'bg-purple-100' },
}

// Document section keys used in generation
export const SETTLEMENT_SECTIONS = [
  { key: 'preamble', label: 'Preamble', required: true },
  { key: 'recitals', label: 'Recitals', required: true },
  { key: 'property_division', label: 'Property Division', required: true },
  { key: 'separate_property', label: 'Separate Property', required: false },
  { key: 'debt_division', label: 'Debt Division', required: true },
  { key: 'spousal_support', label: 'Spousal Support', required: true },
  { key: 'child_custody', label: 'Child Custody', required: false },
  { key: 'child_support', label: 'Child Support', required: false },
  { key: 'tax_provisions', label: 'Tax Provisions', required: false },
  { key: 'insurance', label: 'Insurance', required: false },
  { key: 'attorney_fees', label: 'Attorney Fees', required: false },
  { key: 'general_provisions', label: 'General Provisions', required: true },
  { key: 'signatures', label: 'Signatures', required: true },
] as const

// ============================================================================
// Helpers
// ============================================================================

// Helper: format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Helper: calculate NPV of support stream
export function calculateSupportNPV(
  monthlyAmount: number,
  durationMonths: number | null,
  discountRate: number = 0.05
): number {
  if (!monthlyAmount) return 0
  const months = durationMonths || 120 // Cap permanent at 10 years for NPV
  const monthlyRate = discountRate / 12
  return monthlyAmount * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate)
}

// Helper: calculate property allocation amounts
export function calculateAllocation(
  netValue: number,
  allocatedTo: PropertyAllocation,
  percentage: number = 50
): { husband: number; wife: number } {
  switch (allocatedTo) {
    case 'husband':
      return { husband: netValue, wife: 0 }
    case 'wife':
      return { husband: 0, wife: netValue }
    case 'sell':
      return { husband: netValue / 2, wife: netValue / 2 }
    case 'split':
      return {
        husband: netValue * (percentage / 100),
        wife: netValue * ((100 - percentage) / 100),
      }
    default:
      return { husband: 0, wife: 0 }
  }
}

// Helper: calculate scenario totals from scenario data
export function calculateScenarioTotals(scenario: {
  property_allocation?: ScenarioPropertyItem[]
  spousal_support?: { monthly_amount?: number; payor?: string; duration_months?: number }
}): ScenarioTotals {
  let husbandPropertyNet = 0
  let wifePropertyNet = 0

  if (scenario.property_allocation) {
    for (const item of scenario.property_allocation) {
      if (item.item_type === 'asset') {
        husbandPropertyNet += item.husband_receives || 0
        wifePropertyNet += item.wife_receives || 0
      } else {
        husbandPropertyNet -= item.husband_receives || 0
        wifePropertyNet -= item.wife_receives || 0
      }
    }
  }

  let supportNPV = 0
  let monthlySupport = 0
  let supportPayor: string | null = null

  if (scenario.spousal_support && (scenario.spousal_support.monthly_amount || 0) > 0) {
    monthlySupport = scenario.spousal_support.monthly_amount || 0
    supportPayor = scenario.spousal_support.payor || null
    const rate = 0.05 / 12
    const months = scenario.spousal_support.duration_months || 120
    supportNPV = monthlySupport * ((1 - Math.pow(1 + rate, -months)) / rate)
  }

  const husbandTotal = husbandPropertyNet
    - (supportPayor === 'husband' ? supportNPV : 0)
    + (supportPayor === 'wife' ? supportNPV : 0)
  const wifeTotal = wifePropertyNet
    - (supportPayor === 'wife' ? supportNPV : 0)
    + (supportPayor === 'husband' ? supportNPV : 0)

  const totalAbs = Math.abs(husbandTotal) + Math.abs(wifeTotal)

  return {
    husband_property_net: husbandPropertyNet,
    wife_property_net: wifePropertyNet,
    monthly_support: monthlySupport,
    support_payor: supportPayor,
    support_npv: supportNPV,
    husband_total: husbandTotal,
    wife_total: wifeTotal,
    total_estate: husbandPropertyNet + wifePropertyNet,
    husband_percentage: totalAbs > 0 ? ((Math.abs(husbandTotal) / totalAbs) * 100).toFixed(1) : '50.0',
    wife_percentage: totalAbs > 0 ? ((Math.abs(wifeTotal) / totalAbs) * 100).toFixed(1) : '50.0',
  }
}
