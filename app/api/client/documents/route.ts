import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/client/documents - List documents for client's case
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Get client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!caseData) {
      return NextResponse.json({ documents: [] })
    }

    // Build query
    let query = supabase
      .from('documents')
      .select('id, original_filename, filename, category, mime_type, file_size, storage_path, uploaded_at, uploader_id, is_shared_with_client')
      .eq('case_id', caseData.id)
      .eq('is_archived', false)
      .order('uploaded_at', { ascending: false })

    // Only show docs shared with client (or uploaded by client)
    query = query.or(`is_shared_with_client.eq.true,uploader_id.eq.${user.id}`)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: documents, error: docsError } = await query

    if (docsError) {
      console.error('Error fetching documents:', docsError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error('Client documents GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
