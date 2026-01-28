import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { RelationshipType } from '@/types/tags'

// Create authenticated Supabase client
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

interface RouteParams {
  params: Promise<{ id: string }>
}

// Type for joined relationship data
interface RelationshipWithDocument {
  id: string
  source_document_id: string
  related_document_id: string
  relationship_type: RelationshipType
  confidence: number
  notes: string | null
  created_by: string | null
  created_at: string
  related_document?: {
    id: string
    original_filename: string
    category: string | null
    mime_type: string
  } | null
  source_document?: {
    id: string
    original_filename: string
    category: string | null
    mime_type: string
  } | null
}

/**
 * GET /api/documents/[id]/relationships
 * Get all relationships for a document (both as source and related)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    if (!documentId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to document (via RLS)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Not Found', details: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Get relationships where this document is the source
    const { data: outgoing, error: outError } = await supabase
      .from('document_relationships')
      .select(`
        *,
        related_document:related_document_id(id, original_filename, category, mime_type)
      `)
      .eq('source_document_id', documentId)

    if (outError) {
      console.error('Error fetching outgoing relationships:', outError)
    }

    // Get relationships where this document is the related document
    const { data: incoming, error: inError } = await supabase
      .from('document_relationships')
      .select(`
        *,
        source_document:source_document_id(id, original_filename, category, mime_type)
      `)
      .eq('related_document_id', documentId)

    if (inError) {
      console.error('Error fetching incoming relationships:', inError)
    }

    // Format outgoing relationships
    const outgoingRels = (outgoing as RelationshipWithDocument[] || []).map(rel => ({
      id: rel.id,
      documentId: rel.related_document_id,
      filename: rel.related_document?.original_filename || 'Unknown',
      category: rel.related_document?.category,
      mimeType: rel.related_document?.mime_type,
      relationshipType: rel.relationship_type,
      confidence: rel.confidence,
      notes: rel.notes,
      direction: 'outgoing' as const,
      createdAt: rel.created_at
    }))

    // Format incoming relationships
    const incomingRels = (incoming as RelationshipWithDocument[] || []).map(rel => ({
      id: rel.id,
      documentId: rel.source_document_id,
      filename: rel.source_document?.original_filename || 'Unknown',
      category: rel.source_document?.category,
      mimeType: rel.source_document?.mime_type,
      relationshipType: rel.relationship_type,
      confidence: rel.confidence,
      notes: rel.notes,
      direction: 'incoming' as const,
      createdAt: rel.created_at
    }))

    return NextResponse.json({
      relationships: [...outgoingRels, ...incomingRels],
      outgoing: outgoingRels,
      incoming: incomingRels
    })

  } catch (error) {
    console.error('Document relationships API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/relationships
 * Create a new relationship between documents
 * Body: { relatedDocumentId: string, relationshipType: string, notes?: string, confidence?: number }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params
    const body = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Document ID is required' },
        { status: 400 }
      )
    }

    if (!body.relatedDocumentId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'relatedDocumentId is required' },
        { status: 400 }
      )
    }

    if (documentId === body.relatedDocumentId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Cannot create relationship with the same document' },
        { status: 400 }
      )
    }

    // Verify user has access to both documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id')
      .in('id', [documentId, body.relatedDocumentId])

    if (docsError || !docs || docs.length !== 2) {
      return NextResponse.json(
        { error: 'Not Found', details: 'One or both documents not found or access denied' },
        { status: 404 }
      )
    }

    // Valid relationship types
    const validTypes: RelationshipType[] = ['related', 'version', 'supersedes', 'references', 'attachment', 'response']
    const relationshipType = validTypes.includes(body.relationshipType)
      ? body.relationshipType
      : 'related'

    // Create the relationship
    const { data: relationship, error: insertError } = await supabase
      .from('document_relationships')
      .insert({
        source_document_id: documentId,
        related_document_id: body.relatedDocumentId,
        relationship_type: relationshipType,
        confidence: body.confidence || 100,
        notes: body.notes || null,
        created_by: user.id
      })
      .select(`
        *,
        related_document:related_document_id(id, original_filename, category, mime_type)
      `)
      .single()

    if (insertError) {
      // Handle duplicate relationship
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Conflict', details: 'This relationship already exists' },
          { status: 409 }
        )
      }
      console.error('Error creating relationship:', insertError)
      return NextResponse.json(
        { error: 'Failed to create relationship', details: insertError.message },
        { status: 500 }
      )
    }

    const rel = relationship as RelationshipWithDocument

    return NextResponse.json({
      success: true,
      relationship: {
        id: rel.id,
        documentId: rel.related_document_id,
        filename: rel.related_document?.original_filename || 'Unknown',
        category: rel.related_document?.category,
        mimeType: rel.related_document?.mime_type,
        relationshipType: rel.relationship_type,
        confidence: rel.confidence,
        notes: rel.notes,
        direction: 'outgoing',
        createdAt: rel.created_at
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Document relationships API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/documents/[id]/relationships
 * Remove a relationship
 * Query params: relationshipId
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params
    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get('relationshipId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Document ID is required' },
        { status: 400 }
      )
    }

    if (!relationshipId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'relationshipId query parameter is required' },
        { status: 400 }
      )
    }

    // Delete the relationship (RLS will ensure user has permission)
    const { error: deleteError } = await supabase
      .from('document_relationships')
      .delete()
      .eq('id', relationshipId)
      .or(`source_document_id.eq.${documentId},related_document_id.eq.${documentId}`)

    if (deleteError) {
      console.error('Error deleting relationship:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete relationship', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Relationship removed'
    })

  } catch (error) {
    console.error('Document relationships API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
