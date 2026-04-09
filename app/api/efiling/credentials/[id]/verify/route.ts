import { NextRequest, NextResponse } from 'next/server'
import { EFilingService } from '@/lib/efiling/efilingService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/efiling/credentials/[id]/verify - Verify credentials
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: credentials, error } = await supabase
      .from('efiling_credentials')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !credentials) {
      return NextResponse.json({ error: 'Credentials not found' }, { status: 404 })
    }

    const service = new EFilingService(credentials)
    const result = await service.verifyCredentials()

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('E-filing verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
