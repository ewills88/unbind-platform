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

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/settlement-documents/[id]/comments
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('document_review_comments')
      .select('*')
      .eq('document_id', id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/settlement-documents/[id]/comments - Add a comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { section_key, comment_text, comment_type, parent_comment_id } = body

    if (!comment_text) {
      return NextResponse.json({ error: 'comment_text is required' }, { status: 400 })
    }

    // Get author name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { data, error } = await supabase
      .from('document_review_comments')
      .insert({
        document_id: id,
        author_id: user.id,
        author_name: profile?.full_name || user.email || 'Unknown',
        section_key: section_key || null,
        comment_text,
        comment_type: comment_type || 'comment',
        parent_comment_id: parent_comment_id || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/settlement-documents/[id]/comments - Resolve or update a comment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { comment_id, is_resolved } = body

    if (!comment_id) {
      return NextResponse.json({ error: 'comment_id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (is_resolved !== undefined) {
      updateData.is_resolved = is_resolved
      if (is_resolved) {
        updateData.resolved_by = user.id
        updateData.resolved_at = new Date().toISOString()
      } else {
        updateData.resolved_by = null
        updateData.resolved_at = null
      }
    }

    const { data, error } = await supabase
      .from('document_review_comments')
      .update(updateData)
      .eq('id', comment_id)
      .eq('document_id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Comments PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
