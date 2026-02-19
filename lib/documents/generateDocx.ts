// Document Generation Service
// Generates .docx files from FilledDocumentData + DocumentTemplate field mappings

import {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, HeadingLevel, BorderStyle,
} from 'docx'
import type { FilledDocumentData, DocumentTemplate } from '@/types/document-templates'
import { resolveDataPath } from '@/types/document-templates'

/**
 * Resolve all field mappings from a template against filled data,
 * producing a flat { placeholder: value } map.
 */
function resolveFieldMappings(
  template: DocumentTemplate,
  filledData: FilledDocumentData
): Record<string, string> {
  const resolved: Record<string, string> = {}

  for (const [placeholder, dataPath] of Object.entries(template.field_mappings || {})) {
    const value = resolveDataPath(filledData, dataPath as string)
    if (value !== null && value !== undefined) {
      resolved[placeholder] = String(value)
    } else {
      // Use default value if available, otherwise leave blank
      const defaultVal = template.default_values?.[placeholder]
      resolved[placeholder] = defaultVal != null ? String(defaultVal) : ''
    }
  }

  return resolved
}

/**
 * Replace {{placeholder}} tokens in a string with resolved values.
 */
function interpolate(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key) => {
    return values[key] || `[${key}]`
  })
}

/**
 * Build a legal document header section.
 */
function buildHeader(template: DocumentTemplate, values: Record<string, string>): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // Court name
  const courtName = values['court_name'] || values['case.court_name'] || ''
  if (courtName) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({ text: courtName.toUpperCase(), bold: true, size: 24 }),
        ],
      })
    )
  }

  // County
  const county = values['county'] || values['case.county'] || ''
  const stateCode = values['state_code'] || values['case.state_code'] || ''
  if (county || stateCode) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${county ? `County of ${county}` : ''}${county && stateCode ? ', ' : ''}${stateCode ? `State of ${stateCode}` : ''}`,
            size: 22,
          }),
        ],
      })
    )
  }

  // Case caption
  const clientName = values['client_full_name'] || values['client.full_name'] || 'PETITIONER'
  const spouseName = values['spouse_full_name'] || values['spouse.full_name'] || 'RESPONDENT'
  const caseNumber = values['case_number'] || values['case.case_number'] || ''

  paragraphs.push(
    new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: clientName.toUpperCase(), bold: true, size: 22 }),
        new TextRun({ text: ',', size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      indent: { left: 720 },
      children: [
        new TextRun({ text: 'Petitioner,', italics: true, size: 22 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: 'v.', size: 22 }),
        ...(caseNumber ? [
          new TextRun({ text: `          Case No. ${caseNumber}`, bold: true, size: 22 }),
        ] : []),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: spouseName.toUpperCase(), bold: true, size: 22 }),
        new TextRun({ text: ',', size: 22 }),
      ],
    }),
    new Paragraph({
      indent: { left: 720 },
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'Respondent.', italics: true, size: 22 }),
      ],
    })
  )

  // Horizontal rule
  paragraphs.push(
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      },
      children: [],
    })
  )

  return paragraphs
}

/**
 * Build the document title section.
 */
function buildTitle(template: DocumentTemplate, values: Record<string, string>): Paragraph[] {
  const title = values['document_title'] || template.template_name || 'LEGAL DOCUMENT'
  const formNumber = template.form_number

  const paragraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: title.toUpperCase(), bold: true, size: 26, underline: {} }),
      ],
    }),
  ]

  if (formNumber) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: `(Form ${formNumber})`, size: 20, italics: true }),
        ],
      })
    )
  }

  return paragraphs
}

/**
 * Build body paragraphs from template conditional_sections or a default body.
 */
function buildBody(
  template: DocumentTemplate,
  filledData: FilledDocumentData,
  values: Record<string, string>
): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const sections = template.conditional_sections || {}

  // If we have conditional sections defined, render them
  const sectionKeys = Object.keys(sections)
  if (sectionKeys.length > 0) {
    for (const sectionKey of sectionKeys) {
      const section = sections[sectionKey]

      // Check condition
      if (section.condition) {
        const condValue = resolveDataPath(filledData, section.condition)
        if (!condValue) continue
      }

      // Section heading
      if (section.title) {
        paragraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({ text: interpolate(section.title, values), bold: true, size: 24 }),
            ],
          })
        )
      }

      // Section content
      if (section.content) {
        const content = interpolate(section.content, values)
        const lines = content.split('\n').filter(l => l.trim())

        for (const line of lines) {
          paragraphs.push(
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({ text: line.trim(), size: 22 }),
              ],
            })
          )
        }
      }
    }
  } else {
    // Default body: list all filled data as structured sections
    paragraphs.push(buildInfoSection('PETITIONER INFORMATION', [
      { label: 'Name', value: values['client_full_name'] || values['client.full_name'] },
      { label: 'Address', value: values['client_address'] || values['client.address'] },
      { label: 'Phone', value: values['client_phone'] || values['client.phone'] },
      { label: 'Email', value: values['client_email'] || values['client.email'] },
    ]))

    paragraphs.push(buildInfoSection('RESPONDENT INFORMATION', [
      { label: 'Name', value: values['spouse_full_name'] || values['spouse.full_name'] },
      { label: 'Address', value: values['spouse_address'] || values['spouse.address'] },
    ]))

    paragraphs.push(buildInfoSection('CASE INFORMATION', [
      { label: 'Case Number', value: values['case_number'] || values['case.case_number'] },
      { label: 'Date of Marriage', value: values['marriage_date'] || values['case.marriage_date'] },
      { label: 'Date of Separation', value: values['separation_date'] || values['case.separation_date'] },
      { label: 'County', value: values['county'] || values['case.county'] },
    ]))

    if (filledData.children?.count && filledData.children.count > 0) {
      const childRows = (filledData.children.names || []).map((name, i) => ({
        label: `Child ${i + 1}`,
        value: `${name}${filledData.children?.ages?.[i] ? `, age ${filledData.children.ages[i]}` : ''}`,
      }))
      paragraphs.push(buildInfoSection('CHILDREN', childRows))
    }

    paragraphs.push(buildInfoSection('ATTORNEY INFORMATION', [
      { label: 'Name', value: values['attorney_full_name'] || values['attorney.full_name'] },
      { label: 'Bar Number', value: values['attorney_bar_number'] || values['attorney.bar_number'] },
      { label: 'Firm', value: values['attorney_firm_name'] || values['attorney.firm_name'] },
      { label: 'Phone', value: values['attorney_phone'] || values['attorney.phone'] },
    ]))
  }

  return paragraphs.flat()
}

/**
 * Helper to create a labeled info section.
 */
function buildInfoSection(
  title: string,
  fields: { label: string; value?: string }[]
): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({ text: title, bold: true, size: 24 }),
      ],
    }),
  ]

  for (const field of fields) {
    if (field.value) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${field.label}: `, bold: true, size: 22 }),
            new TextRun({ text: field.value, size: 22 }),
          ],
        })
      )
    }
  }

  return paragraphs
}

/**
 * Build signature block at the end of the document.
 */
function buildSignatureBlock(values: Record<string, string>): Paragraph[] {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return [
    new Paragraph({ spacing: { before: 600 }, children: [] }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `Date: ${today}`, size: 22 }),
      ],
    }),
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: '____________________________________', size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: values['attorney_full_name'] || values['attorney.full_name'] || 'Attorney for Petitioner',
          size: 22,
        }),
      ],
    }),
    ...(values['attorney_bar_number'] || values['attorney.bar_number'] ? [
      new Paragraph({
        children: [
          new TextRun({
            text: `State Bar No. ${values['attorney_bar_number'] || values['attorney.bar_number']}`,
            size: 20,
            italics: true,
          }),
        ],
      }),
    ] : []),
  ]
}

/**
 * Generate a .docx Buffer from a DocumentTemplate and FilledDocumentData.
 */
export async function generateDocxBuffer(
  template: DocumentTemplate,
  filledData: FilledDocumentData
): Promise<Buffer> {
  const values = resolveFieldMappings(template, filledData)

  const doc = new Document({
    creator: 'Unbind Legal Platform',
    title: template.template_name,
    description: template.description || undefined,
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 24 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          ...buildHeader(template, values),
          ...buildTitle(template, values),
          ...buildBody(template, filledData, values),
          ...buildSignatureBlock(values),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}
