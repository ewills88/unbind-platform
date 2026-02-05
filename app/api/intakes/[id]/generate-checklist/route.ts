import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { DOCUMENT_TYPES, DocumentType, DocumentCategory } from '@/types/intake-documents'
import { IntakeData } from '@/types/intake'

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

interface ChecklistItem {
  type: DocumentType
  category: DocumentCategory
  reason?: string
}

// Determine which documents are needed based on intake data
function generateChecklistFromIntake(intakeData: IntakeData): ChecklistItem[] {
  const checklist: ChecklistItem[] = []

  // Always required documents
  checklist.push(
    { type: 'drivers_license', category: 'required', reason: 'Identity verification' },
    { type: 'marriage_certificate', category: 'required', reason: 'Required for divorce filing' },
    { type: 'tax_return_current', category: 'required', reason: 'Financial disclosure' },
    { type: 'tax_return_prior', category: 'required', reason: 'Income history' },
    { type: 'pay_stubs', category: 'required', reason: 'Current income verification' },
    { type: 'bank_statements', category: 'required', reason: 'Asset documentation' }
  )

  // Children-related documents
  if (intakeData.children?.hasMinorChildren) {
    checklist.push(
      { type: 'birth_certificates', category: 'required', reason: 'Custody determination' },
      { type: 'school_records', category: 'recommended', reason: 'Children educational records' }
    )

    // Childcare expenses if mentioned
    if (intakeData.children.existingChildSupport || intakeData.children.children?.length) {
      checklist.push(
        { type: 'childcare_expenses', category: 'recommended', reason: 'Child support calculation' }
      )
    }

    // Medical records if special needs mentioned
    const hasSpecialNeeds = intakeData.children.children?.some(
      child => child.specialNeeds || child.medicalConditions
    )
    if (hasSpecialNeeds) {
      checklist.push(
        { type: 'medical_records_children', category: 'required', reason: 'Children special needs documentation' }
      )
    }

    // Extracurricular if custody disputed
    if (intakeData.children.preferredCustodyArrangement === 'sole_client' ||
        intakeData.children.preferredCustodyArrangement === 'sole_spouse') {
      checklist.push(
        { type: 'extracurricular_expenses', category: 'recommended', reason: 'Parental involvement documentation' }
      )
    }
  }

  // Real estate documents
  const hasRealEstate = (intakeData.financial?.realEstateProperties ?? 0) > 0 ||
    (intakeData.financial?.estimatedRealEstateValue ?? 0) > 0

  if (hasRealEstate) {
    checklist.push(
      { type: 'property_deed', category: 'required', reason: 'Property ownership verification' },
      { type: 'mortgage_statement', category: 'required', reason: 'Property debt documentation' },
      { type: 'property_tax_bill', category: 'recommended', reason: 'Property value reference' }
    )

    // High-value property requires appraisal
    if ((intakeData.financial?.estimatedRealEstateValue ?? 0) > 500000) {
      checklist.push(
        { type: 'property_appraisal', category: 'recommended', reason: 'High-value property valuation' }
      )
    }
  }

  // Business documents
  if (intakeData.financial?.ownsBusinesses) {
    checklist.push(
      { type: 'business_tax_returns', category: 'required', reason: 'Business income documentation' },
      { type: 'business_financial_statements', category: 'required', reason: 'Business valuation' },
      { type: 'business_bank_statements', category: 'recommended', reason: 'Business cash flow' }
    )
  }

  // Self-employed income documentation
  if (intakeData.financial?.clientEmploymentStatus === 'self_employed' ||
      intakeData.financial?.spouseEmploymentStatus === 'self_employed') {
    if (!intakeData.financial?.ownsBusinesses) {
      checklist.push(
        { type: 'business_tax_returns', category: 'required', reason: 'Self-employment income' }
      )
    }
  }

  // Retirement accounts
  if ((intakeData.financial?.retirementAccountsValue ?? 0) > 0) {
    checklist.push(
      { type: 'retirement_statements', category: 'required', reason: 'Retirement asset division' }
    )
  }

  // Investment accounts
  if ((intakeData.financial?.investmentAccountsValue ?? 0) > 0) {
    checklist.push(
      { type: 'investment_statements', category: 'required', reason: 'Investment asset division' }
    )

    // Stock options for high-value investments
    if ((intakeData.financial?.investmentAccountsValue ?? 0) > 100000) {
      checklist.push(
        { type: 'stock_options', category: 'recommended', reason: 'Stock compensation documentation' }
      )
    }
  }

  // Vehicle documents
  if ((intakeData.financial?.vehiclesValue ?? 0) > 25000) {
    checklist.push(
      { type: 'vehicle_titles', category: 'recommended', reason: 'Vehicle ownership' }
    )
  }

  if ((intakeData.financial?.vehicleLoansBalance ?? 0) > 0) {
    checklist.push(
      { type: 'vehicle_loan_statements', category: 'recommended', reason: 'Vehicle debt documentation' }
    )
  }

  // Debt documents
  if ((intakeData.financial?.studentLoansBalance ?? 0) > 0) {
    checklist.push(
      { type: 'student_loan_statements', category: 'recommended', reason: 'Student debt documentation' }
    )
  }

  if ((intakeData.financial?.creditCardBalance ?? 0) > 10000) {
    checklist.push(
      { type: 'credit_card_statements', category: 'recommended', reason: 'Credit card debt documentation' }
    )
  }

  // Prenup if mentioned
  if (intakeData.marriage?.hasPrenup) {
    checklist.push(
      { type: 'prenup_agreement', category: 'required', reason: 'Prenuptial agreement enforcement' }
    )
  }

  // W-2s for employed parties
  if (intakeData.financial?.clientEmploymentStatus === 'employed' ||
      intakeData.financial?.spouseEmploymentStatus === 'employed') {
    checklist.push(
      { type: 'w2_forms', category: 'recommended', reason: 'Employment income verification' }
    )
  }

  // High-asset case additions
  const totalAssets =
    (intakeData.financial?.estimatedRealEstateValue ?? 0) +
    (intakeData.financial?.bankAccountsValue ?? 0) +
    (intakeData.financial?.retirementAccountsValue ?? 0) +
    (intakeData.financial?.investmentAccountsValue ?? 0) +
    (intakeData.financial?.vehiclesValue ?? 0) +
    (intakeData.financial?.otherAssetsValue ?? 0)

  if (totalAssets > 500000) {
    checklist.push(
      { type: 'tax_return_2_years_prior', category: 'required', reason: 'High-asset case income history' }
    )

    // Trust documents for high-asset
    checklist.push(
      { type: 'trust_documents', category: 'recommended', reason: 'Trust asset documentation' },
      { type: 'inheritance_documents', category: 'recommended', reason: 'Separate property documentation' }
    )
  }

  // Insurance documents
  checklist.push(
    { type: 'health_insurance_cards', category: 'optional', reason: 'Current coverage documentation' },
    { type: 'life_insurance_policies', category: 'optional', reason: 'Life insurance beneficiary review' }
  )

  // Remove duplicates and return
  const seen = new Set<string>()
  return checklist.filter(item => {
    if (seen.has(item.type)) return false
    seen.add(item.type)
    return true
  })
}

// POST /api/intakes/[id]/generate-checklist - Generate personalized document checklist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: intakeId } = await params

    // Get intake with data
    const { data: intake, error: intakeError } = await supabase
      .from('client_intakes')
      .select('*')
      .eq('id', intakeId)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    if (intake.user_id !== user.id && intake.invited_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate checklist based on intake data
    const checklistItems = generateChecklistFromIntake(intake.intake_data as IntakeData)

    // Get existing documents
    const { data: existingDocs } = await supabase
      .from('intake_documents')
      .select('document_type')
      .eq('intake_id', intakeId)

    const existingTypes = new Set((existingDocs || []).map(d => d.document_type))

    // Create document records for new items
    const newItems = checklistItems.filter(item => !existingTypes.has(item.type))

    if (newItems.length > 0) {
      const { error: insertError } = await supabase
        .from('intake_documents')
        .insert(
          newItems.map(item => ({
            intake_id: intakeId,
            document_type: item.type,
            document_category: item.category,
            upload_status: 'pending',
            uploaded_by: user.id,
          }))
        )

      if (insertError) {
        console.error('Error creating document records:', insertError)
        return NextResponse.json({ error: 'Failed to generate checklist' }, { status: 500 })
      }
    }

    // Fetch all documents with updated checklist
    const { data: documents, error: fetchError } = await supabase
      .from('intake_documents')
      .select('*')
      .eq('intake_id', intakeId)
      .order('document_category', { ascending: true })
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching documents:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
    }

    // Build response with document configs
    const checklist = {
      required: [] as Array<{ type: string; config: typeof DOCUMENT_TYPES[string]; status: string; document: unknown }>,
      recommended: [] as Array<{ type: string; config: typeof DOCUMENT_TYPES[string]; status: string; document: unknown }>,
      optional: [] as Array<{ type: string; config: typeof DOCUMENT_TYPES[string]; status: string; document: unknown }>,
    }

    for (const doc of documents || []) {
      const config = DOCUMENT_TYPES[doc.document_type as DocumentType]
      if (!config) continue

      const item = {
        type: doc.document_type,
        config,
        status: doc.upload_status,
        document: doc,
      }

      if (doc.document_category === 'required') {
        checklist.required.push(item)
      } else if (doc.document_category === 'recommended') {
        checklist.recommended.push(item)
      } else {
        checklist.optional.push(item)
      }
    }

    // Calculate progress
    const uploadedRequired = checklist.required.filter(d =>
      ['uploaded', 'processing', 'verified'].includes(d.status)
    ).length

    return NextResponse.json({
      checklist: {
        ...checklist,
        totalRequired: checklist.required.length,
        totalRecommended: checklist.recommended.length,
        totalOptional: checklist.optional.length,
        uploadedRequired,
        uploadedRecommended: checklist.recommended.filter(d =>
          ['uploaded', 'processing', 'verified'].includes(d.status)
        ).length,
        uploadedOptional: checklist.optional.filter(d =>
          ['uploaded', 'processing', 'verified'].includes(d.status)
        ).length,
        progressPercentage: checklist.required.length > 0
          ? Math.round((uploadedRequired / checklist.required.length) * 100)
          : 0,
      },
      itemsCreated: newItems.length,
    })
  } catch (error) {
    console.error('Generate checklist error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
