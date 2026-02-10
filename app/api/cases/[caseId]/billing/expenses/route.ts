import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET /api/cases/[caseId]/billing/expenses - List billable expenses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)

    // Filters
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const billable = searchParams.get('billable')
    const billed = searchParams.get('billed')
    const expenseType = searchParams.get('expense_type')

    // Verify access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData || (caseData.attorney_id !== user.id && caseData.client_id !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query for billing expenses table
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('case_id', caseId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (startDate) {
      query = query.gte('expense_date', startDate)
    }
    if (endDate) {
      query = query.lte('expense_date', endDate)
    }
    if (billable !== null && billable !== undefined) {
      query = query.eq('billable', billable === 'true')
    }
    if (billed === 'true') {
      query = query.not('billed_at', 'is', null)
    } else if (billed === 'false') {
      query = query.is('billed_at', null)
    }
    if (expenseType) {
      query = query.eq('expense_type', expenseType)
    }

    const { data: expenses, error } = await query

    if (error) {
      console.error('Error fetching billing expenses:', error)
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
    }

    // Calculate totals
    const totalAmount = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
    const totalBilledAmount = expenses?.reduce((sum, e) => sum + Number(e.billed_amount || e.amount), 0) || 0
    const unbilledAmount = expenses?.filter(e => e.billable && !e.billed_at)
      .reduce((sum, e) => sum + Number(e.billed_amount || e.amount), 0) || 0

    return NextResponse.json({
      expenses,
      summary: {
        total_expenses: expenses?.length || 0,
        total_amount: totalAmount,
        total_billed_amount: totalBilledAmount,
        unbilled_amount: unbilledAmount
      }
    })
  } catch (error) {
    console.error('Billing expenses GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/billing/expenses - Create billable expense
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    // Verify attorney access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can create billing expenses' }, { status: 403 })
    }

    // Validate required fields
    if (!body.description || body.amount === undefined) {
      return NextResponse.json({ error: 'description and amount are required' }, { status: 400 })
    }

    // Create expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        case_id: caseId,
        expense_date: body.expense_date || new Date().toISOString().split('T')[0],
        expense_type: body.expense_type || 'other',
        description: body.description,
        amount: body.amount,
        receipt_path: body.receipt_path,
        billable: body.billable !== false,
        markup_percentage: body.markup_percentage || 0,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating billing expense:', error)
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
    }

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('Billing expenses POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/billing/expenses - Update expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()
    const { expense_id, ...updates } = body

    if (!expense_id) {
      return NextResponse.json({ error: 'expense_id is required' }, { status: 400 })
    }

    // Verify attorney access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can update expenses' }, { status: 403 })
    }

    // Verify expense exists and is not billed
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expense_id)
      .eq('case_id', caseId)
      .single()

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    if (existingExpense.billed_at) {
      return NextResponse.json({ error: 'Cannot update billed expense' }, { status: 400 })
    }

    // Update expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expense_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating expense:', error)
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Billing expenses PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/billing/expenses
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const expenseId = searchParams.get('expense_id')

    if (!expenseId) {
      return NextResponse.json({ error: 'expense_id is required' }, { status: 400 })
    }

    // Verify attorney access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can delete expenses' }, { status: 403 })
    }

    // Verify expense exists and is not billed
    const { data: expense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('case_id', caseId)
      .single()

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    if (expense.billed_at) {
      return NextResponse.json({ error: 'Cannot delete billed expense' }, { status: 400 })
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) {
      console.error('Error deleting expense:', error)
      return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Billing expenses DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
