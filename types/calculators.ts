// Types for Property Division & Support Calculators

// ─── Asset Classification ───────────────────────────────────────

export type AssetClassification = 'community' | 'separate_wife' | 'separate_husband' | 'mixed'
export type FundSource = 'community' | 'separate_wife' | 'separate_husband' | 'gift' | 'inheritance' | 'mixed'

export interface Asset {
  id: string
  name: string
  current_value: number
  acquisition_date: string
  original_value?: number
  source_of_funds?: FundSource
  owner?: 'wife' | 'husband' | 'joint'
  description?: string
}

export interface ClassifiedAsset extends Asset {
  classification: AssetClassification
  reasoning: string
  assigned_to?: 'wife' | 'husband' | 'split'
  wife_percentage?: number
  husband_percentage?: number
}

// ─── Property Division ──────────────────────────────────────────

export interface PropertyDivisionInput {
  assets: Asset[]
  marriage_date: string
  separation_date?: string
  state_code: 'CA' | 'TX' | 'FL'
}

export interface PropertyDivisionResult {
  community_assets: ClassifiedAsset[]
  separate_wife_assets: ClassifiedAsset[]
  separate_husband_assets: ClassifiedAsset[]
  community_total: number
  separate_wife_total: number
  separate_husband_total: number
  recommended_division: {
    wife_receives: ClassifiedAsset[]
    husband_receives: ClassifiedAsset[]
    wife_total: number
    husband_total: number
    equalizing_payment: number
    payment_direction: 'wife_to_husband' | 'husband_to_wife' | 'none'
  }
  classification_notes: Record<string, string>
}

// ─── Equitable Distribution (FL) ────────────────────────────────

export interface EquitableDistributionFactors {
  marriage_duration_years: number
  wife_contributions_financial: number
  wife_contributions_homemaking: number
  husband_contributions_financial: number
  husband_contributions_homemaking: number
  wife_career_sacrifices: boolean
  husband_career_sacrifices: boolean
  wife_future_earning_capacity: number
  husband_future_earning_capacity: number
  wife_health_age: number
  husband_health_age: number
  prenup_exists: boolean
  prenup_terms?: string
}

export interface EquitableDistributionResult {
  total_marital_property: number
  recommended_wife_percentage: number
  recommended_husband_percentage: number
  wife_share_amount: number
  husband_share_amount: number
  justification: string
  factors_considered: string[]
}

// ─── Child Support ──────────────────────────────────────────────

export interface ChildSupportInput {
  wife_net_monthly_income: number
  husband_net_monthly_income: number
  children_count: number
  wife_timeshare_percentage?: number // CA
  primary_custody_parent?: 'wife' | 'husband' // TX
  wife_annual_overnights?: number // FL
}

export interface ChildSupportResult {
  state: string
  method: string
  monthly_support: number
  payor: 'wife' | 'husband'
  recipient: 'wife' | 'husband'
  formula_explanation: string
  details: Record<string, number | string>
}

// ─── Spousal Support ────────────────────────────────────────────

export interface SpousalSupportInput {
  wife_net_monthly_income: number
  husband_net_monthly_income: number
  wife_gross_monthly_income?: number
  husband_gross_monthly_income?: number
  marriage_date: string
  separation_date?: string
  marriage_duration_years?: number
  family_violence_within_2_years?: boolean
}

export interface SpousalSupportResult {
  state: string
  eligible: boolean
  marriage_duration: { years: number; months: number }
  is_long_term_marriage: boolean
  temporary_support_estimate?: number
  permanent_support_estimate?: number
  estimated_duration_months: number | 'indefinite'
  payor: 'wife' | 'husband'
  recipient: 'wife' | 'husband'
  monthly_support: number
  factors_analysis: SupportFactor[]
  recommendations: string[]
}

export interface SupportFactor {
  factor: string
  analysis: string
  weight: 'High' | 'Medium' | 'Low'
}

// ─── Scenario ───────────────────────────────────────────────────

export interface PropertyDivisionScenario {
  id: string
  case_id: string
  scenario_name: string
  state_code: string
  division_method: 'community_property' | 'equitable_distribution'
  assets_classification: Record<string, ClassifiedAsset>
  division_percentages: Record<string, number>
  justification: string | null
  calculations: Record<string, unknown>
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SupportCalculation {
  id: string
  case_id: string
  calculation_type: 'child_support' | 'spousal_support'
  state_code: string
  inputs: Record<string, unknown>
  results: Record<string, unknown>
  overrides: Record<string, unknown>
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}
