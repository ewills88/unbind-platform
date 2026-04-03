import { NextRequest, NextResponse } from 'next/server'
import { DOCUMENT_TYPES, DocumentType } from '@/types/intake-documents'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/intakes/[id]/documents/[documentId]/upload - Upload a document file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: intakeId, documentId } = await params

    // Get document record
    const { data: document, error: docError } = await supabase
      .from('intake_documents')
      .select('*, client_intakes!inner(user_id)')
      .eq('id', documentId)
      .eq('intake_id', intakeId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Verify ownership
    if ((document.client_intakes as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const config = DOCUMENT_TYPES[document.document_type as DocumentType]
    if (config) {
      const fileExt = file.name.split('.').pop()?.toUpperCase()
      if (fileExt && !config.acceptableFormats.includes(fileExt)) {
        return NextResponse.json({
          error: `Invalid file type. Accepted formats: ${config.acceptableFormats.join(', ')}`
        }, { status: 400 })
      }

      // Validate file size
      const maxSize = (config.maxSizeMB || 25) * 1024 * 1024
      if (file.size > maxSize) {
        return NextResponse.json({
          error: `File too large. Maximum size: ${config.maxSizeMB || 25}MB`
        }, { status: 400 })
      }
    }

    // Generate storage path
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `intakes/${intakeId}/documents/${documentId}/${timestamp}_${safeFileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('intake-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Update document record
    const { data: updatedDoc, error: updateError } = await supabase
      .from('intake_documents')
      .update({
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        upload_status: 'uploaded',
        upload_date: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single()

    if (updateError) {
      console.error('Document update error:', updateError)
      return NextResponse.json({ error: 'Failed to update document record' }, { status: 500 })
    }

    // Trigger AI verification asynchronously (don't wait for it)
    // In production, this would be a background job
    triggerAIVerification(supabase, documentId, storagePath, document.document_type)

    return NextResponse.json({
      document: updatedDoc,
      message: 'File uploaded successfully. AI verification in progress.',
    })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Trigger AI verification (runs asynchronously)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function triggerAIVerification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  documentId: string,
  filePath: string,
  documentType: string
) {
  try {
    // Update status to processing
    await supabase
      .from('intake_documents')
      .update({ upload_status: 'processing' })
      .eq('id', documentId)

    // Get file URL for AI analysis
    const { data: signedUrl } = await supabase.storage
      .from('intake-documents')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (!signedUrl?.signedUrl) {
      throw new Error('Failed to get signed URL')
    }

    // Call AI verification API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/verify-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        fileUrl: signedUrl.signedUrl,
        expectedType: documentType,
      }),
    })

    if (!response.ok) {
      throw new Error('AI verification request failed')
    }

    // AI verification endpoint will update the document status
  } catch (error) {
    console.error('AI verification trigger error:', error)
    // Update status back to uploaded if verification fails to start
    await supabase
      .from('intake_documents')
      .update({
        upload_status: 'uploaded',
        ai_verification: { error: 'Verification failed to start', verified: false }
      })
      .eq('id', documentId)
  }
}
