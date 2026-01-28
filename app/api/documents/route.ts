import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create authenticated Supabase client
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

/**
 * GET /api/documents
 * List documents with optional filters
 * Query params:
 *   - caseId: filter by case
 *   - search: search in filename and description
 *   - category: filter by category
 *   - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let query = supabase
      .from('documents')
      .select('id, original_filename, filename, category, mime_type, file_size, uploaded_at, case_id')
      .eq('is_archived', false)
      .order('uploaded_at', { ascending: false })
      .limit(limit)

    // Filter by case
    if (caseId) {
      query = query.eq('case_id', caseId)
    }

    // Filter by category
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Search in filename
    if (search) {
      query = query.or(`original_filename.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ documents: documents || [] })

  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
