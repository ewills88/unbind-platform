import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { ExpenseFormData, ExpenseItem, FREQUENCY_CONFIG, IncomeFrequency } from '@/types/financial'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { client: null, user: null }
  }

  return { client: supabase, user }
}

// GET /api/cases/[caseId]/expenses - List all expenses for a case
export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = params
    const { searchParams } = new URL(request.url)
    const party = searchParams.get('party')
    const category = searchParams.get('category')
    const essential = searchParams.get('essential')

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
      .from('expense_items')
      .select('*')
      .eq('case_id', caseId)
      .order('amount', { ascending: false })

    if (party) {
      query = query.eq('party', party)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (essential === 'true') {
      query = query.eq('is_essential', true)
    } else if (essential === 'false') {
      query = query.eq('is_essential', false)
    }

    const { data: expenses, error } = await query

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
    }

    // Calculate monthly totals
    const expensesList = (expenses || []) as ExpenseItem[]
    const calculateMonthly = (items: ExpenseItem[], partyFilter?: string) => {
      return items
        .filter((e: ExpenseItem) => !partyFilter || e.party === partyFilter)
        .reduce((sum: number, e: ExpenseItem) => {
          const multiplier = FREQUENCY_CONFIG[e.frequency as IncomeFrequency]?.monthlyMultiplier || 1
          return sum + (Number(e.amount) * multiplier)
        }, 0)
    }

    return NextResponse.json({
      expenses: expenses || [],
      client_monthly: calculateMonthly(expensesList, 'client'),
      spouse_monthly: calculateMonthly(expensesList, 'spouse'),
      joint_monthly: calculateMonthly(expensesList, 'joint'),
      total_monthly: calculateMonthly(expensesList),
      count: expenses?.length || 0,
    })
  } catch (error) {
    console.error('Error in expenses GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/expenses - Create a new expense
export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = params
    const body: ExpenseFormData = await request.json()

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

    // Create the expense
    const { data: expense, error } = await supabase
      .from('expense_items')
      .insert({
        case_id: caseId,
        party: body.party,
        category: body.category,
        description: body.description,
        amount: body.amount,
        frequency: body.frequency,
        is_recurring: body.is_recurring,
        is_essential: body.is_essential,
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating expense:', error)
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
    }

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('Error in expenses POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/expenses - Update an expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = params
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 })
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

    // Update the expense
    const { data: expense, error } = await supabase
      .from('expense_items')
      .update(updates)
      .eq('id', id)
      .eq('case_id', caseId)
      .select()
      .single()

    if (error) {
      console.error('Error updating expense:', error)
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Error in expenses PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/expenses - Delete an expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = params
    const { searchParams } = new URL(request.url)
    const expenseId = searchParams.get('id')

    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 })
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

    // Delete the expense
    const { error } = await supabase
      .from('expense_items')
      .delete()
      .eq('id', expenseId)
      .eq('case_id', caseId)

    if (error) {
      console.error('Error deleting expense:', error)
      return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in expenses DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
