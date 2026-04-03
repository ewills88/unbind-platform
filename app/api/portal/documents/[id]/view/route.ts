import { NextRequest, NextResponse } from 'next/server'
import { recordDocumentView } from '@/lib/portal/documentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/portal/documents/[id]/view — record document view
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await recordDocumentView(id, user.id, {
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Document view error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
