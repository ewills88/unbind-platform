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

// POST /api/discovery/[id]/extension - Request or grant an extension
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.extension_days || body.extension_days < 1) {
      return NextResponse.json({ error: 'extension_days must be a positive number' }, { status: 400 })
    }

    // Get current discovery request
    const { data: discovery, error: discError } = await supabase
      .from('discovery_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (discError || !discovery) {
      return NextResponse.json({ error: 'Discovery request not found' }, { status: 404 })
    }

    const currentDueDate = new Date(discovery.extended_due_date || discovery.response_due_date)
    const newDueDate = new Date(currentDueDate)
    newDueDate.setDate(newDueDate.getDate() + body.extension_days)

    // Create extension record
    const { data: extension, error } = await supabase
      .from('discovery_extensions')
      .insert({
        discovery_request_id: id,
        original_due_date: currentDueDate.toISOString().split('T')[0],
        requested_extension_days: body.extension_days,
        new_due_date: newDueDate.toISOString().split('T')[0],
        requested_date: new Date().toISOString().split('T')[0],
        granted_date: body.granted ? new Date().toISOString().split('T')[0] : null,
        granted_by: body.granted_by || null,
        reason: body.reason || null,
        stipulation_document_id: body.stipulation_document_id || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update discovery request if extension is granted
    if (body.granted) {
      await supabase
        .from('discovery_requests')
        .update({ extended_due_date: newDueDate.toISOString().split('T')[0] })
        .eq('id', id)
    }

    return NextResponse.json({
      data: extension,
      new_due_date: newDueDate.toISOString().split('T')[0],
    }, { status: 201 })
  } catch (error) {
    console.error('Extension POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
