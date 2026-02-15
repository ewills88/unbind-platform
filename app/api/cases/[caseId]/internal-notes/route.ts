import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { CreateNoteRequest } from '@/types/collaboration'

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

// GET /api/cases/[caseId]/internal-notes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { caseId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's firm
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 403 })
    }

    // Verify active membership
    const { data: membership } = await supabase
      .from('firm_members')
      .select('id, status')
      .eq('firm_id', profile.current_firm_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not an active firm member' }, { status: 403 })
    }

    // Get top-level notes (no parent) with author info
    const { data: notes, error: notesError } = await supabase
      .from('internal_case_notes')
      .select(`
        *,
        author:profiles!internal_case_notes_author_id_fkey(id, full_name, email)
      `)
      .eq('case_id', caseId)
      .eq('firm_id', profile.current_firm_id)
      .is('parent_note_id', null)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (notesError) {
      // Fallback without join
      const { data: notesOnly } = await supabase
        .from('internal_case_notes')
        .select('*')
        .eq('case_id', caseId)
        .eq('firm_id', profile.current_firm_id)
        .is('parent_note_id', null)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })

      return NextResponse.json({ notes: notesOnly || [] })
    }

    // Get replies for each note
    const noteIds = (notes || []).map(n => n.id)
    let replies: Record<string, unknown[]> = {}

    if (noteIds.length > 0) {
      const { data: allReplies } = await supabase
        .from('internal_case_notes')
        .select(`
          *,
          author:profiles!internal_case_notes_author_id_fkey(id, full_name, email)
        `)
        .in('parent_note_id', noteIds)
        .order('created_at', { ascending: true })

      if (allReplies) {
        replies = allReplies.reduce((acc: Record<string, unknown[]>, reply) => {
          const parentId = reply.parent_note_id as string
          if (!acc[parentId]) acc[parentId] = []
          acc[parentId].push(reply)
          return acc
        }, {})
      }
    }

    const notesWithReplies = (notes || []).map(note => ({
      ...note,
      replies: replies[note.id] || [],
    }))

    return NextResponse.json({ notes: notesWithReplies })
  } catch (error) {
    console.error('Internal notes GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/internal-notes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { caseId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 403 })
    }

    const body: CreateNoteRequest = await request.json()

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data: note, error: insertError } = await supabase
      .from('internal_case_notes')
      .insert({
        case_id: caseId,
        firm_id: profile.current_firm_id,
        author_id: user.id,
        content: body.content.trim(),
        note_type: body.note_type || 'fyi',
        mentioned_users: body.mentioned_users || [],
        parent_note_id: body.parent_note_id || null,
      })
      .select(`
        *,
        author:profiles!internal_case_notes_author_id_fkey(id, full_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating note:', insertError)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Internal notes POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
