import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, Packer,
  BorderStyle,
} from 'docx'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ caseId: string }>
}

const PRIVILEGE_LABELS: Record<string, string> = {
  attorney_client: 'Attorney-Client',
  work_product: 'Work Product',
  joint_defense: 'Joint Defense',
  spousal: 'Spousal',
  therapist_patient: 'Therapist-Patient',
  other: 'Other',
}

// GET /api/cases/[caseId]/privilege-log/export - Export privilege log
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    // Fetch entries
    const { data: entries, error } = await supabase
      .from('privilege_log_entries')
      .select('*')
      .eq('case_id', caseId)
      .order('entry_number', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch case info for document title
    const { data: caseData } = await supabase
      .from('cases')
      .select('case_number, client_name, spouse_name')
      .eq('id', caseId)
      .single()

    const caseName = caseData
      ? `${caseData.client_name || 'Party'} v. ${caseData.spouse_name || 'Party'}`
      : 'Unknown Case'

    if (format === 'csv') {
      return exportCSV(entries || [], caseName)
    }

    return exportDocx(entries || [], caseName, caseData?.case_number || '')
  } catch (error) {
    console.error('Privilege log export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function exportCSV(entries: Record<string, unknown>[], caseName: string): NextResponse {
  const headers = [
    'Entry #', 'Document Date', 'Document Description', 'Document Type',
    'Author', 'Recipients', 'Privilege Type', 'Privilege Basis',
    'Bates Begin', 'Bates End', 'Redacted', 'Produced in Redacted Form',
  ]

  const rows = entries.map(e => [
    e.entry_number,
    e.document_date || '',
    `"${String(e.document_description || '').replace(/"/g, '""')}"`,
    e.document_type || '',
    `"${String(e.author || '').replace(/"/g, '""')}"`,
    `"${String(e.recipients || '').replace(/"/g, '""')}"`,
    PRIVILEGE_LABELS[e.privilege_type as string] || e.privilege_type,
    `"${String(e.privilege_basis || '').replace(/"/g, '""')}"`,
    e.bates_begin || '',
    e.bates_end || '',
    e.redacted ? 'Yes' : 'No',
    e.produced_in_redacted_form ? 'Yes' : 'No',
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

  const fileName = `Privilege Log - ${caseName}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}

async function exportDocx(
  entries: Record<string, unknown>[],
  caseName: string,
  caseNumber: string,
): Promise<NextResponse> {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  }
  const cellBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  }

  // Header row
  const headerCells = ['#', 'Date', 'Description', 'Author/Recipients', 'Privilege', 'Basis', 'Bates']
    .map(text => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18 })],
      })],
      borders: cellBorders,
      width: { size: 100 / 7, type: WidthType.PERCENTAGE },
    }))

  const headerRow = new TableRow({ children: headerCells })

  // Data rows
  const dataRows = entries.map(e => {
    const cells = [
      String(e.entry_number || ''),
      String(e.document_date || ''),
      String(e.document_description || ''),
      [e.author, e.recipients].filter(Boolean).join(' / '),
      PRIVILEGE_LABELS[e.privilege_type as string] || String(e.privilege_type || ''),
      String(e.privilege_basis || ''),
      [e.bates_begin, e.bates_end].filter(Boolean).join(' - '),
    ]

    return new TableRow({
      children: cells.map(text => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, size: 18 })],
        })],
        borders: cellBorders,
        width: { size: 100 / 7, type: WidthType.PERCENTAGE },
      })),
    })
  })

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
          size: { orientation: 'landscape' as unknown as undefined },
        },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'PRIVILEGE LOG', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: caseName, size: 22 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Case No.: ${caseNumber}`, size: 22 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)

  const fileName = `Privilege Log - ${caseName}.docx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
