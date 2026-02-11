import { NextRequest, NextResponse } from 'next/server'
import { calculateCommunityPropertyDivision } from '@/lib/communityPropertyCalculator'
import { calculateEquitableDistribution } from '@/lib/equitableDistributionCalculator'

// POST /api/cases/[caseId]/property-division - Calculate property division
export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const body = await request.json()
  const { state_code, assets, marriage_date, separation_date, equitable_factors } = body

  if (!state_code || !assets || !marriage_date) {
    return NextResponse.json(
      { error: 'state_code, assets, and marriage_date are required' },
      { status: 400 }
    )
  }

  const isCommunityProperty = state_code === 'CA' || state_code === 'TX'

  const divisionResult = calculateCommunityPropertyDivision({
    assets,
    marriage_date,
    separation_date,
    state_code,
  })

  let equitableResult = null
  if (!isCommunityProperty && equitable_factors) {
    const maritalAssets = assets.filter(
      (a: { owner?: string }) => a.owner === 'joint' || !a.owner
    )
    equitableResult = calculateEquitableDistribution(maritalAssets, equitable_factors)
  }

  return NextResponse.json({
    case_id: params.caseId,
    state_code,
    division_method: isCommunityProperty ? 'community_property' : 'equitable_distribution',
    division: divisionResult,
    equitable_distribution: equitableResult,
  })
}
