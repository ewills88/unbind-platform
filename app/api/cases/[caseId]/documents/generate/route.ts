import { NextRequest, NextResponse } from 'next/server'
import {
  FilledDocumentData,
  DataValidationWarning,
  DocumentTemplate,
  resolveDataPath,
  getFieldDisplayName
} from '@/types/document-templates'
import { generateDocxBuffer } from '@/lib/documents/generateDocx'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// Helper to gather all case data for document generation
async function gatherCaseData(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  caseId: string
): Promise<FilledDocumentData> {
  // Fetch case with related data
  const { data: caseData } = await supabase
    .from('cases')
    .select(`
      *,
      attorney:profiles!cases_attorney_id_fkey(
        id, full_name, email, phone
      ),
      client:profiles!cases_client_id_fkey(
        id, full_name, email, phone
      )
    `)
    .eq('id', caseId)
    .single()

  if (!caseData) {
    throw new Error('Case not found')
  }

  // Fetch attorney profile for bar number
  const { data: attorneyProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', caseData.attorney_id)
    .single()

  // Fetch client profile
  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', caseData.client_id)
    .single()

  // Fetch financial data
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
    .eq('party', 'client')

  const { data: expenseRecords } = await supabase
    .from('expenses')
    .select('*')
    .eq('case_id', caseId)

  // Calculate totals
  const totalAssets = (assets || []).reduce((sum: number, a: { estimated_value?: number }) =>
    sum + (a.estimated_value || 0), 0)
  const totalDebts = (debts || []).reduce((sum: number, d: { current_balance?: number }) =>
    sum + (d.current_balance || 0), 0)
  const totalMonthlyIncome = (incomeRecords || []).reduce((sum: number, i: { amount?: number }) =>
    sum + (i.amount || 0), 0)
  const totalMonthlyExpenses = (expenseRecords || []).reduce((sum: number, e: { amount?: number }) =>
    sum + (e.amount || 0), 0)

  // Fetch from intake if available
  const { data: intake } = await supabase
    .from('client_intakes')
    .select('intake_data')
    .eq('case_id', caseId)
    .single()

  const intakeData = intake?.intake_data || {}

  // Build the filled data object
  const filledData: FilledDocumentData = {
    client: {
      full_name: clientProfile?.full_name || caseData.client_name || '',
      first_name: intakeData.personal?.firstName || '',
      last_name: intakeData.personal?.lastName || '',
      address: intakeData.personal?.currentAddress || '',
      city_state_zip: intakeData.personal?.currentAddress || '',
      phone: clientProfile?.phone || '',
      email: clientProfile?.email || '',
      dob: intakeData.personal?.dateOfBirth || ''
    },
    spouse: {
      full_name: caseData.spouse_name || '',
      first_name: intakeData.personal?.spouseFirstName || '',
      last_name: intakeData.personal?.spouseLastName || '',
      address: intakeData.personal?.spouseAddress || '',
    },
    case: {
      case_number: caseData.case_number || '',
      court_name: caseData.court_name || `${caseData.state_code} Superior Court`,
      court_address: '',
      county: caseData.county || '',
      state_code: caseData.state_code || 'CA',
      marriage_date: intakeData.marriage?.marriageDate || caseData.marriage_date || '',
      separation_date: intakeData.marriage?.separationDate || caseData.separation_date || '',
      has_children: intakeData.children?.hasMinorChildren || false,
      filing_date: caseData.created_at?.split('T')[0] || '',
      spouse_name: caseData.spouse_name || ''
    },
    attorney: {
      full_name: attorneyProfile?.full_name || '',
      bar_number: attorneyProfile?.bar_number || '',
      firm_name: attorneyProfile?.firm_name || '',
      address: attorneyProfile?.office_address || '',
      phone: attorneyProfile?.phone || '',
      email: attorneyProfile?.email || ''
    },
    children: {
      count: intakeData.children?.children?.length || 0,
      names: (intakeData.children?.children || []).map((c: { name?: string }) => c.name || ''),
      ages: (intakeData.children?.children || []).map((c: { age?: number }) => c.age || 0),
      birthdates: (intakeData.children?.children || []).map((c: { dateOfBirth?: string }) => c.dateOfBirth || '')
    },
    income: {
      employer_name: intakeData.financial?.clientEmployer || '',
      job_title: intakeData.financial?.clientOccupation || '',
      gross_monthly: totalMonthlyIncome || (intakeData.financial?.clientAnnualIncome / 12) || 0,
      net_monthly: totalMonthlyIncome * 0.7, // Approximate
      gross_annual: intakeData.financial?.clientAnnualIncome || totalMonthlyIncome * 12
    },
    expenses: {
      housing: 0,
      food: 0,
      utilities: 0,
      transportation: 0,
      insurance: 0,
      childcare: 0,
      total: totalMonthlyExpenses
    },
    assets: {
      total_value: totalAssets,
      real_estate: (assets || [])
        .filter((a: { asset_type?: string }) => a.asset_type === 'real_estate')
        .map((a: { description?: string; estimated_value?: number; ownership?: string }) => ({
          description: a.description || '',
          value: a.estimated_value || 0,
          ownership: (a.ownership || 'joint') as 'client' | 'spouse' | 'joint'
        })),
      vehicles: (assets || [])
        .filter((a: { asset_type?: string }) => a.asset_type === 'vehicle')
        .map((a: { description?: string; estimated_value?: number; ownership?: string }) => ({
          description: a.description || '',
          value: a.estimated_value || 0,
          ownership: (a.ownership || 'joint') as 'client' | 'spouse' | 'joint'
        })),
      bank_accounts: (assets || [])
        .filter((a: { asset_type?: string }) => a.asset_type === 'bank_account')
        .map((a: { description?: string; estimated_value?: number; ownership?: string }) => ({
          description: a.description || '',
          value: a.estimated_value || 0,
          ownership: (a.ownership || 'joint') as 'client' | 'spouse' | 'joint'
        })),
      retirement: (assets || [])
        .filter((a: { asset_type?: string }) => a.asset_type === 'retirement')
        .map((a: { description?: string; estimated_value?: number; ownership?: string }) => ({
          description: a.description || '',
          value: a.estimated_value || 0,
          ownership: (a.ownership || 'joint') as 'client' | 'spouse' | 'joint'
        }))
    },
    debts: {
      total_balance: totalDebts,
      mortgage: (debts || [])
        .filter((d: { debt_type?: string }) => d.debt_type === 'mortgage')
        .map((d: { description?: string; current_balance?: number; monthly_payment?: number; responsibility?: string }) => ({
          description: d.description || '',
          balance: d.current_balance || 0,
          monthly_payment: d.monthly_payment || 0,
          responsibility: (d.responsibility || 'joint') as 'client' | 'spouse' | 'joint'
        })),
      credit_cards: (debts || [])
        .filter((d: { debt_type?: string }) => d.debt_type === 'credit_card')
        .map((d: { description?: string; current_balance?: number; monthly_payment?: number; responsibility?: string }) => ({
          description: d.description || '',
          balance: d.current_balance || 0,
          monthly_payment: d.monthly_payment || 0,
          responsibility: (d.responsibility || 'joint') as 'client' | 'spouse' | 'joint'
        }))
    }
  }

  return filledData
}

// Validate that required fields are filled
function validateRequiredFields(
  template: DocumentTemplate,
  filledData: FilledDocumentData
): DataValidationWarning[] {
  const warnings: DataValidationWarning[] = []

  for (const requiredField of template.required_data_fields || []) {
    const value = resolveDataPath(filledData, requiredField)

    if (value === null || value === undefined || value === '') {
      warnings.push({
        field: requiredField,
        message: `Required field "${getFieldDisplayName(requiredField)}" is missing`,
        severity: 'error',
        suggestion: `Please provide ${getFieldDisplayName(requiredField)} before generating this document`
      })
    }
  }

  // Also check all field mappings and warn about empty optional fields
  for (const [, dataPath] of Object.entries(template.field_mappings || {})) {
    const value = resolveDataPath(filledData, dataPath)

    if ((value === null || value === undefined || value === '') &&
        !template.required_data_fields?.includes(dataPath)) {
      warnings.push({
        field: dataPath,
        message: `Optional field "${getFieldDisplayName(dataPath)}" is empty`,
        severity: 'warning'
      })
    }
  }

  return warnings
}

// GET /api/cases/[caseId]/documents/generate - Preview what data would be filled
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('template_id')

    if (!templateId) {
      return NextResponse.json({ error: 'template_id is required' }, { status: 400 })
    }

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (caseData.attorney_id !== user.id && caseData.client_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Gather case data
    const filledData = await gatherCaseData(supabase, caseId)

    // Validate
    const warnings = validateRequiredFields(template as DocumentTemplate, filledData)

    // Build preview of field values
    const fieldPreview: Record<string, { template_field: string; data_path: string; value: unknown; is_filled: boolean }> = {}

    for (const [templateField, dataPath] of Object.entries(template.field_mappings || {})) {
      const value = resolveDataPath(filledData, dataPath as string)
      fieldPreview[templateField] = {
        template_field: templateField,
        data_path: dataPath as string,
        value,
        is_filled: value !== null && value !== undefined && value !== ''
      }
    }

    return NextResponse.json({
      template,
      filled_data: filledData,
      field_preview: fieldPreview,
      warnings,
      has_errors: warnings.some(w => w.severity === 'error'),
      missing_required: warnings.filter(w => w.severity === 'error').map(w => w.field)
    })
  } catch (error) {
    console.error('Document generation preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/documents/generate - Generate document from template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    const {
      template_id,
      document_title,
      description,
      data_overrides,
      custom_content,
      skip_validation
    } = body

    if (!template_id) {
      return NextResponse.json({ error: 'template_id is required' }, { status: 400 })
    }

    // Verify user has access to this case (only attorneys can generate)
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, attorney_id, case_number')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only the assigned attorney can generate documents' }, { status: 403 })
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Gather case data
    let filledData = await gatherCaseData(supabase, caseId)

    // Apply overrides
    if (data_overrides) {
      filledData = { ...filledData, ...data_overrides }
    }

    // Validate required fields
    const warnings = validateRequiredFields(template as DocumentTemplate, filledData)
    const hasErrors = warnings.some(w => w.severity === 'error')

    if (hasErrors && !skip_validation) {
      return NextResponse.json({
        error: 'Missing required fields',
        warnings,
        missing_fields: warnings.filter(w => w.severity === 'error').map(w => w.field)
      }, { status: 400 })
    }

    // Create generated document record
    const generatedDocData = {
      case_id: caseId,
      template_id: template_id,
      document_type: template.template_type,
      document_title: document_title || template.template_name,
      description: description || template.description,
      status: 'draft',
      filled_data: filledData,
      custom_content: custom_content || {},
      version: 1,
      created_by: user.id
    }

    const { data: generatedDoc, error: insertError } = await supabase
      .from('generated_documents')
      .insert(generatedDocData)
      .select()
      .single()

    if (insertError || !generatedDoc) {
      console.error('Error creating generated document:', insertError)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    // Log generation history
    await supabase.rpc('log_document_generation', {
      p_document_id: generatedDoc.id,
      p_version: 1,
      p_action: 'created',
      p_changes_summary: `Generated from template ${template.template_code || template.template_name}`,
      p_user_id: user.id
    })

    // Generate the actual .docx file
    try {
      const docxBuffer = await generateDocxBuffer(template as DocumentTemplate, filledData)
      const fileName = `${caseData.case_number || caseId}/${generatedDoc.id}.docx`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('case-documents')
        .upload(fileName, docxBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        })

      if (!uploadError) {
        // Update the generated document record with the file path
        await supabase
          .from('generated_documents')
          .update({ file_path: fileName })
          .eq('id', generatedDoc.id)

        generatedDoc.file_path = fileName
      } else {
        console.error('Document upload error:', uploadError)
        // Non-fatal: document record exists, file upload failed
      }
    } catch (genError) {
      console.error('Document file generation error:', genError)
      // Non-fatal: document record exists, file generation failed
    }

    return NextResponse.json({
      document: generatedDoc,
      warnings: warnings.filter(w => w.severity === 'warning'),
      message: 'Document draft created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Document generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
