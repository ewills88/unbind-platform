import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET /api/cases/[caseId]/documents/generated/[documentId]/assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params

    // Verify access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData || (caseData.attorney_id !== user.id && caseData.client_id !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get assignments
    const { data: assignments, error } = await supabase
      .from('document_assignments')
      .select(`
        *,
        assigned_to_user:profiles!document_assignments_assigned_to_fkey(
          id, full_name, email
        ),
        assigned_by_user:profiles!document_assignments_assigned_by_fkey(
          id, full_name
        )
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Assignments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/documents/generated/[documentId]/assignments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params
    const body = await request.json()

    // Verify attorney access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can create assignments' }, { status: 403 })
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

    // Create assignment
    const { data: assignment, error } = await supabase
      .from('document_assignments')
      .insert({
        document_id: documentId,
        assigned_to: body.assigned_to,
        assigned_by: user.id,
        role: body.role || 'reviewer',
        status: 'pending',
        due_date: body.due_date,
        notes: body.notes
      })
      .select(`
        *,
        assigned_to_user:profiles!document_assignments_assigned_to_fkey(
          id, full_name, email
        ),
        assigned_by_user:profiles!document_assignments_assigned_by_fkey(
          id, full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating assignment:', error)
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
    }

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Assignments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/documents/generated/[documentId]/assignments
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params
    const body = await request.json()
    const { assignment_id, status, notes } = body

    if (!assignment_id) {
      return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 })
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

    // Get assignment
    const { data: existingAssignment } = await supabase
      .from('document_assignments')
      .select('*')
      .eq('id', assignment_id)
      .eq('document_id', documentId)
      .single()

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Only assignee or attorney can update
    if (existingAssignment.assigned_to !== user.id && caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Cannot update this assignment' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data: assignment, error } = await supabase
      .from('document_assignments')
      .update(updateData)
      .eq('id', assignment_id)
      .select(`
        *,
        assigned_to_user:profiles!document_assignments_assigned_to_fkey(
          id, full_name, email
        ),
        assigned_by_user:profiles!document_assignments_assigned_by_fkey(
          id, full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating assignment:', error)
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
    }

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Assignments PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/documents/generated/[documentId]/assignments
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, documentId } = await params
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignment_id')

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 })
    }

    // Verify attorney access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can delete assignments' }, { status: 403 })
    }

    const { error } = await supabase
      .from('document_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('document_id', documentId)

    if (error) {
      console.error('Error deleting assignment:', error)
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Assignments DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
