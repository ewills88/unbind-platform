import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// PATCH /api/internal-notes/[noteId] - Update note (pin, resolve, edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    const { noteId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.content === 'string') {
      updates.content = body.content.trim()
    }

    if (typeof body.pinned === 'boolean') {
      updates.pinned = body.pinned
    }

    if (body.resolved === true) {
      updates.resolved_at = new Date().toISOString()
      updates.resolved_by = user.id
    } else if (body.resolved === false) {
      updates.resolved_at = null
      updates.resolved_by = null
    }

    const { data: note, error: updateError } = await supabase
      .from('internal_case_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating note:', updateError)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Internal note PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
