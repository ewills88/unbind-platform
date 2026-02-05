import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { DOCUMENT_TYPES, DocumentType, AIVerificationResult } from '@/types/intake-documents'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Supabase admin client for background processing
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return null
  }

  return createClient(url, serviceKey)
}

// POST /api/ai/verify-document - AI document verification
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { documentId, fileUrl, expectedType } = await request.json()

    if (!documentId || !fileUrl || !expectedType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    // Get document config
    const docConfig = DOCUMENT_TYPES[expectedType as DocumentType]
    if (!docConfig) {
      return NextResponse.json({ error: 'Unknown document type' }, { status: 400 })
    }

    // Build verification prompt
    const verificationPrompt = buildVerificationPrompt(expectedType, docConfig)

    let verificationResult: AIVerificationResult

    try {
      // Call GPT-4 Vision for analysis
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a legal document verification assistant. Your job is to analyze uploaded documents and verify they match the expected document type. You extract key information and assess document quality. Always respond in valid JSON format.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: verificationPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: fileUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      })

      const content = response.choices[0]?.message?.content || ''

      // Parse AI response
      verificationResult = parseVerificationResponse(content)
    } catch (aiError) {
      console.error('OpenAI API error:', aiError)

      // Return a default result if AI fails
      verificationResult = {
        verified: false,
        confidence: 0,
        document_type_match: false,
        extracted_data: {},
        issues: ['AI verification service temporarily unavailable. Document will be reviewed manually.'],
        quality_score: 0,
        processing_time_ms: Date.now() - startTime,
      }
    }

    verificationResult.processing_time_ms = Date.now() - startTime

    // Determine final status
    const newStatus = verificationResult.verified && verificationResult.confidence >= 0.7
      ? 'verified'
      : verificationResult.confidence >= 0.5
        ? 'uploaded' // Needs manual review
        : 'rejected'

    // Update document record
    const { error: updateError } = await supabase
      .from('intake_documents')
      .update({
        upload_status: newStatus,
        ai_verification: verificationResult,
        ai_extracted_data: verificationResult.extracted_data,
        ai_confidence: verificationResult.confidence,
        rejection_reason: newStatus === 'rejected'
          ? verificationResult.issues.join('; ')
          : null,
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Document update error:', updateError)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    return NextResponse.json({
      verification: verificationResult,
      status: newStatus,
    })
  } catch (error) {
    console.error('Document verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildVerificationPrompt(documentType: string, config: typeof DOCUMENT_TYPES[string]): string {
  const extractionFields = getExtractionFields(documentType)

  return `
Analyze this document and verify if it is a valid "${config.name}".

Expected document type: ${config.name}
Description: ${config.description}

Please verify the following and respond in JSON format:

1. Document Type Match: Is this document actually a ${config.name}? (true/false)
2. Quality Assessment: Rate the document quality from 0 to 1 (1 being perfect)
   - Is the document readable and clear?
   - Is it complete (not cut off or missing pages)?
   - Are all important details visible?
3. Data Extraction: Extract the following information if present:
${extractionFields.map(f => `   - ${f}`).join('\n')}
4. Issues: List any problems with the document

Respond with this exact JSON structure:
{
  "verified": boolean,
  "confidence": number (0-1),
  "document_type_match": boolean,
  "quality_score": number (0-1),
  "extracted_data": {
    // extracted fields
  },
  "issues": ["list of issues if any"]
}
`
}

function getExtractionFields(documentType: string): string[] {
  const fieldMap: Record<string, string[]> = {
    marriage_certificate: [
      'spouse_1_name',
      'spouse_2_name',
      'marriage_date',
      'marriage_location',
      'certificate_number',
    ],
    drivers_license: [
      'full_name',
      'date_of_birth',
      'license_number',
      'expiration_date',
      'address',
      'state',
    ],
    tax_return_current: [
      'tax_year',
      'filing_status',
      'total_income',
      'adjusted_gross_income',
      'taxpayer_name',
    ],
    tax_return_prior: [
      'tax_year',
      'filing_status',
      'total_income',
      'adjusted_gross_income',
      'taxpayer_name',
    ],
    birth_certificates: [
      'child_name',
      'date_of_birth',
      'place_of_birth',
      'parent_names',
    ],
    bank_statements: [
      'account_holder',
      'bank_name',
      'account_type',
      'statement_period',
      'ending_balance',
    ],
    pay_stubs: [
      'employee_name',
      'employer_name',
      'pay_period',
      'gross_pay',
      'net_pay',
      'ytd_earnings',
    ],
    property_deed: [
      'property_address',
      'owner_names',
      'recording_date',
      'deed_type',
    ],
    mortgage_statement: [
      'borrower_name',
      'property_address',
      'loan_balance',
      'monthly_payment',
      'interest_rate',
    ],
    retirement_statements: [
      'account_holder',
      'account_type',
      'balance',
      'statement_date',
    ],
  }

  return fieldMap[documentType] || ['document_date', 'names_mentioned', 'key_amounts']
}

function parseVerificationResponse(content: string): AIVerificationResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        verified: parsed.verified ?? false,
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0)),
        document_type_match: parsed.document_type_match ?? false,
        quality_score: Math.min(1, Math.max(0, parsed.quality_score ?? 0)),
        extracted_data: parsed.extracted_data ?? {},
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      }
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e)
  }

  // Default response if parsing fails
  return {
    verified: false,
    confidence: 0,
    document_type_match: false,
    quality_score: 0,
    extracted_data: {},
    issues: ['Failed to analyze document. Please ensure the document is clear and properly formatted.'],
  }
}
