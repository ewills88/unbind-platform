import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { IntakeData } from '@/types/intake'
import { CasePreview, getComplexityLevel } from '@/types/intake-workflow'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { client: null, user: null }
  }

  return { client: supabase, user }
}

// GET /api/intakes/[id]/preview - Generate case preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: intakeId } = await params

    // Get intake with AI analysis
    const { data: intake, error: intakeError } = await supabase
      .from('client_intakes')
      .select(`
        *,
        intake_ai_analysis (
          complexity_score,
          flags
        )
      `)
      .eq('id', intakeId)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    const intakeData = intake.intake_data as IntakeData
    const personal = intakeData.personal
    const financial = intakeData.financial
    const analysis = intake.intake_ai_analysis?.[0]

    // Calculate financial totals
    const totalAssets =
      (financial?.estimatedRealEstateValue ?? 0) +
      (financial?.bankAccountsValue ?? 0) +
      (financial?.retirementAccountsValue ?? 0) +
      (financial?.investmentAccountsValue ?? 0) +
      (financial?.vehiclesValue ?? 0) +
      (financial?.otherAssetsValue ?? 0)

    const totalDebts =
      (financial?.mortgageBalance ?? 0) +
      (financial?.vehicleLoansBalance ?? 0) +
      (financial?.creditCardBalance ?? 0) +
      (financial?.studentLoansBalance ?? 0) +
      (financial?.otherDebtsBalance ?? 0)

    const clientIncome = financial?.clientAnnualIncome ?? 0
    const spouseIncome = financial?.spouseAnnualIncome ?? 0

    // Generate case number preview
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)

    const nextCaseNum = ((count || 0) + 1).toString().padStart(5, '0')
    const caseNumber = `${year}-${nextCaseNum}`

    // Determine complexity
    const complexityScore = analysis?.complexity_score || 5
    const complexity = getComplexityLevel(complexityScore)

    // Determine case type
    let caseType = 'Standard Divorce'
    if (totalAssets > 500000 || financial?.ownsBusinesses) {
      caseType = 'High-Asset Divorce'
    } else if (intakeData.children?.hasMinorChildren && !intakeData.children?.preferredCustodyArrangement?.includes('joint')) {
      caseType = 'Contested Custody'
    }

    // Get setup tasks
    const { data: setupTasks } = await supabase
      .from('case_setup_tasks')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(10)

    // Generate timeline
    const today = new Date()
    const timeline = [
      {
        title: 'Case Opened',
        description: 'Case file created and assigned',
        estimated_date: today.toISOString(),
        is_milestone: true,
        category: 'case',
      },
      {
        title: 'Initial Consultation',
        description: 'First meeting with attorney',
        estimated_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_milestone: false,
        category: 'meeting',
      },
      {
        title: 'File Petition',
        description: 'Submit divorce petition to court',
        estimated_date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        is_milestone: true,
        category: 'filing',
      },
      {
        title: 'Serve Spouse',
        description: 'Complete service of process',
        estimated_date: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        is_milestone: true,
        category: 'filing',
      },
      {
        title: 'Response Deadline',
        description: 'Spouse must respond by this date',
        estimated_date: new Date(today.getTime() + 51 * 24 * 60 * 60 * 1000).toISOString(),
        is_milestone: true,
        category: 'deadline',
      },
    ]

    const preview: CasePreview = {
      case_number: caseNumber,
      client_name: `${personal?.firstName || ''} ${personal?.lastName || ''}`.trim(),
      spouse_name: `${personal?.spouseFirstName || ''} ${personal?.spouseLastName || ''}`.trim(),
      case_type: caseType,
      state_code: intakeData.marriage?.placeOfMarriage?.state || 'CA',
      estimated_timeline: timeline,
      financial_overview: {
        estimated_assets: totalAssets,
        estimated_debts: totalDebts,
        income_difference: Math.abs(clientIncome - spouseIncome),
      },
      initial_tasks: (setupTasks || []).map(t => ({
        id: t.id,
        task_name: t.task_name,
        task_description: t.task_description,
        category: t.category,
        days_from_case_open: t.days_from_case_open,
        is_milestone: t.is_milestone,
      })),
      complexity,
    }

    return NextResponse.json({ preview })
  } catch (error) {
    console.error('Case preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
