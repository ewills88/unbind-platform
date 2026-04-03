import { NextRequest, NextResponse } from 'next/server'
import { AddTagsToDocumentRequest, Tag } from '@/types/tags'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// Helper to extract tags from Supabase join results
function extractTagsFromJoin(data: unknown): Tag[] {
  if (!Array.isArray(data)) return []
  return data
    .map(item => {
      if (item && typeof item === 'object' && 'tag' in item) {
        const tag = item.tag
        // Handle both single object and array cases from Supabase
        if (Array.isArray(tag) && tag.length > 0) {
          return tag[0] as Tag
        }
        if (tag && typeof tag === 'object') {
          return tag as Tag
        }
      }
      return null
    })
    .filter((tag): tag is Tag => tag !== null)
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/documents/[id]/tags
 * Get all tags for a document
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

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

    // Get tags for document
    const { data: documentTags, error } = await supabase
      .from('document_tags')
      .select(`
        document_id,
        tag_id,
        added_at,
        tag:tags(*)
      `)
      .eq('document_id', documentId)

    if (error) {
      console.error('Error fetching document tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tags', details: error.message },
        { status: 500 }
      )
    }

    // Extract tags from the join
    const tags = extractTagsFromJoin(documentTags)

    return NextResponse.json({ tags })

  } catch (error) {
    console.error('Document tags API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/tags
 * Add tags to a document
 * Body: { tagIds: string[] }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params
    const body: AddTagsToDocumentRequest = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Document ID is required' },
        { status: 400 }
      )
    }

    if (!body.tagIds || !Array.isArray(body.tagIds) || body.tagIds.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'tagIds array is required' },
        { status: 400 }
      )
    }

    // Verify user has access to document
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

    // Verify all tags exist
    const { data: existingTags, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .in('id', body.tagIds)

    if (tagError) {
      return NextResponse.json(
        { error: 'Failed to verify tags', details: tagError.message },
        { status: 500 }
      )
    }

    const validTagIds = existingTags?.map(t => t.id) || []

    if (validTagIds.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'No valid tag IDs provided' },
        { status: 400 }
      )
    }

    // Insert document-tag associations (upsert to handle duplicates)
    const insertData = validTagIds.map(tagId => ({
      document_id: documentId,
      tag_id: tagId,
      added_by: user.id
    }))

    const { error: insertError } = await supabase
      .from('document_tags')
      .upsert(insertData, { onConflict: 'document_id,tag_id' })

    if (insertError) {
      console.error('Error adding tags to document:', insertError)
      return NextResponse.json(
        { error: 'Failed to add tags', details: insertError.message },
        { status: 500 }
      )
    }

    // Fetch updated tags
    const { data: updatedTags } = await supabase
      .from('document_tags')
      .select('tag:tags(*)')
      .eq('document_id', documentId)

    const tags = extractTagsFromJoin(updatedTags)

    return NextResponse.json({
      success: true,
      message: `Added ${validTagIds.length} tag(s) to document`,
      tags
    })

  } catch (error) {
    console.error('Document tags API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/documents/[id]/tags
 * Remove a tag from a document
 * Query params: tagId
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params
    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Document ID is required' },
        { status: 400 }
      )
    }

    if (!tagId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'tagId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify user has access to document
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

    // Remove the tag association
    const { error: deleteError } = await supabase
      .from('document_tags')
      .delete()
      .eq('document_id', documentId)
      .eq('tag_id', tagId)

    if (deleteError) {
      console.error('Error removing tag from document:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove tag', details: deleteError.message },
        { status: 500 }
      )
    }

    // Fetch remaining tags
    const { data: remainingTags } = await supabase
      .from('document_tags')
      .select('tag:tags(*)')
      .eq('document_id', documentId)

    const tags = extractTagsFromJoin(remainingTags)

    return NextResponse.json({
      success: true,
      message: 'Tag removed from document',
      tags
    })

  } catch (error) {
    console.error('Document tags API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
