// Tyler Technologies E-Filing API Service
// Implements Tyler/Odyssey e-filing REST API integration

import { decrypt } from '@/lib/encryption'
import type {
  EFilingCredentials,
  TylerCourtLocation,
  TylerFilingCode,
  TylerDocumentType,
  TylerCaseCategory,
  TylerCaseType,
  TylerPartyType,
  TylerPaymentAccount,
  TylerEnvelopeStatus,
  TylerFeeCalculation,
  CreateEnvelopeParams,
} from '@/types/efiling'

interface TylerConfig {
  baseUrl: string
  clientToken: string
  username: string
  password: string
}

interface TylerAuthToken {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

export class TylerEFilingService {
  private config: TylerConfig
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(credentials: EFilingCredentials) {
    const baseUrls: Record<string, Record<string, string>> = {
      tyler: {
        production: 'https://california.tylerhost.net/api',
        staging: 'https://california-stage.tylerhost.net/api',
        sandbox: 'https://california-sandbox.tylerhost.net/api',
      },
      odyssey: {
        production: 'https://odyssey.tylerhost.net/api',
        staging: 'https://odyssey-stage.tylerhost.net/api',
        sandbox: 'https://odyssey-sandbox.tylerhost.net/api',
      },
    }

    const providerUrls = baseUrls[credentials.provider] || baseUrls.tyler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customUrl = (credentials.settings as any)?.base_url

    this.config = {
      baseUrl: customUrl || providerUrls[credentials.environment] || providerUrls.production,
      clientToken: credentials.client_token_encrypted ? decrypt(credentials.client_token_encrypted) : '',
      username: credentials.username_encrypted ? decrypt(credentials.username_encrypted) : '',
      password: credentials.password_encrypted ? decrypt(credentials.password_encrypted) : '',
    }
  }

  // ============================================================
  // Authentication
  // ============================================================

  async authenticate(): Promise<TylerAuthToken> {
    const response = await fetch(`${this.config.baseUrl}/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.config.clientToken,
      },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
      }),
    })

    if (!response.ok) {
      let errorMsg = `Tyler auth failed (${response.status})`
      try {
        const error = await response.json()
        errorMsg = error.message || errorMsg
      } catch {
        // Use default error
      }
      throw new Error(errorMsg)
    }

    const token: TylerAuthToken = await response.json()
    this.accessToken = token.access_token
    this.tokenExpiry = new Date(Date.now() + (token.expires_in * 1000))
    return token
  }

  private async ensureAuthenticated(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry < new Date()) {
      await this.authenticate()
    }
    return this.accessToken!
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async makeRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const token = await this.ensureAuthenticated()

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-API-KEY': this.config.clientToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let errorMsg = `Tyler API error (${response.status})`
      try {
        const error = await response.json()
        errorMsg = error.message || error.error || errorMsg
      } catch {
        // Use default error
      }
      throw new Error(errorMsg)
    }

    return response.json()
  }

  // ============================================================
  // Court / Code Lookups
  // ============================================================

  async getCourtLocations(stateCode: string): Promise<TylerCourtLocation[]> {
    const data = await this.makeRequest(`/courts?state=${stateCode}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.courts || []).map((court: any) => ({
      code: court.code,
      name: court.name,
      county: court.county,
      address: court.address,
      efiling_enabled: court.efiling_enabled ?? true,
    }))
  }

  async getFilingCodes(courtLocationCode: string, caseCategory: string): Promise<TylerFilingCode[]> {
    const data = await this.makeRequest(
      `/courts/${courtLocationCode}/filingcodes?category=${caseCategory}`
    )
    return data.filing_codes || []
  }

  async getCaseCategories(courtLocationCode: string): Promise<TylerCaseCategory[]> {
    const data = await this.makeRequest(`/courts/${courtLocationCode}/casecategories`)
    return data.categories || []
  }

  async getCaseTypes(courtLocationCode: string, caseCategory: string): Promise<TylerCaseType[]> {
    const data = await this.makeRequest(
      `/courts/${courtLocationCode}/casetypes?category=${caseCategory}`
    )
    return data.case_types || []
  }

  async getDocumentTypes(courtLocationCode: string, filingCode: string): Promise<TylerDocumentType[]> {
    const data = await this.makeRequest(
      `/courts/${courtLocationCode}/documenttypes?filingcode=${filingCode}`
    )
    return data.document_types || []
  }

  async getPartyTypes(courtLocationCode: string, caseCategory: string): Promise<TylerPartyType[]> {
    const data = await this.makeRequest(
      `/courts/${courtLocationCode}/partytypes?category=${caseCategory}`
    )
    return data.party_types || []
  }

  // ============================================================
  // Payment
  // ============================================================

  async getPaymentAccounts(): Promise<TylerPaymentAccount[]> {
    const data = await this.makeRequest('/paymentaccounts')
    return data.accounts || []
  }

  async calculateFees(params: {
    courtLocationCode: string
    filingCode: string
    documentCount: number
    pageCount: number
  }): Promise<TylerFeeCalculation> {
    const data = await this.makeRequest('/fees/calculate', 'POST', params)
    return {
      filingFee: data.filing_fee || 0,
      convenienceFee: data.convenience_fee || 0,
      total: data.total || 0,
    }
  }

  // ============================================================
  // Envelope / Submission
  // ============================================================

  async createEnvelope(params: CreateEnvelopeParams): Promise<{ envelopeId: string }> {
    const data = await this.makeRequest('/envelopes', 'POST', {
      court_location_code: params.courtLocationCode,
      case_category: params.caseCategory,
      case_type: params.caseType,
      case_number: params.caseNumber,
      filing_party_type: params.filingPartyType,
      payment_account_id: params.paymentAccountId,
      filing_attorney: params.filingAttorney,
      filings: params.filings.map(f => ({
        filing_code: f.filingCode,
        filing_description: f.description,
        filing_comments: f.comments,
        courtesy_copies: f.courtesyCopies,
        documents: f.documents.map(d => ({
          document_type_code: d.documentTypeCode,
          description: d.description,
          file_name: d.fileName,
          file_base64: d.fileBase64,
          is_lead_document: d.isLeadDocument,
        })),
      })),
      parties: params.parties?.map(p => ({
        party_type: p.partyType,
        first_name: p.firstName,
        last_name: p.lastName,
        business_name: p.businessName,
        address: p.address,
      })),
    })

    return { envelopeId: data.envelope_id }
  }

  async submitEnvelope(envelopeId: string): Promise<{
    submissionId: string
    status: string
    message: string
  }> {
    const data = await this.makeRequest(`/envelopes/${envelopeId}/submit`, 'POST')
    return {
      submissionId: data.submission_id || envelopeId,
      status: data.status || 'submitted',
      message: data.message || 'Submitted successfully',
    }
  }

  async getEnvelopeStatus(envelopeId: string): Promise<TylerEnvelopeStatus> {
    const data = await this.makeRequest(`/envelopes/${envelopeId}/status`)
    return {
      envelopeId: data.envelope_id || envelopeId,
      status: data.status,
      statusMessage: data.status_message || '',
      statusTimestamp: data.status_timestamp || new Date().toISOString(),
      filingNumber: data.filing_number,
      stampedDocuments: data.stamped_documents,
      rejectionReasons: data.rejection_reasons,
    }
  }

  async getStampedDocument(envelopeId: string, documentId: string): Promise<{
    fileName: string
    fileBase64: string
  }> {
    const data = await this.makeRequest(
      `/envelopes/${envelopeId}/documents/${documentId}/stamped`
    )
    return {
      fileName: data.file_name || `stamped_${documentId}.pdf`,
      fileBase64: data.file_base64 || '',
    }
  }

  async cancelEnvelope(envelopeId: string): Promise<void> {
    await this.makeRequest(`/envelopes/${envelopeId}/cancel`, 'POST')
  }

  // ============================================================
  // Case Search
  // ============================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async searchCases(params: {
    courtLocationCode: string
    caseNumber?: string
    partyName?: string
  }): Promise<any[]> {
    const queryParams = new URLSearchParams()
    if (params.caseNumber) queryParams.set('caseNumber', params.caseNumber)
    if (params.partyName) queryParams.set('partyName', params.partyName)

    const data = await this.makeRequest(
      `/courts/${params.courtLocationCode}/cases?${queryParams}`
    )
    return data.cases || []
  }
}
