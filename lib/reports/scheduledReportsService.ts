// Session 19 CP3: Scheduled Reports Service
// Next run calculation, report execution, and email delivery

import { createClient } from '@supabase/supabase-js'
import { addDays, addWeeks, addMonths, format } from 'date-fns'
import {
  getRevenueReport, getARAgingReport, getCollectionsReport,
  getProfitabilityReport, getTrustAccountReport,
} from '@/lib/analytics/financialAnalytics'
import {
  getAttorneyPerformance, getTeamPerformance, getProductivityTrends,
} from '@/lib/analytics/attorneyAnalytics'
import {
  getCaseLifecycleAnalysis, getCaseOutcomesAnalysis, getWorkloadAnalysis,
} from '@/lib/analytics/caseAnalytics'
import { exportToExcel, exportToCSV, exportToPDF } from './exportService'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface ScheduledReportRow {
  id: string
  firm_id: string
  template_id: string | null
  report_type: string
  schedule_name: string
  description: string | null
  frequency: string
  day_of_week: number
  day_of_month: number
  time_of_day: string
  timezone: string
  recipients: string[]
  export_format: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: Record<string, any>
  include_charts: boolean
  is_active: boolean
  last_run_at: string | null
  last_run_status: string | null
  next_run_at: string | null
  run_count: number
  created_by: string
}

// ============================================================
// Calculate Next Run Time
// ============================================================

export function calculateNextRun(schedule: {
  frequency: string
  day_of_week?: number
  day_of_month?: number
  time_of_day?: string
}): Date {
  const now = new Date()
  const [hours, minutes] = (schedule.time_of_day || '08:00').split(':').map(Number)

  let nextRun: Date

  switch (schedule.frequency) {
    case 'daily':
      nextRun = new Date(now)
      nextRun.setHours(hours, minutes, 0, 0)
      if (nextRun <= now) nextRun = addDays(nextRun, 1)
      break

    case 'weekly': {
      const dayOfWeek = schedule.day_of_week ?? 1
      nextRun = new Date(now)
      const currentDay = nextRun.getDay()
      const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7
      nextRun = addDays(nextRun, daysUntil)
      nextRun.setHours(hours, minutes, 0, 0)
      if (nextRun <= now) nextRun = addWeeks(nextRun, 1)
      break
    }

    case 'biweekly': {
      const dayOfWeek2 = schedule.day_of_week ?? 1
      nextRun = new Date(now)
      const currentDay2 = nextRun.getDay()
      const daysUntil2 = (dayOfWeek2 - currentDay2 + 7) % 7 || 7
      nextRun = addDays(nextRun, daysUntil2)
      nextRun.setHours(hours, minutes, 0, 0)
      if (nextRun <= now) nextRun = addWeeks(nextRun, 2)
      break
    }

    case 'monthly': {
      const dayOfMonth = schedule.day_of_month ?? 1
      nextRun = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
      nextRun.setHours(hours, minutes, 0, 0)
      if (nextRun <= now) nextRun = addMonths(nextRun, 1)
      break
    }

    case 'quarterly': {
      const dayOfMonth2 = schedule.day_of_month ?? 1
      const currentQuarter = Math.floor(now.getMonth() / 3)
      nextRun = new Date(now.getFullYear(), (currentQuarter + 1) * 3, dayOfMonth2)
      nextRun.setHours(hours, minutes, 0, 0)
      if (nextRun <= now) {
        nextRun = new Date(now.getFullYear(), (currentQuarter + 2) * 3, dayOfMonth2)
        nextRun.setHours(hours, minutes, 0, 0)
      }
      break
    }

    default:
      nextRun = addDays(now, 1)
      nextRun.setHours(hours, minutes, 0, 0)
  }

  return nextRun
}

// ============================================================
// Dynamic Date Range from Filters
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDateRangeFromFilters(filters: any): { start: Date; end: Date } {
  const now = new Date()
  switch (filters?.date_range) {
    case 'last_week': return { start: addDays(now, -7), end: now }
    case 'last_month': return { start: addMonths(now, -1), end: now }
    case 'last_quarter': return { start: addMonths(now, -3), end: now }
    case 'last_year': return { start: addMonths(now, -12), end: now }
    case 'mtd': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    case 'ytd': return { start: new Date(now.getFullYear(), 0, 1), end: now }
    default: return { start: addMonths(now, -1), end: now }
  }
}

// ============================================================
// Run a Scheduled Report
// ============================================================

export async function runScheduledReport(scheduleId: string): Promise<{
  success: boolean
  runId?: string
  error?: string
}> {
  const supabase = getServiceClient()

  const { data: schedule } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (!schedule) {
    return { success: false, error: 'Schedule not found' }
  }

  try {
    // Get firm name
    const { data: firm } = await supabase
      .from('firms')
      .select('name')
      .eq('id', schedule.firm_id)
      .single()

    // Get date range
    const dateRange = getDateRangeFromFilters(schedule.filters)

    // Fetch report data
    const reportData = await fetchReportData(
      schedule.firm_id,
      schedule.report_type,
      dateRange,
      schedule.filters
    )

    // Generate export
    let fileBuffer: Buffer
    let contentType: string
    let fileExtension: string
    const exportOptions = {
      format: schedule.export_format as 'pdf' | 'excel' | 'csv',
      reportName: schedule.schedule_name,
      reportType: schedule.report_type,
      data: reportData,
      filters: {
        ...schedule.filters,
        dateRange: `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
      },
      firmName: firm?.name,
      includeCharts: schedule.include_charts,
    }

    switch (schedule.export_format) {
      case 'excel':
        fileBuffer = await exportToExcel(exportOptions)
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        fileExtension = 'xlsx'
        break
      case 'csv':
        fileBuffer = await exportToCSV(exportOptions)
        contentType = 'text/csv'
        fileExtension = 'csv'
        break
      default:
        fileBuffer = await exportToPDF(exportOptions)
        contentType = 'application/pdf'
        fileExtension = 'pdf'
    }

    // Upload to storage
    const fileName = `${schedule.schedule_name.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.${fileExtension}`
    const filePath = `reports/${schedule.firm_id}/${scheduleId}/${fileName}`

    await supabase.storage
      .from('report-exports')
      .upload(filePath, fileBuffer, { contentType, upsert: true })

    const { data: urlData } = supabase.storage
      .from('report-exports')
      .getPublicUrl(filePath)

    // Create report run record
    const { data: runRecord } = await supabase
      .from('report_runs')
      .insert({
        template_id: schedule.template_id,
        report_type: schedule.report_type,
        firm_id: schedule.firm_id,
        report_name: schedule.schedule_name,
        filters_used: { ...schedule.filters, dateRange },
        row_count: countDataRows(reportData),
        data_snapshot: reportData,
        export_format: schedule.export_format,
        file_path: filePath,
        file_url: urlData.publicUrl,
        run_by: schedule.created_by,
        run_at: new Date().toISOString(),
      })
      .select()
      .single()

    // Send emails to recipients
    if (schedule.recipients?.length > 0 && runRecord) {
      await sendReportEmails({
        scheduleId: schedule.id,
        runId: runRecord.id,
        recipients: schedule.recipients,
        reportName: schedule.schedule_name,
        fileUrl: urlData.publicUrl,
        fileName,
        fileBuffer,
      })
    }

    // Update schedule with next run
    const nextRun = calculateNextRun(schedule)
    await supabase
      .from('scheduled_reports')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: 'success',
        next_run_at: nextRun.toISOString(),
        run_count: (schedule.run_count || 0) + 1,
      })
      .eq('id', scheduleId)

    return { success: true, runId: runRecord?.id }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await supabase
      .from('scheduled_reports')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: `error: ${msg}`,
      })
      .eq('id', scheduleId)

    return { success: false, error: msg }
  }
}

// ============================================================
// Fetch Report Data
// ============================================================

async function fetchReportData(
  firmId: string,
  reportType: string,
  dateRange: { start: Date; end: Date },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const financialFilters = { dateRange }
  const caseFilters = { dateRange }

  switch (reportType) {
    case 'revenue': return getRevenueReport(firmId, financialFilters)
    case 'ar_aging': return getARAgingReport(firmId)
    case 'collections': return getCollectionsReport(firmId, financialFilters)
    case 'profitability': return getProfitabilityReport(firmId, financialFilters)
    case 'trust': return getTrustAccountReport(firmId)
    case 'performance':
      if (filters?.attorney_id) {
        return getAttorneyPerformance(firmId, filters.attorney_id, dateRange)
      }
      return getTeamPerformance(firmId, dateRange)
    case 'team': return getTeamPerformance(firmId, dateRange)
    case 'trends': return getProductivityTrends(firmId, filters?.attorney_id, 6)
    case 'lifecycle': return getCaseLifecycleAnalysis(firmId, caseFilters)
    case 'outcomes': return getCaseOutcomesAnalysis(firmId, caseFilters)
    case 'workload': return getWorkloadAnalysis(firmId)
    default: throw new Error(`Unknown report type: ${reportType}`)
  }
}

// ============================================================
// Send Report Emails
// ============================================================

async function sendReportEmails(params: {
  scheduleId: string
  runId: string
  recipients: string[]
  reportName: string
  fileUrl: string
  fileName: string
  fileBuffer: Buffer
}) {
  // Only send if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured, skipping email delivery')
    return
  }

  const db = getServiceClient()
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'reports@unbind.app'

  for (const recipient of params.recipients) {
    try {
      const { data: emailResult } = await resend.emails.send({
        from: `Unbind Reports <${fromEmail}>`,
        to: recipient,
        subject: `Scheduled Report: ${params.reportName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">${params.reportName}</h2>
            <p style="color: #4b5563;">Your scheduled report is ready.</p>
            <p style="color: #6b7280; font-size: 14px;">Generated: ${format(new Date(), 'PPpp')}</p>
            <p style="margin: 24px 0;">
              <a href="${params.fileUrl}" style="
                display: inline-block; padding: 12px 24px;
                background-color: #4F46E5; color: white;
                text-decoration: none; border-radius: 6px; font-weight: 600;
              ">Download Report</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              This report was automatically generated by Unbind.
            </p>
          </div>
        `,
        attachments: [{
          filename: params.fileName,
          content: params.fileBuffer,
        }],
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from('report_deliveries').insert({
        scheduled_report_id: params.scheduleId,
        run_id: params.runId,
        recipients: [recipient],
        delivery_status: 'sent',
        file_url: params.fileUrl,
        file_size: params.fileBuffer.length,
        email_message_id: emailResult?.id,
        delivered_at: new Date().toISOString(),
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from('report_deliveries').insert({
        scheduled_report_id: params.scheduleId,
        run_id: params.runId,
        recipients: [recipient],
        delivery_status: 'failed',
        error_message: msg,
      })
    }
  }
}

// ============================================================
// Helpers
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countDataRows(data: any): number {
  if (Array.isArray(data)) return data.length
  if (data.cases) return data.cases.length
  if (data.attorneys) return data.attorneys.length
  if (data.byAttorney) return data.byAttorney.length
  if (data.accounts) return data.accounts.length
  return 0
}
