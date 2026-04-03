import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/cases/[caseId]/documents/generated/[documentId]/comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params
    const { searchParams } = new URL(request.url)
    const includeResolved = searchParams.get('include_resolved') === 'true'

    // Verify access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData || (caseData.attorney_id !== user.id && caseData.client_id !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get top-level comments (no parent)
    let query = supabase
      .from('document_comments')
      .select(`
        *,
        created_by_user:profiles!document_comments_created_by_fkey(
          id, full_name, email
        ),
        resolved_by_user:profiles!document_comments_resolved_by_fkey(
          id, full_name
        )
      `)
      .eq('document_id', documentId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })

    if (!includeResolved) {
      query = query.eq('resolved', false)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('document_comments')
          .select(`
            *,
            created_by_user:profiles!document_comments_created_by_fkey(
              id, full_name, email
            )
          `)
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true })

        return {
          ...comment,
          replies: replies || []
        }
      })
    )

    return NextResponse.json({ comments: commentsWithReplies })
  } catch (error) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/documents/generated/[documentId]/comments - Create comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params
    const body = await request.json()

    // Verify access (both attorney and client can comment)
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData || (caseData.attorney_id !== user.id && caseData.client_id !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify document exists
    const { data: document } = await supabase
      .from('generated_documents')
      .select('id')
      .eq('id', documentId)
      .eq('case_id', caseId)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('document_comments')
      .insert({
        document_id: documentId,
        content: body.content,
        position_start: body.position_start,
        position_end: body.position_end,
        section_id: body.section_id,
        parent_comment_id: body.parent_comment_id,
        mentioned_users: body.mentioned_users,
        created_by: user.id
      })
      .select(`
        *,
        created_by_user:profiles!document_comments_created_by_fkey(
          id, full_name, email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/documents/generated/[documentId]/comments - Resolve/update comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params
    const body = await request.json()
    const { comment_id, action, content } = body

    if (!comment_id) {
      return NextResponse.json({ error: 'comment_id is required' }, { status: 400 })
    }

    // Verify access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData || (caseData.attorney_id !== user.id && caseData.client_id !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get comment
    const { data: existingComment } = await supabase
      .from('document_comments')
      .select('*')
      .eq('id', comment_id)
      .eq('document_id', documentId)
      .single()

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    let updateData: Record<string, unknown> = {}

    if (action === 'resolve') {
      updateData = {
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString()
      }
    } else if (action === 'unresolve') {
      updateData = {
        resolved: false,
        resolved_by: null,
        resolved_at: null
      }
    } else if (action === 'edit') {
      // Only creator can edit
      if (existingComment.created_by !== user.id) {
        return NextResponse.json({ error: 'Only the comment creator can edit' }, { status: 403 })
      }
      updateData = {
        content,
        updated_at: new Date().toISOString()
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('document_comments')
      .update(updateData)
      .eq('id', comment_id)
      .select(`
        *,
        created_by_user:profiles!document_comments_created_by_fkey(
          id, full_name, email
        ),
        resolved_by_user:profiles!document_comments_resolved_by_fkey(
          id, full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
    }

    return NextResponse.json({ comment })
  } catch (error) {
    console.error('Comments PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/documents/generated/[documentId]/comments
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('comment_id')

    if (!commentId) {
      return NextResponse.json({ error: 'comment_id is required' }, { status: 400 })
    }

    // Verify case access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Get comment
    const { data: comment } = await supabase
      .from('document_comments')
      .select('*')
      .eq('id', commentId)
      .eq('document_id', documentId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Only creator or attorney can delete
    if (comment.created_by !== user.id && caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Cannot delete this comment' }, { status: 403 })
    }

    const { error } = await supabase
      .from('document_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comments DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
