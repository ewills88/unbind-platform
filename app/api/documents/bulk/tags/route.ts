import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { BulkTagRequest } from '@/types/tags'

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

/**
 * POST /api/documents/bulk/tags
 * Bulk add or remove tags from multiple documents
 * Body: { documentIds: string[], addTagIds?: string[], removeTagIds?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: BulkTagRequest = await request.json()

    // Validate request
    if (!body.documentIds || !Array.isArray(body.documentIds) || body.documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'documentIds array is required' },
        { status: 400 }
      )
    }

    const hasAddTags = body.addTagIds && body.addTagIds.length > 0
    const hasRemoveTags = body.removeTagIds && body.removeTagIds.length > 0

    if (!hasAddTags && !hasRemoveTags) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Either addTagIds or removeTagIds is required' },
        { status: 400 }
      )
    }

    // Verify user has access to all documents (via RLS)
    const { data: accessibleDocs, error: accessError } = await supabase
      .from('documents')
      .select('id')
      .in('id', body.documentIds)

    if (accessError) {
      return NextResponse.json(
        { error: 'Failed to verify document access', details: accessError.message },
        { status: 500 }
      )
    }

    const accessibleDocIds = accessibleDocs?.map(d => d.id) || []

    if (accessibleDocIds.length === 0) {
      return NextResponse.json(
        { error: 'Not Found', details: 'No accessible documents found' },
        { status: 404 }
      )
    }

    let addedCount = 0
    let removedCount = 0

    // Add tags to documents
    if (hasAddTags && body.addTagIds) {
      // Verify tags exist
      const { data: validTags } = await supabase
        .from('tags')
        .select('id')
        .in('id', body.addTagIds)

      const validTagIds = validTags?.map(t => t.id) || []

      if (validTagIds.length > 0) {
        // Create all document-tag pairs
        const insertData: { document_id: string; tag_id: string; added_by: string }[] = []

        for (const docId of accessibleDocIds) {
          for (const tagId of validTagIds) {
            insertData.push({
              document_id: docId,
              tag_id: tagId,
              added_by: user.id
            })
          }
        }

        const { error: insertError } = await supabase
          .from('document_tags')
          .upsert(insertData, { onConflict: 'document_id,tag_id' })

        if (insertError) {
          console.error('Error bulk adding tags:', insertError)
        } else {
          addedCount = insertData.length
        }
      }
    }

    // Remove tags from documents
    if (hasRemoveTags && body.removeTagIds) {
      const { error: deleteError, count } = await supabase
        .from('document_tags')
        .delete()
        .in('document_id', accessibleDocIds)
        .in('tag_id', body.removeTagIds)

      if (deleteError) {
        console.error('Error bulk removing tags:', deleteError)
      } else {
        removedCount = count || 0
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${accessibleDocIds.length} document(s)`,
      details: {
        documentsProcessed: accessibleDocIds.length,
        tagsAdded: addedCount,
        tagsRemoved: removedCount
      }
    })

  } catch (error) {
    console.error('Bulk tags API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
