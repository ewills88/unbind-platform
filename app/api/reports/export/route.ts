import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import {
  getRevenueReport, getARAgingReport, getCollectionsReport,
  getProfitabilityReport, getTrustAccountReport,
} from '@/lib/analytics/financialAnalytics'
import {
  getTeamPerformance, getAttorneyPerformance, getProductivityTrends,
} from '@/lib/analytics/attorneyAnalytics'
import {
  getCaseLifecycleAnalysis, getCaseOutcomesAnalysis, getWorkloadAnalysis,
} from '@/lib/analytics/caseAnalytics'
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/reports/exportService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/reports/export — generate and download a report export
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const firmId = profile.current_firm_id
    const body = await request.json()
    const { report_type, export_format, filters, report_name } = body

    if (!report_type || !export_format) {
      return NextResponse.json({ error: 'report_type and export_format are required' }, { status: 400 })
    }

    // Get firm name
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: firm } = await serviceClient
      .from('firms')
      .select('name')
      .eq('id', firmId)
      .single()

    // Build date range from filters
    const dateRange = filters?.start_date && filters?.end_date
      ? { start: new Date(filters.start_date), end: new Date(filters.end_date) }
      : undefined

    // Fetch report data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reportData: any
    switch (report_type) {
      case 'revenue': reportData = await getRevenueReport(firmId, { dateRange }); break
      case 'ar_aging': reportData = await getARAgingReport(firmId); break
      case 'collections': reportData = await getCollectionsReport(firmId, { dateRange }); break
      case 'profitability': reportData = await getProfitabilityReport(firmId, { dateRange }); break
      case 'trust': reportData = await getTrustAccountReport(firmId); break
      case 'team': reportData = await getTeamPerformance(firmId, dateRange); break
      case 'performance':
        if (filters?.attorney_id) {
          reportData = await getAttorneyPerformance(firmId, filters.attorney_id, dateRange)
        } else {
          reportData = await getTeamPerformance(firmId, dateRange)
        }
        break
      case 'trends': reportData = await getProductivityTrends(firmId, filters?.attorney_id, 6); break
      case 'lifecycle': reportData = await getCaseLifecycleAnalysis(firmId, { dateRange }); break
      case 'outcomes': reportData = await getCaseOutcomesAnalysis(firmId, { dateRange }); break
      case 'workload': reportData = await getWorkloadAnalysis(firmId); break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    // Generate export
    const exportOptions = {
      format: export_format as 'pdf' | 'excel' | 'csv',
      reportName: report_name || `${report_type}_report`,
      reportType: report_type,
      data: reportData,
      filters,
      firmName: firm?.name,
    }

    let fileBuffer: Buffer
    let contentType: string
    let fileExtension: string

    switch (export_format) {
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
    const fileName = `${report_type}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.${fileExtension}`
    const filePath = `exports/${firmId}/${fileName}`

    await serviceClient.storage
      .from('report-exports')
      .upload(filePath, fileBuffer, { contentType, upsert: true })

    const { data: urlData } = serviceClient.storage
      .from('report-exports')
      .getPublicUrl(filePath)

    // Create run record
    await serviceClient.from('report_runs').insert({
      report_type,
      firm_id: firmId,
      report_name: report_name || report_type,
      filters_used: filters || {},
      row_count: 0,
      data_snapshot: {},
      export_format,
      file_path: filePath,
      file_url: urlData.publicUrl,
      run_by: user.id,
      run_at: new Date().toISOString(),
    })

    return NextResponse.json({
      url: urlData.publicUrl,
      fileName,
      format: export_format,
      size: fileBuffer.length,
    })
  } catch (error) {
    console.error('Report export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
