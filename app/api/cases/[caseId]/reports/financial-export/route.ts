import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/cases/[caseId]/reports/financial-export - Generate Excel export
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const scenarioId = searchParams.get('scenario')

    // Verify access and get case info
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Fetch all financial data
    const [assetsRes, debtsRes, incomeRes, expensesRes, scenarioRes] = await Promise.all([
      supabase.from('assets').select('*').eq('case_id', caseId).order('category'),
      supabase.from('debts').select('*').eq('case_id', caseId).order('category'),
      supabase.from('income_sources').select('*').eq('case_id', caseId).order('party'),
      supabase.from('expense_items').select('*').eq('case_id', caseId).order('party'),
      scenarioId
        ? supabase.from('division_scenarios').select('*').eq('id', scenarioId).single()
        : Promise.resolve({ data: null }),
    ])

    const assets = assetsRes.data || []
    const debts = debtsRes.data || []
    const incomes = incomeRes.data || []
    const expenses = expensesRes.data || []
    const scenario = scenarioRes.data

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Unbind Legal Platform'
    workbook.created = new Date()

    // ===== ASSETS SHEET =====
    const assetsSheet = workbook.addWorksheet('Assets')
    assetsSheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Ownership', key: 'ownership', width: 15 },
      { header: 'Date Acquired', key: 'date_acquired', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
    ]

    // Style header
    assetsSheet.getRow(1).font = { bold: true }
    assetsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' },
    }

    // Add data
    let totalAssets = 0
    for (const asset of assets) {
      assetsSheet.addRow({
        name: asset.name,
        category: asset.category,
        value: asset.estimated_value,
        ownership: asset.ownership,
        date_acquired: asset.date_acquired || '',
        description: asset.description || '',
      })
      totalAssets += Number(asset.estimated_value) || 0
    }

    // Add total row
    const assetTotalRow = assetsSheet.addRow({
      name: 'TOTAL',
      value: totalAssets,
    })
    assetTotalRow.font = { bold: true }

    // Format currency column
    assetsSheet.getColumn('value').numFmt = '"$"#,##0.00'

    // ===== DEBTS SHEET =====
    const debtsSheet = workbook.addWorksheet('Debts')
    debtsSheet.columns = [
      { header: 'Creditor', key: 'creditor', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Balance', key: 'balance', width: 15 },
      { header: 'Monthly Payment', key: 'monthly', width: 15 },
      { header: 'Interest Rate', key: 'rate', width: 12 },
      { header: 'Ownership', key: 'ownership', width: 15 },
    ]

    debtsSheet.getRow(1).font = { bold: true }
    debtsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEF4444' },
    }

    let totalDebts = 0
    for (const debt of debts) {
      debtsSheet.addRow({
        creditor: debt.creditor_name,
        category: debt.category,
        balance: debt.current_balance,
        monthly: debt.monthly_payment || 0,
        rate: debt.interest_rate ? `${debt.interest_rate}%` : '',
        ownership: debt.ownership,
      })
      totalDebts += Number(debt.current_balance) || 0
    }

    const debtTotalRow = debtsSheet.addRow({
      creditor: 'TOTAL',
      balance: totalDebts,
    })
    debtTotalRow.font = { bold: true }

    debtsSheet.getColumn('balance').numFmt = '"$"#,##0.00'
    debtsSheet.getColumn('monthly').numFmt = '"$"#,##0.00'

    // ===== INCOME & EXPENSES SHEET =====
    const incExpSheet = workbook.addWorksheet('Income & Expenses')

    // Income section
    incExpSheet.addRow(['INCOME SOURCES']).font = { bold: true, size: 14 }
    incExpSheet.addRow(['Source', 'Party', 'Type', 'Gross Amount', 'Frequency', 'Monthly Equivalent'])
    incExpSheet.getRow(2).font = { bold: true }
    incExpSheet.getRow(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    }

    const frequencyMultipliers: Record<string, number> = {
      weekly: 4.33,
      biweekly: 2.17,
      semimonthly: 2,
      monthly: 1,
      quarterly: 0.33,
      annually: 0.083,
    }

    let clientMonthlyIncome = 0
    let spouseMonthlyIncome = 0

    for (const income of incomes) {
      const monthly = (income.gross_amount || 0) * (frequencyMultipliers[income.frequency] || 1)
      incExpSheet.addRow([
        income.source_name,
        income.party,
        income.income_type,
        income.gross_amount,
        income.frequency,
        monthly,
      ])
      if (income.party === 'client') {
        clientMonthlyIncome += monthly
      } else {
        spouseMonthlyIncome += monthly
      }
    }

    incExpSheet.addRow([])
    incExpSheet.addRow(['MONTHLY INCOME TOTALS']).font = { bold: true }
    incExpSheet.addRow(['Client Monthly Income:', '', '', '', '', clientMonthlyIncome])
    incExpSheet.addRow(['Spouse Monthly Income:', '', '', '', '', spouseMonthlyIncome])
    incExpSheet.addRow(['Total Monthly Income:', '', '', '', '', clientMonthlyIncome + spouseMonthlyIncome])

    // Expenses section
    incExpSheet.addRow([])
    incExpSheet.addRow(['EXPENSES']).font = { bold: true, size: 14 }
    incExpSheet.addRow(['Description', 'Party', 'Category', 'Amount', 'Frequency', 'Monthly Equivalent'])
    const expHeaderRow = incExpSheet.lastRow
    if (expHeaderRow) {
      expHeaderRow.font = { bold: true }
      expHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF59E0B' },
      }
    }

    let clientMonthlyExpenses = 0
    let spouseMonthlyExpenses = 0
    let jointMonthlyExpenses = 0

    for (const expense of expenses) {
      const monthly = (expense.amount || 0) * (frequencyMultipliers[expense.frequency] || 1)
      incExpSheet.addRow([
        expense.description,
        expense.party,
        expense.category,
        expense.amount,
        expense.frequency,
        monthly,
      ])
      if (expense.party === 'client') {
        clientMonthlyExpenses += monthly
      } else if (expense.party === 'spouse') {
        spouseMonthlyExpenses += monthly
      } else {
        jointMonthlyExpenses += monthly
      }
    }

    incExpSheet.addRow([])
    incExpSheet.addRow(['MONTHLY EXPENSE TOTALS']).font = { bold: true }
    incExpSheet.addRow(['Client Monthly Expenses:', '', '', '', '', clientMonthlyExpenses])
    incExpSheet.addRow(['Spouse Monthly Expenses:', '', '', '', '', spouseMonthlyExpenses])
    incExpSheet.addRow(['Joint Monthly Expenses:', '', '', '', '', jointMonthlyExpenses])
    incExpSheet.addRow(['Total Monthly Expenses:', '', '', '', '', clientMonthlyExpenses + spouseMonthlyExpenses + jointMonthlyExpenses])

    // Set column widths
    incExpSheet.getColumn(1).width = 30
    incExpSheet.getColumn(2).width = 12
    incExpSheet.getColumn(3).width = 20
    incExpSheet.getColumn(4).width = 15
    incExpSheet.getColumn(5).width = 15
    incExpSheet.getColumn(6).width = 18

    // ===== SUMMARY SHEET =====
    const summarySheet = workbook.addWorksheet('Summary')
    summarySheet.addRow([`${caseData.client_name} v. ${caseData.spouse_name}`]).font = { bold: true, size: 16 }
    summarySheet.addRow([`Case #: ${caseData.case_number || 'Pending'}`])
    summarySheet.addRow([`Generated: ${new Date().toLocaleDateString()}`])
    summarySheet.addRow([])

    summarySheet.addRow(['FINANCIAL SUMMARY']).font = { bold: true, size: 14 }
    summarySheet.addRow([])
    summarySheet.addRow(['Total Assets:', totalAssets])
    summarySheet.addRow(['Total Debts:', totalDebts])
    summarySheet.addRow(['Net Worth:', totalAssets - totalDebts])
    summarySheet.addRow([])
    summarySheet.addRow(['Monthly Income:', clientMonthlyIncome + spouseMonthlyIncome])
    summarySheet.addRow(['Monthly Expenses:', clientMonthlyExpenses + spouseMonthlyExpenses + jointMonthlyExpenses])
    summarySheet.addRow(['Monthly Cash Flow:', (clientMonthlyIncome + spouseMonthlyIncome) - (clientMonthlyExpenses + spouseMonthlyExpenses + jointMonthlyExpenses)])

    summarySheet.getColumn(1).width = 25
    summarySheet.getColumn(2).width = 20
    summarySheet.getColumn(2).numFmt = '"$"#,##0.00'

    // ===== DIVISION SCENARIO SHEET (if provided) =====
    if (scenario) {
      const divisionSheet = workbook.addWorksheet('Division Scenario')
      divisionSheet.addRow([`Scenario: ${scenario.name}`]).font = { bold: true, size: 14 }
      divisionSheet.addRow([])

      divisionSheet.addRow(['PROPOSED DIVISION']).font = { bold: true }
      divisionSheet.addRow([])

      // Client assets
      divisionSheet.addRow(['CLIENT RECEIVES:']).font = { bold: true }
      const clientAssets = assets.filter(a => scenario.asset_assignments?.[a.id] === 'client')
      for (const asset of clientAssets) {
        divisionSheet.addRow([`  ${asset.name}`, asset.estimated_value])
      }
      divisionSheet.addRow(['Client Total Assets:', scenario.client_asset_total])

      // Client debts
      divisionSheet.addRow([])
      divisionSheet.addRow(['CLIENT RESPONSIBLE FOR:']).font = { bold: true }
      const clientDebts = debts.filter(d => scenario.debt_assignments?.[d.id] === 'client')
      for (const debt of clientDebts) {
        divisionSheet.addRow([`  ${debt.creditor_name}`, debt.current_balance])
      }
      divisionSheet.addRow(['Client Total Debts:', scenario.client_debt_total])
      divisionSheet.addRow(['CLIENT NET:', scenario.client_net_total]).font = { bold: true }

      divisionSheet.addRow([])

      // Spouse assets
      divisionSheet.addRow(['SPOUSE RECEIVES:']).font = { bold: true }
      const spouseAssets = assets.filter(a => scenario.asset_assignments?.[a.id] === 'spouse')
      for (const asset of spouseAssets) {
        divisionSheet.addRow([`  ${asset.name}`, asset.estimated_value])
      }
      divisionSheet.addRow(['Spouse Total Assets:', scenario.spouse_asset_total])

      // Spouse debts
      divisionSheet.addRow([])
      divisionSheet.addRow(['SPOUSE RESPONSIBLE FOR:']).font = { bold: true }
      const spouseDebts = debts.filter(d => scenario.debt_assignments?.[d.id] === 'spouse')
      for (const debt of spouseDebts) {
        divisionSheet.addRow([`  ${debt.creditor_name}`, debt.current_balance])
      }
      divisionSheet.addRow(['Spouse Total Debts:', scenario.spouse_debt_total])
      divisionSheet.addRow(['SPOUSE NET:', scenario.spouse_net_total]).font = { bold: true }

      divisionSheet.addRow([])

      // Equalization
      if (scenario.equalization_amount > 0) {
        divisionSheet.addRow(['EQUALIZATION PAYMENT']).font = { bold: true }
        const payer = scenario.equalization_payer === 'client' ? caseData.client_name : caseData.spouse_name
        const receiver = scenario.equalization_payer === 'client' ? caseData.spouse_name : caseData.client_name
        divisionSheet.addRow([`${payer} pays ${receiver}:`, scenario.equalization_amount])
      }

      divisionSheet.getColumn(1).width = 35
      divisionSheet.getColumn(2).width = 20
      divisionSheet.getColumn(2).numFmt = '"$"#,##0.00'
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Return as downloadable file
    const filename = `Financial_Report_${caseData.case_number || caseId}_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Financial export error:', error)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
