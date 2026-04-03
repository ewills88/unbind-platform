import { NextRequest, NextResponse } from 'next/server'
import { DebtFormData, Debt } from '@/types/financial'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/cases/[caseId]/debts - List all debts for a case
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
    const category = searchParams.get('category')
    const ownership = searchParams.get('ownership')

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
      .from('debts')
      .select('*, secured_asset:assets(id, name)')
      .eq('case_id', caseId)
      .order('current_balance', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (ownership) {
      query = query.eq('ownership', ownership)
    }

    const { data: debts, error } = await query

    if (error) {
      console.error('Error fetching debts:', error)
      return NextResponse.json({ error: 'Failed to fetch debts' }, { status: 500 })
    }

    // Calculate totals
    const debtsList = (debts || []) as Debt[]
    const totalBalance = debtsList.reduce((sum: number, d: Debt) => sum + Number(d.current_balance), 0)
    const totalMonthlyPayment = debtsList.reduce((sum: number, d: Debt) => sum + Number(d.monthly_payment || 0), 0)

    return NextResponse.json({
      debts: debts || [],
      total_balance: totalBalance,
      total_monthly_payment: totalMonthlyPayment,
      count: debts?.length || 0,
    })
  } catch (error) {
    console.error('Error in debts GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/debts - Create a new debt
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
    const body: DebtFormData = await request.json()

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

    // Create the debt
    const { data: debt, error } = await supabase
      .from('debts')
      .insert({
        case_id: caseId,
        category: body.category,
        creditor_name: body.creditor_name,
        account_number: body.account_number || null,
        original_amount: body.original_amount,
        current_balance: body.current_balance,
        monthly_payment: body.monthly_payment || null,
        interest_rate: body.interest_rate || null,
        ownership: body.ownership,
        is_secured: body.is_secured,
        secured_asset_id: body.secured_asset_id || null,
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating debt:', error)
      return NextResponse.json({ error: 'Failed to create debt' }, { status: 500 })
    }

    return NextResponse.json({ debt }, { status: 201 })
  } catch (error) {
    console.error('Error in debts POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/debts - Update a debt
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
      return NextResponse.json({ error: 'Debt ID required' }, { status: 400 })
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

    // Update the debt
    const { data: debt, error } = await supabase
      .from('debts')
      .update(updates)
      .eq('id', id)
      .eq('case_id', caseId)
      .select()
      .single()

    if (error) {
      console.error('Error updating debt:', error)
      return NextResponse.json({ error: 'Failed to update debt' }, { status: 500 })
    }

    return NextResponse.json({ debt })
  } catch (error) {
    console.error('Error in debts PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/debts - Delete a debt
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
    const debtId = searchParams.get('id')

    if (!debtId) {
      return NextResponse.json({ error: 'Debt ID required' }, { status: 400 })
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

    // Delete the debt
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId)
      .eq('case_id', caseId)

    if (error) {
      console.error('Error deleting debt:', error)
      return NextResponse.json({ error: 'Failed to delete debt' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in debts DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
