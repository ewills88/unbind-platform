// Notification Triggers
// Session 15: Functions that queue emails + create in-app notifications

import { createClient } from '@supabase/supabase-js'
import { queueEmail } from '@/lib/email/emailService'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function createInAppNotification(
  userId: string,
  title: string,
  message: string,
  notificationType: string,
  caseId?: string,
  actionUrl?: string
) {
  const supabase = getServiceClient()
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    notification_type: notificationType,
    case_id: caseId || null,
    action_url: actionUrl || null,
  })
}

/**
 * Notify when a new message is sent in a case.
 */
export async function notifyNewMessage(
  caseId: string,
  senderId: string,
  recipientId: string,
  messagePreview: string
) {
  const supabase = getServiceClient()

  const { data: sender } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', senderId)
    .single()

  const { data: caseData } = await supabase
    .from('cases')
    .select('case_number, client_name')
    .eq('id', caseId)
    .single()

  const senderName = sender?.full_name || 'Someone'
  const caseName = caseData?.client_name || caseData?.case_number || 'your case'
  const actionUrl = `${BASE_URL}/dashboard/cases/${caseId}/messages`

  await createInAppNotification(
    recipientId,
    `New message from ${senderName}`,
    messagePreview.slice(0, 200),
    'message',
    caseId,
    actionUrl
  )

  await queueEmail(recipientId, 'new_message', {
    sender_name: senderName,
    case_name: caseName,
    message_preview: messagePreview.slice(0, 300),
    action_url: actionUrl,
  }, caseId)
}

/**
 * Notify when a document is uploaded.
 */
export async function notifyDocumentUploaded(
  caseId: string,
  uploaderId: string,
  documentName: string,
  recipientIds: string[]
) {
  const supabase = getServiceClient()

  const { data: uploader } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', uploaderId)
    .single()

  const { data: caseData } = await supabase
    .from('cases')
    .select('case_number, client_name')
    .eq('id', caseId)
    .single()

  const uploaderName = uploader?.full_name || 'Someone'
  const caseName = caseData?.client_name || caseData?.case_number || 'your case'
  const actionUrl = `${BASE_URL}/dashboard/cases/${caseId}/documents`

  for (const recipientId of recipientIds) {
    if (recipientId === uploaderId) continue

    await createInAppNotification(
      recipientId,
      `New document: ${documentName}`,
      `${uploaderName} uploaded "${documentName}" to ${caseName}`,
      'document',
      caseId,
      actionUrl
    )

    await queueEmail(recipientId, 'document_uploaded', {
      uploader_name: uploaderName,
      document_name: documentName,
      case_name: caseName,
      action_url: actionUrl,
    }, caseId)
  }
}

/**
 * Notify when a task is assigned.
 */
export async function notifyTaskAssigned(
  caseId: string,
  taskTitle: string,
  assignedById: string,
  assigneeId: string,
  dueDate?: string
) {
  const supabase = getServiceClient()

  const { data: assigner } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', assignedById)
    .single()

  const { data: caseData } = await supabase
    .from('cases')
    .select('case_number, client_name')
    .eq('id', caseId)
    .single()

  const assignerName = assigner?.full_name || 'Someone'
  const caseName = caseData?.client_name || caseData?.case_number || 'your case'
  const actionUrl = `${BASE_URL}/dashboard/cases/${caseId}/tasks`
  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'No due date'

  await createInAppNotification(
    assigneeId,
    `New task: ${taskTitle}`,
    `${assignerName} assigned you "${taskTitle}" in ${caseName}`,
    'reminder',
    caseId,
    actionUrl
  )

  await queueEmail(assigneeId, 'task_assigned', {
    assigner_name: assignerName,
    task_title: taskTitle,
    case_name: caseName,
    due_date: formattedDue,
    action_url: actionUrl,
  }, caseId)
}

/**
 * Notify when a task is overdue.
 */
export async function notifyTaskOverdue(
  caseId: string,
  taskTitle: string,
  assigneeId: string,
  dueDate: string
) {
  const supabase = getServiceClient()

  const { data: caseData } = await supabase
    .from('cases')
    .select('case_number, client_name')
    .eq('id', caseId)
    .single()

  const caseName = caseData?.client_name || caseData?.case_number || 'your case'
  const actionUrl = `${BASE_URL}/dashboard/cases/${caseId}/tasks`

  const daysOverdue = Math.floor(
    (Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const formattedDue = new Date(dueDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  await createInAppNotification(
    assigneeId,
    `Overdue: ${taskTitle}`,
    `Task "${taskTitle}" is ${daysOverdue} days overdue`,
    'reminder',
    caseId,
    actionUrl
  )

  await queueEmail(assigneeId, 'task_overdue', {
    task_title: taskTitle,
    case_name: caseName,
    days_overdue: daysOverdue.toString(),
    due_date: formattedDue,
    action_url: actionUrl,
  }, caseId)
}

/**
 * Notify when a deadline is approaching.
 */
export async function notifyDeadlineApproaching(
  caseId: string,
  eventTitle: string,
  eventDate: string,
  recipientIds: string[],
  daysUntil: number
) {
  const supabase = getServiceClient()

  const { data: caseData } = await supabase
    .from('cases')
    .select('case_number, client_name')
    .eq('id', caseId)
    .single()

  const caseName = caseData?.client_name || caseData?.case_number || 'your case'
  const actionUrl = `${BASE_URL}/dashboard/cases/${caseId}/timeline`
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  for (const recipientId of recipientIds) {
    await createInAppNotification(
      recipientId,
      `Deadline in ${daysUntil} days: ${eventTitle}`,
      `${eventTitle} is due on ${formattedDate}`,
      'reminder',
      caseId,
      actionUrl
    )

    await queueEmail(recipientId, 'deadline_reminder', {
      event_title: eventTitle,
      event_date: formattedDate,
      days_until: daysUntil.toString(),
      case_name: caseName,
      action_url: actionUrl,
    }, caseId)
  }
}

/**
 * Notify when a payment is received.
 */
export async function notifyPaymentReceived(
  caseId: string,
  invoiceNumber: string,
  amount: string,
  attorneyId: string
) {
  const supabase = getServiceClient()

  const { data: caseData } = await supabase
    .from('cases')
    .select('case_number, client_name')
    .eq('id', caseId)
    .single()

  const caseName = caseData?.client_name || caseData?.case_number || 'your case'
  const actionUrl = `${BASE_URL}/dashboard/billing`

  await createInAppNotification(
    attorneyId,
    `Payment received: Invoice #${invoiceNumber}`,
    `Payment of ${amount} received for ${caseName}`,
    'system',
    caseId,
    actionUrl
  )

  await queueEmail(attorneyId, 'payment_received', {
    invoice_number: invoiceNumber,
    amount,
    case_name: caseName,
    action_url: actionUrl,
  }, caseId)
}

/**
 * Notify when an invoice is sent.
 */
export async function notifyInvoiceSent(
  caseId: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string,
  clientId: string
) {
  const supabase = getServiceClient()

  const { data: caseData } = await supabase
    .from('cases')
    .select('case_number, client_name')
    .eq('id', caseId)
    .single()

  const caseName = caseData?.client_name || caseData?.case_number || 'your case'
  const actionUrl = `${BASE_URL}/dashboard/billing`
  const formattedDue = new Date(dueDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  await createInAppNotification(
    clientId,
    `New invoice: #${invoiceNumber}`,
    `Invoice for ${amount} due ${formattedDue}`,
    'system',
    caseId,
    actionUrl
  )

  await queueEmail(clientId, 'invoice_sent', {
    invoice_number: invoiceNumber,
    amount,
    due_date: formattedDue,
    case_name: caseName,
    firm_name: 'Your Attorney',
    action_url: actionUrl,
  }, caseId)
}

/**
 * Notify when a case status changes.
 */
export async function notifyCaseStatusChanged(
  caseId: string,
  updateDescription: string,
  recipientIds: string[]
) {
  const supabase = getServiceClient()

  const { data: caseData } = await supabase
    .from('cases')
    .select('case_number, client_name')
    .eq('id', caseId)
    .single()

  const caseName = caseData?.client_name || caseData?.case_number || 'your case'
  const actionUrl = `${BASE_URL}/dashboard/cases/${caseId}`

  for (const recipientId of recipientIds) {
    await createInAppNotification(
      recipientId,
      `Case update: ${caseName}`,
      updateDescription,
      'system',
      caseId,
      actionUrl
    )

    await queueEmail(recipientId, 'case_update', {
      case_name: caseName,
      update_description: updateDescription,
      action_url: actionUrl,
    }, caseId)
  }
}

/**
 * Notify when an intake form is submitted.
 */
export async function notifyIntakeSubmitted(
  intakeId: string,
  clientName: string,
  attorneyId: string
) {
  const actionUrl = `${BASE_URL}/dashboard/intakes/${intakeId}`

  await createInAppNotification(
    attorneyId,
    'New intake form submitted',
    `${clientName} submitted a new intake form`,
    'system',
    undefined,
    actionUrl
  )

  await queueEmail(attorneyId, 'intake_submitted', {
    client_name: clientName,
    action_url: actionUrl,
  })
}
