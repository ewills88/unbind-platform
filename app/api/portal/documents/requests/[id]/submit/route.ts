import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { submitDocumentForRequest } from '@/lib/portal/documentService'

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

// POST /api/portal/documents/requests/[id]/submit — submit a file for a document request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedClient()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Upload to storage
    const supabase = getServiceClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = `client-uploads/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('case-documents')
      .upload(filePath, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('case-documents')
      .getPublicUrl(filePath)

    const result = await submitDocumentForRequest(
      id, user.id, filePath, urlData.publicUrl, file.name, file.type, file.size
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, documentId: result.documentId })
  } catch (error) {
    console.error('Document submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
