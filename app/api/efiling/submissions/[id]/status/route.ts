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

// GET /api/efiling/submissions/[id]/status - Check submission status
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get submission with credential
    const { data: submission, error } = await supabase
      .from('efiling_submissions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Get credentials
    const { data: credentials } = await supabase
      .from('efiling_credentials')
      .select('*')
      .eq('id', submission.credential_id)
      .single()

    if (!credentials) {
      return NextResponse.json({ error: 'Credentials not found' }, { status: 404 })
    }

    const service = new EFilingService(credentials)
    const updated = await service.checkSubmissionStatus(id)

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('E-filing status check error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
