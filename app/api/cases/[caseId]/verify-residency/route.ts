import { NextRequest, NextResponse } from 'next/server'
import { verifyResidency } from '@/lib/residencyChecker'

// POST /api/cases/[caseId]/verify-residency
export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const body = await request.json()
  const { state_code, state_move_in_date, county_move_in_date } = body

  if (!state_code) {
    return NextResponse.json({ error: 'state_code is required' }, { status: 400 })
  }

  const result = verifyResidency({
    stateCode: state_code,
    stateMoveInDate: state_move_in_date || null,
    countyMoveInDate: county_move_in_date || null,
  })

  return NextResponse.json({
    case_id: params.caseId,
    ...result,
  })
}
