import { NextRequest, NextResponse } from 'next/server'
import { GeneratedDocumentStatus, DocumentTemplateType } from '@/types/document-templates'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/cases/[caseId]/documents/generated - List generated documents for a case
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

    const status = searchParams.get('status') as GeneratedDocumentStatus | null
    const documentType = searchParams.get('document_type') as DocumentTemplateType | null

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

    // Build query
    let query = supabase
      .from('generated_documents')
      .select(`
        *,
        template:document_templates(
          id, template_name, template_code, form_number, state_code
        ),
        created_by_user:profiles!generated_documents_created_by_fkey(
          id, full_name
        ),
        approved_by_user:profiles!generated_documents_approved_by_fkey(
          id, full_name
        )
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('Error fetching generated documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Group by status for UI
    const byStatus: Record<string, typeof documents> = {
      draft: [],
      in_review: [],
      approved: [],
      filed: [],
      rejected: []
    }

    for (const doc of documents || []) {
      if (byStatus[doc.status]) {
        byStatus[doc.status].push(doc)
      }
    }

    // Calculate stats
    const stats = {
      total: documents?.length || 0,
      draft: byStatus.draft.length,
      in_review: byStatus.in_review.length,
      approved: byStatus.approved.length,
      filed: byStatus.filed.length,
      rejected: byStatus.rejected.length
    }

    return NextResponse.json({
      documents,
      by_status: byStatus,
      stats
    })
  } catch (error) {
    console.error('Generated documents GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
