import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { generateResponseDocument } from '@/lib/discovery/documentGenerator'

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

// POST /api/discovery/generate - Generate a discovery response document
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { discovery_id, respondingPartyName, includeVerification, includeObjections } = body

    if (!discovery_id) {
      return NextResponse.json({ error: 'discovery_id is required' }, { status: 400 })
    }

    // Fetch discovery request
    const { data: discovery, error: discError } = await supabase
      .from('discovery_requests')
      .select('*')
      .eq('id', discovery_id)
      .single()

    if (discError || !discovery) {
      return NextResponse.json({ error: 'Discovery request not found' }, { status: 404 })
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('discovery_items')
      .select('*')
      .eq('discovery_request_id', discovery_id)
      .order('item_number', { ascending: true })

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Fetch case info
    const { data: caseData } = await supabase
      .from('cases')
      .select('case_number, state_code, county, court_name, client_name, spouse_name')
      .eq('id', discovery.case_id)
      .single()

    const caseInfo = {
      case_number: caseData?.case_number || '',
      state_code: caseData?.state_code || 'CA',
      county: caseData?.county || '',
      court_name: caseData?.court_name || '',
      client_name: caseData?.client_name || '',
      spouse_name: caseData?.spouse_name || '',
    }

    // Generate document
    const buffer = await generateResponseDocument({
      discoveryTitle: discovery.title,
      discoveryType: discovery.discovery_type,
      setNumber: discovery.set_number,
      propoundingParty: discovery.propounding_party || '',
      respondingParty: discovery.responding_party || '',
      items: items || [],
      caseInfo,
      includeVerification: includeVerification !== false,
      includeObjections: includeObjections !== false,
      respondingPartyName: respondingPartyName || caseData?.client_name || 'Responding Party',
    })

    const fileName = `${discovery.title} - Responses.docx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Discovery generate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
