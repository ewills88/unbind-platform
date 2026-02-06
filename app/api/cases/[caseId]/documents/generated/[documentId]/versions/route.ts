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

// GET /api/cases/[caseId]/documents/generated/[documentId]/versions
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

    // Get versions
    const { data: versions, error } = await supabase
      .from('document_versions')
      .select(`
        *,
        created_by_user:profiles!document_versions_created_by_fkey(
          id, full_name
        )
      `)
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })

    if (error) {
      console.error('Error fetching versions:', error)
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
    }

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Versions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/documents/generated/[documentId]/versions - Create new version
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
      return NextResponse.json({ error: 'Only attorneys can create versions' }, { status: 403 })
    }

    // Get current document
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', documentId)
      .eq('case_id', caseId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get next version number
    const { data: latestVersion } = await supabase
      .from('document_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (latestVersion?.version_number || 0) + 1

    // Create version
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: documentId,
        version_number: nextVersion,
        is_major_version: body.is_major_version || false,
        content_snapshot: {
          title: document.document_title,
          status: document.status,
          file_path: document.file_path
        },
        filled_data_snapshot: document.filled_data,
        custom_content_snapshot: document.custom_content,
        changes_summary: body.changes_summary || `Version ${nextVersion} saved`,
        created_by: user.id
      })
      .select(`
        *,
        created_by_user:profiles!document_versions_created_by_fkey(
          id, full_name
        )
      `)
      .single()

    if (versionError) {
      console.error('Error creating version:', versionError)
      return NextResponse.json({ error: 'Failed to create version' }, { status: 500 })
    }

    // Update document version number
    await supabase
      .from('generated_documents')
      .update({ version: nextVersion })
      .eq('id', documentId)

    return NextResponse.json({ version }, { status: 201 })
  } catch (error) {
    console.error('Versions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
