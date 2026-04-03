import { NextRequest, NextResponse } from 'next/server'
import { getDocumentRequests } from '@/lib/portal/documentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/documents/requests — list document requests for client
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('case_id') || undefined

    const requests = await getDocumentRequests(user.id, caseId)
    return NextResponse.json({ data: requests })
  } catch (error) {
    console.error('Document requests GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
