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

// Negotiation event type
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
  event_type: NegotiationEventType
  event_date: string
  proposal_id: string | null
  title: string
  description: string | null
  participants: string[]
  movement_summary: string | null
  notes: string | null
  created_by: string | null
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
}> = {
  proposal_sent: { label: 'Proposal Sent', color: 'text-blue-600' },
  proposal_received: { label: 'Proposal Received', color: 'text-purple-600' },
  counter_offer: { label: 'Counter-Offer', color: 'text-orange-600' },
  accepted: { label: 'Accepted', color: 'text-green-600' },
  rejected: { label: 'Rejected', color: 'text-red-600' },
  expired: { label: 'Expired', color: 'text-gray-500' },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-500' },
  mediation: { label: 'Mediation', color: 'text-teal-600' },
  conference: { label: 'Conference', color: 'text-indigo-600' },
  settlement_reached: { label: 'Settlement Reached', color: 'text-green-700' },
}

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
