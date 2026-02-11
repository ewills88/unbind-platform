import { NextRequest, NextResponse } from 'next/server'
import { generateProcedureChecklist } from '@/lib/procedureGenerator'

// POST /api/cases/[caseId]/procedures - Generate procedure checklist
export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const body = await request.json()
  const { state_code, filing_date, has_children } = body

  if (!state_code || !filing_date) {
    return NextResponse.json(
      { error: 'state_code and filing_date are required' },
      { status: 400 }
    )
  }

  const checklist = generateProcedureChecklist(
    state_code,
    filing_date,
    has_children ?? false
  )

  return NextResponse.json({
    case_id: params.caseId,
    state_code,
    ...checklist,
  })
}
