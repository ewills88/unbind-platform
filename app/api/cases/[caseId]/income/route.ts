import { NextRequest, NextResponse } from 'next/server'
import { IncomeFormData, IncomeSource, FREQUENCY_CONFIG, IncomeFrequency } from '@/types/financial'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/cases/[caseId]/income - List all income sources for a case
export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = params
    const { searchParams } = new URL(request.url)
    const party = searchParams.get('party')
    const incomeType = searchParams.get('income_type')

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('income_sources')
      .select('*')
      .eq('case_id', caseId)
      .order('gross_amount', { ascending: false })

    if (party) {
      query = query.eq('party', party)
    }

    if (incomeType) {
      query = query.eq('income_type', incomeType)
    }

    const { data: income, error } = await query

    if (error) {
      console.error('Error fetching income:', error)
      return NextResponse.json({ error: 'Failed to fetch income' }, { status: 500 })
    }

    // Calculate monthly totals
    const incomeList = (income || []) as IncomeSource[]
    const calculateMonthly = (sources: IncomeSource[], partyFilter?: string) => {
      return sources
        .filter((s: IncomeSource) => !partyFilter || s.party === partyFilter)
        .reduce((sum: number, s: IncomeSource) => {
          const multiplier = FREQUENCY_CONFIG[s.frequency as IncomeFrequency]?.monthlyMultiplier || 1
          return sum + (Number(s.gross_amount) * multiplier)
        }, 0)
    }

    return NextResponse.json({
      income: income || [],
      client_monthly_gross: calculateMonthly(incomeList, 'client'),
      spouse_monthly_gross: calculateMonthly(incomeList, 'spouse'),
      total_monthly_gross: calculateMonthly(incomeList),
      count: income?.length || 0,
    })
  } catch (error) {
    console.error('Error in income GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/income - Create a new income source
export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = params
    const body: IncomeFormData = await request.json()

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Create the income source
    const { data: income, error } = await supabase
      .from('income_sources')
      .insert({
        case_id: caseId,
        party: body.party,
        income_type: body.income_type,
        source_name: body.source_name,
        gross_amount: body.gross_amount,
        net_amount: body.net_amount || null,
        frequency: body.frequency,
        is_variable: body.is_variable,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating income:', error)
      return NextResponse.json({ error: 'Failed to create income source' }, { status: 500 })
    }

    return NextResponse.json({ income }, { status: 201 })
  } catch (error) {
    console.error('Error in income POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/income - Update an income source
export async function PATCH(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = params
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Income source ID required' }, { status: 400 })
    }

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Update the income source
    const { data: income, error } = await supabase
      .from('income_sources')
      .update(updates)
      .eq('id', id)
      .eq('case_id', caseId)
      .select()
      .single()

    if (error) {
      console.error('Error updating income:', error)
      return NextResponse.json({ error: 'Failed to update income source' }, { status: 500 })
    }

    return NextResponse.json({ income })
  } catch (error) {
    console.error('Error in income PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/income - Delete an income source
export async function DELETE(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = params
    const { searchParams } = new URL(request.url)
    const incomeId = searchParams.get('id')

    if (!incomeId) {
      return NextResponse.json({ error: 'Income source ID required' }, { status: 400 })
    }

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Delete the income source
    const { error } = await supabase
      .from('income_sources')
      .delete()
      .eq('id', incomeId)
      .eq('case_id', caseId)

    if (error) {
      console.error('Error deleting income:', error)
      return NextResponse.json({ error: 'Failed to delete income source' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in income DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
