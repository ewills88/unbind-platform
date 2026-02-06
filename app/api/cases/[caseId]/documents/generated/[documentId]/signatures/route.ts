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

// GET /api/cases/[caseId]/documents/generated/[documentId]/signatures
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

    // Get signatures
    const { data: signatures, error } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching signatures:', error)
      return NextResponse.json({ error: 'Failed to fetch signatures' }, { status: 500 })
    }

    return NextResponse.json({ signatures })
  } catch (error) {
    console.error('Signatures GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/documents/generated/[documentId]/signatures - Request signature
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

    // Verify attorney access for requesting signatures
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can request signatures' }, { status: 403 })
    }

    // Verify document exists and is approved
    const { data: document } = await supabase
      .from('generated_documents')
      .select('id, status')
      .eq('id', documentId)
      .eq('case_id', caseId)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Create signature request
    const { data: signature, error } = await supabase
      .from('document_signatures')
      .insert({
        document_id: documentId,
        signer_id: body.signer_id,
        signer_name: body.signer_name,
        signer_email: body.signer_email,
        external_service: body.service || 'native',
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating signature request:', error)
      return NextResponse.json({ error: 'Failed to create signature request' }, { status: 500 })
    }

    return NextResponse.json({ signature }, { status: 201 })
  } catch (error) {
    console.error('Signatures POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/documents/generated/[documentId]/signatures - Sign document
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
    const { signature_id, action, signature_data, signature_image_path } = body

    if (!signature_id) {
      return NextResponse.json({ error: 'signature_id is required' }, { status: 400 })
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

    // Get signature
    const { data: existingSignature } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('id', signature_id)
      .eq('document_id', documentId)
      .single()

    if (!existingSignature) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
    }

    // Only the signer can sign
    if (existingSignature.signer_id && existingSignature.signer_id !== user.id) {
      return NextResponse.json({ error: 'Only the designated signer can sign' }, { status: 403 })
    }

    let updateData: Record<string, unknown> = {}

    if (action === 'sign') {
      // Get request headers for audit
      const forwardedFor = request.headers.get('x-forwarded-for')
      const userAgent = request.headers.get('user-agent')

      updateData = {
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_data: signature_data,
        signature_image_path: signature_image_path,
        ip_address: forwardedFor?.split(',')[0] || 'unknown',
        user_agent: userAgent || 'unknown',
        signer_id: user.id
      }
    } else if (action === 'decline') {
      updateData = {
        status: 'declined'
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: signature, error } = await supabase
      .from('document_signatures')
      .update(updateData)
      .eq('id', signature_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating signature:', error)
      return NextResponse.json({ error: 'Failed to update signature' }, { status: 500 })
    }

    return NextResponse.json({ signature })
  } catch (error) {
    console.error('Signatures PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
