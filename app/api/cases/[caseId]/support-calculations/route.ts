import { NextRequest, NextResponse } from 'next/server'
import { calculateChildSupport } from '@/lib/childSupportCalculator'
import { analyzeSpousalSupport } from '@/lib/spousalSupportAnalyzer'

// POST /api/cases/[caseId]/support-calculations - Calculate child or spousal support
export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const body = await request.json()
  const { calculation_type, state_code, inputs } = body

  if (!calculation_type || !state_code || !inputs) {
    return NextResponse.json(
      { error: 'calculation_type, state_code, and inputs are required' },
      { status: 400 }
    )
  }

  try {
    let result
    if (calculation_type === 'child_support') {
      result = calculateChildSupport(state_code, inputs)
    } else if (calculation_type === 'spousal_support') {
      result = analyzeSpousalSupport(state_code, inputs)
    } else {
      return NextResponse.json(
        { error: 'calculation_type must be child_support or spousal_support' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      case_id: params.caseId,
      calculation_type,
      state_code,
      inputs,
      results: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calculation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
