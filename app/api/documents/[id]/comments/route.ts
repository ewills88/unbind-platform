import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } }
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

// GET /api/documents/[documentId]/comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { id: documentId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get top-level comments
    const { data: comments, error: commentsError } = await supabase
      .from('firm_document_comments')
      .select(`
        *,
        author:profiles!firm_document_comments_author_id_fkey(id, full_name, email)
      `)
      .eq('document_id', documentId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })

    if (commentsError) {
      const { data: commentsOnly } = await supabase
        .from('firm_document_comments')
        .select('*')
        .eq('document_id', documentId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })

      return NextResponse.json({ comments: commentsOnly || [] })
    }

    // Get replies
    const commentIds = (comments || []).map(c => c.id)
    let replies: Record<string, unknown[]> = {}

    if (commentIds.length > 0) {
      const { data: allReplies } = await supabase
        .from('firm_document_comments')
        .select(`
          *,
          author:profiles!firm_document_comments_author_id_fkey(id, full_name, email)
        `)
        .in('parent_comment_id', commentIds)
        .order('created_at', { ascending: true })

      if (allReplies) {
        replies = allReplies.reduce((acc: Record<string, unknown[]>, reply) => {
          const parentId = reply.parent_comment_id as string
          if (!acc[parentId]) acc[parentId] = []
          acc[parentId].push(reply)
          return acc
        }, {})
      }
    }

    const commentsWithReplies = (comments || []).map(comment => ({
      ...comment,
      replies: replies[comment.id] || [],
    }))

    return NextResponse.json({ comments: commentsWithReplies })
  } catch (error) {
    console.error('Document comments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/documents/[documentId]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { id: documentId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const body = await request.json()

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data: comment, error: insertError } = await supabase
      .from('firm_document_comments')
      .insert({
        document_id: documentId,
        firm_id: profile.current_firm_id,
        author_id: user.id,
        content: body.content.trim(),
        comment_type: body.comment_type || 'comment',
        position: body.position || null,
        parent_comment_id: body.parent_comment_id || null,
      })
      .select(`
        *,
        author:profiles!firm_document_comments_author_id_fkey(id, full_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating comment:', insertError)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    return NextResponse.json({ comment })
  } catch (error) {
    console.error('Document comments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
