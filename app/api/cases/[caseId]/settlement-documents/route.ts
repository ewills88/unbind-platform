import { NextRequest, NextResponse } from 'next/server'
import { generateSettlementAgreement } from '@/lib/settlement/documentGenerator'
import { SettlementTemplateSection } from '@/types/settlement'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/settlement-documents - List all settlement documents for a case
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    const { data, error } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('case_id', caseId)
      .eq('document_type', 'settlement_agreement')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch signature counts for each document
    const docIds = (data || []).map((d: { id: string }) => d.id)
    let signatureCounts: Record<string, { total: number; signed: number }> = {}
    if (docIds.length > 0) {
      const { data: sigs } = await supabase
        .from('document_signatures')
        .select('document_id, status')
        .in('document_id', docIds)

      signatureCounts = (sigs || []).reduce((acc: Record<string, { total: number; signed: number }>, s: { document_id: string; status: string }) => {
        if (!acc[s.document_id]) acc[s.document_id] = { total: 0, signed: 0 }
        acc[s.document_id].total++
        if (s.status === 'signed') acc[s.document_id].signed++
        return acc
      }, {})
    }

    const enriched = (data || []).map((doc: { id: string }) => ({
      ...doc,
      signature_summary: signatureCounts[doc.id] || { total: 0, signed: 0 },
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Settlement documents GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/settlement-documents - Generate a new settlement document
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()
    const {
      proposal_id,
      document_title,
      selected_sections,
      section_overrides,
    } = body

    if (!proposal_id) {
      return NextResponse.json({ error: 'proposal_id is required' }, { status: 400 })
    }

    // Fetch case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Fetch proposal with all terms
    const { data: proposal } = await supabase
      .from('settlement_proposals')
      .select('*')
      .eq('id', proposal_id)
      .single()

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Fetch sub-tables
    const [propertyRes, supportRes, childSupportRes, custodyRes, otherRes] = await Promise.all([
      supabase.from('proposal_property_items').select('*').eq('proposal_id', proposal_id).order('display_order'),
      supabase.from('proposal_spousal_support').select('*').eq('proposal_id', proposal_id),
      supabase.from('proposal_child_support').select('*').eq('proposal_id', proposal_id),
      supabase.from('proposal_custody').select('*').eq('proposal_id', proposal_id),
      supabase.from('proposal_other_terms').select('*').eq('proposal_id', proposal_id).order('display_order'),
    ])

    const fullProposal = {
      ...proposal,
      property_items: propertyRes.data || [],
      spousal_support: supportRes.data || [],
      child_support: childSupportRes.data || [],
      custody: custodyRes.data || [],
      other_terms: otherRes.data || [],
    }

    // Fetch intake data for marriage_date, etc.
    const { data: intake } = await supabase
      .from('client_intakes')
      .select('intake_data')
      .eq('case_id', caseId)
      .limit(1)
      .single()

    const intakeData = intake?.intake_data || {}

    const caseInfo = {
      case_number: caseData.case_number || '',
      state_code: caseData.state_code || 'CA',
      county: caseData.county || '',
      court_name: caseData.court_name || '',
      client_name: caseData.client_name || '',
      spouse_name: caseData.spouse_name || '',
      marriage_date: intakeData.marriage?.marriageDate || caseData.marriage_date || '',
      separation_date: intakeData.marriage?.separationDate || caseData.separation_date || '',
      marriage_location: intakeData.marriage?.marriageLocation || '',
    }

    // Fetch template sections for the state
    let sections: unknown[] = []
    const { data: stateSections } = await supabase
      .from('settlement_template_sections')
      .select('*')
      .eq('state_code', caseInfo.state_code)
      .eq('is_active', true)
      .order('section_order')

    if (stateSections && stateSections.length > 0) {
      sections = stateSections
    } else {
      // Fall back to CA if no state-specific templates
      const { data: caTemplates } = await supabase
        .from('settlement_template_sections')
        .select('*')
        .eq('state_code', 'CA')
        .eq('is_active', true)
        .order('section_order')

      if (!caTemplates || caTemplates.length === 0) {
        return NextResponse.json({ error: 'No template sections found' }, { status: 404 })
      }

      sections = caTemplates
    }

    // Generate the document
    const { buffer, renderedSections, variables } = await generateSettlementAgreement(
      fullProposal,
      caseInfo,
      sections as SettlementTemplateSection[],
      selected_sections,
      section_overrides
    )

    // Find or create a settlement_agreement template reference
    let templateId: string | null = null
    const { data: existingTemplate } = await supabase
      .from('document_templates')
      .select('id')
      .eq('template_type', 'settlement_agreement')
      .eq('state_code', caseInfo.state_code)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (existingTemplate) {
      templateId = existingTemplate.id
    } else {
      // Create a minimal template record
      const { data: newTemplate } = await supabase
        .from('document_templates')
        .insert({
          template_name: `${caseInfo.state_code} Marital Settlement Agreement`,
          template_type: 'settlement_agreement',
          state_code: caseInfo.state_code,
          template_file_path: 'generated',
          field_mappings: {},
          created_by: user.id,
        })
        .select()
        .single()

      templateId = newTemplate?.id || null
    }

    if (!templateId) {
      return NextResponse.json({ error: 'Failed to resolve template' }, { status: 500 })
    }

    // Upload DOCX to storage
    const fileName = `settlement_${caseId}_${Date.now()}.docx`
    const storagePath = `cases/${caseId}/settlement/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, new Uint8Array(buffer), {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

    // Create generated_documents record
    const { data: doc, error: docError } = await supabase
      .from('generated_documents')
      .insert({
        case_id: caseId,
        template_id: templateId,
        document_type: 'settlement_agreement',
        document_title: document_title || `Settlement Agreement - ${fullProposal.title}`,
        status: 'draft',
        filled_data: variables,
        custom_content: {
          proposal_id: proposal_id,
          rendered_sections: renderedSections,
          section_overrides: section_overrides || {},
          selected_sections: selected_sections || [],
        },
        file_path: uploadError ? null : storagePath,
        version: 1,
        created_by: user.id,
      })
      .select()
      .single()

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    // Create initial version snapshot
    await supabase.from('settlement_document_versions').insert({
      document_id: doc.id,
      version_number: 1,
      sections_content: renderedSections.reduce((acc: Record<string, string>, s: { key: string; content: string }) => {
        acc[s.key] = s.content
        return acc
      }, {}),
      variables_snapshot: variables,
      change_summary: 'Initial generation from proposal',
      changed_by: user.id,
    })

    // Create default signatures (petitioner + respondent)
    await supabase.from('document_signatures').insert([
      {
        document_id: doc.id,
        signer_role: 'petitioner',
        signer_name: caseInfo.client_name || 'Petitioner',
        status: 'pending',
        sign_order: 1,
      },
      {
        document_id: doc.id,
        signer_role: 'respondent',
        signer_name: caseInfo.spouse_name || 'Respondent',
        status: 'pending',
        sign_order: 2,
      },
    ])

    // Create timeline event
    await supabase.from('negotiation_events').insert({
      case_id: caseId,
      firm_id: caseData.firm_id,
      event_type: 'settlement_reached',
      event_date: new Date().toISOString(),
      proposal_id: proposal_id,
      title: `Settlement Agreement drafted from ${fullProposal.title}`,
      is_milestone: true,
      created_by: user.id,
    })

    return NextResponse.json({
      data: doc,
      message: 'Settlement agreement generated successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Settlement document POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
