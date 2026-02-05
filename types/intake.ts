// Session 9: Client Intake Types

// Intake status enum
export type IntakeStatus = 'draft' | 'in_progress' | 'submitted' | 'reviewed' | 'converted'

// Step definitions
export const INTAKE_STEPS = {
  PERSONAL: 1,
  MARRIAGE: 2,
  CHILDREN: 3,
  FINANCIAL: 4,
  LEGAL_GOALS: 5,
} as const

export const TOTAL_INTAKE_STEPS = 5

export const STEP_LABELS: Record<number, string> = {
  1: 'Personal Information',
  2: 'Marriage Details',
  3: 'Children & Custody',
  4: 'Financial Overview',
  5: 'Legal Goals',
}

// Personal Information (Step 1)
export interface PersonalInfo {
  // Client info
  firstName: string
  lastName: string
  preferredName?: string
  dateOfBirth: string
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  }

  // Spouse info
  spouseFirstName: string
  spouseLastName: string
  spouseDateOfBirth?: string
  spouseEmail?: string
  spousePhone?: string
  spouseAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    sameAsClient: boolean
  }

  // Emergency contact
  emergencyContact?: {
    name?: string
    relationship?: string
    phone?: string
  }
}

// Marriage Details (Step 2)
export interface MarriageDetails {
  dateOfMarriage: string
  placeOfMarriage: {
    city: string
    state: string
    country: string
  }
  dateOfSeparation?: string
  separationCircumstances?: string

  // Current living situation
  currentlyLivingTogether: boolean
  whoLeftMaritalHome?: 'client' | 'spouse' | 'both' | 'neither'
  maritalHomeAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
  }

  // Previous marriages
  clientPreviousMarriages: number
  spousePreviousMarriages: number

  // Prenuptial agreement
  hasPrenup: boolean
  prenupDetails?: string

  // Domestic issues
  domesticViolenceHistory: boolean
  domesticViolenceDetails?: string
  restrainingOrders: boolean
  restrainingOrderDetails?: string
}

// Children & Custody (Step 3)
export interface ChildInfo {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  school?: string
  grade?: string
  specialNeeds?: string
  medicalConditions?: string
  currentCustody?: 'client' | 'spouse' | 'shared' | 'other'
  custodyNotes?: string
}

export interface ChildrenCustody {
  hasMinorChildren: boolean
  children: ChildInfo[]

  // Custody preferences
  preferredCustodyArrangement: 'sole_client' | 'sole_spouse' | 'joint' | 'undecided'
  custodyPriorities: string[]

  // Parenting time
  currentParentingSchedule?: string
  proposedParentingSchedule?: string

  // Child support
  existingChildSupport: boolean
  childSupportAmount?: number
  childSupportPayer?: 'client' | 'spouse'

  // Other concerns
  relocationConcerns: boolean
  relocationDetails?: string
  parentingConcerns?: string
}

// Financial Overview (Step 4)
export interface FinancialOverview {
  // Income
  clientEmploymentStatus: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'disabled'
  clientEmployer?: string
  clientJobTitle?: string
  clientAnnualIncome?: number
  clientOtherIncome?: number
  clientOtherIncomeSource?: string

  spouseEmploymentStatus: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'disabled'
  spouseEmployer?: string
  spouseJobTitle?: string
  spouseAnnualIncome?: number
  spouseOtherIncome?: number

  // Assets summary (high-level for intake)
  realEstateProperties: number
  estimatedRealEstateValue?: number
  bankAccountsValue?: number
  retirementAccountsValue?: number
  investmentAccountsValue?: number
  vehiclesValue?: number
  otherAssetsValue?: number

  // Debts summary
  mortgageBalance?: number
  vehicleLoansBalance?: number
  creditCardBalance?: number
  studentLoansBalance?: number
  otherDebtsBalance?: number

  // Business ownership
  ownsBusinesses: boolean
  businessDetails?: string

  // Financial concerns
  financialConcerns: string[]
  suspectedHiddenAssets: boolean
  hiddenAssetsDetails?: string
}

// Legal Goals (Step 5)
export interface LegalGoals {
  // Primary objectives
  primaryGoals: string[]

  // Divorce approach
  preferredApproach: 'collaborative' | 'mediation' | 'litigation' | 'undecided'
  approachReasoning?: string

  // Timeline
  urgencyLevel: 'urgent' | 'standard' | 'flexible'
  targetCompletionDate?: string

  // Specific requests
  spousalSupportSeeking: boolean
  spousalSupportAmount?: number
  spousalSupportDuration?: string

  // Property division
  propertyDivisionPriorities: string[]
  mustKeepItems?: string[]

  // Other legal matters
  nameChangeRequested: boolean
  newLastName?: string

  // Attorney expectations
  communicationPreference: 'email' | 'phone' | 'text' | 'portal'
  meetingPreference: 'in_person' | 'video' | 'either'

  // Additional information
  additionalConcerns?: string
  questionsForAttorney?: string
}

// Complete intake data structure
export interface IntakeData {
  personal?: Partial<PersonalInfo>
  marriage?: Partial<MarriageDetails>
  children?: Partial<ChildrenCustody>
  financial?: Partial<FinancialOverview>
  legalGoals?: Partial<LegalGoals>
}

// Client intake record
export interface ClientIntake {
  id: string
  case_id?: string
  user_id: string
  invited_by?: string

  status: IntakeStatus
  current_step: number
  completed_steps: number[]
  progress_percentage: number

  intake_data: IntakeData
  validation_errors: Record<string, string[]>

  last_saved_at?: string
  auto_save_enabled: boolean

  submitted_at?: string
  reviewed_at?: string
  reviewed_by?: string
  review_notes?: string

  converted_to_case_id?: string
  converted_at?: string

  created_at: string
  updated_at: string
}

// API request/response types
export interface CreateIntakeRequest {
  case_id?: string
  invited_by?: string
}

export interface UpdateIntakeRequest {
  current_step?: number
  completed_steps?: number[]
  intake_data?: IntakeData
  status?: IntakeStatus
  auto_save_enabled?: boolean
}

export interface SubmitIntakeRequest {
  intake_data: IntakeData
}

export interface ReviewIntakeRequest {
  review_notes?: string
  status: 'reviewed' | 'in_progress' // Can send back for revision
}

// Validation helpers
export interface StepValidation {
  isValid: boolean
  errors: Record<string, string>
}

// Pre-defined options for dropdowns
export const CUSTODY_PRIORITIES = [
  'Stability for children',
  'Equal time with both parents',
  'Children remain in current school',
  'Keep siblings together',
  'Minimize transitions',
  'Flexible scheduling',
  'Proximity to extended family',
]

export const FINANCIAL_CONCERNS = [
  'Fair division of assets',
  'Protecting retirement funds',
  'Keeping the family home',
  'Child support adequacy',
  'Spousal support',
  'Business valuation',
  'Hidden assets discovery',
  'Debt responsibility',
]

export const PRIMARY_GOALS = [
  'Protect my children\'s wellbeing',
  'Achieve financial security',
  'Maintain my standard of living',
  'Keep the family home',
  'Protect my business',
  'Minimize conflict',
  'Quick resolution',
  'Fair asset division',
  'Adequate support payments',
]

export const PROPERTY_PRIORITIES = [
  'Family home',
  'Retirement accounts',
  'Investment accounts',
  'Family business',
  'Vehicles',
  'Personal property',
  'Pets',
  'Heirlooms/sentimental items',
]
