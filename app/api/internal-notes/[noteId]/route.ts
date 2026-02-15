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

// PATCH /api/internal-notes/[noteId] - Update note (pin, resolve, edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
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
