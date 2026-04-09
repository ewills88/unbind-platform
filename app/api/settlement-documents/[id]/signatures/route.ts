import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/settlement-documents/[id]/signatures
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('document_id', id)
      .order('sign_order')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Signatures GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/settlement-documents/[id]/signatures - Add a signer
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const { signer_role, signer_name, signer_email, sign_order } = body
    if (!signer_role || !signer_name) {
      return NextResponse.json({ error: 'signer_role and signer_name are required' }, { status: 400 })
    }

    // Get max order if not provided
    let order = sign_order
    if (order === undefined) {
      const { data: existing } = await supabase
        .from('document_signatures')
        .select('sign_order')
        .eq('document_id', id)
        .order('sign_order', { ascending: false })
        .limit(1)

      order = existing && existing.length > 0 ? existing[0].sign_order + 1 : 1
    }

    const { data, error } = await supabase
      .from('document_signatures')
      .insert({
        document_id: id,
        signer_role,
        signer_name,
        signer_email: signer_email || null,
        sign_order: order,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Signatures POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/settlement-documents/[id]/signatures - Update signature status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { signature_id, status, signature_method, decline_reason } = body

    if (!signature_id || !status) {
      return NextResponse.json({ error: 'signature_id and status are required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }

    if (status === 'signed') {
      updateData.signed_at = new Date().toISOString()
      updateData.signature_method = signature_method || 'electronic'
    }
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString()
    }
    if (status === 'viewed') {
      updateData.viewed_at = new Date().toISOString()
    }
    if (status === 'declined') {
      updateData.decline_reason = decline_reason || null
    }

    const { data, error } = await supabase
      .from('document_signatures')
      .update(updateData)
      .eq('id', signature_id)
      .eq('document_id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Check if all signatures are complete
    const { data: allSigs } = await supabase
      .from('document_signatures')
      .select('status')
      .eq('document_id', id)

    const allSigned = allSigs && allSigs.length > 0 && allSigs.every((s: { status: string }) => s.status === 'signed')

    return NextResponse.json({
      data,
      all_signed: allSigned,
    })
  } catch (error) {
    console.error('Signatures PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
