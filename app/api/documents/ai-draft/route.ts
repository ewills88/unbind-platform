import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { DocumentTemplateType } from '@/types/document-templates'
import { getAuthenticatedClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Fetch comprehensive case context for AI drafting
async function fetchCaseContext(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  caseId: string
) {
  // Get case data
  const { data: caseData } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single()

  if (!caseData) {
    throw new Error('Case not found')
  }

  // Get intake data if available
  const { data: intake } = await supabase
    .from('client_intakes')
    .select('intake_data')
    .eq('case_id', caseId)
    .single()

  const intakeData = intake?.intake_data || {}

  // Get financial data
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('case_id', caseId)

  const { data: debts } = await supabase
    .from('debts')
    .select('*')
    .eq('case_id', caseId)

  const { data: incomeRecords } = await supabase
    .from('income_sources')
    .select('*')
    .eq('case_id', caseId)

  // Calculate totals
  const totalAssets = (assets || []).reduce((sum: number, a: { estimated_value?: number }) =>
    sum + (a.estimated_value || 0), 0)
  const totalDebts = (debts || []).reduce((sum: number, d: { current_balance?: number }) =>
    sum + (d.current_balance || 0), 0)

  const clientIncome = (incomeRecords || [])
    .filter((i: { party?: string }) => i.party === 'client')
    .reduce((sum: number, i: { amount?: number }) => sum + (i.amount || 0), 0)

  const spouseIncome = (incomeRecords || [])
    .filter((i: { party?: string }) => i.party === 'spouse')
    .reduce((sum: number, i: { amount?: number }) => sum + (i.amount || 0), 0)

  // Build context object
  return {
    client_name: caseData.client_name || '',
    spouse_name: caseData.spouse_name || '',
    case_number: caseData.case_number || '',
    state_code: caseData.state_code || 'CA',
    marriage_date: intakeData.marriage?.marriageDate || caseData.marriage_date || '',
    separation_date: intakeData.marriage?.separationDate || caseData.separation_date || '',
    marriage_duration_years: calculateMarriageDuration(
      intakeData.marriage?.marriageDate,
      intakeData.marriage?.separationDate
    ),
    has_children: intakeData.children?.hasMinorChildren || false,
    children: intakeData.children?.children || [],
    custody_preference: intakeData.children?.preferredCustodyArrangement || '',
    client_income: clientIncome || intakeData.financial?.clientAnnualIncome / 12 || 0,
    spouse_income: spouseIncome || intakeData.financial?.spouseAnnualIncome / 12 || 0,
    income_disparity: Math.abs(
      (clientIncome || intakeData.financial?.clientAnnualIncome / 12 || 0) -
      (spouseIncome || intakeData.financial?.spouseAnnualIncome / 12 || 0)
    ),
    total_assets: totalAssets || intakeData.financial?.estimatedTotalAssets || 0,
    total_debts: totalDebts || 0,
    net_worth: totalAssets - totalDebts,
    assets: (assets || []).map((a: { asset_type?: string; description?: string; estimated_value?: number }) => ({
      type: a.asset_type,
      description: a.description,
      value: a.estimated_value
    })),
    debts: (debts || []).map((d: { debt_type?: string; description?: string; current_balance?: number }) => ({
      type: d.debt_type,
      description: d.description,
      balance: d.current_balance
    })),
    client_employment: intakeData.financial?.clientEmploymentStatus || '',
    spouse_employment: intakeData.financial?.spouseEmploymentStatus || '',
    grounds_for_divorce: intakeData.legal?.groundsForDivorce || 'irreconcilable differences',
    primary_concerns: intakeData.legal?.primaryConcerns || []
  }
}

function calculateMarriageDuration(marriageDate?: string, separationDate?: string): number {
  if (!marriageDate) return 0

  const start = new Date(marriageDate)
  const end = separationDate ? new Date(separationDate) : new Date()

  const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return Math.round(years * 10) / 10
}

// Document type specific system prompts
const DOCUMENT_PROMPTS: Record<DocumentTemplateType, string> = {
  petition: `You are drafting a Petition for Dissolution of Marriage. Use formal legal language
appropriate for initial court filings. Include standard allegations and prayer for relief.`,

  response: `You are drafting a Response to a Petition for Dissolution. Address the petitioner's
allegations and state the responding party's position on each issue.`,

  summons: `You are completing a Family Law Summons form. Use standard legal notice language.`,

  financial_disclosure: `You are drafting financial disclosure statements. Be thorough and accurate
with all financial information.`,

  income_expense_declaration: `You are preparing an Income and Expense Declaration. Present
financial information clearly and completely.`,

  property_declaration: `You are drafting a Property Declaration listing marital and separate property.
Clearly describe each asset and debt with accurate values.`,

  custody_declaration: `You are drafting a Custody Declaration. Write in first person from the
parent's perspective. Focus on the children's best interests, parenting capability, stability,
and specific facts supporting the custody request.`,

  spousal_support_request: `You are drafting a Spousal Support Request. Present compelling arguments
based on the Gavron factors: length of marriage, standard of living, needs and ability to pay,
age and health, earning capacity disparity, and contribution to the other's education/career.`,

  settlement_agreement: `You are drafting a Marital Settlement Agreement. Include comprehensive
terms for property division, support, custody, and any other relevant issues. Use clear,
enforceable language.`,

  judgment: `You are preparing a Judgment of Dissolution. Incorporate all terms from the
settlement agreement in proper judgment format.`,

  proof_of_service: `You are completing a Proof of Service form. Include all required
service details.`,

  request_for_order: `You are drafting a Request for Order motion. State the relief requested,
supporting facts, and legal basis.`,

  stipulation: `You are drafting a Stipulation and Order. Ensure both parties' agreement is
clearly stated and the terms are enforceable.`,

  declaration: `You are drafting a Declaration in support of a motion. Write in first person,
state facts within personal knowledge, and support the relief being requested.`,

  motion: `You are drafting a Motion. State the relief requested, the factual basis, and
applicable legal authorities.`
}

// Log AI usage for audit trail
async function logAIUsage(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  data: {
    case_id: string
    user_id: string
    prompt: string
    response: string
    document_type: DocumentTemplateType
    tokens_used: number
  }
) {
  // Log to a general activity or audit table
  // For now, we'll create a simple log entry
  try {
    await supabase.from('ai_usage_logs').insert({
      case_id: data.case_id,
      user_id: data.user_id,
      action_type: 'document_draft',
      prompt: data.prompt,
      response_preview: data.response.substring(0, 500),
      document_type: data.document_type,
      tokens_used: data.tokens_used,
      created_at: new Date().toISOString()
    })
  } catch {
    // Table might not exist yet, log to console
    console.log('AI Usage:', {
      case_id: data.case_id,
      document_type: data.document_type,
      tokens_used: data.tokens_used
    })
  }
}

// POST /api/documents/ai-draft - Generate AI-assisted draft content
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      prompt,
      case_id,
      document_type,
      context,
      section_type,
      max_length
    } = body

    if (!prompt || !case_id) {
      return NextResponse.json({
        error: 'prompt and case_id are required'
      }, { status: 400 })
    }

    // Verify user has access to this case
    const { data: caseAccess, error: accessError } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', case_id)
      .single()

    if (accessError || !caseAccess) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (caseAccess.attorney_id !== user.id) {
      return NextResponse.json({
        error: 'Only attorneys can use AI drafting'
      }, { status: 403 })
    }

    // Fetch case context
    const caseContext = await fetchCaseContext(supabase, case_id)

    // Build system prompt
    const documentTypePrompt = document_type
      ? DOCUMENT_PROMPTS[document_type as DocumentTemplateType] || ''
      : ''

    const systemPrompt = `You are an experienced family law attorney drafting legal documents.
${documentTypePrompt}

Use formal legal language appropriate for court filings in ${caseContext.state_code}.
Base your draft on the following case facts:

CASE INFORMATION:
- Case Number: ${caseContext.case_number || 'To be assigned'}
- Client (Petitioner): ${caseContext.client_name}
- Spouse (Respondent): ${caseContext.spouse_name}
- State: ${caseContext.state_code}

MARRIAGE DETAILS:
- Marriage Date: ${caseContext.marriage_date || 'Unknown'}
- Separation Date: ${caseContext.separation_date || 'Unknown'}
- Duration: ${caseContext.marriage_duration_years} years

${caseContext.has_children ? `CHILDREN:
- Number of Children: ${caseContext.children.length}
- Children: ${caseContext.children.map((c: { name?: string; age?: number }) => `${c.name} (age ${c.age})`).join(', ')}
- Custody Preference: ${caseContext.custody_preference}` : 'No minor children'}

FINANCIAL INFORMATION:
- Client Monthly Income: $${caseContext.client_income.toLocaleString()}
- Spouse Monthly Income: $${caseContext.spouse_income.toLocaleString()}
- Income Disparity: $${caseContext.income_disparity.toLocaleString()}/month
- Total Assets: $${caseContext.total_assets.toLocaleString()}
- Total Debts: $${caseContext.total_debts.toLocaleString()}
- Net Worth: $${caseContext.net_worth.toLocaleString()}

${context ? `ADDITIONAL CONTEXT:\n${context}` : ''}

INSTRUCTIONS:
- Write in formal legal style
- Be specific and factual
- Reference relevant facts from the case
- For declarations, write in first person
- For motions, include proper headings and formatting
- Do not fabricate facts not provided
- Flag any assumptions with [VERIFY]`

    // Call GPT-4
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: max_length || 1500,
      temperature: 0.7
    })

    const draftText = response.choices[0]?.message?.content || ''
    const tokensUsed = response.usage?.total_tokens || 0

    // Log AI usage for audit
    await logAIUsage(supabase, {
      case_id,
      user_id: user.id,
      prompt,
      response: draftText,
      document_type: document_type || 'general',
      tokens_used: tokensUsed
    })

    return NextResponse.json({
      draft: draftText,
      section_type: section_type || 'general',
      usage: {
        prompt_tokens: response.usage?.prompt_tokens,
        completion_tokens: response.usage?.completion_tokens,
        total_tokens: tokensUsed
      },
      warnings: draftText.includes('[VERIFY]')
        ? ['This draft contains items marked [VERIFY] that need confirmation']
        : []
    })
  } catch (error) {
    console.error('AI draft error:', error)

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json({
        error: 'OpenAI API not configured'
      }, { status: 500 })
    }

    return NextResponse.json({
      error: 'Failed to generate draft'
    }, { status: 500 })
  }
}

// Common drafting prompts for the UI (not exported to avoid Next.js route constraint)
const _COMMON_DRAFTING_PROMPTS = [
  {
    category: 'Custody',
    prompts: [
      'Draft a custody declaration explaining why I should have primary physical custody',
      'Write a declaration about my involvement in the children\'s daily care and activities',
      'Draft a response to opposing party\'s custody concerns',
      'Write about the children\'s current schedule and proposed parenting plan'
    ]
  },
  {
    category: 'Support',
    prompts: [
      'Draft a spousal support request based on income disparity',
      'Write an argument for temporary spousal support during proceedings',
      'Draft a response to spouse\'s support request',
      'Calculate and justify child support based on guideline factors'
    ]
  },
  {
    category: 'Property',
    prompts: [
      'Draft property division proposal with 50/50 split',
      'Write argument for unequal property division based on contributions',
      'Draft declaration identifying separate property claims',
      'Respond to spouse\'s property characterization claims'
    ]
  },
  {
    category: 'Settlement',
    prompts: [
      'Draft comprehensive settlement proposal',
      'Write settlement offer with specific terms for all issues',
      'Draft counter-proposal responding to spouse\'s settlement offer',
      'Create stipulation language for agreed-upon terms'
    ]
  },
  {
    category: 'Motions',
    prompts: [
      'Draft motion for temporary orders',
      'Write declaration in support of motion to modify',
      'Draft opposition to spouse\'s motion',
      'Write request for emergency orders'
    ]
  }
]
