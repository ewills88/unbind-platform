import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_firm_id')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('client_intakes')
    .select('*')
    .order('created_at', { ascending: false })

  if (profile?.current_firm_id) {
    query = query.eq('firm_id', profile.current_firm_id)
  } else {
    query = query.eq('attorney_id', user.id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching intakes:', error)
    return NextResponse.json({ error: 'Failed to fetch intakes' }, { status: 500 })
  }

  return NextResponse.json({ intakes: data || [] })
}

export async function POST(request: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const convertToCase = body.convert_to_case === true
  delete body.convert_to_case

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_firm_id')
    .eq('id', user.id)
    .single()

  const insertData = {
    ...body,
    attorney_id: user.id,
    firm_id: profile?.current_firm_id || null,
  }

  const { data: intake, error } = await supabase
    .from('client_intakes')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating intake:', error)
    return NextResponse.json({ error: 'Failed to create intake' }, { status: 500 })
  }

  let caseId: string | null = null

  if (convertToCase && intake) {
    const caseNumber = `${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`

    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        case_number: caseNumber,
        attorney_id: user.id,
        client_name: `${body.client_first_name} ${body.client_last_name}`.trim(),
        spouse_name: `${body.opposing_first_name || ''} ${body.opposing_last_name || ''}`.trim() || 'Unknown',
        status: 'active',
        state_code: body.state_of_filing || 'CA',
        case_type: body.case_type || 'divorce',
        created_from_intake: intake.id,
      })
      .select()
      .single()

    if (caseError) {
      console.error('Error creating case from intake:', caseError)
    } else if (newCase) {
      caseId = newCase.id

      await supabase
        .from('client_intakes')
        .update({ case_id: newCase.id, status: 'converted' })
        .eq('id', intake.id)
    }
  }

  return NextResponse.json({ intake, case_id: caseId }, { status: 201 })
}
