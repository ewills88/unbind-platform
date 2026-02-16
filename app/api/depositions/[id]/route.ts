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

// GET /api/depositions/[id] - Get deposition with topics, exhibits, notes
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: deposition, error } = await supabase
      .from('depositions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !deposition) {
      return NextResponse.json({ error: 'Deposition not found' }, { status: 404 })
    }

    // Fetch related data in parallel
    const [topicsRes, exhibitsRes, notesRes] = await Promise.all([
      supabase
        .from('deposition_topics')
        .select('*')
        .eq('deposition_id', id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('deposition_exhibits')
        .select('*')
        .eq('deposition_id', id)
        .order('exhibit_number', { ascending: true }),
      supabase
        .from('deposition_testimony_notes')
        .select('*')
        .eq('deposition_id', id)
        .order('created_at', { ascending: true }),
    ])

    return NextResponse.json({
      data: {
        ...deposition,
        topics: topicsRes.data || [],
        exhibits: exhibitsRes.data || [],
        testimony_notes: notesRes.data || [],
      },
    })
  } catch (error) {
    console.error('Deposition GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/depositions/[id] - Update deposition
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Handle sub-resource operations
    if (body._action === 'add_topic') {
      const { data, error } = await supabase
        .from('deposition_topics')
        .insert({
          deposition_id: id,
          topic: body.topic,
          priority: body.priority || 'medium',
          estimated_minutes: body.estimated_minutes,
          key_documents: body.key_documents,
          sample_questions: body.sample_questions,
          sort_order: body.sort_order || 0,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (body._action === 'update_topic') {
      const updateData: Record<string, unknown> = {}
      if (body.topic !== undefined) updateData.topic = body.topic
      if (body.priority !== undefined) updateData.priority = body.priority
      if (body.estimated_minutes !== undefined) updateData.estimated_minutes = body.estimated_minutes
      if (body.key_documents !== undefined) updateData.key_documents = body.key_documents
      if (body.sample_questions !== undefined) updateData.sample_questions = body.sample_questions
      if (body.covered !== undefined) updateData.covered = body.covered
      if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
      if (body.notes !== undefined) updateData.notes = body.notes

      const { data, error } = await supabase
        .from('deposition_topics')
        .update(updateData)
        .eq('id', body.topic_id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (body._action === 'delete_topic') {
      const { error } = await supabase
        .from('deposition_topics')
        .delete()
        .eq('id', body.topic_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (body._action === 'add_exhibit') {
      const { data, error } = await supabase
        .from('deposition_exhibits')
        .insert({
          deposition_id: id,
          exhibit_number: body.exhibit_number,
          description: body.description,
          document_id: body.document_id,
          marked_by: body.marked_by,
          page_reference: body.page_reference,
          notes: body.notes,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (body._action === 'delete_exhibit') {
      const { error } = await supabase
        .from('deposition_exhibits')
        .delete()
        .eq('id', body.exhibit_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (body._action === 'add_note') {
      const { data, error } = await supabase
        .from('deposition_testimony_notes')
        .insert({
          deposition_id: id,
          timestamp_marker: body.timestamp_marker,
          page_line: body.page_line,
          note_text: body.note_text,
          note_type: body.note_type || 'general',
          importance: body.importance || 'normal',
          created_by: user.id,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (body._action === 'delete_note') {
      const { error } = await supabase
        .from('deposition_testimony_notes')
        .delete()
        .eq('id', body.note_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    // Default: update deposition fields
    const updateData: Record<string, unknown> = {}
    const fields = [
      'deponent_name', 'deponent_type', 'deponent_role',
      'scheduled_date', 'scheduled_end_time', 'location', 'location_type',
      'video_link', 'court_reporter', 'court_reporter_contact', 'videographer',
      'status', 'cancellation_reason', 'duration_hours',
      'transcript_received', 'transcript_date', 'summary', 'notes',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }

    const { data, error } = await supabase
      .from('depositions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Deposition PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/depositions/[id] - Delete a deposition
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('depositions')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Deposition DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
