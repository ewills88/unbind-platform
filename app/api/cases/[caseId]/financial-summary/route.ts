import { NextRequest, NextResponse } from 'next/server'
import {
  FREQUENCY_CONFIG,
  FinancialSummary,
  CategoryTotal,
  OwnershipTotal,
  OwnershipType,
  IncomeFrequency,
} from '@/types/financial'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface AssetRecord {
  id: string
  category: string
  estimated_value: number
  ownership: OwnershipType
}

interface DebtRecord {
  id: string
  category: string
  current_balance: number
  ownership: OwnershipType
}

interface IncomeRecord {
  id: string
  party: string
  gross_amount: number
  frequency: IncomeFrequency
}

interface ExpenseRecord {
  id: string
  party: string
  amount: number
  frequency: IncomeFrequency
}

// GET /api/cases/[caseId]/financial-summary - Get comprehensive financial summary
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

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, client_name, spouse_name')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Fetch all financial data in parallel
    const [assetsResult, debtsResult, incomeResult, expensesResult] = await Promise.all([
      supabase.from('assets').select('*').eq('case_id', caseId),
      supabase.from('debts').select('*').eq('case_id', caseId),
      supabase.from('income_sources').select('*').eq('case_id', caseId),
      supabase.from('expense_items').select('*').eq('case_id', caseId),
    ])

    const assets = (assetsResult.data || []) as AssetRecord[]
    const debts = (debtsResult.data || []) as DebtRecord[]
    const income = (incomeResult.data || []) as IncomeRecord[]
    const expenses = (expensesResult.data || []) as ExpenseRecord[]

    // Calculate totals
    const totalAssets = assets.reduce((sum: number, a: AssetRecord) => sum + Number(a.estimated_value), 0)
    const totalDebts = debts.reduce((sum: number, d: DebtRecord) => sum + Number(d.current_balance), 0)
    const netWorth = totalAssets - totalDebts

    // Assets by category
    const assetCategoryMap: Record<string, { total: number; count: number }> = {}
    assets.forEach((a: AssetRecord) => {
      if (!assetCategoryMap[a.category]) {
        assetCategoryMap[a.category] = { total: 0, count: 0 }
      }
      assetCategoryMap[a.category].total += Number(a.estimated_value)
      assetCategoryMap[a.category].count += 1
    })
    const assetsByCategory: CategoryTotal[] = Object.entries(assetCategoryMap)
      .map(([category, data]) => ({ category, total: data.total, count: data.count }))

    // Debts by category
    const debtCategoryMap: Record<string, { total: number; count: number }> = {}
    debts.forEach((d: DebtRecord) => {
      if (!debtCategoryMap[d.category]) {
        debtCategoryMap[d.category] = { total: 0, count: 0 }
      }
      debtCategoryMap[d.category].total += Number(d.current_balance)
      debtCategoryMap[d.category].count += 1
    })
    const debtsByCategory: CategoryTotal[] = Object.entries(debtCategoryMap)
      .map(([category, data]) => ({ category, total: data.total, count: data.count }))

    // Assets by ownership
    const assetOwnershipMap: Record<string, { total: number; count: number }> = {}
    assets.forEach((a: AssetRecord) => {
      if (!assetOwnershipMap[a.ownership]) {
        assetOwnershipMap[a.ownership] = { total: 0, count: 0 }
      }
      assetOwnershipMap[a.ownership].total += Number(a.estimated_value)
      assetOwnershipMap[a.ownership].count += 1
    })
    const assetsByOwnership: OwnershipTotal[] = Object.entries(assetOwnershipMap)
      .map(([ownership, data]) => ({ ownership: ownership as OwnershipType, total: data.total, count: data.count }))

    // Debts by ownership
    const debtOwnershipMap: Record<string, { total: number; count: number }> = {}
    debts.forEach((d: DebtRecord) => {
      if (!debtOwnershipMap[d.ownership]) {
        debtOwnershipMap[d.ownership] = { total: 0, count: 0 }
      }
      debtOwnershipMap[d.ownership].total += Number(d.current_balance)
      debtOwnershipMap[d.ownership].count += 1
    })
    const debtsByOwnership: OwnershipTotal[] = Object.entries(debtOwnershipMap)
      .map(([ownership, data]) => ({ ownership: ownership as OwnershipType, total: data.total, count: data.count }))

    // Calculate monthly income/expenses
    const calculateMonthlyAmount = (amount: number, frequency: IncomeFrequency) => {
      const multiplier = FREQUENCY_CONFIG[frequency]?.monthlyMultiplier || 1
      return amount * multiplier
    }

    const clientMonthlyIncome = income
      .filter((i: IncomeRecord) => i.party === 'client')
      .reduce((sum: number, i: IncomeRecord) => sum + calculateMonthlyAmount(Number(i.gross_amount), i.frequency), 0)

    const spouseMonthlyIncome = income
      .filter((i: IncomeRecord) => i.party === 'spouse')
      .reduce((sum: number, i: IncomeRecord) => sum + calculateMonthlyAmount(Number(i.gross_amount), i.frequency), 0)

    const clientMonthlyExpenses = expenses
      .filter((e: ExpenseRecord) => e.party === 'client')
      .reduce((sum: number, e: ExpenseRecord) => sum + calculateMonthlyAmount(Number(e.amount), e.frequency), 0)

    const spouseMonthlyExpenses = expenses
      .filter((e: ExpenseRecord) => e.party === 'spouse')
      .reduce((sum: number, e: ExpenseRecord) => sum + calculateMonthlyAmount(Number(e.amount), e.frequency), 0)

    const jointMonthlyExpenses = expenses
      .filter((e: ExpenseRecord) => e.party === 'joint')
      .reduce((sum: number, e: ExpenseRecord) => sum + calculateMonthlyAmount(Number(e.amount), e.frequency), 0)

    const summary: FinancialSummary = {
      total_assets: totalAssets,
      total_debts: totalDebts,
      net_worth: netWorth,
      assets_by_category: assetsByCategory.sort((a, b) => b.total - a.total),
      debts_by_category: debtsByCategory.sort((a, b) => b.total - a.total),
      assets_by_ownership: assetsByOwnership,
      debts_by_ownership: debtsByOwnership,
      client_monthly_income: clientMonthlyIncome,
      spouse_monthly_income: spouseMonthlyIncome,
      client_monthly_expenses: clientMonthlyExpenses,
      spouse_monthly_expenses: spouseMonthlyExpenses,
      joint_monthly_expenses: jointMonthlyExpenses,
    }

    return NextResponse.json({
      summary,
      case_info: {
        client_name: caseData.client_name,
        spouse_name: caseData.spouse_name,
      },
      counts: {
        assets: assets.length,
        debts: debts.length,
        income_sources: income.length,
        expense_items: expenses.length,
      },
    })
  } catch (error) {
    console.error('Error in financial-summary GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
