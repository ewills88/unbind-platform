import { NextRequest, NextResponse } from 'next/server'
import { calculateScenarioTotals } from '@/types/settlement'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/scenarios
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    const { data, error } = await supabase
      .from('settlement_scenarios')
      .select('*')
      .eq('case_id', caseId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Scenarios GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/scenarios
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    // Get firm_id
    const { data: caseData } = await supabase
      .from('cases')
      .select('firm_id')
      .eq('id', caseId)
      .single()

    // Calculate totals
    const totals = calculateScenarioTotals({
      property_allocation: body.property_allocation,
      spousal_support: body.spousal_support,
    })

    const { data, error } = await supabase
      .from('settlement_scenarios')
      .insert({
        case_id: caseId,
        firm_id: caseData?.firm_id || null,
        scenario_name: body.scenario_name,
        scenario_description: body.scenario_description || null,
        base_proposal_id: body.base_proposal_id || null,
        property_allocation: body.property_allocation || [],
        spousal_support: body.spousal_support || {},
        child_support: body.child_support || {},
        custody_terms: body.custody_terms || {},
        other_terms: body.other_terms || [],
        calculated_totals: totals,
        comparison_notes: body.comparison_notes || null,
        pros: body.pros || [],
        cons: body.cons || [],
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Scenarios POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
