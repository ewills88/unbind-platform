// E-Filing Service Wrapper
// Provides a unified interface for e-filing operations across providers

import { TylerEFilingService } from './providers/tyler'
import { createClient } from '@supabase/supabase-js'
import { encrypt } from '@/lib/encryption'
import { mapProviderStatus } from '@/types/efiling'
import type { EFilingCredentials, EFilingSubmission } from '@/types/efiling'

// Service-role client for background operations
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase service config')
  return createClient(url, serviceKey)
}

export class EFilingService {
  private provider: TylerEFilingService
  private credentials: EFilingCredentials

  constructor(credentials: EFilingCredentials) {
    this.credentials = credentials

    switch (credentials.provider) {
      case 'tyler':
      case 'odyssey':
        this.provider = new TylerEFilingService(credentials)
        break
      default:
        // Default to Tyler for now
        this.provider = new TylerEFilingService(credentials)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async getCredentialsForFirm(supabase: any, firmId: string): Promise<EFilingCredentials | null> {
    const { data } = await supabase
      .from('efiling_credentials')
      .select('*')
      .eq('firm_id', firmId)
      .eq('is_active', true)
      .limit(1)
      .single()
    return data
  }

  // Verify credentials work
  async verifyCredentials(): Promise<{ success: boolean; error?: string }> {
    const supabase = getServiceClient()
    try {
      await this.provider.authenticate()

      await supabase
        .from('efiling_credentials')
        .update({
          last_verified_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', this.credentials.id)

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await supabase
        .from('efiling_credentials')
        .update({ last_error: message })
        .eq('id', this.credentials.id)

      return { success: false, error: message }
    }
  }

  // Submit a filing to court
  async submitFiling(params: {
    caseId: string
    filingId: string
    courtLocationCode: string
    caseNumber?: string
    filingCode: string
    filingDescription: string
    documents: {
      fileName: string
      fileBase64: string
      documentTypeCode: string
      description: string
      isLeadDocument: boolean
    }[]
    paymentAccountId: string
    filingAttorney: {
      barNumber: string
      firstName: string
      lastName: string
      firmName: string
      email: string
      phone: string
    }
    userId: string
  }): Promise<EFilingSubmission> {
    const supabase = getServiceClient()

    // Create envelope
    const { envelopeId } = await this.provider.createEnvelope({
      courtLocationCode: params.courtLocationCode,
      caseCategory: 'family',
      caseType: 'dissolution',
      caseNumber: params.caseNumber,
      filingPartyType: 'petitioner',
      paymentAccountId: params.paymentAccountId,
      filingAttorney: params.filingAttorney,
      filings: [{
        filingCode: params.filingCode,
        description: params.filingDescription,
        documents: params.documents,
      }],
    })

    // Submit envelope
    const submission = await this.provider.submitEnvelope(envelopeId)

    // Calculate fees
    let feeInfo = { filingFee: 0, convenienceFee: 0, total: 0 }
    try {
      feeInfo = await this.provider.calculateFees({
        courtLocationCode: params.courtLocationCode,
        filingCode: params.filingCode,
        documentCount: params.documents.length,
        pageCount: params.documents.length, // approximation
      })
    } catch {
      // Fee calculation is optional
    }

    // Create submission record
    const { data: record, error } = await supabase
      .from('efiling_submissions')
      .insert({
        case_id: params.caseId,
        filing_id: params.filingId,
        credential_id: this.credentials.id,
        provider: this.credentials.provider,
        envelope_id: envelopeId,
        submission_timestamp: new Date().toISOString(),
        status: 'submitted',
        status_message: submission.message,
        status_timestamp: new Date().toISOString(),
        court_location_code: params.courtLocationCode,
        case_number_at_court: params.caseNumber,
        filing_code: params.filingCode,
        filing_description: params.filingDescription,
        documents_submitted: params.documents.map(d => ({
          fileName: d.fileName,
          documentTypeCode: d.documentTypeCode,
        })),
        filing_fee_amount: feeInfo.filingFee,
        convenience_fee: feeInfo.convenienceFee,
        total_charged: feeInfo.total,
        payment_account_id: params.paymentAccountId,
        raw_request: { envelopeId, filingCode: params.filingCode },
        created_by: params.userId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to record submission: ${error.message}`)
    }

    // Update filing status
    await supabase
      .from('case_filings')
      .update({
        status: 'filed',
        filed_date: new Date().toISOString(),
        confirmation_number: envelopeId,
        filing_method: 'efiling',
      })
      .eq('id', params.filingId)

    return record
  }

  // Check submission status
  async checkSubmissionStatus(submissionId: string): Promise<EFilingSubmission> {
    const supabase = getServiceClient()

    const { data: submission } = await supabase
      .from('efiling_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (!submission) {
      throw new Error('Submission not found')
    }

    if (!submission.envelope_id) {
      throw new Error('No envelope ID on submission')
    }

    // Get status from provider
    const status = await this.provider.getEnvelopeStatus(submission.envelope_id)
    const updatedStatus = mapProviderStatus(status.status)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      status: updatedStatus,
      status_message: status.statusMessage,
      status_timestamp: new Date().toISOString(),
      raw_response: status,
    }

    if (updatedStatus === 'accepted') {
      updates.accepted_timestamp = new Date().toISOString()
      updates.filing_number = status.filingNumber
      updates.stamped_documents = status.stampedDocuments

      // Update filing record
      await supabase
        .from('case_filings')
        .update({
          status: 'completed',
          filing_number: status.filingNumber,
          confirmation_number: status.filingNumber,
        })
        .eq('id', submission.filing_id)

      // Download stamped documents if available
      if (status.stampedDocuments && status.stampedDocuments.length > 0) {
        for (const stampedDoc of status.stampedDocuments) {
          try {
            const { fileName, fileBase64 } = await this.provider.getStampedDocument(
              submission.envelope_id,
              stampedDoc.documentId
            )
            const buffer = Buffer.from(fileBase64, 'base64')
            const filePath = `cases/${submission.case_id}/stamped/${fileName}`

            await supabase.storage
              .from('documents')
              .upload(filePath, new Uint8Array(buffer), {
                contentType: 'application/pdf',
              })

            // Update filing with conformed document path
            await supabase
              .from('filing_documents')
              .update({
                is_conformed: true,
                conformed_file_path: filePath,
              })
              .eq('filing_id', submission.filing_id)
              .eq('document_type', 'primary')
          } catch (err) {
            console.error('Failed to download stamped document:', err)
          }
        }
      }
    }

    if (updatedStatus === 'rejected') {
      updates.rejected_timestamp = new Date().toISOString()
      updates.rejection_reason = status.rejectionReasons?.map(r => r.description).join('; ') || 'Unknown reason'
      updates.rejection_codes = status.rejectionReasons

      await supabase
        .from('case_filings')
        .update({
          status: 'rejected',
          rejection_reason: updates.rejection_reason,
        })
        .eq('id', submission.filing_id)
    }

    const { data: updated, error } = await supabase
      .from('efiling_submissions')
      .update(updates)
      .eq('id', submissionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update submission: ${error.message}`)
    }

    return updated
  }

  // Proxy methods
  async getFilingCodes(courtLocationCode: string, caseCategory: string = 'family') {
    return this.provider.getFilingCodes(courtLocationCode, caseCategory)
  }

  async getDocumentTypes(courtLocationCode: string, filingCode: string) {
    return this.provider.getDocumentTypes(courtLocationCode, filingCode)
  }

  async getPaymentAccounts() {
    return this.provider.getPaymentAccounts()
  }

  async calculateFees(params: {
    courtLocationCode: string
    filingCode: string
    documentCount: number
    pageCount: number
  }) {
    return this.provider.calculateFees(params)
  }

  async searchCases(params: {
    courtLocationCode: string
    caseNumber?: string
    partyName?: string
  }) {
    return this.provider.searchCases(params)
  }

  async cancelSubmission(envelopeId: string) {
    return this.provider.cancelEnvelope(envelopeId)
  }
}

// Encrypt credentials helper (for API routes)
export function encryptCredentialFields(body: {
  username?: string
  password?: string
  client_token?: string
  api_key?: string
}): {
  username_encrypted: string | null
  password_encrypted: string | null
  client_token_encrypted: string | null
  api_key_encrypted: string | null
} {
  return {
    username_encrypted: body.username ? encrypt(body.username) : null,
    password_encrypted: body.password ? encrypt(body.password) : null,
    client_token_encrypted: body.client_token ? encrypt(body.client_token) : null,
    api_key_encrypted: body.api_key ? encrypt(body.api_key) : null,
  }
}
