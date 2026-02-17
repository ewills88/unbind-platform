import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup } from 'pdf-lib'
import { format } from 'date-fns'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): unknown {
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }

  return current
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evaluateExpression(expr: string, data: any): boolean {
  if (expr.includes(' > ')) {
    const [left, right] = expr.split(' > ').map(s => s.trim())
    const leftVal = getNestedValue(data, left.replace('case.', ''))
    const rightVal = parseInt(right)
    return Number(leftVal) > rightVal
  }

  if (expr.includes(' == ')) {
    const [left, right] = expr.split(' == ').map(s => s.trim())
    const leftVal = getNestedValue(data, left.replace('case.', ''))
    return String(leftVal) === right.replace(/['"]/g, '')
  }

  return false
}

function resolveDataPath(
  path: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  partyType?: string
): unknown {
  // Handle special path prefixes
  if (path.startsWith('party.')) {
    const partyPath = path.replace('party.', '')
    const party = partyType === 'respondent' ? data.respondent : data.petitioner
    return getNestedValue(party, partyPath)
  }

  if (path.startsWith('case.')) {
    return getNestedValue(data, path.replace('case.', ''))
  }

  if (path.startsWith('proposal.')) {
    const latestProposal = data.proposals?.[0]
    return getNestedValue(latestProposal, path.replace('proposal.', ''))
  }

  // Handle computed expressions
  if (path.includes('>') || path.includes('==')) {
    return evaluateExpression(path, data)
  }

  return getNestedValue(data, path)
}

function buildFieldValues(
  mappings: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  caseData: any,
  partyType?: string
): Record<string, unknown> {
  const values: Record<string, unknown> = {}

  for (const [pdfField, dataPath] of Object.entries(mappings)) {
    const value = resolveDataPath(dataPath, caseData, partyType)
    if (value !== undefined && value !== null) {
      values[pdfField] = value
    }
  }

  return values
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return ''

  if (value instanceof Date) {
    return format(value, 'MM/dd/yyyy')
  }

  if (typeof value === 'string') {
    // Try to detect date strings
    const dateMatch = /^\d{4}-\d{2}-\d{2}/.test(value)
    if (dateMatch) {
      try {
        return format(new Date(value), 'MM/dd/yyyy')
      } catch {
        return value
      }
    }
    return value
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    return value.toLocaleString()
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return String(value)
}

async function downloadPdfTemplate(
  urlOrPath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<Uint8Array> {
  if (urlOrPath.startsWith('http')) {
    const response = await fetch(urlOrPath)
    return new Uint8Array(await response.arrayBuffer())
  } else {
    const { data } = await supabase.storage
      .from('form-templates')
      .download(urlOrPath)
    if (!data) throw new Error('Failed to download template')
    return new Uint8Array(await data.arrayBuffer())
  }
}

export async function fillCourtForm(params: {
  formId: string
  caseId: string
  partyType?: 'petitioner' | 'respondent'
  overrides?: Record<string, unknown>
}): Promise<{
  filledPdfBuffer: Uint8Array
  fieldValues: Record<string, unknown>
}> {
  const supabase = getServiceClient()
  if (!supabase) throw new Error('Service client not configured')

  const { formId, caseId, partyType, overrides } = params

  // Get form template
  const { data: form, error: formError } = await supabase
    .from('court_forms')
    .select('*')
    .eq('id', formId)
    .single()

  if (formError || !form) {
    throw new Error('Form not found')
  }

  // Get case data with related info
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select(`
      *,
      petitioner:profiles!attorney_id(full_name, email, phone)
    `)
    .eq('id', caseId)
    .single()

  if (caseError || !caseData) {
    throw new Error('Case not found')
  }

  // Build field values from mappings
  const fieldValues = buildFieldValues(
    form.field_mappings || {},
    caseData,
    partyType
  )

  // Apply overrides
  const finalValues = { ...fieldValues, ...(overrides || {}) }

  // Download PDF template
  const templateUrl = form.pdf_template_url || form.pdf_template_path
  if (!templateUrl) {
    throw new Error('No PDF template URL configured for this form')
  }

  let filledPdfBytes: Uint8Array

  try {
    const pdfBytes = await downloadPdfTemplate(templateUrl, supabase)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const formPdf = pdfDoc.getForm()

    // Fill fields
    for (const [fieldName, value] of Object.entries(finalValues)) {
      try {
        const field = formPdf.getField(fieldName)

        if (field instanceof PDFTextField) {
          field.setText(formatFieldValue(value))
        } else if (field instanceof PDFCheckBox) {
          if (value === true || value === 'true' || value === 'Yes') {
            field.check()
          } else {
            field.uncheck()
          }
        } else if (field instanceof PDFRadioGroup) {
          field.select(String(value))
        }
      } catch {
        // Field might not exist in PDF, continue
      }
    }

    filledPdfBytes = await pdfDoc.save()
  } catch {
    // If PDF fill fails (e.g., download error, non-fillable), return empty with values
    throw new Error('Failed to process PDF template. The form may not be fillable or the template URL may be invalid.')
  }

  return {
    filledPdfBuffer: new Uint8Array(filledPdfBytes),
    fieldValues: finalValues,
  }
}

export async function saveFilledForm(params: {
  caseId: string
  formId: string
  fieldValues: Record<string, unknown>
  pdfBuffer: Uint8Array
  overrides?: Record<string, unknown>
  userId: string
}): Promise<Record<string, unknown>> {
  const supabase = getServiceClient()
  if (!supabase) throw new Error('Service client not configured')

  const { caseId, formId, fieldValues, pdfBuffer, overrides, userId } = params

  // Get form info
  const { data: form } = await supabase
    .from('court_forms')
    .select('form_number, form_name')
    .eq('id', formId)
    .single()

  if (!form) throw new Error('Form not found')

  // Get case info
  const { data: caseData } = await supabase
    .from('cases')
    .select('firm_id, case_number')
    .eq('id', caseId)
    .single()

  if (!caseData) throw new Error('Case not found')

  // Upload filled PDF
  const caseNumber = caseData.case_number || 'draft'
  const fileName = `${form.form_number}-${caseNumber}-${Date.now()}.pdf`
  const filePath = `filled-forms/${caseId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('case-documents')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
    })

  let pdfUrl: string | null = null
  if (!uploadError) {
    const { data: urlData } = supabase.storage
      .from('case-documents')
      .getPublicUrl(filePath)
    pdfUrl = urlData?.publicUrl || null
  }

  // Create filled form record
  const { data: filledForm, error: insertError } = await supabase
    .from('filled_forms')
    .insert({
      case_id: caseId,
      firm_id: caseData.firm_id,
      form_id: formId,
      form_number: form.form_number,
      form_name: form.form_name,
      field_values: fieldValues,
      overrides: overrides || {},
      filled_pdf_path: filePath,
      filled_pdf_url: pdfUrl,
      status: 'draft',
      generated_at: new Date().toISOString(),
      generated_by: userId,
    })
    .select()
    .single()

  if (insertError) throw new Error(insertError.message)

  return filledForm
}
