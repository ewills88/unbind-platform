import { NextRequest, NextResponse } from 'next/server'
import { fillCourtForm, saveFilledForm } from '@/lib/forms/formFillingService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/forms/fill - Fill a court form with case data
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { form_id, case_id, party_type, overrides } = body

    if (!form_id || !case_id) {
      return NextResponse.json({ error: 'form_id and case_id are required' }, { status: 400 })
    }

    // Fill the form
    const { filledPdfBuffer, fieldValues } = await fillCourtForm({
      formId: form_id,
      caseId: case_id,
      partyType: party_type,
      overrides,
    })

    // Save filled form
    const filledForm = await saveFilledForm({
      caseId: case_id,
      formId: form_id,
      fieldValues,
      pdfBuffer: filledPdfBuffer,
      overrides,
      userId: user.id,
    })

    return NextResponse.json({ data: filledForm })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fill form'
    console.error('Form fill error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
