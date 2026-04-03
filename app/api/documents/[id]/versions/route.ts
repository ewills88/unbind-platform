import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/documents/[documentId]/versions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    const { id: documentId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: versions, error: versionsError } = await supabase
      .from('document_versions_collab')
      .select(`
        *,
        creator:profiles!document_versions_collab_created_by_fkey(id, full_name)
      `)
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })

    if (versionsError) {
      const { data: versionsOnly } = await supabase
        .from('document_versions_collab')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })

      return NextResponse.json({ versions: versionsOnly || [] })
    }

    return NextResponse.json({ versions: versions || [] })
  } catch (error) {
    console.error('Document versions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/documents/[documentId]/versions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    const { id: documentId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.file_path?.trim()) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }

    // Get next version number
    const { data: latestVersion } = await supabase
      .from('document_versions_collab')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (latestVersion?.version_number || 0) + 1

    const { data: version, error: insertError } = await supabase
      .from('document_versions_collab')
      .insert({
        document_id: documentId,
        version_number: nextVersion,
        file_path: body.file_path.trim(),
        created_by: user.id,
        change_summary: body.change_summary || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating version:', insertError)
      return NextResponse.json({ error: 'Failed to create version' }, { status: 500 })
    }

    return NextResponse.json({ version })
  } catch (error) {
    console.error('Document versions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
