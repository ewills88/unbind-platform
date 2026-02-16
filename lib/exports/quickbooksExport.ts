// QuickBooks Export Service
// Session 15: Generate CSV, IIF, and QBO exports from billing data

import { createClient } from '@supabase/supabase-js'
import { ExportFormat } from '@/types/webhooks'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ExportOptions {
  userId: string
  firmId: string | null
  startDate: string
  endDate: string
  format: ExportFormat
  includeInvoices: boolean
  includePayments: boolean
  includeTimeEntries: boolean
}

interface InvoiceRecord {
  type: 'invoice'
  invoice_number: string
  issue_date: string
  due_date: string
  client_name: string
  case_number: string | null
  total_amount: number
  status: string
}

interface PaymentRecord {
  type: 'payment'
  id: string
  payment_date: string
  invoice_number: string
  client_name: string
  amount: number
  payment_method: string
}

interface TimeEntryRecord {
  type: 'time_entry'
  entry_date: string
  attorney_name: string
  case_number: string | null
  client_name: string
  duration_minutes: number
  hourly_rate: number
  amount: number
  description: string
}

type ExportRecord = InvoiceRecord | PaymentRecord | TimeEntryRecord

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateIIF(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function formatDateOFX(date: Date): string {
  return date.toISOString().replace(/[-:T.Z]/g, '').substring(0, 14)
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Fetch billing data for export based on user's cases.
 */
async function fetchExportData(options: ExportOptions): Promise<ExportRecord[]> {
  const supabase = getServiceClient()
  const records: ExportRecord[] = []

  // Get cases the user has access to (as attorney or via assignments)
  const caseIds: string[] = []

  const { data: ownCases } = await supabase
    .from('cases')
    .select('id')
    .eq('attorney_id', options.userId)

  if (ownCases) {
    for (const c of ownCases) caseIds.push(c.id)
  }

  const { data: assignments } = await supabase
    .from('case_assignments')
    .select('case_id')
    .eq('user_id', options.userId)

  if (assignments) {
    for (const a of assignments) {
      if (!caseIds.includes(a.case_id)) caseIds.push(a.case_id)
    }
  }

  if (caseIds.length === 0) return records

  // Fetch invoices
  if (options.includeInvoices) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_number, issue_date, due_date, total_amount, status, case_id')
      .in('case_id', caseIds)
      .gte('issue_date', options.startDate)
      .lte('issue_date', options.endDate)
      .order('issue_date', { ascending: true })

    if (invoices && invoices.length > 0) {
      // Batch fetch case info
      const invoiceCaseIds = Array.from(new Set(invoices.map(i => i.case_id)))
      const { data: cases } = await supabase
        .from('cases')
        .select('id, case_number, client_name')
        .in('id', invoiceCaseIds)

      const caseMap: Record<string, { case_number: string | null; client_name: string }> = {}
      for (const c of cases || []) caseMap[c.id] = c

      for (const inv of invoices) {
        const caseInfo = caseMap[inv.case_id]
        records.push({
          type: 'invoice',
          invoice_number: inv.invoice_number,
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          client_name: caseInfo?.client_name || 'Unknown',
          case_number: caseInfo?.case_number || null,
          total_amount: Number(inv.total_amount),
          status: inv.status,
        })
      }
    }
  }

  // Fetch payments
  if (options.includePayments) {
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, payment_method, payment_date, status, invoice_id')
      .eq('status', 'succeeded')
      .gte('payment_date', options.startDate)
      .lte('payment_date', options.endDate)
      .order('payment_date', { ascending: true })

    if (payments && payments.length > 0) {
      // Batch fetch invoice + case info
      const invoiceIds = Array.from(new Set(payments.map(p => p.invoice_id)))
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, case_id')
        .in('id', invoiceIds)

      const invoiceMap: Record<string, { invoice_number: string; case_id: string }> = {}
      for (const inv of invoices || []) invoiceMap[inv.id] = inv

      const paymentCaseIds = Array.from(new Set((invoices || []).map(i => i.case_id)))
      const relevantCaseIds = paymentCaseIds.filter(id => caseIds.includes(id))

      if (relevantCaseIds.length > 0) {
        const { data: cases } = await supabase
          .from('cases')
          .select('id, case_number, client_name')
          .in('id', relevantCaseIds)

        const caseMap: Record<string, { case_number: string | null; client_name: string }> = {}
        for (const c of cases || []) caseMap[c.id] = c

        for (const pay of payments) {
          const invInfo = invoiceMap[pay.invoice_id]
          if (!invInfo || !caseIds.includes(invInfo.case_id)) continue

          const caseInfo = caseMap[invInfo.case_id]
          records.push({
            type: 'payment',
            id: pay.id,
            payment_date: pay.payment_date,
            invoice_number: invInfo.invoice_number,
            client_name: caseInfo?.client_name || 'Unknown',
            amount: Number(pay.amount),
            payment_method: pay.payment_method,
          })
        }
      }
    }
  }

  // Fetch time entries
  if (options.includeTimeEntries) {
    const { data: entries } = await supabase
      .from('time_entries')
      .select('entry_date, duration_minutes, hourly_rate, amount, description, billable, case_id, attorney_id')
      .in('case_id', caseIds)
      .eq('billable', true)
      .gte('entry_date', options.startDate)
      .lte('entry_date', options.endDate)
      .order('entry_date', { ascending: true })

    if (entries && entries.length > 0) {
      const entryCaseIds = Array.from(new Set(entries.map(e => e.case_id)))
      const entryAttorneyIds = Array.from(new Set(entries.map(e => e.attorney_id)))

      const { data: cases } = await supabase
        .from('cases')
        .select('id, case_number, client_name')
        .in('id', entryCaseIds)

      const caseMap: Record<string, { case_number: string | null; client_name: string }> = {}
      for (const c of cases || []) caseMap[c.id] = c

      const { data: attorneys } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', entryAttorneyIds)

      const attorneyMap: Record<string, string> = {}
      for (const a of attorneys || []) attorneyMap[a.id] = a.full_name || 'Unknown'

      for (const entry of entries) {
        const caseInfo = caseMap[entry.case_id]
        records.push({
          type: 'time_entry',
          entry_date: entry.entry_date,
          attorney_name: attorneyMap[entry.attorney_id] || 'Unknown',
          case_number: caseInfo?.case_number || null,
          client_name: caseInfo?.client_name || 'Unknown',
          duration_minutes: entry.duration_minutes,
          hourly_rate: Number(entry.hourly_rate),
          amount: Number(entry.amount),
          description: entry.description,
        })
      }
    }
  }

  return records
}

// ─── Format Generators ───────────────────────────────────────

function generateCSV(records: ExportRecord[]): string {
  const invoices = records.filter((r): r is InvoiceRecord => r.type === 'invoice')
  const payments = records.filter((r): r is PaymentRecord => r.type === 'payment')
  const timeEntries = records.filter((r): r is TimeEntryRecord => r.type === 'time_entry')

  let csv = ''

  if (invoices.length > 0) {
    csv += 'INVOICES\n'
    csv += 'Invoice #,Date,Due Date,Client,Case #,Amount,Status\n'
    for (const inv of invoices) {
      csv += `${escapeCSV(inv.invoice_number)},${formatDateShort(inv.issue_date)},${formatDateShort(inv.due_date)},`
      csv += `${escapeCSV(inv.client_name)},${escapeCSV(inv.case_number)},`
      csv += `${inv.total_amount.toFixed(2)},${inv.status}\n`
    }
    csv += '\n'
  }

  if (payments.length > 0) {
    csv += 'PAYMENTS\n'
    csv += 'Date,Invoice #,Client,Amount,Method\n'
    for (const pay of payments) {
      csv += `${formatDateShort(pay.payment_date)},${escapeCSV(pay.invoice_number)},`
      csv += `${escapeCSV(pay.client_name)},${pay.amount.toFixed(2)},`
      csv += `${pay.payment_method}\n`
    }
    csv += '\n'
  }

  if (timeEntries.length > 0) {
    csv += 'TIME ENTRIES\n'
    csv += 'Date,Attorney,Case #,Client,Hours,Rate,Amount,Description\n'
    for (const te of timeEntries) {
      const hours = te.duration_minutes / 60
      csv += `${formatDateShort(te.entry_date)},${escapeCSV(te.attorney_name)},`
      csv += `${escapeCSV(te.case_number)},${escapeCSV(te.client_name)},`
      csv += `${hours.toFixed(2)},${te.hourly_rate.toFixed(2)},${te.amount.toFixed(2)},`
      csv += `${escapeCSV(te.description)}\n`
    }
  }

  return csv
}

function generateIIF(records: ExportRecord[]): string {
  let iif = ''

  // IIF header
  iif += '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n'
  iif += '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n'
  iif += '!ENDTRNS\n'

  const invoices = records.filter((r): r is InvoiceRecord => r.type === 'invoice')
  for (const inv of invoices) {
    iif += `TRNS\tINVOICE\t${formatDateIIF(inv.issue_date)}\t`
    iif += `Accounts Receivable\t${inv.client_name}\t`
    iif += `${inv.total_amount.toFixed(2)}\tInvoice #${inv.invoice_number}\n`

    iif += `SPL\tINVOICE\t${formatDateIIF(inv.issue_date)}\t`
    iif += `Legal Services Revenue\t${inv.client_name}\t`
    iif += `-${inv.total_amount.toFixed(2)}\tCase #${inv.case_number || 'N/A'}\n`

    iif += 'ENDTRNS\n'
  }

  const payments = records.filter((r): r is PaymentRecord => r.type === 'payment')
  for (const pay of payments) {
    iif += `TRNS\tPAYMENT\t${formatDateIIF(pay.payment_date)}\t`
    iif += `Checking\t${pay.client_name}\t`
    iif += `${pay.amount.toFixed(2)}\tPayment for Invoice #${pay.invoice_number}\n`

    iif += `SPL\tPAYMENT\t${formatDateIIF(pay.payment_date)}\t`
    iif += `Accounts Receivable\t${pay.client_name}\t`
    iif += `-${pay.amount.toFixed(2)}\t\n`

    iif += 'ENDTRNS\n'
  }

  return iif
}

function generateQBO(records: ExportRecord[]): string {
  const now = new Date()
  const payments = records.filter((r): r is PaymentRecord => r.type === 'payment')

  let qbo = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${formatDateOFX(now)}
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>999999999
<ACCTID>UNBIND-EXPORT
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
`

  for (const pay of payments) {
    qbo += `<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>${formatDateOFX(new Date(pay.payment_date))}
<TRNAMT>${pay.amount.toFixed(2)}
<FITID>${pay.id}
<NAME>${pay.client_name.substring(0, 32)}
<MEMO>Invoice #${pay.invoice_number}
</STMTTRN>
`
  }

  qbo += `</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`

  return qbo
}

// ─── Main Export Function ────────────────────────────────────

export async function generateQuickBooksExport(options: ExportOptions): Promise<{
  content: string
  fileName: string
  recordCount: number
  contentType: string
}> {
  const supabase = getServiceClient()
  const records = await fetchExportData(options)

  const dateLabel = `${options.startDate}_to_${options.endDate}`
  let content: string
  let fileName: string
  let contentType: string

  switch (options.format) {
    case 'iif':
      content = generateIIF(records)
      fileName = `unbind-export-${dateLabel}.iif`
      contentType = 'text/plain'
      break
    case 'qbo':
      content = generateQBO(records)
      fileName = `unbind-export-${dateLabel}.qbo`
      contentType = 'text/plain'
      break
    case 'csv':
    default:
      content = generateCSV(records)
      fileName = `unbind-export-${dateLabel}.csv`
      contentType = 'text/csv'
      break
  }

  // Log the export
  await supabase.from('accounting_exports').insert({
    firm_id: options.firmId,
    user_id: options.userId,
    export_type: options.format,
    date_range_start: options.startDate,
    date_range_end: options.endDate,
    include_invoices: options.includeInvoices,
    include_payments: options.includePayments,
    include_time_entries: options.includeTimeEntries,
    record_count: records.length,
    file_name: fileName,
  })

  return { content, fileName, recordCount: records.length, contentType }
}
