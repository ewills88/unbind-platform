import { NextRequest, NextResponse } from 'next/server'
import { getSharedDocuments } from '@/lib/portal/documentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/documents — list shared documents for client
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('case_id') || undefined

    const documents = await getSharedDocuments(user.id, caseId)
    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('Portal documents GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
