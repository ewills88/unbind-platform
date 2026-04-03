import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { IntakeData } from '@/types/intake'
import { AIFlag, MissingInfo, DataInconsistency } from '@/types/intake-documents'
import { getAuthenticatedClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// POST /api/intakes/[id]/analyze - Run AI analysis on intake
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: intakeId } = await params

    // Get intake data
    const { data: intake, error: intakeError } = await supabase
      .from('client_intakes')
      .select('*')
      .eq('id', intakeId)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // Verify access (must be attorney or invited_by)
    if (intake.user_id !== user.id && intake.invited_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const intakeData = intake.intake_data as IntakeData

    // Run AI analysis
    let aiAnalysis
    try {
      aiAnalysis = await analyzeIntakeWithAI(intakeData)
    } catch (aiError) {
      console.error('AI analysis error:', aiError)
      // Use rule-based analysis as fallback
      aiAnalysis = runRuleBasedAnalysis(intakeData)
    }

    // Store analysis results
    const { data: analysis, error: insertError } = await supabase
      .from('intake_ai_analysis')
      .upsert({
        intake_id: intakeId,
        complexity_score: aiAnalysis.complexity_score,
        flags: aiAnalysis.flags,
        recommendations: aiAnalysis.recommendations,
        missing_information: aiAnalysis.missing_information,
        data_inconsistencies: aiAnalysis.data_inconsistencies,
        analyzed_at: new Date().toISOString(),
      }, {
        onConflict: 'intake_id'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Analysis storage error:', insertError)
      return NextResponse.json({ error: 'Failed to store analysis' }, { status: 500 })
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Intake analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function analyzeIntakeWithAI(intakeData: IntakeData) {
  const prompt = buildAnalysisPrompt(intakeData)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a family law case analysis assistant. You analyze divorce intake questionnaires to identify case complexity, potential issues, and attorney recommendations. Respond only in valid JSON format.`
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 2000,
    temperature: 0.2,
  })

  const content = response.choices[0]?.message?.content || ''
  return parseAnalysisResponse(content, intakeData)
}

function buildAnalysisPrompt(data: IntakeData): string {
  return `
Analyze this divorce case intake questionnaire and provide a detailed assessment.

INTAKE DATA:
${JSON.stringify(data, null, 2)}

Please analyze for:

1. COMPLEXITY SCORE (0-10):
   - 0-3: Simple, uncontested divorce
   - 4-6: Moderate complexity, some disputed issues
   - 7-8: Complex case requiring significant attorney time
   - 9-10: Highly complex, likely contentious litigation

2. FLAGS - Identify issues that need attorney attention:
   - high_asset: Total assets exceed $500,000
   - business_ownership: Business requiring valuation
   - custody_dispute: Parents have conflicting preferences
   - domestic_violence: Safety concerns mentioned
   - hidden_assets: Client suspects hidden assets
   - multiple_properties: More than one property to divide
   - retirement_accounts: Significant retirement assets needing QDRO
   - self_employment: Complex income verification needed
   - international_assets: Assets in other countries
   - prior_litigation: History of legal disputes

   Each flag should have: type, severity (low/medium/high/critical), description

3. RECOMMENDATIONS:
   - Consultation time needed (30 min, 60 min, 90 min, extended)
   - Referrals needed (forensic accountant, custody evaluator, etc.)
   - Special considerations for case strategy

4. MISSING INFORMATION:
   - Vague or incomplete responses
   - Required fields that need clarification
   - Inconsistencies in answers

5. DATA INCONSISTENCIES:
   - Conflicting information between sections
   - Numbers that don't add up
   - Dates that don't align

Respond with this JSON structure:
{
  "complexity_score": number,
  "flags": [{"type": string, "severity": string, "description": string}],
  "recommendations": [string],
  "missing_information": [{"field": string, "section": string, "description": string, "importance": string}],
  "data_inconsistencies": [{"field1": string, "field2": string, "description": string}]
}
`
}

function parseAnalysisResponse(content: string, intakeData: IntakeData) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        complexity_score: Math.min(10, Math.max(0, parsed.complexity_score ?? 5)),
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        missing_information: Array.isArray(parsed.missing_information) ? parsed.missing_information : [],
        data_inconsistencies: Array.isArray(parsed.data_inconsistencies) ? parsed.data_inconsistencies : [],
      }
    }
  } catch (e) {
    console.error('Failed to parse AI analysis:', e)
  }

  // Fallback to rule-based analysis
  return runRuleBasedAnalysis(intakeData)
}

function runRuleBasedAnalysis(data: IntakeData) {
  const flags: AIFlag[] = []
  const recommendations: string[] = []
  const missingInfo: MissingInfo[] = []
  const inconsistencies: DataInconsistency[] = []
  let complexityScore = 3 // Base score

  // Check for high assets
  const totalAssets =
    (data.financial?.estimatedRealEstateValue ?? 0) +
    (data.financial?.bankAccountsValue ?? 0) +
    (data.financial?.retirementAccountsValue ?? 0) +
    (data.financial?.investmentAccountsValue ?? 0) +
    (data.financial?.vehiclesValue ?? 0) +
    (data.financial?.otherAssetsValue ?? 0)

  if (totalAssets > 500000) {
    flags.push({
      type: 'high_asset',
      severity: totalAssets > 1000000 ? 'high' : 'medium',
      description: `High-asset case with estimated total assets of $${totalAssets.toLocaleString()}`,
    })
    complexityScore += 2
    recommendations.push('Schedule extended consultation (90 minutes)')
  }

  // Check for business ownership
  if (data.financial?.ownsBusinesses) {
    flags.push({
      type: 'business_ownership',
      severity: 'high',
      description: 'Business ownership requiring valuation',
    })
    complexityScore += 2
    recommendations.push('Refer to forensic accountant for business valuation')
  }

  // Check for custody disputes
  if (data.children?.hasMinorChildren) {
    complexityScore += 1
    if (data.children.preferredCustodyArrangement === 'sole_client') {
      flags.push({
        type: 'custody_dispute',
        severity: 'medium',
        description: 'Client seeking sole custody - potential for dispute',
      })
      complexityScore += 1
      recommendations.push('Discuss custody strategy and documentation')
    }
    if (data.children.relocationConcerns) {
      flags.push({
        type: 'relocation_concern',
        severity: 'medium',
        description: 'Concerns about possible relocation',
      })
    }
  }

  // Check for domestic violence
  if (data.marriage?.domesticViolenceHistory) {
    flags.push({
      type: 'domestic_violence',
      severity: 'critical',
      description: 'History of domestic violence - safety protocols required',
    })
    complexityScore += 2
    recommendations.push('Implement safety protocols')
    recommendations.push('Consider protective order if needed')
  }

  // Check for hidden assets suspicion
  if (data.financial?.suspectedHiddenAssets) {
    flags.push({
      type: 'hidden_assets',
      severity: 'high',
      description: 'Client suspects spouse has hidden assets',
    })
    complexityScore += 1
    recommendations.push('Consider forensic accounting investigation')
  }

  // Check for multiple properties
  if ((data.financial?.realEstateProperties ?? 0) > 1) {
    flags.push({
      type: 'multiple_properties',
      severity: 'medium',
      description: `Multiple properties (${data.financial?.realEstateProperties}) to divide`,
    })
    complexityScore += 1
  }

  // Check for significant retirement accounts
  if ((data.financial?.retirementAccountsValue ?? 0) > 100000) {
    flags.push({
      type: 'retirement_accounts',
      severity: 'medium',
      description: 'Significant retirement accounts may require QDRO',
    })
    recommendations.push('Plan for QDRO preparation')
  }

  // Check for self-employment
  if (data.financial?.clientEmploymentStatus === 'self_employed' ||
      data.financial?.spouseEmploymentStatus === 'self_employed') {
    flags.push({
      type: 'self_employment',
      severity: 'medium',
      description: 'Self-employment income verification needed',
    })
    complexityScore += 1
  }

  // Check for restraining orders
  if (data.marriage?.restrainingOrders) {
    flags.push({
      type: 'restraining_order',
      severity: 'high',
      description: 'Existing restraining order(s) in place',
    })
    complexityScore += 1
  }

  // Check for missing information
  if (!data.personal?.firstName || !data.personal?.lastName) {
    missingInfo.push({
      field: 'personal.firstName/lastName',
      section: 'Personal Information',
      description: 'Client name is incomplete',
      importance: 'required',
    })
  }

  if (!data.marriage?.dateOfMarriage) {
    missingInfo.push({
      field: 'marriage.dateOfMarriage',
      section: 'Marriage Details',
      description: 'Marriage date not provided',
      importance: 'required',
    })
  }

  if (data.children?.hasMinorChildren && (!data.children.children || data.children.children.length === 0)) {
    missingInfo.push({
      field: 'children.children',
      section: 'Children & Custody',
      description: 'Has minor children but no children details provided',
      importance: 'required',
    })
  }

  // Add default recommendations based on complexity
  if (complexityScore <= 4) {
    recommendations.push('Standard consultation (60 minutes)')
  } else if (complexityScore <= 6) {
    recommendations.push('Extended consultation recommended (90 minutes)')
  } else {
    recommendations.push('Schedule comprehensive consultation (2+ hours)')
    recommendations.push('Consider multi-session strategy planning')
  }

  // Cap complexity score
  complexityScore = Math.min(10, complexityScore)

  return {
    complexity_score: complexityScore,
    flags,
    recommendations,
    missing_information: missingInfo,
    data_inconsistencies: inconsistencies,
  }
}
