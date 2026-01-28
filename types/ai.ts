export interface AIAnalysisResult {
  category: string
  confidence: number
  reasoning: string
  metadata: {
    documentType: string
    date?: string
    amount?: number
    parties?: string[]
    keyPoints?: string[]
    relevance?: 'high' | 'medium' | 'low'
    [key: string]: unknown
  }
}

export interface AIUsageLog {
  operation_type: 'categorize' | 'summarize' | 'extract' | 'analyze'
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_cost: number
  success: boolean
  error_message?: string
}

export interface DocumentSummary {
  summary: string
  keyPoints: string[]
  documentType: string
  relevance: 'high' | 'medium' | 'low'
  generatedAt: string
}

export interface ExtractedFinancialData {
  totalAmount?: number
  currency?: string
  accountNumbers?: string[]
  transactions?: {
    date: string
    description: string
    amount: number
    type: 'credit' | 'debit'
  }[]
  period?: {
    start: string
    end: string
  }
}

export interface ExtractedPartyInfo {
  name: string
  role: 'petitioner' | 'respondent' | 'attorney' | 'institution' | 'other'
  details?: string
}

export interface ExtractedDateInfo {
  date: string
  type: 'filing' | 'deadline' | 'hearing' | 'document' | 'transaction' | 'other'
  description: string
  isImportant: boolean
}

export interface ExtractedPropertyInfo {
  type: 'real_estate' | 'vehicle' | 'account' | 'investment' | 'personal' | 'other'
  description: string
  estimatedValue?: number
  ownership?: string
  address?: string
}

export interface DocumentExtraction {
  financialData?: ExtractedFinancialData
  parties: ExtractedPartyInfo[]
  dates: ExtractedDateInfo[]
  properties: ExtractedPropertyInfo[]
  keyFigures: {
    label: string
    value: string | number
    type: 'currency' | 'percentage' | 'date' | 'text'
  }[]
  extractedAt: string
}

export interface DocumentAIAnalysis {
  documentId: string
  category: AIAnalysisResult
  summary?: DocumentSummary
  extraction?: DocumentExtraction
  insights?: DocumentAIInsights
  analyzedAt: string
  status: 'pending' | 'analyzing' | 'complete' | 'error'
  error?: string
}

// Enhanced AI Insights (Session 5)
export interface DocumentAIInsights {
  sentiment: 'positive' | 'negative' | 'neutral' | 'urgent'
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  entities: {
    people: string[]
    organizations: string[]
    locations: string[]
  }
  deadlines: {
    date: string
    description: string
    isUrgent: boolean
    daysUntil?: number
  }[]
  actionItems: {
    action: string
    priority: 'low' | 'medium' | 'high'
    assignee?: string
    dueDate?: string
  }[]
  suggestedTags: string[]
  riskFactors?: {
    factor: string
    severity: 'low' | 'medium' | 'high'
    recommendation: string
  }[]
  analyzedAt: string
}

export interface CaseDocumentAnalytics {
  caseId: string
  totalDocuments: number
  analyzedDocuments: number
  categoryBreakdown: {
    category: string
    count: number
    percentage: number
  }[]
  financialSummary: {
    totalAssets: number
    totalDebts: number
    totalIncome: number
    accountsIdentified: number
  }
  importantDates: ExtractedDateInfo[]
  partiesIdentified: ExtractedPartyInfo[]
  missingDocuments: {
    type: string
    importance: 'required' | 'recommended' | 'optional'
    reason: string
  }[]
  lastUpdated: string
}
