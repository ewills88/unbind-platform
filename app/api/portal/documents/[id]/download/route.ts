import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

// GET /api/portal/documents/[id]/download — download a shared document
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedClient()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getServiceClient()

    // Get shared document
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shared } = await (supabase as any)
      .from('shared_documents')
      .select('id, allow_download, document_id')
      .eq('id', id)
      .eq('client_id', user.id)
      .eq('is_active', true)
      .single()

    if (!shared) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!shared.allow_download) {
      return NextResponse.json({ error: 'Download not allowed' }, { status: 403 })
    }

    // Get document info
    const { data: doc } = await supabase
      .from('documents')
      .select('file_name, file_path')
      .eq('id', shared.document_id)
      .single()

    if (!doc?.file_path) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get file from storage
    const { data: file, error } = await supabase.storage
      .from('case-documents')
      .download(doc.file_path)

    if (error || !file) {
      return NextResponse.json({ error: 'File not available' }, { status: 404 })
    }

    // Increment download count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('increment_download_count', { shared_doc_id: id })

    const arrayBuffer = await file.arrayBuffer()
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${doc.file_name}"`,
      },
    })
  } catch (error) {
    console.error('Document download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
