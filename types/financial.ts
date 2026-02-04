// Financial Tracking Types for Session 8

// ============ Enums ============

export type AssetCategory =
  | 'real_estate'
  | 'vehicle'
  | 'bank_account'
  | 'investment'
  | 'retirement'
  | 'business'
  | 'personal_property'
  | 'other'

export type DebtCategory =
  | 'mortgage'
  | 'auto_loan'
  | 'credit_card'
  | 'student_loan'
  | 'personal_loan'
  | 'medical'
  | 'tax'
  | 'other'

export type OwnershipType =
  | 'joint'
  | 'client'
  | 'spouse'
  | 'unknown'

export type IncomeType =
  | 'salary'
  | 'hourly'
  | 'self_employment'
  | 'rental'
  | 'investment'
  | 'retirement'
  | 'social_security'
  | 'alimony'
  | 'child_support'
  | 'other'

export type IncomeFrequency =
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'quarterly'
  | 'annually'

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'transportation'
  | 'insurance'
  | 'healthcare'
  | 'childcare'
  | 'education'
  | 'food'
  | 'clothing'
  | 'entertainment'
  | 'debt_payment'
  | 'savings'
  | 'other'

export type DivisionMethod =
  | 'equal'
  | 'equitable'
  | 'custom'

// ============ Database Types ============

export interface Asset {
  id: string
  case_id: string
  category: AssetCategory
  name: string
  description: string | null
  estimated_value: number
  date_acquired: string | null
  ownership: OwnershipType
  supporting_documents: string[]
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Debt {
  id: string
  case_id: string
  category: DebtCategory
  creditor_name: string
  account_number: string | null
  original_amount: number
  current_balance: number
  monthly_payment: number | null
  interest_rate: number | null
  ownership: OwnershipType
  is_secured: boolean
  secured_asset_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface IncomeSource {
  id: string
  case_id: string
  party: 'client' | 'spouse'
  income_type: IncomeType
  source_name: string
  gross_amount: number
  net_amount: number | null
  frequency: IncomeFrequency
  is_variable: boolean
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ExpenseItem {
  id: string
  case_id: string
  party: 'client' | 'spouse' | 'joint'
  category: ExpenseCategory
  description: string
  amount: number
  frequency: IncomeFrequency
  is_recurring: boolean
  is_essential: boolean
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface DivisionScenario {
  id: string
  case_id: string
  name: string
  description: string | null
  asset_assignments: Record<string, 'client' | 'spouse' | 'sell'>
  debt_assignments: Record<string, 'client' | 'spouse'>
  client_asset_total: number
  client_debt_total: number
  spouse_asset_total: number
  spouse_debt_total: number
  client_net_total: number
  spouse_net_total: number
  equalization_amount: number
  equalization_payer: 'client' | 'spouse' | 'none'
  is_preferred: boolean
  is_final: boolean
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface DivisionScenarioFormData {
  name: string
  description?: string
  asset_assignments: Record<string, 'client' | 'spouse' | 'sell'>
  debt_assignments: Record<string, 'client' | 'spouse'>
  is_preferred?: boolean
  notes?: string
}

// ============ Division Detail Types ============

export interface AssetDivision {
  asset_id: string
  client_percentage: number
  spouse_percentage: number
  notes?: string
}

export interface DebtDivision {
  debt_id: string
  client_percentage: number
  spouse_percentage: number
  notes?: string
}

// ============ Summary Types ============

export interface FinancialSummary {
  total_assets: number
  total_debts: number
  net_worth: number
  assets_by_category: CategoryTotal[]
  debts_by_category: CategoryTotal[]
  assets_by_ownership: OwnershipTotal[]
  debts_by_ownership: OwnershipTotal[]
  client_monthly_income: number
  spouse_monthly_income: number
  client_monthly_expenses: number
  spouse_monthly_expenses: number
  joint_monthly_expenses: number
}

export interface CategoryTotal {
  category: string
  total: number
  count: number
}

export interface OwnershipTotal {
  ownership: OwnershipType
  total: number
  count: number
}

// ============ Form Input Types ============

export interface AssetFormData {
  category: AssetCategory
  name: string
  description?: string
  estimated_value: number
  date_acquired?: string
  ownership: OwnershipType
  supporting_documents?: string[]
  notes?: string
}

export interface DebtFormData {
  category: DebtCategory
  creditor_name: string
  account_number?: string
  original_amount: number
  current_balance: number
  monthly_payment?: number
  interest_rate?: number
  ownership: OwnershipType
  is_secured: boolean
  secured_asset_id?: string
  notes?: string
}

export interface IncomeFormData {
  party: 'client' | 'spouse'
  income_type: IncomeType
  source_name: string
  gross_amount: number
  net_amount?: number
  frequency: IncomeFrequency
  is_variable: boolean
  start_date?: string
  end_date?: string
  notes?: string
}

export interface ExpenseFormData {
  party: 'client' | 'spouse' | 'joint'
  category: ExpenseCategory
  description: string
  amount: number
  frequency: IncomeFrequency
  is_recurring: boolean
  is_essential: boolean
  notes?: string
}

// ============ Config Constants ============

export const ASSET_CATEGORY_CONFIG: Record<AssetCategory, { label: string; icon: string; color: string }> = {
  real_estate: { label: 'Real Estate', icon: 'Home', color: 'text-blue-600' },
  vehicle: { label: 'Vehicle', icon: 'Car', color: 'text-gray-600' },
  bank_account: { label: 'Bank Account', icon: 'Building', color: 'text-green-600' },
  investment: { label: 'Investment', icon: 'TrendingUp', color: 'text-purple-600' },
  retirement: { label: 'Retirement', icon: 'PiggyBank', color: 'text-orange-600' },
  business: { label: 'Business', icon: 'Briefcase', color: 'text-indigo-600' },
  personal_property: { label: 'Personal Property', icon: 'Package', color: 'text-yellow-600' },
  other: { label: 'Other', icon: 'MoreHorizontal', color: 'text-gray-500' },
}

export const DEBT_CATEGORY_CONFIG: Record<DebtCategory, { label: string; icon: string; color: string }> = {
  mortgage: { label: 'Mortgage', icon: 'Home', color: 'text-blue-600' },
  auto_loan: { label: 'Auto Loan', icon: 'Car', color: 'text-gray-600' },
  credit_card: { label: 'Credit Card', icon: 'CreditCard', color: 'text-red-600' },
  student_loan: { label: 'Student Loan', icon: 'GraduationCap', color: 'text-purple-600' },
  personal_loan: { label: 'Personal Loan', icon: 'Banknote', color: 'text-green-600' },
  medical: { label: 'Medical', icon: 'Heart', color: 'text-pink-600' },
  tax: { label: 'Tax', icon: 'Receipt', color: 'text-orange-600' },
  other: { label: 'Other', icon: 'MoreHorizontal', color: 'text-gray-500' },
}

export const INCOME_TYPE_CONFIG: Record<IncomeType, { label: string }> = {
  salary: { label: 'Salary' },
  hourly: { label: 'Hourly Wages' },
  self_employment: { label: 'Self-Employment' },
  rental: { label: 'Rental Income' },
  investment: { label: 'Investment Income' },
  retirement: { label: 'Retirement/Pension' },
  social_security: { label: 'Social Security' },
  alimony: { label: 'Alimony' },
  child_support: { label: 'Child Support' },
  other: { label: 'Other' },
}

export const EXPENSE_CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: string }> = {
  housing: { label: 'Housing', icon: 'Home' },
  utilities: { label: 'Utilities', icon: 'Zap' },
  transportation: { label: 'Transportation', icon: 'Car' },
  insurance: { label: 'Insurance', icon: 'Shield' },
  healthcare: { label: 'Healthcare', icon: 'Heart' },
  childcare: { label: 'Childcare', icon: 'Baby' },
  education: { label: 'Education', icon: 'GraduationCap' },
  food: { label: 'Food', icon: 'Utensils' },
  clothing: { label: 'Clothing', icon: 'Shirt' },
  entertainment: { label: 'Entertainment', icon: 'Tv' },
  debt_payment: { label: 'Debt Payment', icon: 'CreditCard' },
  savings: { label: 'Savings', icon: 'PiggyBank' },
  other: { label: 'Other', icon: 'MoreHorizontal' },
}

export const FREQUENCY_CONFIG: Record<IncomeFrequency, { label: string; monthlyMultiplier: number }> = {
  weekly: { label: 'Weekly', monthlyMultiplier: 4.33 },
  biweekly: { label: 'Bi-weekly', monthlyMultiplier: 2.17 },
  semimonthly: { label: 'Semi-monthly', monthlyMultiplier: 2 },
  monthly: { label: 'Monthly', monthlyMultiplier: 1 },
  quarterly: { label: 'Quarterly', monthlyMultiplier: 0.33 },
  annually: { label: 'Annually', monthlyMultiplier: 0.083 },
}

export const OWNERSHIP_CONFIG: Record<OwnershipType, { label: string; color: string; bgColor: string }> = {
  joint: { label: 'Joint', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  client: { label: 'Client', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  spouse: { label: 'Spouse', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  unknown: { label: 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-100' },
}

// ============ Utility Functions ============

export function calculateMonthlyAmount(amount: number, frequency: IncomeFrequency): number {
  return amount * FREQUENCY_CONFIG[frequency].monthlyMultiplier
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
