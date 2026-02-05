import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { GeneratedDocumentStatus } from '@/types/document-templates'

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

// GET /api/cases/[caseId]/documents/generated/[documentId] - Get single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params

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

    // Get document with template and history
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select(`
        *,
        template:document_templates(*),
        created_by_user:profiles!generated_documents_created_by_fkey(
          id, full_name, email
        ),
        approved_by_user:profiles!generated_documents_approved_by_fkey(
          id, full_name
        ),
        reviewed_by_user:profiles!generated_documents_reviewed_by_fkey(
          id, full_name
        )
      `)
      .eq('id', documentId)
      .eq('case_id', caseId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get version history
    const { data: history } = await supabase
      .from('document_generation_history')
      .select(`
        *,
        performed_by_user:profiles!document_generation_history_performed_by_fkey(
          id, full_name
        )
      `)
      .eq('document_id', documentId)
      .order('performed_at', { ascending: false })

    return NextResponse.json({
      document,
      history: history || []
    })
  } catch (error) {
    console.error('Generated document GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/documents/generated/[documentId] - Update document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params
    const body = await request.json()

    // Verify user is the attorney
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only the attorney can update documents' }, { status: 403 })
    }

    // Get current document
    const { data: currentDoc, error: currentError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', documentId)
      .eq('case_id', caseId)
      .single()

    if (currentError || !currentDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Can't update filed documents
    if (currentDoc.status === 'filed') {
      return NextResponse.json({ error: 'Cannot update filed documents' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    const changes: string[] = []

    // Update allowed fields
    if (body.document_title !== undefined) {
      updateData.document_title = body.document_title
      changes.push('Updated title')
    }

    if (body.description !== undefined) {
      updateData.description = body.description
      changes.push('Updated description')
    }

    if (body.filled_data !== undefined) {
      updateData.filled_data = { ...currentDoc.filled_data, ...body.filled_data }
      changes.push('Updated document data')
    }

    if (body.custom_content !== undefined) {
      updateData.custom_content = { ...currentDoc.custom_content, ...body.custom_content }
      changes.push('Updated custom content')
    }

    // Handle status transitions
    if (body.status !== undefined) {
      const newStatus = body.status as GeneratedDocumentStatus
      const currentStatus = currentDoc.status as GeneratedDocumentStatus

      // Validate status transitions
      const validTransitions: Record<GeneratedDocumentStatus, GeneratedDocumentStatus[]> = {
        draft: ['in_review', 'rejected'],
        in_review: ['approved', 'draft', 'rejected'],
        approved: ['filed', 'draft'],
        filed: [], // Can't change once filed
        rejected: ['draft']
      }

      if (!validTransitions[currentStatus].includes(newStatus)) {
        return NextResponse.json({
          error: `Cannot transition from ${currentStatus} to ${newStatus}`
        }, { status: 400 })
      }

      updateData.status = newStatus
      changes.push(`Status changed to ${newStatus}`)

      // Handle specific status actions
      if (newStatus === 'in_review') {
        updateData.submitted_for_review_at = new Date().toISOString()
      }

      if (newStatus === 'approved') {
        updateData.approved_by = user.id
        updateData.approved_at = new Date().toISOString()
      }

      if (newStatus === 'filed' && body.filed_date) {
        updateData.filed_date = body.filed_date
        if (body.filing_confirmation_number) {
          updateData.filing_confirmation_number = body.filing_confirmation_number
        }
      }
    }

    if (body.review_notes !== undefined) {
      updateData.review_notes = body.review_notes
      updateData.reviewed_by = user.id
      updateData.reviewed_at = new Date().toISOString()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Perform update
    const { data: updatedDoc, error: updateError } = await supabase
      .from('generated_documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating document:', updateError)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    // Log to history
    await supabase.rpc('log_document_generation', {
      p_document_id: documentId,
      p_version: currentDoc.version,
      p_action: 'edited',
      p_changes_summary: changes.join(', '),
      p_user_id: user.id,
      p_notes: body.edit_notes || null
    })

    return NextResponse.json({ document: updatedDoc })
  } catch (error) {
    console.error('Generated document PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/documents/generated/[documentId] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params

    // Verify user is the attorney
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only the attorney can delete documents' }, { status: 403 })
    }

    // Get document to check status
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select('status')
      .eq('id', documentId)
      .eq('case_id', caseId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Can't delete filed documents
    if (document.status === 'filed') {
      return NextResponse.json({ error: 'Cannot delete filed documents' }, { status: 400 })
    }

    // Delete document (history will cascade)
    const { error: deleteError } = await supabase
      .from('generated_documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Error deleting document:', deleteError)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Generated document DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
