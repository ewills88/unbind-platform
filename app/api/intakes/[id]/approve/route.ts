import { NextRequest, NextResponse } from 'next/server'
import { ApproveIntakeRequest, getComplexityLevel } from '@/types/intake-workflow'
import { IntakeData } from '@/types/intake'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// Generate case number: YYYY-NNNNN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateCaseNumber(supabase: any): Promise<string> {
  const year = new Date().getFullYear()

  // Get count of cases this year
  const { count } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)

  const caseNum = ((count || 0) + 1).toString().padStart(5, '0')
  return `${year}-${caseNum}`
}

// POST /api/intakes/[id]/approve - Approve intake and create case
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
    const body: ApproveIntakeRequest = await request.json()

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

    if (intake.converted_to_case_id) {
      return NextResponse.json({
        error: 'Intake already converted to case',
        case_id: intake.converted_to_case_id
      }, { status: 400 })
    }

    // Check for unresolved conflicts
    const { data: conflictCheck } = await supabase
      .from('conflict_checks')
      .select('*')
      .eq('intake_id', intakeId)
      .order('checked_at', { ascending: false })
      .limit(1)
      .single()

    if (conflictCheck?.has_conflicts && !conflictCheck.conflict_cleared && !body.conflict_cleared) {
      return NextResponse.json({
        error: 'Conflicts must be cleared before approval',
        conflicts: conflictCheck.potential_conflicts,
      }, { status: 400 })
    }

    const intakeData = intake.intake_data as IntakeData
    const personal = intakeData.personal
    const analysis = intake.intake_ai_analysis?.[0]
    const complexityScore = analysis?.complexity_score || 5
    const complexity = getComplexityLevel(complexityScore)

    // Generate case number
    const caseNumber = await generateCaseNumber(supabase)

    // Determine case type
    const caseType = body.case_type || (
      complexity === 'complex' ? 'high_asset_divorce' :
      intakeData.children?.hasMinorChildren ? 'standard_divorce' :
      'standard_divorce'
    )

    // Create the case
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        case_number: caseNumber,
        attorney_id: body.primary_attorney_id || user.id,
        client_id: intake.user_id,
        client_name: `${personal?.firstName || ''} ${personal?.lastName || ''}`.trim(),
        spouse_name: `${personal?.spouseFirstName || ''} ${personal?.spouseLastName || ''}`.trim(),
        status: 'active',
        state_code: intakeData.marriage?.placeOfMarriage?.state || 'CA',
        case_type: caseType,
        created_from_intake: intakeId,
        notes: body.notes,
      })
      .select()
      .single()

    if (caseError || !newCase) {
      console.error('Error creating case:', caseError)
      return NextResponse.json({ error: 'Failed to create case' }, { status: 500 })
    }

    // Update intake as approved
    await supabase
      .from('client_intakes')
      .update({
        review_status: 'approved',
        status: 'converted',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        converted_to_case_id: newCase.id,
        converted_at: new Date().toISOString(),
        case_id: newCase.id,
      })
      .eq('id', intakeId)

    // Pre-populate financial data from intake
    await createFinancialRecords(supabase, newCase.id, intakeData)

    // Create initial timeline events
    await createTimelineEvents(supabase, newCase.id)

    // Generate task list
    await createInitialTasks(supabase, newCase.id, user.id, caseType)

    // Transfer documents to case
    await transferDocuments(supabase, intakeId, newCase.id)

    // Create client onboarding record
    await supabase
      .from('client_onboarding')
      .insert({
        user_id: intake.user_id,
        case_id: newCase.id,
      })

    // Update conflict check if waiver provided
    if (body.conflict_cleared && body.conflict_waiver_notes && conflictCheck) {
      await supabase
        .from('conflict_checks')
        .update({
          conflict_cleared: true,
          conflict_waiver_notes: body.conflict_waiver_notes,
          cleared_at: new Date().toISOString(),
          cleared_by: user.id,
        })
        .eq('id', conflictCheck.id)
    }

    // TODO: Send notifications
    // - Email to client: "Your case has been opened!"
    // - Email to attorney: "New case ready for your review"

    return NextResponse.json({
      case: newCase,
      message: 'Case created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Approve intake error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper: Create financial records from intake data
async function createFinancialRecords(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  caseId: string,
  intakeData: IntakeData
) {
  const financial = intakeData.financial
  if (!financial) return

  // Create asset placeholders
  const assets = []

  if ((financial.realEstateProperties ?? 0) > 0) {
    assets.push({
      case_id: caseId,
      asset_type: 'real_estate',
      description: 'Real Estate (from intake)',
      estimated_value: financial.estimatedRealEstateValue || 0,
      ownership: 'joint',
    })
  }

  if ((financial.bankAccountsValue ?? 0) > 0) {
    assets.push({
      case_id: caseId,
      asset_type: 'bank_account',
      description: 'Bank Accounts (from intake)',
      estimated_value: financial.bankAccountsValue,
      ownership: 'joint',
    })
  }

  if ((financial.retirementAccountsValue ?? 0) > 0) {
    assets.push({
      case_id: caseId,
      asset_type: 'retirement',
      description: 'Retirement Accounts (from intake)',
      estimated_value: financial.retirementAccountsValue,
      ownership: 'joint',
    })
  }

  if ((financial.investmentAccountsValue ?? 0) > 0) {
    assets.push({
      case_id: caseId,
      asset_type: 'investment',
      description: 'Investment Accounts (from intake)',
      estimated_value: financial.investmentAccountsValue,
      ownership: 'joint',
    })
  }

  if ((financial.vehiclesValue ?? 0) > 0) {
    assets.push({
      case_id: caseId,
      asset_type: 'vehicle',
      description: 'Vehicles (from intake)',
      estimated_value: financial.vehiclesValue,
      ownership: 'joint',
    })
  }

  if (assets.length > 0) {
    await supabase.from('assets').insert(assets)
  }

  // Create debt placeholders
  const debts = []

  if ((financial.mortgageBalance ?? 0) > 0) {
    debts.push({
      case_id: caseId,
      debt_type: 'mortgage',
      description: 'Mortgage (from intake)',
      current_balance: financial.mortgageBalance,
      responsibility: 'joint',
    })
  }

  if ((financial.vehicleLoansBalance ?? 0) > 0) {
    debts.push({
      case_id: caseId,
      debt_type: 'auto_loan',
      description: 'Vehicle Loans (from intake)',
      current_balance: financial.vehicleLoansBalance,
      responsibility: 'joint',
    })
  }

  if ((financial.creditCardBalance ?? 0) > 0) {
    debts.push({
      case_id: caseId,
      debt_type: 'credit_card',
      description: 'Credit Cards (from intake)',
      current_balance: financial.creditCardBalance,
      responsibility: 'joint',
    })
  }

  if ((financial.studentLoansBalance ?? 0) > 0) {
    debts.push({
      case_id: caseId,
      debt_type: 'student_loan',
      description: 'Student Loans (from intake)',
      current_balance: financial.studentLoansBalance,
      responsibility: 'joint',
    })
  }

  if (debts.length > 0) {
    await supabase.from('debts').insert(debts)
  }

  // Create income records
  const incomes = []

  if (financial.clientAnnualIncome) {
    incomes.push({
      case_id: caseId,
      party: 'client',
      income_type: financial.clientEmploymentStatus === 'self_employed' ? 'self_employment' : 'employment',
      amount: financial.clientAnnualIncome / 12,
      frequency: 'monthly',
      description: financial.clientEmployer || 'Primary Income',
    })
  }

  if (financial.spouseAnnualIncome) {
    incomes.push({
      case_id: caseId,
      party: 'spouse',
      income_type: financial.spouseEmploymentStatus === 'self_employed' ? 'self_employment' : 'employment',
      amount: financial.spouseAnnualIncome / 12,
      frequency: 'monthly',
      description: financial.spouseEmployer || 'Spouse Income',
    })
  }

  if (incomes.length > 0) {
    await supabase.from('income_sources').insert(incomes)
  }
}

// Helper: Create timeline events
async function createTimelineEvents(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  caseId: string
) {
  const today = new Date()

  const events = [
    {
      case_id: caseId,
      title: 'Case Opened',
      event_type: 'milestone',
      start_date: today.toISOString(),
      all_day: true,
      status: 'completed',
    },
    {
      case_id: caseId,
      title: 'Initial Consultation',
      event_type: 'meeting',
      start_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
      all_day: false,
      status: 'pending',
    },
    {
      case_id: caseId,
      title: 'File Petition',
      event_type: 'deadline',
      start_date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), // +14 days
      all_day: true,
      status: 'pending',
    },
    {
      case_id: caseId,
      title: 'Serve Spouse',
      event_type: 'deadline',
      start_date: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(), // +21 days
      all_day: true,
      status: 'pending',
    },
  ]

  await supabase.from('events').insert(events)
}

// Helper: Create initial tasks
async function createInitialTasks(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  caseId: string,
  attorneyId: string,
  caseType: string
) {
  // Get task templates
  const { data: templates } = await supabase
    .from('case_setup_tasks')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!templates || templates.length === 0) return

  const today = new Date()
  const tasks = templates
    .filter((t: { case_type_filter?: string[] }) => !t.case_type_filter || t.case_type_filter.includes(caseType))
    .map((template: { task_name: string; task_description: string; is_milestone: boolean; days_from_case_open: number; category: string }) => ({
      case_id: caseId,
      title: template.task_name,
      description: template.task_description,
      status: 'pending',
      priority: template.is_milestone ? 'high' : 'medium',
      assigned_to: attorneyId,
      due_date: new Date(today.getTime() + template.days_from_case_open * 24 * 60 * 60 * 1000).toISOString(),
      category: template.category,
    }))

  if (tasks.length > 0) {
    await supabase.from('tasks').insert(tasks)
  }
}

// Helper: Transfer documents from intake to case
async function transferDocuments(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  intakeId: string,
  caseId: string
) {
  // Get all intake documents
  const { data: intakeDocs } = await supabase
    .from('intake_documents')
    .select('*')
    .eq('intake_id', intakeId)
    .in('upload_status', ['uploaded', 'verified'])

  if (!intakeDocs || intakeDocs.length === 0) return

  // Map document types to case document categories
  const categoryMap: Record<string, string> = {
    marriage_certificate: 'legal',
    drivers_license: 'identification',
    tax_return_current: 'financial',
    tax_return_prior: 'financial',
    bank_statements: 'financial',
    pay_stubs: 'financial',
    property_deed: 'property',
    mortgage_statement: 'financial',
    retirement_statements: 'financial',
    birth_certificates: 'personal',
    prenup_agreement: 'legal',
  }

  const caseDocuments = intakeDocs.map((doc: { document_type: string; file_path: string; file_name: string; file_size: number; mime_type: string; uploaded_by: string; ai_verification: unknown }) => ({
    case_id: caseId,
    file_path: doc.file_path,
    file_name: doc.file_name,
    file_size: doc.file_size,
    mime_type: doc.mime_type,
    category: categoryMap[doc.document_type] || 'other',
    uploaded_by: doc.uploaded_by,
    ai_analysis: doc.ai_verification,
    source: 'intake',
    source_intake_id: intakeId,
  }))

  await supabase.from('documents').insert(caseDocuments)
}
