// State-Specific Divorce Law Types
// Session 12: State Law Automation

export type LawCategory =
  | 'residency'
  | 'waiting_period'
  | 'property_division'
  | 'custody'
  | 'child_support'
  | 'spousal_support'
  | 'grounds'
  | 'filing_procedure'

export type FormType =
  | 'petition'
  | 'summons'
  | 'response'
  | 'financial_disclosure'
  | 'custody'
  | 'support'
  | 'property'
  | 'judgment'
  | 'service'
  | 'discovery'
  | 'motion'
  | 'declaration'
  | 'other'

export interface StateLaw {
  id: string
  state_code: string
  law_category: LawCategory
  law_name: string
  law_value: Record<string, unknown>
  effective_date: string
  expiration_date: string | null
  source_citation: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StateForm {
  id: string
  state_code: string
  form_number: string
  form_name: string
  form_type: FormType
  template_id: string | null
  required_when: FormRequirement
  order_in_process: number
  court_fee: number
  instructions_url: string | null
  sample_url: string | null
  notes: string | null
  created_at: string
}

export interface FormRequirement {
  always?: boolean
  has_children?: boolean
  has_property?: boolean
  case_type?: 'contested' | 'uncontested'
  spousal_support_requested?: boolean
  military_member?: boolean
  or?: FormRequirement[]
  and?: FormRequirement[]
}

export interface StateCounty {
  id: string
  state_code: string
  county_name: string
  court_name: string
  court_address: string | null
  court_phone: string | null
  efiling_system: string | null
  efiling_url: string | null
  local_rules_url: string | null
  filing_fees: Record<string, number>
  created_at: string
}

export interface ResidencyCheck {
  id: string
  case_id: string
  check_date: string
  state_code: string
  state_residency_days: number
  county_residency_days: number
  meets_state_requirement: boolean
  meets_county_requirement: boolean
  can_file_on: string | null
  evidence: string[]
  missing_documents: string[]
  recommendations: string[]
  checked_by: string
  created_at: string
}

export interface CaseFacts {
  has_children: boolean
  has_property: boolean
  case_type: 'contested' | 'uncontested'
  spousal_support_requested: boolean
  has_prenup: boolean
  military_member: boolean
}

export interface ResidencyResult {
  meets_state_requirement: boolean
  meets_county_requirement: boolean
  can_file_on: string | null
  state_residency_days: number
  county_residency_days: number
  state_required_days: number
  county_required_days: number
  missing_documents: string[]
  recommendations: string[]
}

// State law data structure for seed files
export interface ResidencyRules {
  state_months: number
  county_months: number
  statute: string
  proof_documents: string[]
  alternative_proof: string[]
  minimum_proof: string
  military_exception: boolean
  student_exception: string
}

export interface WaitingPeriodRules {
  duration_days: number
  start_event: string
  earliest_judgment: string
  statute: string
  exceptions: string[]
  can_waive: boolean
}

export interface PropertyDivisionRules {
  system: 'community_property' | 'equitable_distribution'
  default_split: string
  statute: string
  community_property_definition: string
  separate_property_definition: string
  date_of_separation_significant: boolean
  commingling_rules: string
}

export interface GroundsRules {
  no_fault: boolean
  grounds_options: string[]
  statute: string
  legal_separation_available: boolean
}

export interface CustodyRules {
  standard: string
  joint_custody_preference: boolean
  factors: string[]
  statute: string
  geographic_restrictions: string | null
}

export interface ChildSupportRules {
  guideline_type: string
  statute: string
  factors: string[]
  cap: string | null
}

export interface SpousalSupportRules {
  temporary_support_formula: boolean
  permanent_support_factors: string
  long_term_marriage_years: number
  modification_standard: string
  termination_events: string[]
  duration_limits: string | null
}

export interface StateFormSeed {
  form_number: string
  form_name: string
  form_type: FormType
  required_when: FormRequirement
  order_in_process: number
  court_fee: number
  instructions_url: string | null
}

export interface StateCountySeed {
  county_name: string
  court_name: string
  court_address: string
  court_phone: string
  efiling_system: string | null
  efiling_url: string | null
  filing_fees: Record<string, number>
}

export interface StateLawData {
  code: string
  name: string
  residency: ResidencyRules
  waiting_period: WaitingPeriodRules
  property_division: PropertyDivisionRules
  grounds: GroundsRules
  child_custody: CustodyRules
  child_support: ChildSupportRules
  spousal_support: SpousalSupportRules
  forms: StateFormSeed[]
  counties: StateCountySeed[]
}

// Display helpers
export const STATE_NAMES: Record<string, string> = {
  CA: 'California',
  TX: 'Texas',
  FL: 'Florida',
}

export const LAW_CATEGORY_INFO: Record<LawCategory, { label: string; icon: string }> = {
  residency: { label: 'Residency', icon: 'Home' },
  waiting_period: { label: 'Waiting Period', icon: 'Clock' },
  property_division: { label: 'Property Division', icon: 'Scale' },
  custody: { label: 'Child Custody', icon: 'Users' },
  child_support: { label: 'Child Support', icon: 'DollarSign' },
  spousal_support: { label: 'Spousal Support', icon: 'Heart' },
  grounds: { label: 'Grounds', icon: 'Gavel' },
  filing_procedure: { label: 'Filing Procedure', icon: 'FileText' },
}

export const FORM_TYPE_INFO: Record<FormType, { label: string; color: string }> = {
  petition: { label: 'Petition', color: 'bg-blue-100 text-blue-700' },
  summons: { label: 'Summons', color: 'bg-indigo-100 text-indigo-700' },
  response: { label: 'Response', color: 'bg-purple-100 text-purple-700' },
  financial_disclosure: { label: 'Financial', color: 'bg-green-100 text-green-700' },
  custody: { label: 'Custody', color: 'bg-orange-100 text-orange-700' },
  support: { label: 'Support', color: 'bg-yellow-100 text-yellow-700' },
  property: { label: 'Property', color: 'bg-emerald-100 text-emerald-700' },
  judgment: { label: 'Judgment', color: 'bg-red-100 text-red-700' },
  service: { label: 'Service', color: 'bg-gray-100 text-gray-700' },
  discovery: { label: 'Discovery', color: 'bg-cyan-100 text-cyan-700' },
  motion: { label: 'Motion', color: 'bg-pink-100 text-pink-700' },
  declaration: { label: 'Declaration', color: 'bg-violet-100 text-violet-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-600' },
}
