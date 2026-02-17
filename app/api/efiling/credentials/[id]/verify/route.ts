import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { EFilingService } from '@/lib/efiling/efilingService'

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

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/efiling/credentials/[id]/verify - Verify credentials
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
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
