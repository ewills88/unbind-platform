/**
 * Document Classification System
 * 
 * Current: Rule-based classification using filename patterns
 * Future: Will integrate GPT-4 Vision for content-based classification
 * 
 * TODO for Session 4:
 * - Add GPT-4 Vision API integration
 * - Extract text from PDFs using OCR
 * - Analyze document content, not just filename
 * - Train on legal document patterns
 * - Add confidence scoring based on content analysis
 */

export interface ClassificationResult {
    category: 'financial' | 'legal' | 'property' | 'custody' | 'other'
    confidence: number // 0.0 to 1.0
    reasoning: string
    suggestedTags?: string[]
  }
  
  /**
   * Categorize document based on filename (current implementation)
   * 
   * @param filename - Original filename
   * @param fileUrl - URL to file (for future AI processing)
   * @returns Classification result with category, confidence, and reasoning
   */
  export async function categorizeDocument(
    filename: string,
    fileUrl?: string
  ): Promise<ClassificationResult> {
    const lowerFilename = filename.toLowerCase()
  
    // Financial documents
    const financialKeywords = [
      'bank', 'statement', 'w2', 'w-2', 'tax', '1099', 
      'pay stub', 'paystub', 'income', 'salary', 'asset',
      'debt', 'credit', 'loan', 'mortgage', 'financial',
      'account', 'balance', 'investment', '401k', 'retirement'
    ]
  
    // Legal documents
    const legalKeywords = [
      'petition', 'motion', 'order', 'decree', 'judgment',
      'summons', 'complaint', 'response', 'declaration',
      'affidavit', 'stipulation', 'settlement', 'agreement',
      'filing', 'court', 'legal', 'attorney', 'notice'
    ]
  
    // Property documents
    const propertyKeywords = [
      'deed', 'title', 'property', 'mortgage', 'lease',
      'rental', 'real estate', 'appraisal', 'valuation',
      'home', 'house', 'vehicle', 'car', 'asset'
    ]
  
    // Custody/children documents
    const custodyKeywords = [
      'parenting', 'custody', 'child', 'children', 'school',
      'medical', 'health', 'visitation', 'support', 'education',
      'daycare', 'minor', 'kid', 'kids'
    ]
  
    // Check for matches
    const financialScore = countMatches(lowerFilename, financialKeywords)
    const legalScore = countMatches(lowerFilename, legalKeywords)
    const propertyScore = countMatches(lowerFilename, propertyKeywords)
    const custodyScore = countMatches(lowerFilename, custodyKeywords)
  
    const scores = [
      { category: 'financial' as const, score: financialScore, keywords: financialKeywords },
      { category: 'legal' as const, score: legalScore, keywords: legalKeywords },
      { category: 'property' as const, score: propertyScore, keywords: propertyKeywords },
      { category: 'custody' as const, score: custodyScore, keywords: custodyKeywords },
    ]
  
    // Find highest scoring category
    const maxScore = Math.max(financialScore, legalScore, propertyScore, custodyScore)
    
    if (maxScore === 0) {
      return {
        category: 'other',
        confidence: 0.3,
        reasoning: 'No specific keywords found in filename. Manual categorization recommended.',
      }
    }
  
    const winner = scores.find(s => s.score === maxScore)!
    const matchedKeywords = winner.keywords.filter(k => lowerFilename.includes(k))
  
    // Calculate confidence based on number of matches
    // 1 match = 0.6, 2 matches = 0.75, 3+ matches = 0.85
    const confidence = Math.min(0.6 + (maxScore - 1) * 0.15, 0.85)
  
    return {
      category: winner.category,
      confidence,
      reasoning: `Found "${matchedKeywords.join('", "')}" in filename`,
      suggestedTags: matchedKeywords.slice(0, 3),
    }
  }
  
  /**
   * Count how many keywords are found in the text
   */
  function countMatches(text: string, keywords: string[]): number {
    return keywords.filter(keyword => text.includes(keyword)).length
  }
  
  /**
   * Get confidence level label
   */
  export function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return 'High Confidence'
    if (confidence >= 0.6) return 'Medium Confidence'
    return 'Low Confidence'
  }
  
  /**
   * Get confidence color for UI
   */
  export function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'green'
    if (confidence >= 0.6) return 'yellow'
    return 'orange'
  }
  
  /**
   * TODO: Future AI Enhancement (Session 4)
   * 
   * This function will be implemented with GPT-4 Vision API
   * to analyze actual document content, not just filename.
   * 
   * Steps:
   * 1. Download document from Supabase Storage
   * 2. For PDFs: Extract first page as image or extract text
   * 3. Send to GPT-4 Vision API with prompt:
   *    "Analyze this legal document and categorize it as:
   *     financial, legal, property, custody, or other.
   *     Provide confidence score and reasoning."
   * 4. Store extracted text for future search
   * 5. Return enhanced classification result
   */
  export async function categorizeDocumentWithAI(
    fileUrl: string,
    filename: string
  ): Promise<ClassificationResult> {
    // TODO: Implement in Session 4
    console.log('AI categorization queued for:', filename)
    
    // For now, fall back to filename-based classification
    return categorizeDocument(filename, fileUrl)
  }