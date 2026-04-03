import { NextRequest, NextResponse } from 'next/server'
import { DOCUMENT_TYPES, DocumentType, DocumentCategory } from '@/types/intake-documents'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/intakes/[id]/documents - Get all documents for an intake
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: intakeId } = await params

    // Verify access to intake
    const { data: intake, error: intakeError } = await supabase
      .from('client_intakes')
      .select('id, user_id, invited_by')
      .eq('id', intakeId)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    if (intake.user_id !== user.id && intake.invited_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all documents for this intake
    const { data: documents, error } = await supabase
      .from('intake_documents')
      .select('*')
      .eq('intake_id', intakeId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Build checklist with document configs
    const checklist = {
      required: [] as Array<{ type: string; config: typeof DOCUMENT_TYPES[string]; status: string; document?: unknown }>,
      recommended: [] as Array<{ type: string; config: typeof DOCUMENT_TYPES[string]; status: string; document?: unknown }>,
      optional: [] as Array<{ type: string; config: typeof DOCUMENT_TYPES[string]; status: string; document?: unknown }>,
    }

    // Group documents by type
    const documentsByType = new Map<string, unknown>()
    for (const doc of documents || []) {
      documentsByType.set(doc.document_type, doc)
    }

    // Build checklist items
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
    const uploadedRecommended = checklist.recommended.filter(d =>
      ['uploaded', 'processing', 'verified'].includes(d.status)
    ).length
    const uploadedOptional = checklist.optional.filter(d =>
      ['uploaded', 'processing', 'verified'].includes(d.status)
    ).length

    const totalRequired = checklist.required.length
    const progressPercentage = totalRequired > 0
      ? Math.round((uploadedRequired / totalRequired) * 100)
      : 0

    return NextResponse.json({
      documents: documents || [],
      checklist: {
        ...checklist,
        totalRequired,
        totalRecommended: checklist.recommended.length,
        totalOptional: checklist.optional.length,
        uploadedRequired,
        uploadedRecommended,
        uploadedOptional,
        progressPercentage,
      }
    })
  } catch (error) {
    console.error('Documents GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/intakes/[id]/documents - Add a document record (before upload)
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
    const body = await request.json()
    const { document_type, document_category } = body as {
      document_type: DocumentType
      document_category?: DocumentCategory
    }

    if (!document_type || !DOCUMENT_TYPES[document_type]) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    // Verify access to intake
    const { data: intake, error: intakeError } = await supabase
      .from('client_intakes')
      .select('id, user_id')
      .eq('id', intakeId)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    if (intake.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if document already exists
    const { data: existing } = await supabase
      .from('intake_documents')
      .select('id')
      .eq('intake_id', intakeId)
      .eq('document_type', document_type)
      .single()

    if (existing) {
      return NextResponse.json({
        error: 'Document type already exists for this intake',
        existingId: existing.id
      }, { status: 409 })
    }

    // Create document record
    const config = DOCUMENT_TYPES[document_type]
    const { data: document, error } = await supabase
      .from('intake_documents')
      .insert({
        intake_id: intakeId,
        document_type,
        document_category: document_category || config.category,
        upload_status: 'pending',
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating document:', error)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Documents POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
