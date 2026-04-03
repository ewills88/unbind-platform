import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/proposals - List proposals
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const party = searchParams.get('party')

    let query = supabase
      .from('settlement_proposals')
      .select(`
        *,
        property_items:proposal_property_items(count),
        spousal_support:proposal_spousal_support(*),
        child_support:proposal_child_support(*),
        custody:proposal_custody(*),
        other_terms:proposal_other_terms(count)
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (party) query = query.eq('created_by_party', party)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Proposals list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/proposals - Create proposal
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    // Get case info for firm_id
    const { data: caseData } = await supabase
      .from('cases')
      .select('firm_id')
      .eq('id', caseId)
      .single()

    // Get next proposal number
    const { data: existing } = await supabase
      .from('settlement_proposals')
      .select('proposal_number')
      .eq('case_id', caseId)
      .order('proposal_number', { ascending: false })
      .limit(1)

    const nextNumber = existing && existing.length > 0 ? existing[0].proposal_number + 1 : 1

    const { data, error } = await supabase
      .from('settlement_proposals')
      .insert({
        case_id: caseId,
        firm_id: caseData?.firm_id || null,
        proposal_number: nextNumber,
        title: body.title || `Proposal #${nextNumber}`,
        created_by_party: body.created_by_party || 'our_client',
        status: 'draft',
        parent_proposal_id: body.parent_proposal_id || null,
        cover_letter: body.cover_letter || null,
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Proposal create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
