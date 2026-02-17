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

// POST /api/efiling/submit - Submit a filing electronically
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      filing_id,
      court_location_code,
      case_number,
      filing_code,
      documents,
      payment_account_id,
    } = body

    if (!filing_id || !court_location_code || !filing_code || !payment_account_id) {
      return NextResponse.json({
        error: 'filing_id, court_location_code, filing_code, and payment_account_id are required'
      }, { status: 400 })
    }

    // Get filing with case info
    const { data: filing, error: filingError } = await supabase
      .from('case_filings')
      .select('*')
      .eq('id', filing_id)
      .single()

    if (filingError || !filing) {
      return NextResponse.json({ error: 'Filing not found' }, { status: 404 })
    }

    // Get case info
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, firm_id, state_code, case_number, client_name, spouse_name')
      .eq('id', filing.case_id)
      .single()

    if (!caseData?.firm_id) {
      return NextResponse.json({ error: 'Case not found or no firm' }, { status: 404 })
    }

    // Get credentials
    const credentials = await EFilingService.getCredentialsForFirm(supabase, caseData.firm_id)
    if (!credentials) {
      return NextResponse.json({
        error: 'No e-filing credentials configured for this firm'
      }, { status: 400 })
    }

    // Get attorney info (the filing user)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const nameParts = (profile?.full_name || 'Attorney').split(' ')

    // Prepare documents - fetch from filing_documents if not provided
    let preparedDocs = documents || []
    if (!preparedDocs.length) {
      const { data: filingDocs } = await supabase
        .from('filing_documents')
        .select('*')
        .eq('filing_id', filing_id)
        .order('display_order')

      preparedDocs = (filingDocs || []).map((doc: { document_name: string; document_type: string; file_path: string | null }, i: number) => ({
        fileName: doc.document_name,
        fileBase64: '', // Would need to fetch from storage
        documentTypeCode: doc.document_type === 'primary' ? 'LEAD' : 'ATTACHMENT',
        isLeadDocument: i === 0,
      }))
    }

    const service = new EFilingService(credentials)

    const submission = await service.submitFiling({
      caseId: filing.case_id,
      filingId: filing_id,
      courtLocationCode: court_location_code,
      caseNumber: case_number || caseData.case_number || undefined,
      filingCode: filing_code,
      filingDescription: filing.filing_name,
      documents: preparedDocs,
      paymentAccountId: payment_account_id,
      filingAttorney: {
        barNumber: '',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        firmName: '',
        email: user.email || '',
        phone: '',
      },
      userId: user.id,
    })

    return NextResponse.json({ data: submission }, { status: 201 })
  } catch (error) {
    console.error('E-filing submit error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
