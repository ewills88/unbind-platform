// E-Filing Integration Types
// Session 18 CP2: Tyler Technologies E-Filing

// ============================================================
// STATUS & ENUM TYPES
// ============================================================

export type EFilingProvider = 'tyler' | 'file_serve' | 'odyssey' | 'one_legal'

export type EFilingEnvironment = 'production' | 'staging' | 'sandbox'

export type EFilingSubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'accepted'
  | 'partially_accepted'
  | 'rejected'
  | 'error'
  | 'cancelled'

export type PaymentAccountType = 'credit_card' | 'ach' | 'waiver' | 'firm_account'

// ============================================================
// INTERFACES
// ============================================================

export interface EFilingCredentials {
  id: string
  firm_id: string
  provider: EFilingProvider
  environment: EFilingEnvironment
  display_name: string | null
  username_encrypted: string | null
  password_encrypted: string | null
  client_token_encrypted: string | null
  api_key_encrypted: string | null
  firm_id_at_provider: string | null
  attorney_id_at_provider: string | null
  default_payment_account_id: string | null
  is_active: boolean
  last_verified_at: string | null
  last_error: string | null
  settings: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  payment_accounts?: EFilingPaymentAccount[]
}

export interface EFilingSubmission {
  id: string
  case_id: string
  filing_id: string
  credential_id: string
  provider: string
  envelope_id: string | null
  envelope_number: string | null
  submission_timestamp: string | null
  status: EFilingSubmissionStatus
  status_message: string | null
  status_timestamp: string | null
  court_location_code: string | null
  case_number_at_court: string | null
  case_category_code: string | null
  case_type_code: string | null
  filing_code: string | null
  filing_description: string | null
  documents_submitted: DocumentSubmissionInfo[]
  filing_fee_amount: number
  convenience_fee: number
  total_charged: number
  payment_account_id: string | null
  transaction_id: string | null
  accepted_timestamp: string | null
  filing_number: string | null
  stamped_documents: StampedDocumentInfo[] | null
  rejected_timestamp: string | null
  rejection_reason: string | null
  rejection_codes: RejectionCode[] | null
  raw_request: Record<string, unknown> | null
  raw_response: Record<string, unknown> | null
  webhook_received: boolean
  webhook_payload: Record<string, unknown> | null
  retry_count: number
  last_error: string | null
  created_by: string | null
  created_at: string
}

export interface DocumentSubmissionInfo {
  fileName: string
  documentTypeCode: string
  isLeadDocument?: boolean
}

export interface StampedDocumentInfo {
  documentId: string
  fileName: string
  url?: string
}

export interface RejectionCode {
  code: string
  description: string
  documentId?: string
}

export interface EFilingCodeMapping {
  id: string
  provider: string
  state_code: string
  county: string | null
  court_location_code: string | null
  unbind_filing_type_code: string | null
  efiling_code: string
  efiling_category: string | null
  efiling_description: string | null
  document_type_codes: string[]
  filing_component_codes: string[]
  party_type_codes: string[]
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface EFilingPaymentAccount {
  id: string
  credential_id: string
  account_id_at_provider: string
  account_name: string | null
  account_type: PaymentAccountType
  last_four: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
}

// Tyler API response types
export interface TylerCourtLocation {
  code: string
  name: string
  county: string
  address: string
  efiling_enabled: boolean
}

export interface TylerFilingCode {
  code: string
  name: string
  description: string
  fee: number
}

export interface TylerDocumentType {
  code: string
  name: string
  description: string
}

export interface TylerCaseCategory {
  code: string
  name: string
}

export interface TylerCaseType {
  code: string
  name: string
  category: string
}

export interface TylerPartyType {
  code: string
  name: string
}

export interface TylerPaymentAccount {
  id: string
  name: string
  type: string
  lastFour: string
  isDefault: boolean
}

export interface TylerEnvelopeStatus {
  envelopeId: string
  status: string
  statusMessage: string
  statusTimestamp: string
  filingNumber?: string
  stampedDocuments?: StampedDocumentInfo[]
  rejectionReasons?: RejectionCode[]
}

export interface TylerFeeCalculation {
  filingFee: number
  convenienceFee: number
  total: number
}

export interface CreateEnvelopeParams {
  courtLocationCode: string
  caseCategory: string
  caseType: string
  caseNumber?: string
  filingPartyType: string
  paymentAccountId: string
  filingAttorney: {
    barNumber: string
    firstName: string
    lastName: string
    firmName: string
    email: string
    phone: string
  }
  filings: {
    filingCode: string
    description: string
    comments?: string
    courtesyCopies?: string[]
    documents: {
      documentTypeCode: string
      description: string
      fileName: string
      fileBase64: string
      isLeadDocument: boolean
    }[]
  }[]
  parties?: {
    partyType: string
    firstName?: string
    lastName?: string
    businessName?: string
    address?: {
      street: string
      city: string
      state: string
      zip: string
    }
  }[]
}

// ============================================================
// CONSTANTS
// ============================================================

export const EFILING_SUBMISSION_STATUS_INFO: Record<EFilingSubmissionStatus, { label: string; color: string; description: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', description: 'Envelope being prepared' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', description: 'Submitted to court' },
  processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-700', description: 'Court is reviewing' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', description: 'Accepted by court' },
  partially_accepted: { label: 'Partially Accepted', color: 'bg-orange-100 text-orange-700', description: 'Some documents accepted' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', description: 'Rejected by court' },
  error: { label: 'Error', color: 'bg-red-100 text-red-700', description: 'System error' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', description: 'Submission cancelled' },
}

export const EFILING_PROVIDER_INFO: Record<EFilingProvider, { label: string; description: string; states: string[] }> = {
  tyler: { label: 'Tyler Technologies', description: 'Odyssey e-filing system', states: ['CA', 'TX', 'FL', 'IL', 'GA'] },
  file_serve: { label: 'File & ServeXpress', description: 'Thomson Reuters filing', states: ['NY', 'NJ'] },
  odyssey: { label: 'Odyssey (Direct)', description: 'Tyler Odyssey direct integration', states: ['CA', 'TX'] },
  one_legal: { label: 'One Legal', description: 'InfoTrack e-filing', states: ['CA'] },
}

export const PAYMENT_ACCOUNT_TYPE_INFO: Record<PaymentAccountType, { label: string }> = {
  credit_card: { label: 'Credit Card' },
  ach: { label: 'ACH / Bank Account' },
  waiver: { label: 'Fee Waiver' },
  firm_account: { label: 'Firm Account' },
}

// ============================================================
// HELPERS
// ============================================================

export function formatEFilingFee(amount: number): string {
  if (amount === 0) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function mapProviderStatus(providerStatus: string): EFilingSubmissionStatus {
  const mapping: Record<string, EFilingSubmissionStatus> = {
    draft: 'draft',
    submitted: 'submitted',
    processing: 'processing',
    received: 'processing',
    accepted: 'accepted',
    filed: 'accepted',
    partially_accepted: 'partially_accepted',
    rejected: 'rejected',
    error: 'error',
    cancelled: 'cancelled',
  }
  return mapping[providerStatus.toLowerCase()] || 'processing'
}
