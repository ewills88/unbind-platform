import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ caseId: string }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFullProposal(supabase: any, proposalId: string) {
  const [proposalRes, propertyRes, supportRes, childRes, custodyRes, otherRes] = await Promise.all([
    supabase.from('settlement_proposals').select('*').eq('id', proposalId).single(),
    supabase.from('proposal_property_items').select('*').eq('proposal_id', proposalId).order('display_order'),
    supabase.from('proposal_spousal_support').select('*').eq('proposal_id', proposalId),
    supabase.from('proposal_child_support').select('*').eq('proposal_id', proposalId),
    supabase.from('proposal_custody').select('*').eq('proposal_id', proposalId),
    supabase.from('proposal_other_terms').select('*').eq('proposal_id', proposalId).order('display_order'),
  ])

  return {
    ...proposalRes.data,
    property_items: propertyRes.data || [],
    spousal_support: supportRes.data || [],
    child_support: childRes.data || [],
    custody: custodyRes.data || [],
    other_terms: otherRes.data || [],
  }
}

// GET /api/cases/[caseId]/proposals/compare?a=xxx&b=xxx
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await params
    const { searchParams } = new URL(request.url)
    const proposalAId = searchParams.get('a')
    const proposalBId = searchParams.get('b')

    if (!proposalAId || !proposalBId) {
      return NextResponse.json({ error: 'Both proposal IDs (a, b) are required' }, { status: 400 })
    }

    const [proposalA, proposalB] = await Promise.all([
      getFullProposal(supabase, proposalAId),
      getFullProposal(supabase, proposalBId),
    ])

    if (!proposalA?.id || !proposalB?.id) {
      return NextResponse.json({ error: 'One or both proposals not found' }, { status: 404 })
    }

    // Calculate gap analysis
    const propertyGap = Math.abs(
      (proposalA.total_to_husband - proposalA.total_to_wife) -
      (proposalB.total_to_husband - proposalB.total_to_wife)
    )

    const supportA = proposalA.spousal_support?.[0]
    const supportB = proposalB.spousal_support?.[0]
    const supportGapMonthly = Math.abs(
      (supportA?.monthly_amount || 0) - (supportB?.monthly_amount || 0)
    )
    const supportGapDuration = Math.abs(
      (supportA?.duration_months || 0) - (supportB?.duration_months || 0)
    )

    const custodyA = proposalA.custody?.[0]
    const custodyB = proposalB.custody?.[0]
    const custodyGap = Math.abs(
      (custodyA?.husband_percentage || 50) - (custodyB?.husband_percentage || 50)
    )

    return NextResponse.json({
      data: {
        proposal_a: proposalA,
        proposal_b: proposalB,
        gap_analysis: {
          property_gap: propertyGap,
          support_gap_monthly: supportGapMonthly,
          support_gap_duration: supportGapDuration,
          custody_gap_percentage: custodyGap,
          total_value_gap: propertyGap + (supportGapMonthly * Math.max(supportA?.duration_months || 0, supportB?.duration_months || 0)),
        },
      },
    })
  } catch (error) {
    console.error('Proposal compare error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
