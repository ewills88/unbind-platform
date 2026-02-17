// Session 19 CP3: Report Export Service
// Excel, CSV, and PDF export for all report types

import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { format } from 'date-fns'

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  reportName: string
  reportType: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters?: Record<string, any>
  includeCharts?: boolean
  firmName?: string
}

// ============================================================
// Excel Export
// ============================================================

export async function exportToExcel(options: ExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Unbind'
  workbook.created = new Date()

  // Info sheet
  const infoSheet = workbook.addWorksheet('Report Info')
  infoSheet.columns = [
    { header: 'Property', key: 'property', width: 20 },
    { header: 'Value', key: 'value', width: 40 },
  ]
  infoSheet.addRows([
    { property: 'Report Name', value: options.reportName },
    { property: 'Report Type', value: options.reportType },
    { property: 'Generated', value: format(new Date(), 'PPpp') },
    { property: 'Firm', value: options.firmName || '' },
    ...Object.entries(options.filters || {}).map(([key, value]) => ({
      property: formatColumnHeader(key),
      value: String(value),
    })),
  ])
  styleHeaderRow(infoSheet)

  // Data sheets based on report type
  switch (options.reportType) {
    case 'revenue':
      addRevenueSheets(workbook, options.data)
      break
    case 'ar_aging':
      addARAgingSheets(workbook, options.data)
      break
    case 'collections':
      addCollectionsSheets(workbook, options.data)
      break
    case 'profitability':
      addProfitabilitySheets(workbook, options.data)
      break
    case 'trust':
      addTrustSheets(workbook, options.data)
      break
    case 'team':
    case 'performance':
      addAttorneySheets(workbook, options.data)
      break
    case 'trends':
      addTrendsSheets(workbook, options.data)
      break
    case 'lifecycle':
      addLifecycleSheets(workbook, options.data)
      break
    case 'outcomes':
      addOutcomesSheets(workbook, options.data)
      break
    case 'workload':
      addWorkloadSheets(workbook, options.data)
      break
    default:
      addGenericSheet(workbook, options.data)
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
}

function formatCurrencyCol(sheet: ExcelJS.Worksheet, col: string) {
  sheet.getColumn(col).numFmt = '$#,##0.00'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addRevenueSheets(workbook: ExcelJS.Workbook, data: any) {
  // Summary
  const summary = workbook.addWorksheet('Summary')
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  summary.addRows([
    { metric: 'Total Billed', value: data.summary?.totalBilled || 0 },
    { metric: 'Total Collected', value: data.summary?.totalCollected || 0 },
    { metric: 'Outstanding', value: data.summary?.totalOutstanding || 0 },
    { metric: 'Realization Rate', value: `${data.summary?.realizationRate || 0}%` },
    { metric: 'Invoice Count', value: data.summary?.invoiceCount || 0 },
  ])
  styleHeaderRow(summary)

  // By Month
  if (data.byMonth?.length > 0) {
    const sheet = workbook.addWorksheet('By Month')
    sheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Billed', key: 'billed', width: 15 },
      { header: 'Collected', key: 'collected', width: 15 },
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet.addRows(data.byMonth.map((m: any) => ({ month: m.month, billed: m.billed, collected: m.collected })))
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'B')
    formatCurrencyCol(sheet, 'C')
  }

  // By Attorney
  if (data.byAttorney?.length > 0) {
    const sheet = workbook.addWorksheet('By Attorney')
    sheet.columns = [
      { header: 'Attorney', key: 'name', width: 25 },
      { header: 'Billed', key: 'billed', width: 15 },
      { header: 'Collected', key: 'collected', width: 15 },
      { header: 'Invoices', key: 'count', width: 10 },
    ]
    sheet.addRows(data.byAttorney)
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'B')
    formatCurrencyCol(sheet, 'C')
  }

  // By Client
  if (data.byClient?.length > 0) {
    const sheet = workbook.addWorksheet('By Client')
    sheet.columns = [
      { header: 'Client', key: 'name', width: 30 },
      { header: 'Billed', key: 'billed', width: 15 },
      { header: 'Collected', key: 'collected', width: 15 },
    ]
    sheet.addRows(data.byClient)
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'B')
    formatCurrencyCol(sheet, 'C')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addARAgingSheets(workbook: ExcelJS.Workbook, data: any) {
  const summary = workbook.addWorksheet('Aging Summary')
  summary.columns = [
    { header: 'Bucket', key: 'bucket', width: 25 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Count', key: 'count', width: 10 },
  ]

  const bucketLabels: Record<string, string> = {
    current: 'Current', days_1_30: '1-30 Days',
    days_31_60: '31-60 Days', days_61_90: '61-90 Days', days_90_plus: '90+ Days',
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.entries(data.buckets || {}).forEach(([key, bucket]: [string, any]) => {
    summary.addRow({ bucket: bucketLabels[key] || key, amount: bucket.total, count: bucket.count })
  })
  summary.addRow({ bucket: 'TOTAL', amount: data.summary?.totalOutstanding || 0, count: data.summary?.invoiceCount || 0 })
  styleHeaderRow(summary)
  formatCurrencyCol(summary, 'B')

  if (data.byClient?.length > 0) {
    const sheet = workbook.addWorksheet('By Client')
    sheet.columns = [
      { header: 'Client', key: 'name', width: 25 },
      { header: 'Current', key: 'current', width: 12 },
      { header: '1-30', key: 'days_1_30', width: 12 },
      { header: '31-60', key: 'days_31_60', width: 12 },
      { header: '61-90', key: 'days_61_90', width: 12 },
      { header: '90+', key: 'days_90_plus', width: 12 },
      { header: 'Total', key: 'total', width: 15 },
    ]
    sheet.addRows(data.byClient)
    styleHeaderRow(sheet)
    ;['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => formatCurrencyCol(sheet, col))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addCollectionsSheets(workbook: ExcelJS.Workbook, data: any) {
  const summary = workbook.addWorksheet('Summary')
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  summary.addRows([
    { metric: 'Total Collected', value: data.summary?.totalCollected || 0 },
    { metric: 'Payment Count', value: data.summary?.paymentCount || 0 },
    { metric: 'Average Payment', value: data.summary?.averagePayment || 0 },
  ])
  styleHeaderRow(summary)

  if (data.byMonth?.length > 0) {
    const sheet = workbook.addWorksheet('By Month')
    sheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
    ]
    sheet.addRows(data.byMonth)
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'B')
  }

  if (data.byMethod?.length > 0) {
    const sheet = workbook.addWorksheet('By Method')
    sheet.columns = [
      { header: 'Method', key: 'method', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Count', key: 'count', width: 10 },
    ]
    sheet.addRows(data.byMethod)
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'B')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addProfitabilitySheets(workbook: ExcelJS.Workbook, data: any) {
  const summary = workbook.addWorksheet('Summary')
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  summary.addRows([
    { metric: 'Cases Analyzed', value: data.summary?.casesAnalyzed || 0 },
    { metric: 'Total Billed', value: data.summary?.totalBilled || 0 },
    { metric: 'Total Collected', value: data.summary?.totalCollected || 0 },
    { metric: 'Total Hours', value: data.summary?.totalHours || 0 },
    { metric: 'Avg Revenue/Case', value: data.summary?.avgRevenuePerCase || 0 },
    { metric: 'Avg Days to Close', value: data.summary?.avgDaysToClose || 0 },
    { metric: 'Realization Rate', value: `${data.summary?.overallRealizationRate || 0}%` },
  ])
  styleHeaderRow(summary)

  if (data.cases?.length > 0) {
    const sheet = workbook.addWorksheet('Case Details')
    sheet.columns = [
      { header: 'Case #', key: 'caseNumber', width: 15 },
      { header: 'Client', key: 'clientName', width: 25 },
      { header: 'Type', key: 'caseType', width: 15 },
      { header: 'Billed', key: 'totalBilled', width: 15 },
      { header: 'Collected', key: 'totalCollected', width: 15 },
      { header: 'Hours', key: 'billableHours', width: 10 },
      { header: 'Eff. Rate', key: 'effectiveRate', width: 12 },
      { header: 'Days Open', key: 'daysOpen', width: 10 },
      { header: 'Realization', key: 'realizationRate', width: 12 },
    ]
    sheet.addRows(data.cases)
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'D')
    formatCurrencyCol(sheet, 'E')
    formatCurrencyCol(sheet, 'G')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addTrustSheets(workbook: ExcelJS.Workbook, data: any) {
  if (data.accounts?.length > 0) {
    const sheet = workbook.addWorksheet('Trust Accounts')
    sheet.columns = [
      { header: 'Client', key: 'clientName', width: 25 },
      { header: 'Case #', key: 'caseNumber', width: 15 },
      { header: 'Balance', key: 'balance', width: 15 },
      { header: 'Total Deposits', key: 'totalDeposits', width: 15 },
      { header: 'Total Withdrawals', key: 'totalWithdrawals', width: 15 },
      { header: 'Low Balance', key: 'isLowBalance', width: 12 },
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet.addRows(data.accounts.map((a: any) => ({ ...a, isLowBalance: a.isLowBalance ? 'YES' : '' })))
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'C')
    formatCurrencyCol(sheet, 'D')
    formatCurrencyCol(sheet, 'E')
  }

  if (data.recentTransactions?.length > 0) {
    const sheet = workbook.addWorksheet('Recent Transactions')
    sheet.columns = [
      { header: 'Date', key: 'transactionDate', width: 15 },
      { header: 'Client', key: 'clientName', width: 25 },
      { header: 'Type', key: 'transactionType', width: 12 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Balance After', key: 'balanceAfter', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
    ]
    sheet.addRows(data.recentTransactions)
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'D')
    formatCurrencyCol(sheet, 'E')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addAttorneySheets(workbook: ExcelJS.Workbook, data: any) {
  if (data.attorneys) {
    const sheet = workbook.addWorksheet('Team Performance')
    sheet.columns = [
      { header: 'Attorney', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Billable Hours', key: 'billableHours', width: 15 },
      { header: 'Utilization %', key: 'utilizationRate', width: 12 },
      { header: 'Revenue', key: 'revenueGenerated', width: 15 },
      { header: 'Collections', key: 'collectionsGenerated', width: 15 },
      { header: 'Active Cases', key: 'activeCases', width: 12 },
      { header: 'Cases Closed', key: 'casesClosedInPeriod', width: 12 },
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet.addRows(data.attorneys.map((a: any) => ({
      name: a.attorney?.name || a.name || 'Unknown',
      role: a.role || '',
      billableHours: a.productivity?.billableHours ?? a.billableHours ?? 0,
      utilizationRate: `${a.productivity?.utilizationRate ?? a.utilizationRate ?? 0}%`,
      revenueGenerated: a.financial?.revenueGenerated ?? a.revenueGenerated ?? 0,
      collectionsGenerated: a.financial?.collectionsGenerated ?? a.collectionsGenerated ?? 0,
      activeCases: a.caseManagement?.activeCases ?? a.activeCases ?? 0,
      casesClosedInPeriod: a.caseManagement?.casesClosedInPeriod ?? a.casesClosedInPeriod ?? 0,
    })))
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'E')
    formatCurrencyCol(sheet, 'F')
  }

  // Individual performance
  if (data.productivity) {
    const sheet = workbook.addWorksheet('Performance Details')
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 },
    ]
    sheet.addRows([
      { metric: 'Total Hours', value: data.productivity.totalHours },
      { metric: 'Billable Hours', value: data.productivity.billableHours },
      { metric: 'Non-Billable Hours', value: data.productivity.nonBillableHours },
      { metric: 'Utilization Rate', value: `${data.productivity.utilizationRate}%` },
      { metric: 'Active Cases', value: data.caseManagement?.activeCases },
      { metric: 'Cases Closed', value: data.caseManagement?.casesClosedInPeriod },
      { metric: 'Task Completion Rate', value: `${data.caseManagement?.taskCompletionRate}%` },
      { metric: 'Revenue Generated', value: data.financial?.revenueGenerated },
      { metric: 'Collections', value: data.financial?.collectionsGenerated },
      { metric: 'Avg Billing Rate', value: `$${data.financial?.averageBillingRate}/hr` },
    ])
    styleHeaderRow(sheet)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addTrendsSheets(workbook: ExcelJS.Workbook, data: any) {
  if (data.trends?.length > 0) {
    const sheet = workbook.addWorksheet('Monthly Trends')
    sheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Billable Hours', key: 'billableHours', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 15 },
    ]
    sheet.addRows(data.trends)
    styleHeaderRow(sheet)
    formatCurrencyCol(sheet, 'C')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addLifecycleSheets(workbook: ExcelJS.Workbook, data: any) {
  const summary = workbook.addWorksheet('Summary')
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  summary.addRows([
    { metric: 'Cases Analyzed', value: data.summary?.casesAnalyzed || 0 },
    { metric: 'Avg Days to Close', value: data.summary?.avgDaysToClose || 0 },
    { metric: 'Median Days to Close', value: data.summary?.medianDaysToClose || 0 },
  ])
  styleHeaderRow(summary)

  if (data.byCaseType?.length > 0) {
    const sheet = workbook.addWorksheet('By Case Type')
    sheet.columns = [
      { header: 'Case Type', key: 'caseType', width: 20 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'Avg Days', key: 'avgDays', width: 12 },
    ]
    sheet.addRows(data.byCaseType)
    styleHeaderRow(sheet)
  }

  if (data.byStage?.length > 0) {
    const sheet = workbook.addWorksheet('By Stage')
    sheet.columns = [
      { header: 'Stage', key: 'label', width: 20 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'Avg Days', key: 'avgDays', width: 12 },
    ]
    sheet.addRows(data.byStage)
    styleHeaderRow(sheet)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addOutcomesSheets(workbook: ExcelJS.Workbook, data: any) {
  const summary = workbook.addWorksheet('Summary')
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  summary.addRows([
    { metric: 'Total Cases', value: data.summary?.totalCases || 0 },
    { metric: 'Settlement Rate', value: `${data.summary?.settlementRate || 0}%` },
    { metric: 'Trial Rate', value: `${data.summary?.trialRate || 0}%` },
  ])
  styleHeaderRow(summary)

  if (data.outcomes) {
    const sheet = workbook.addWorksheet('Outcomes')
    sheet.columns = [
      { header: 'Outcome', key: 'outcome', width: 20 },
      { header: 'Count', key: 'count', width: 12 },
      { header: 'Percentage', key: 'percentage', width: 12 },
    ]
    const total = Object.values(data.outcomes as Record<string, number>).reduce((a, b) => a + b, 0)
    Object.entries(data.outcomes as Record<string, number>).forEach(([outcome, count]) => {
      sheet.addRow({
        outcome: outcome.charAt(0).toUpperCase() + outcome.slice(1),
        count,
        percentage: total > 0 ? `${Math.round((count / total) * 100)}%` : '0%',
      })
    })
    styleHeaderRow(sheet)
  }

  if (data.byCaseType?.length > 0) {
    const sheet = workbook.addWorksheet('By Case Type')
    sheet.columns = [
      { header: 'Case Type', key: 'caseType', width: 20 },
      { header: 'Settled', key: 'settled', width: 10 },
      { header: 'Trial', key: 'trial', width: 10 },
      { header: 'Dismissed', key: 'dismissed', width: 10 },
      { header: 'Default', key: 'defaultJudgment', width: 10 },
      { header: 'Other', key: 'other', width: 10 },
      { header: 'Total', key: 'total', width: 10 },
    ]
    sheet.addRows(data.byCaseType)
    styleHeaderRow(sheet)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addWorkloadSheets(workbook: ExcelJS.Workbook, data: any) {
  if (data.byAttorney?.length > 0) {
    const sheet = workbook.addWorksheet('By Attorney')
    sheet.columns = [
      { header: 'Attorney', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Cases', key: 'caseCount', width: 10 },
    ]
    sheet.addRows(data.byAttorney)
    styleHeaderRow(sheet)
  }

  if (data.unassignedCases?.length > 0) {
    const sheet = workbook.addWorksheet('Unassigned Cases')
    sheet.columns = [
      { header: 'Case #', key: 'caseNumber', width: 15 },
      { header: 'Client', key: 'clientName', width: 25 },
      { header: 'Stage', key: 'caseStage', width: 15 },
      { header: 'Created', key: 'createdAt', width: 15 },
    ]
    sheet.addRows(data.unassignedCases)
    styleHeaderRow(sheet)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addGenericSheet(workbook: ExcelJS.Workbook, data: any) {
  const sheet = workbook.addWorksheet('Data')
  if (Array.isArray(data) && data.length > 0) {
    const columns = Object.keys(data[0]).map(key => ({
      header: formatColumnHeader(key), key, width: 20,
    }))
    sheet.columns = columns
    sheet.addRows(data)
  } else if (typeof data === 'object') {
    sheet.columns = [
      { header: 'Property', key: 'property', width: 25 },
      { header: 'Value', key: 'value', width: 40 },
    ]
    Object.entries(data).forEach(([key, value]) => {
      sheet.addRow({
        property: formatColumnHeader(key),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      })
    })
  }
  styleHeaderRow(sheet)
}

// ============================================================
// CSV Export
// ============================================================

export async function exportToCSV(options: ExportOptions): Promise<Buffer> {
  const rows: string[][] = []

  rows.push(['Report:', options.reportName])
  rows.push(['Generated:', format(new Date(), 'PPpp')])
  rows.push([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = options.data as any
  if (data.summary) {
    rows.push(['Metric', 'Value'])
    Object.entries(data.summary).forEach(([key, value]) => {
      rows.push([formatColumnHeader(key), String(value)])
    })
    rows.push([])
  }

  // Find the primary array data
  const arrayKeys = Object.keys(data).filter(k => Array.isArray(data[k]) && data[k].length > 0)
  for (const key of arrayKeys) {
    const arr = data[key]
    if (arr.length > 0) {
      rows.push([formatColumnHeader(key)])
      rows.push(Object.keys(arr[0]).map(formatColumnHeader))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      arr.forEach((row: any) => {
        rows.push(Object.values(row).map(v => String(v ?? '')))
      })
      rows.push([])
    }
  }

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  return Buffer.from(csv, 'utf-8')
}

// ============================================================
// PDF Export
// ============================================================

export async function exportToPDF(options: ExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(options.reportName, { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
      .text(`Generated: ${format(new Date(), 'PPpp')}`, { align: 'center' })
    if (options.firmName) {
      doc.text(options.firmName, { align: 'center' })
    }
    doc.moveDown(1)
    doc.fillColor('#000000')

    // Filters
    if (options.filters && Object.keys(options.filters).length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text('Filters:')
      doc.font('Helvetica')
      Object.entries(options.filters).forEach(([key, value]) => {
        doc.text(`  ${formatColumnHeader(key)}: ${value}`)
      })
      doc.moveDown(1)
    }

    // Summary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = options.data as any
    if (data.summary) {
      doc.fontSize(14).font('Helvetica-Bold').text('Summary')
      doc.moveDown(0.5)
      addPDFTable(doc,
        Object.entries(data.summary).map(([key, value]) => [
          formatColumnHeader(key),
          formatPDFValue(value),
        ]),
        ['Metric', 'Value']
      )
      doc.moveDown(1)
    }

    // Add report-specific sections
    addReportSpecificPDF(doc, options)

    doc.end()
  })
}

function addPDFTable(doc: PDFKit.PDFDocument, rows: string[][], headers: string[]) {
  const startX = 50
  const columnWidth = (doc.page.width - 100) / headers.length
  let y = doc.y

  // Header
  doc.font('Helvetica-Bold').fontSize(10)
  headers.forEach((header, i) => {
    doc.text(header, startX + (i * columnWidth), y, { width: columnWidth, align: 'left' })
  })
  y += 20
  doc.moveTo(startX, y).lineTo(doc.page.width - 50, y).stroke()
  y += 5

  // Rows
  doc.font('Helvetica').fontSize(9)
  rows.forEach(row => {
    if (y > doc.page.height - 100) {
      doc.addPage()
      y = 50
    }
    row.forEach((cell, i) => {
      doc.text(String(cell), startX + (i * columnWidth), y, {
        width: columnWidth - 5,
        align: 'left',
        lineBreak: false,
      })
    })
    y += 18
  })

  doc.y = y + 10
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPDFValue(value: any): string {
  if (typeof value === 'number') {
    if (value > 1000) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    }
    return String(value)
  }
  return String(value ?? '')
}

function addReportSpecificPDF(doc: PDFKit.PDFDocument, options: ExportOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = options.data as any

  switch (options.reportType) {
    case 'revenue':
      if (data.byAttorney?.length > 0) {
        doc.addPage()
        doc.fontSize(14).font('Helvetica-Bold').text('Revenue by Attorney')
        doc.moveDown(0.5)
        addPDFTable(doc,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.byAttorney.slice(0, 15).map((a: any) => [
            a.name || 'Unknown',
            formatPDFValue(a.billed),
            formatPDFValue(a.collected),
          ]),
          ['Attorney', 'Billed', 'Collected']
        )
      }
      break

    case 'ar_aging':
      if (data.byClient?.length > 0) {
        doc.addPage()
        doc.fontSize(14).font('Helvetica-Bold').text('Aging by Client')
        doc.moveDown(0.5)
        addPDFTable(doc,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.byClient.slice(0, 20).map((c: any) => [
            c.name,
            formatPDFValue(c.current),
            formatPDFValue(c.days_90_plus),
            formatPDFValue(c.total),
          ]),
          ['Client', 'Current', '90+ Days', 'Total']
        )
      }
      break

    case 'team':
      if (data.attorneys?.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Team Performance')
        doc.moveDown(0.5)
        addPDFTable(doc,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.attorneys.map((a: any) => [
            a.attorney?.name || 'Unknown',
            `${a.productivity?.billableHours || 0}h`,
            `${a.productivity?.utilizationRate || 0}%`,
            formatPDFValue(a.financial?.revenueGenerated || 0),
          ]),
          ['Attorney', 'Billable Hours', 'Utilization', 'Revenue']
        )
      }
      break

    case 'profitability':
      if (data.cases?.length > 0) {
        doc.addPage()
        doc.fontSize(14).font('Helvetica-Bold').text('Case Profitability')
        doc.moveDown(0.5)
        addPDFTable(doc,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.cases.slice(0, 20).map((c: any) => [
            c.caseNumber || '-',
            c.clientName,
            formatPDFValue(c.totalBilled),
            `${c.billableHours}h`,
            `${c.realizationRate}%`,
          ]),
          ['Case #', 'Client', 'Billed', 'Hours', 'Realization']
        )
      }
      break
  }
}

// ============================================================
// Helpers
// ============================================================

function formatColumnHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}
