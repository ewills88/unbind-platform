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

// GET /api/efiling/codes - Get filing codes, document types from provider
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const firmId = searchParams.get('firm_id')
    const courtLocationCode = searchParams.get('court_location_code')
    const codeType = searchParams.get('type') || 'filing' // filing, document, party, category
    const filingCode = searchParams.get('filing_code')
    const caseCategory = searchParams.get('case_category') || 'family'

    if (!firmId) {
      return NextResponse.json({ error: 'firm_id is required' }, { status: 400 })
    }

    // First try local code mappings
    if (courtLocationCode) {
      const { data: mappings } = await supabase
        .from('efiling_code_mappings')
        .select('*')
        .eq('court_location_code', courtLocationCode)
        .eq('is_active', true)

      if (mappings && mappings.length > 0 && codeType === 'filing') {
        return NextResponse.json({ data: mappings, source: 'local' })
      }
    }

    // Fall back to live API
    const credentials = await EFilingService.getCredentialsForFirm(supabase, firmId)
    if (!credentials) {
      return NextResponse.json({
        error: 'No e-filing credentials configured'
      }, { status: 400 })
    }

    if (!courtLocationCode) {
      return NextResponse.json({ error: 'court_location_code is required' }, { status: 400 })
    }

    const service = new EFilingService(credentials)

    try {
      let data
      switch (codeType) {
        case 'filing':
          data = await service.getFilingCodes(courtLocationCode, caseCategory)
          break
        case 'document':
          if (!filingCode) {
            return NextResponse.json({ error: 'filing_code is required for document types' }, { status: 400 })
          }
          data = await service.getDocumentTypes(courtLocationCode, filingCode)
          break
        case 'category':
          data = await service.getFilingCodes(courtLocationCode, caseCategory)
          break
        default:
          data = await service.getFilingCodes(courtLocationCode, caseCategory)
      }

      return NextResponse.json({ data, source: 'api' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch codes'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    console.error('E-filing codes GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
