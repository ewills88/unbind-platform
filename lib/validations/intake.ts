import { z } from 'zod'

// Address schema (reusable)
const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'Use state abbreviation'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code format'),
})

const optionalAddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  sameAsClient: z.boolean().optional(),
}).optional()

// Step 1: Personal Information
export const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[\d\s\-()]+$/, 'Invalid phone number').min(10, 'Phone number is required'),
  address: addressSchema,

  spouseFirstName: z.string().min(1, 'Spouse first name is required'),
  spouseLastName: z.string().min(1, 'Spouse last name is required'),
  spouseDateOfBirth: z.string().optional(),
  spouseEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  spousePhone: z.string().optional(),
  spouseAddress: optionalAddressSchema,

  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
})

// Step 2: Marriage Details
export const marriageDetailsSchema = z.object({
  dateOfMarriage: z.string().min(1, 'Date of marriage is required'),
  placeOfMarriage: z.object({
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    country: z.string().default('United States'),
  }),
  dateOfSeparation: z.string().optional(),
  separationCircumstances: z.string().optional(),

  currentlyLivingTogether: z.boolean(),
  whoLeftMaritalHome: z.enum(['client', 'spouse', 'both', 'neither']).optional(),
  maritalHomeAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),

  clientPreviousMarriages: z.number().int().min(0).default(0),
  spousePreviousMarriages: z.number().int().min(0).default(0),

  hasPrenup: z.boolean().default(false),
  prenupDetails: z.string().optional(),

  domesticViolenceHistory: z.boolean().default(false),
  domesticViolenceDetails: z.string().optional(),
  restrainingOrders: z.boolean().default(false),
  restrainingOrderDetails: z.string().optional(),
})

// Child info schema
const childInfoSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1, 'Child first name is required'),
  lastName: z.string().min(1, 'Child last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  age: z.number().int().min(0),
  school: z.string().optional(),
  grade: z.string().optional(),
  specialNeeds: z.string().optional(),
  medicalConditions: z.string().optional(),
  currentCustody: z.enum(['client', 'spouse', 'shared', 'other']).optional(),
  custodyNotes: z.string().optional(),
})

// Step 3: Children & Custody (base object, before refinement)
const childrenCustodyBaseSchema = z.object({
  hasMinorChildren: z.boolean(),
  children: z.array(childInfoSchema).default([]),

  preferredCustodyArrangement: z.enum(['sole_client', 'sole_spouse', 'joint', 'undecided']).optional(),
  custodyPriorities: z.array(z.string()).default([]),

  currentParentingSchedule: z.string().optional(),
  proposedParentingSchedule: z.string().optional(),

  existingChildSupport: z.boolean().default(false),
  childSupportAmount: z.number().min(0).optional(),
  childSupportPayer: z.enum(['client', 'spouse']).optional(),

  relocationConcerns: z.boolean().default(false),
  relocationDetails: z.string().optional(),
  parentingConcerns: z.string().optional(),
})

export const childrenCustodySchema = childrenCustodyBaseSchema.refine(
  (data: { hasMinorChildren: boolean; children: unknown[] }) => !data.hasMinorChildren || data.children.length > 0,
  { message: 'Please add at least one child', path: ['children'] }
)

// Step 4: Financial Overview
export const financialOverviewSchema = z.object({
  clientEmploymentStatus: z.enum(['employed', 'self_employed', 'unemployed', 'retired', 'disabled']),
  clientEmployer: z.string().optional(),
  clientJobTitle: z.string().optional(),
  clientAnnualIncome: z.number().min(0).optional(),
  clientOtherIncome: z.number().min(0).optional(),
  clientOtherIncomeSource: z.string().optional(),

  spouseEmploymentStatus: z.enum(['employed', 'self_employed', 'unemployed', 'retired', 'disabled']),
  spouseEmployer: z.string().optional(),
  spouseJobTitle: z.string().optional(),
  spouseAnnualIncome: z.number().min(0).optional(),
  spouseOtherIncome: z.number().min(0).optional(),

  realEstateProperties: z.number().int().min(0).default(0),
  estimatedRealEstateValue: z.number().min(0).optional(),
  bankAccountsValue: z.number().min(0).optional(),
  retirementAccountsValue: z.number().min(0).optional(),
  investmentAccountsValue: z.number().min(0).optional(),
  vehiclesValue: z.number().min(0).optional(),
  otherAssetsValue: z.number().min(0).optional(),

  mortgageBalance: z.number().min(0).optional(),
  vehicleLoansBalance: z.number().min(0).optional(),
  creditCardBalance: z.number().min(0).optional(),
  studentLoansBalance: z.number().min(0).optional(),
  otherDebtsBalance: z.number().min(0).optional(),

  ownsBusinesses: z.boolean().default(false),
  businessDetails: z.string().optional(),

  financialConcerns: z.array(z.string()).default([]),
  suspectedHiddenAssets: z.boolean().default(false),
  hiddenAssetsDetails: z.string().optional(),
})

// Step 5: Legal Goals
export const legalGoalsSchema = z.object({
  primaryGoals: z.array(z.string()).min(1, 'Select at least one primary goal'),

  preferredApproach: z.enum(['collaborative', 'mediation', 'litigation', 'undecided']),
  approachReasoning: z.string().optional(),

  urgencyLevel: z.enum(['urgent', 'standard', 'flexible']).default('standard'),
  targetCompletionDate: z.string().optional(),

  spousalSupportSeeking: z.boolean().default(false),
  spousalSupportAmount: z.number().min(0).optional(),
  spousalSupportDuration: z.string().optional(),

  propertyDivisionPriorities: z.array(z.string()).default([]),
  mustKeepItems: z.array(z.string()).default([]),

  nameChangeRequested: z.boolean().default(false),
  newLastName: z.string().optional(),

  communicationPreference: z.enum(['email', 'phone', 'text', 'portal']).default('email'),
  meetingPreference: z.enum(['in_person', 'video', 'either']).default('either'),

  additionalConcerns: z.string().optional(),
  questionsForAttorney: z.string().optional(),
})

// Complete intake schema
export const completeIntakeSchema = z.object({
  personal: personalInfoSchema,
  marriage: marriageDetailsSchema,
  children: childrenCustodySchema,
  financial: financialOverviewSchema,
  legalGoals: legalGoalsSchema,
})

// Partial schemas for auto-save (all fields optional)
export const partialPersonalInfoSchema = personalInfoSchema.partial()
export const partialMarriageDetailsSchema = marriageDetailsSchema.partial()
export const partialChildrenCustodySchema = childrenCustodyBaseSchema.partial()
export const partialFinancialOverviewSchema = financialOverviewSchema.partial()
export const partialLegalGoalsSchema = legalGoalsSchema.partial()

// Type exports
export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>
export type MarriageDetailsFormData = z.infer<typeof marriageDetailsSchema>
export type ChildrenCustodyFormData = z.infer<typeof childrenCustodySchema>
export type FinancialOverviewFormData = z.infer<typeof financialOverviewSchema>
export type LegalGoalsFormData = z.infer<typeof legalGoalsSchema>
export type CompleteIntakeFormData = z.infer<typeof completeIntakeSchema>

// Validation helpers
export function getSchemaForStep(step: number) {
  switch (step) {
    case 1:
      return personalInfoSchema
    case 2:
      return marriageDetailsSchema
    case 3:
      return childrenCustodySchema
    case 4:
      return financialOverviewSchema
    case 5:
      return legalGoalsSchema
    default:
      return personalInfoSchema
  }
}

export function getPartialSchemaForStep(step: number) {
  switch (step) {
    case 1:
      return partialPersonalInfoSchema
    case 2:
      return partialMarriageDetailsSchema
    case 3:
      return partialChildrenCustodySchema
    case 4:
      return partialFinancialOverviewSchema
    case 5:
      return partialLegalGoalsSchema
    default:
      return partialPersonalInfoSchema
  }
}
