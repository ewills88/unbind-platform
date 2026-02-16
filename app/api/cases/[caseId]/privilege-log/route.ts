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
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/privilege-log - List privilege log entries
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const privilegeType = searchParams.get('privilege_type')

    let query = supabase
      .from('privilege_log_entries')
      .select('*')
      .eq('case_id', caseId)
      .order('entry_number', { ascending: true })

    if (privilegeType) {
      query = query.eq('privilege_type', privilegeType)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Privilege log list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/privilege-log - Create privilege log entry
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    const { document_description, privilege_type, privilege_basis, author } = body

    if (!document_description || !privilege_type || !privilege_basis) {
      return NextResponse.json({
        error: 'document_description, privilege_type, and privilege_basis are required',
      }, { status: 400 })
    }

    // Get next entry number
    const { data: existing } = await supabase
      .from('privilege_log_entries')
      .select('entry_number')
      .eq('case_id', caseId)
      .order('entry_number', { ascending: false })
      .limit(1)

    const nextNumber = existing && existing.length > 0 ? existing[0].entry_number + 1 : 1

    const { data, error } = await supabase
      .from('privilege_log_entries')
      .insert({
        case_id: caseId,
        entry_number: nextNumber,
        document_date: body.document_date,
        document_description,
        document_type: body.document_type,
        author: author || '',
        recipients: body.recipients,
        privilege_type,
        privilege_basis,
        redacted: body.redacted || false,
        produced_in_redacted_form: body.produced_in_redacted_form || false,
        bates_begin: body.bates_begin,
        bates_end: body.bates_end,
        discovery_request_id: body.discovery_request_id,
        discovery_item_id: body.discovery_item_id,
        notes: body.notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Privilege log create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/privilege-log - Update a privilege log entry
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await params
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    const fields = [
      'document_date', 'document_description', 'document_type', 'author',
      'recipients', 'privilege_type', 'privilege_basis', 'redacted',
      'produced_in_redacted_form', 'bates_begin', 'bates_end', 'notes',
      'discovery_request_id', 'discovery_item_id',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }

    const { data, error } = await supabase
      .from('privilege_log_entries')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Privilege log update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/privilege-log - Delete a privilege log entry
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await params
    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('id')

    if (!entryId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('privilege_log_entries')
      .delete()
      .eq('id', entryId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Privilege log delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
