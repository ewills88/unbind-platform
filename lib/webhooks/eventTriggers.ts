// Webhook Event Triggers
// Session 15: Functions to call when platform events occur, wiring deferred

import { createClient } from '@supabase/supabase-js'
import { triggerWebhooks } from './webhookService'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getFirmIdForCase(caseId: string): Promise<string | null> {
  const supabase = getServiceClient()
  // Get firm via case attorney's firm membership
  const { data: caseData } = await supabase
    .from('cases')
    .select('attorney_id')
    .eq('id', caseId)
    .single()

  if (!caseData?.attorney_id) return null

  const { data: member } = await supabase
    .from('firm_members')
    .select('firm_id')
    .eq('user_id', caseData.attorney_id)
    .eq('status', 'active')
    .single()

  return member?.firm_id || null
}

export async function onWebhookCaseCreated(caseId: string, caseNumber: string | null, clientName: string, caseType: string | null) {
  const firmId = await getFirmIdForCase(caseId)
  if (!firmId) return

  await triggerWebhooks(firmId, 'case.created', {
    case_id: caseId,
    case_number: caseNumber,
    client_name: clientName,
    case_type: caseType,
    created_at: new Date().toISOString(),
  })
}

export async function onWebhookCaseStatusChanged(caseId: string, caseNumber: string | null, clientName: string, oldStatus: string, newStatus: string) {
  const firmId = await getFirmIdForCase(caseId)
  if (!firmId) return

  await triggerWebhooks(firmId, 'case.status_changed', {
    case_id: caseId,
    case_number: caseNumber,
    client_name: clientName,
    old_status: oldStatus,
    new_status: newStatus,
    changed_at: new Date().toISOString(),
  })
}

export async function onWebhookCaseClosed(caseId: string, caseNumber: string | null, clientName: string, outcome: string) {
  const firmId = await getFirmIdForCase(caseId)
  if (!firmId) return

  await triggerWebhooks(firmId, 'case.closed', {
    case_id: caseId,
    case_number: caseNumber,
    client_name: clientName,
    outcome,
    closed_at: new Date().toISOString(),
  })
}

export async function onWebhookDocumentUploaded(caseId: string, documentId: string, fileName: string, documentType: string | null, uploadedBy: string) {
  const firmId = await getFirmIdForCase(caseId)
  if (!firmId) return

  const supabase = getServiceClient()
  const { data: caseData } = await supabase.from('cases').select('case_number').eq('id', caseId).single()

  await triggerWebhooks(firmId, 'document.uploaded', {
    document_id: documentId,
    document_name: fileName,
    document_type: documentType,
    case_id: caseId,
    case_number: caseData?.case_number,
    uploaded_by: uploadedBy,
    uploaded_at: new Date().toISOString(),
  })
}

export async function onWebhookInvoiceCreated(caseId: string, invoiceId: string, invoiceNumber: string, totalAmount: number, dueDate: string) {
  const firmId = await getFirmIdForCase(caseId)
  if (!firmId) return

  const supabase = getServiceClient()
  const { data: caseData } = await supabase.from('cases').select('case_number, client_name').eq('id', caseId).single()

  await triggerWebhooks(firmId, 'invoice.created', {
    invoice_id: invoiceId,
    invoice_number: invoiceNumber,
    amount: totalAmount,
    case_id: caseId,
    case_number: caseData?.case_number,
    client_name: caseData?.client_name,
    due_date: dueDate,
  })
}

export async function onWebhookPaymentReceived(caseId: string, paymentId: string, amount: number, paymentMethod: string, invoiceNumber: string) {
  const firmId = await getFirmIdForCase(caseId)
  if (!firmId) return

  const supabase = getServiceClient()
  const { data: caseData } = await supabase.from('cases').select('case_number, client_name').eq('id', caseId).single()

  await triggerWebhooks(firmId, 'payment.received', {
    payment_id: paymentId,
    amount,
    payment_method: paymentMethod,
    invoice_number: invoiceNumber,
    case_id: caseId,
    case_number: caseData?.case_number,
    client_name: caseData?.client_name,
    received_at: new Date().toISOString(),
  })
}

export async function onWebhookIntakeSubmitted(firmId: string, intakeId: string, clientName: string, email: string) {
  await triggerWebhooks(firmId, 'intake.submitted', {
    intake_id: intakeId,
    client_name: clientName,
    email,
    submitted_at: new Date().toISOString(),
  })
}

export async function onWebhookTaskCompleted(caseId: string, taskId: string, taskTitle: string, completedBy: string) {
  const firmId = await getFirmIdForCase(caseId)
  if (!firmId) return

  const supabase = getServiceClient()
  const { data: caseData } = await supabase.from('cases').select('case_number').eq('id', caseId).single()

  await triggerWebhooks(firmId, 'task.completed', {
    task_id: taskId,
    task_title: taskTitle,
    completed_by: completedBy,
    case_id: caseId,
    case_number: caseData?.case_number,
    completed_at: new Date().toISOString(),
  })
}
