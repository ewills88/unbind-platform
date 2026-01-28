import { openai, isAIEnabled } from './openai-client'
import {
  AIAnalysisResult,
  DocumentSummary,
  DocumentExtraction,
  DocumentAIAnalysis,
  DocumentAIInsights
} from '@/types/ai'

// Category definitions for divorce documents
export const DOCUMENT_CATEGORIES = {
  financial: {
    label: 'Financial',
    description: 'Bank statements, credit cards, investments, retirement accounts',
    color: 'blue'
  },
  legal: {
    label: 'Legal',
    description: 'Contracts, agreements, legal correspondence',
    color: 'purple'
  },
  property: {
    label: 'Property',
    description: 'Deeds, titles, real estate documents, vehicle titles',
    color: 'green'
  },
  custody: {
    label: 'Custody & Children',
    description: 'Custody agreements, school records, medical records',
    color: 'orange'
  },
  tax: {
    label: 'Tax Documents',
    description: 'Tax returns, W-2s, 1099s, IRS correspondence',
    color: 'red'
  },
  employment: {
    label: 'Employment',
    description: 'Pay stubs, employment contracts, benefits info',
    color: 'cyan'
  },
  court: {
    label: 'Court Filings',
    description: 'Petitions, motions, court orders, summons',
    color: 'indigo'
  },
  other: {
    label: 'Other',
    description: 'Documents that don\'t fit other categories',
    color: 'gray'
  }
}

const CATEGORIZATION_PROMPT = `You are an AI assistant helping family law attorneys organize divorce case documents.

Analyze this document and categorize it as ONE of these categories:
- financial: Bank statements, credit card statements, investment accounts, retirement accounts
- legal: Contracts, agreements, legal correspondence, prenuptial agreements
- property: Deeds, titles, real estate documents, vehicle titles, appraisals
- custody: Custody agreements, parenting plans, school records, medical records for children
- tax: Tax returns, W-2s, 1099s, IRS documents
- employment: Pay stubs, employment contracts, HR documents, benefits information
- court: Court filings, petitions, summons, motions, court orders
- other: Anything that doesn't fit above categories

Return ONLY valid JSON:
{
  "category": "financial",
  "confidence": 95,
  "reasoning": "Document contains bank account statements with transaction history",
  "metadata": {
    "documentType": "bank statement",
    "date": "2024-12",
    "amount": 5420.50,
    "parties": ["Chase Bank"]
  }
}`

const SUMMARY_PROMPT = `You are an AI assistant helping family law attorneys review divorce case documents.

Analyze this document and provide a concise summary for legal review.

Return ONLY valid JSON:
{
  "summary": "A 2-3 sentence summary of the document's contents and significance",
  "keyPoints": ["Important point 1", "Important point 2", "Important point 3"],
  "documentType": "Specific type (e.g., 'Bank Statement', 'Tax Return 1040', 'Property Deed')",
  "relevance": "high|medium|low based on typical importance in divorce proceedings"
}`

const INSIGHTS_PROMPT = `You are an AI assistant helping family law attorneys analyze divorce case documents for actionable insights.

Analyze this document and extract:
1. Overall sentiment and urgency
2. Named entities (people, organizations, locations)
3. Important deadlines or dates requiring action
4. Action items or tasks mentioned
5. Suggested tags for organization
6. Any risk factors or concerns

Return ONLY valid JSON:
{
  "sentiment": "neutral",
  "urgencyLevel": "medium",
  "entities": {
    "people": ["John Smith", "Jane Smith"],
    "organizations": ["Chase Bank", "Superior Court"],
    "locations": ["Los Angeles, CA"]
  },
  "deadlines": [
    {"date": "2024-03-15", "description": "Response due date", "isUrgent": true}
  ],
  "actionItems": [
    {"action": "File response to motion", "priority": "high", "dueDate": "2024-03-15"},
    {"action": "Gather bank statements", "priority": "medium"}
  ],
  "suggestedTags": ["urgent", "court-filing", "deadline"],
  "riskFactors": [
    {"factor": "Missing signature on page 3", "severity": "medium", "recommendation": "Obtain signed copy"}
  ]
}

Sentiment options: positive, negative, neutral, urgent
Urgency options: low, medium, high, critical
Priority options: low, medium, high`

const EXTRACTION_PROMPT = `You are an AI assistant helping extract key information from divorce case documents.

Extract all relevant information including:
- Financial data (amounts, account numbers, transactions)
- Parties mentioned (names and roles)
- Important dates (filing dates, deadlines, document dates)
- Property information (real estate, vehicles, accounts)
- Key figures that would be relevant in divorce proceedings

Return ONLY valid JSON:
{
  "financialData": {
    "totalAmount": 50000,
    "currency": "USD",
    "accountNumbers": ["****1234"],
    "transactions": [{"date": "2024-01-15", "description": "Deposit", "amount": 5000, "type": "credit"}],
    "period": {"start": "2024-01-01", "end": "2024-01-31"}
  },
  "parties": [
    {"name": "John Smith", "role": "petitioner", "details": "Account holder"}
  ],
  "dates": [
    {"date": "2024-01-15", "type": "document", "description": "Statement date", "isImportant": false}
  ],
  "properties": [
    {"type": "account", "description": "Chase Checking Account", "estimatedValue": 50000}
  ],
  "keyFigures": [
    {"label": "Account Balance", "value": 50000, "type": "currency"},
    {"label": "Monthly Income", "value": 8500, "type": "currency"}
  ]
}`

// Helper to check if a file is a PDF (by mimeType or filename)
function isPDF(filename: string, mimeType: string): boolean {
  const lower = filename.toLowerCase()
  return mimeType === 'application/pdf' || lower.endsWith('.pdf')
}

// Helper to check if a file is a supported image
function isImage(filename: string, mimeType: string): boolean {
  const lower = filename.toLowerCase()
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  return mimeType.startsWith('image/') || imageExtensions.some(ext => lower.endsWith(ext))
}

export async function analyzeDocument(
  fileUrl: string,
  filename: string,
  mimeType: string
): Promise<AIAnalysisResult> {
  console.log(`📄 analyzeDocument called: filename=${filename}, mimeType=${mimeType}`)

  // Check for PDF first (by extension or mimeType) - use filename-based categorization
  if (isPDF(filename, mimeType)) {
    console.log('📄 PDF detected - using filename categorization')
    return fallbackCategorization(filename)
  }

  if (!isAIEnabled()) {
    console.log('AI disabled - using fallback categorization')
    return fallbackCategorization(filename)
  }

  try {
    // Only use Vision for actual images
    if (isImage(filename, mimeType)) {
      return await analyzeWithVision(fileUrl, filename, CATEGORIZATION_PROMPT)
    }
    // Unknown format - use fallback
    console.log('Unknown format - using filename categorization')
    return fallbackCategorization(filename)
  } catch (error) {
    console.error('AI categorization failed:', error)
    return fallbackCategorization(filename)
  }
}

export async function summarizeDocument(
  fileUrl: string,
  filename: string,
  mimeType: string
): Promise<DocumentSummary | null> {
  console.log(`📝 summarizeDocument called: filename=${filename}, mimeType=${mimeType}`)

  // For PDFs, generate summary from filename
  if (isPDF(filename, mimeType)) {
    console.log('📝 PDF detected - generating filename-based summary')
    const category = fallbackCategorization(filename)
    return {
      summary: `This appears to be a ${category.metadata.documentType} document based on the filename "${filename}".`,
      keyPoints: [
        `Document type: ${category.metadata.documentType}`,
        `Category: ${category.category}`,
        `Confidence: ${category.confidence}%`
      ],
      documentType: category.metadata.documentType || 'PDF Document',
      relevance: category.category === 'other' ? 'low' : 'medium',
      generatedAt: new Date().toISOString()
    }
  }

  if (!isAIEnabled()) {
    return null
  }

  try {
    // Only use vision for actual images
    if (!isImage(filename, mimeType)) {
      console.log('📝 Not an image - skipping Vision API')
      return null
    }
    const result = await analyzeWithVision(fileUrl, filename, SUMMARY_PROMPT)
    return {
      summary: result.reasoning || 'Unable to generate summary',
      keyPoints: result.metadata?.keyPoints || [],
      documentType: result.metadata?.documentType || 'Unknown',
      relevance: (result.metadata?.relevance as 'high' | 'medium' | 'low') || 'medium',
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('AI summarization failed:', error)
    return null
  }
}

export async function extractDocumentData(
  fileUrl: string,
  filename: string,
  mimeType: string
): Promise<DocumentExtraction | null> {
  console.log(`🔎 extractDocumentData called: filename=${filename}, mimeType=${mimeType}`)

  // For PDFs, return empty extraction (Vision API can't read PDFs)
  if (isPDF(filename, mimeType)) {
    console.log('🔎 PDF detected - returning empty extraction')
    return {
      parties: [],
      dates: [],
      properties: [],
      keyFigures: [],
      extractedAt: new Date().toISOString()
    }
  }

  if (!isAIEnabled()) {
    return null
  }

  try {
    // Only images are supported
    if (!isImage(filename, mimeType)) {
      console.log('🔎 Not an image - skipping Vision API')
      return null
    }

    console.log('🔍 Extracting data with GPT-4 Vision...')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Filename: ${filename}\n\nExtract all relevant information:` },
            { type: 'image_url', image_url: { url: fileUrl, detail: 'high' } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.2
    })

    const content = completion.choices[0].message.content || '{}'
    const result = JSON.parse(content)

    return {
      financialData: result.financialData,
      parties: result.parties || [],
      dates: result.dates || [],
      properties: result.properties || [],
      keyFigures: result.keyFigures || [],
      extractedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('AI extraction failed:', error)
    return null
  }
}

export async function extractInsights(
  fileUrl: string,
  filename: string,
  mimeType: string,
  existingCategory?: string
): Promise<DocumentAIInsights | null> {
  console.log(`💡 extractInsights called: filename=${filename}, mimeType=${mimeType}`)

  // For PDFs, generate insights from filename
  if (isPDF(filename, mimeType)) {
    console.log('💡 PDF detected - generating filename-based insights')
    return generateFallbackInsights(filename, existingCategory)
  }

  if (!isAIEnabled()) {
    return generateFallbackInsights(filename, existingCategory)
  }

  try {
    // Only images are supported for Vision API
    if (!isImage(filename, mimeType)) {
      console.log('💡 Not an image - using fallback insights')
      return generateFallbackInsights(filename, existingCategory)
    }

    console.log('💡 Extracting insights with GPT-4 Vision...')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: INSIGHTS_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Filename: ${filename}\n\nExtract insights and action items:` },
            { type: 'image_url', image_url: { url: fileUrl, detail: 'high' } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.3
    })

    const content = completion.choices[0].message.content || '{}'
    const result = JSON.parse(content)

    // Calculate days until deadlines
    const deadlinesWithDays = (result.deadlines || []).map((d: { date: string; description: string; isUrgent: boolean }) => {
      const deadlineDate = new Date(d.date)
      const today = new Date()
      const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return { ...d, daysUntil }
    })

    return {
      sentiment: result.sentiment || 'neutral',
      urgencyLevel: result.urgencyLevel || 'low',
      entities: {
        people: result.entities?.people || [],
        organizations: result.entities?.organizations || [],
        locations: result.entities?.locations || []
      },
      deadlines: deadlinesWithDays,
      actionItems: result.actionItems || [],
      suggestedTags: result.suggestedTags || [],
      riskFactors: result.riskFactors,
      analyzedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('AI insights extraction failed:', error)
    return generateFallbackInsights(filename, existingCategory)
  }
}

function generateFallbackInsights(filename: string, category?: string): DocumentAIInsights {
  const lower = filename.toLowerCase()
  const suggestedTags: string[] = []
  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  let sentiment: 'positive' | 'negative' | 'neutral' | 'urgent' = 'neutral'

  // Determine urgency and tags based on filename patterns
  if (lower.includes('urgent') || lower.includes('immediate') || lower.includes('asap')) {
    urgencyLevel = 'critical'
    sentiment = 'urgent'
    suggestedTags.push('urgent')
  }

  if (lower.includes('court') || lower.includes('summons') || lower.includes('motion')) {
    urgencyLevel = urgencyLevel === 'low' ? 'high' : urgencyLevel
    suggestedTags.push('court-filing')
  }

  if (lower.includes('deadline') || lower.includes('due')) {
    suggestedTags.push('deadline')
    urgencyLevel = urgencyLevel === 'low' ? 'medium' : urgencyLevel
  }

  if (lower.includes('draft')) {
    suggestedTags.push('draft')
  }

  if (lower.includes('final') || lower.includes('signed')) {
    suggestedTags.push('final')
  }

  if (lower.includes('confidential') || lower.includes('private')) {
    suggestedTags.push('confidential')
  }

  // Add category-based tags
  if (category) {
    suggestedTags.push(category)
  }

  return {
    sentiment,
    urgencyLevel,
    entities: {
      people: [],
      organizations: [],
      locations: []
    },
    deadlines: [],
    actionItems: [],
    suggestedTags: Array.from(new Set(suggestedTags)), // Remove duplicates
    analyzedAt: new Date().toISOString()
  }
}

export async function performFullAnalysis(
  fileUrl: string,
  filename: string,
  mimeType: string,
  documentId: string
): Promise<DocumentAIAnalysis> {
  const startTime = Date.now()
  console.log(`🤖 Starting full AI analysis for: ${filename}`)

  try {
    // Run categorization first to get category for insights
    const category = await analyzeDocument(fileUrl, filename, mimeType)

    // Run summarization, extraction, and insights in parallel
    const [summary, extraction, insights] = await Promise.all([
      summarizeDocument(fileUrl, filename, mimeType),
      extractDocumentData(fileUrl, filename, mimeType),
      extractInsights(fileUrl, filename, mimeType, category.category)
    ])

    console.log(`✅ Full analysis complete in ${Date.now() - startTime}ms`)

    return {
      documentId,
      category,
      summary: summary || undefined,
      extraction: extraction || undefined,
      insights: insights || undefined,
      analyzedAt: new Date().toISOString(),
      status: 'complete'
    }
  } catch (error) {
    console.error('Full analysis failed:', error)
    return {
      documentId,
      category: fallbackCategorization(filename),
      analyzedAt: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function analyzeWithVision(
  fileUrl: string,
  filename: string,
  systemPrompt: string
): Promise<AIAnalysisResult> {
  console.log('🔍 Analyzing with GPT-4 Vision...')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Filename: ${filename}\n\nAnalyze this document:` },
          { type: 'image_url', image_url: { url: fileUrl, detail: 'low' } }
        ]
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
    temperature: 0.3
  })

  const content = completion.choices[0].message.content || '{}'
  const result = JSON.parse(content)

  return {
    category: result.category || 'other',
    confidence: result.confidence || 50,
    reasoning: result.reasoning || result.summary || 'Analyzed document content',
    metadata: {
      documentType: result.documentType || result.metadata?.documentType || 'unknown',
      ...result.metadata,
      keyPoints: result.keyPoints,
      relevance: result.relevance
    }
  }
}

function fallbackCategorization(filename: string): AIAnalysisResult {
  const lower = filename.toLowerCase()

  const patterns: Record<string, { keywords: string[], confidence: number }> = {
    financial: {
      keywords: ['bank', 'statement', 'account', 'chase', 'wells', 'credit', 'visa', 'mastercard', '401k', 'ira', 'investment'],
      confidence: 65
    },
    tax: {
      keywords: ['tax', '1040', 'w2', 'w-2', '1099', 'irs', 'return', 'schedule'],
      confidence: 70
    },
    court: {
      keywords: ['court', 'petition', 'summons', 'fl-100', 'fl-110', 'filing', 'motion', 'order', 'decree'],
      confidence: 75
    },
    employment: {
      keywords: ['pay', 'stub', 'paystub', 'salary', 'payroll', 'earnings', 'employment', 'offer letter'],
      confidence: 70
    },
    property: {
      keywords: ['property', 'deed', 'title', 'real estate', 'appraisal', 'mortgage', 'house', 'vehicle'],
      confidence: 65
    },
    legal: {
      keywords: ['contract', 'agreement', 'legal', 'attorney', 'prenup', 'postnup'],
      confidence: 60
    },
    custody: {
      keywords: ['custody', 'parenting', 'child', 'school', 'medical', 'visitation'],
      confidence: 70
    }
  }

  for (const [category, { keywords, confidence }] of Object.entries(patterns)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return {
        category,
        confidence,
        reasoning: `Filename suggests ${category} document`,
        metadata: { documentType: category }
      }
    }
  }

  return {
    category: 'other',
    confidence: 40,
    reasoning: 'Could not determine category from filename',
    metadata: { documentType: 'unknown' }
  }
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'High'
  if (confidence >= 60) return 'Medium'
  return 'Low'
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'green'
  if (confidence >= 60) return 'yellow'
  return 'red'
}
