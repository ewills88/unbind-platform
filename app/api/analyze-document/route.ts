import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'You must be logged in to analyze documents' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { documentId, fileUrl, filename, mimeType, analysisType = 'categorize' } = body

    // Validate required fields
    if (!documentId || !fileUrl || !filename) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Missing required fields: documentId, fileUrl, filename' },
        { status: 400 }
      )
    }

    console.log(`🚀 Starting AI ${analysisType} for:`, filename, `(user: ${user.email})`)

    // Check if OpenAI is configured
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      console.warn('⚠️ OPENAI_API_KEY not configured - using fallback')
    }

    // Dynamic import to ensure env vars are loaded
    const { analyzeDocument, performFullAnalysis, summarizeDocument, extractDocumentData } =
      await import('@/lib/ai/document-analyzer')

    // Perform the requested analysis type
    let result

    switch (analysisType) {
      case 'full':
        // Full analysis: categorize + summarize + extract + insights
        result = await performFullAnalysis(fileUrl, filename, mimeType, documentId)

        // Store full analysis results if Supabase is available
        if (result.status === 'complete' && supabase) {
          await supabase
            .from('documents')
            .update({
              category: result.category.category,
              ai_category: result.category.category,
              ai_confidence: result.category.confidence,
              ai_reasoning: result.category.reasoning,
              ai_summary: result.summary,
              ai_extraction: result.extraction,
              ai_insights: result.insights,
              ai_processed_at: new Date().toISOString()
            })
            .eq('id', documentId)
        }
        break

      case 'summarize':
        // Summary only
        const summary = await summarizeDocument(fileUrl, filename, mimeType)
        result = { summary, status: summary ? 'complete' : 'error' }

        if (summary && supabase) {
          await supabase
            .from('documents')
            .update({ ai_summary: summary })
            .eq('id', documentId)
        }
        break

      case 'extract':
        // Extraction only
        const extraction = await extractDocumentData(fileUrl, filename, mimeType)
        result = { extraction, status: extraction ? 'complete' : 'error' }

        if (extraction && supabase) {
          await supabase
            .from('documents')
            .update({ ai_extraction: extraction })
            .eq('id', documentId)
        }
        break

      case 'categorize':
      default:
        // Category only (default)
        const analysis = await analyzeDocument(fileUrl, filename, mimeType)
        result = { category: analysis, status: 'complete' }

        if (supabase) {
          await supabase
            .from('documents')
            .update({
              category: analysis.category,
              ai_category: analysis.category,
              ai_confidence: analysis.confidence,
              ai_reasoning: analysis.reasoning,
              ai_processed_at: new Date().toISOString()
            })
            .eq('id', documentId)
        }
        break
    }

    console.log(`✅ AI ${analysisType} complete`)

    return NextResponse.json({ success: true, ...result })

  } catch (error) {
    console.error('❌ Document analysis error:', error)
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
