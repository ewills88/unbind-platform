// Email Template System
// Session 15: HTML email wrapper and default templates

import { NotificationTriggerType } from '@/types/notifications'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Wraps body content in a full HTML email layout.
 * Table-based, inline CSS, 600px max-width, mobile-responsive.
 */
export function getEmailWrapper(
  bodyContent: string,
  ctaText?: string,
  ctaUrl?: string
): string {
  const ctaBlock = ctaText && ctaUrl
    ? `<tr>
        <td align="center" style="padding: 24px 0 0 0;">
          <a href="${ctaUrl}" target="_blank"
            style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            ${ctaText}
          </a>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unbind Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 0 0 24px 0;">
              <span style="font-size: 24px; font-weight: 700; color: #1e40af; letter-spacing: -0.5px;">Unbind</span>
            </td>
          </tr>
          <!-- Body Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="color: #374151; font-size: 14px; line-height: 1.6;">
                    ${bodyContent}
                  </td>
                </tr>
                ${ctaBlock}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 0 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0;">This email was sent by Unbind. <a href="${BASE_URL}/dashboard/settings/notifications" style="color: #6b7280; text-decoration: underline;">Manage preferences</a></p>
              <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} Unbind. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Default email templates with {{variable}} placeholders.
 * Used as fallback when no database template exists.
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<NotificationTriggerType, {
  subject: string
  html: string
  text: string
}> = {
  new_message: {
    subject: 'New message from {{sender_name}} - {{case_name}}',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p><strong>{{sender_name}}</strong> sent you a new message regarding <strong>{{case_name}}</strong>:</p>
      <blockquote style="border-left: 3px solid #e5e7eb; padding-left: 12px; color: #6b7280; margin: 16px 0;">{{message_preview}}</blockquote>`,
      'View Message',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\n{{sender_name}} sent you a new message regarding {{case_name}}:\n\n"{{message_preview}}"\n\nView at: {{action_url}}`,
  },
  document_uploaded: {
    subject: 'New document uploaded - {{case_name}}',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p><strong>{{uploader_name}}</strong> uploaded a new document to <strong>{{case_name}}</strong>:</p>
      <p style="font-weight: 600; color: #1f2937; padding: 8px 0;">{{document_name}}</p>`,
      'View Document',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\n{{uploader_name}} uploaded a new document to {{case_name}}:\n\n{{document_name}}\n\nView at: {{action_url}}`,
  },
  task_assigned: {
    subject: 'New task assigned to you - {{case_name}}',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p><strong>{{assigner_name}}</strong> assigned you a new task in <strong>{{case_name}}</strong>:</p>
      <p style="font-weight: 600; color: #1f2937;">{{task_title}}</p>
      <p style="color: #6b7280;">Due: {{due_date}}</p>`,
      'View Task',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\n{{assigner_name}} assigned you a new task in {{case_name}}:\n\n{{task_title}}\nDue: {{due_date}}\n\nView at: {{action_url}}`,
  },
  task_overdue: {
    subject: 'Overdue task: {{task_title}} - {{case_name}}',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p>Your task <strong>{{task_title}}</strong> in <strong>{{case_name}}</strong> is now <strong style="color: #dc2626;">{{days_overdue}} days overdue</strong>.</p>
      <p style="color: #6b7280;">Original due date: {{due_date}}</p>
      <p>Please complete this task as soon as possible.</p>`,
      'View Task',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\nYour task "{{task_title}}" in {{case_name}} is now {{days_overdue}} days overdue.\n\nOriginal due date: {{due_date}}\n\nView at: {{action_url}}`,
  },
  deadline_reminder: {
    subject: 'Upcoming deadline: {{event_title}} in {{days_until}} days',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p>You have an upcoming deadline in <strong>{{case_name}}</strong>:</p>
      <p style="font-weight: 600; color: #1f2937;">{{event_title}}</p>
      <p style="color: #6b7280;">Date: {{event_date}} ({{days_until}} days away)</p>
      <p>Make sure you're prepared for this deadline.</p>`,
      'View Calendar',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\nUpcoming deadline in {{case_name}}:\n\n{{event_title}}\nDate: {{event_date}} ({{days_until}} days away)\n\nView at: {{action_url}}`,
  },
  invoice_sent: {
    subject: 'Invoice #{{invoice_number}} from {{firm_name}}',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p>A new invoice has been issued for your case <strong>{{case_name}}</strong>:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0; color: #374151;">
        <tr><td style="padding: 4px 16px 4px 0; color: #6b7280;">Invoice:</td><td style="font-weight: 600;">#{{invoice_number}}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #6b7280;">Amount:</td><td style="font-weight: 600;">{{amount}}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #6b7280;">Due Date:</td><td>{{due_date}}</td></tr>
      </table>`,
      'View Invoice',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\nA new invoice has been issued for {{case_name}}:\n\nInvoice #{{invoice_number}}\nAmount: {{amount}}\nDue Date: {{due_date}}\n\nView at: {{action_url}}`,
  },
  payment_received: {
    subject: 'Payment received for Invoice #{{invoice_number}}',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p>A payment of <strong>{{amount}}</strong> has been received for Invoice #{{invoice_number}} in case <strong>{{case_name}}</strong>.</p>
      <p>Thank you for the prompt payment.</p>`,
      'View Details',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\nA payment of {{amount}} has been received for Invoice #{{invoice_number}} in {{case_name}}.\n\nView at: {{action_url}}`,
  },
  case_update: {
    subject: 'Case update - {{case_name}}',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p>There has been an update to your case <strong>{{case_name}}</strong>:</p>
      <p style="background-color: #f9fafb; padding: 12px; border-radius: 6px; color: #374151;">{{update_description}}</p>`,
      'View Case',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\nCase update for {{case_name}}:\n\n{{update_description}}\n\nView at: {{action_url}}`,
  },
  intake_submitted: {
    subject: 'New intake form submitted by {{client_name}}',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p><strong>{{client_name}}</strong> has submitted a new intake form.</p>
      <p>Please review the submission and follow up as needed.</p>`,
      'Review Intake',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\n{{client_name}} has submitted a new intake form.\n\nReview at: {{action_url}}`,
  },
  welcome: {
    subject: 'Welcome to Unbind, {{recipient_name}}!',
    html: getEmailWrapper(
      `<p>Hi {{recipient_name}},</p>
      <p>Welcome to <strong>Unbind</strong> — your divorce collaboration platform.</p>
      <p>Your account has been set up and you're ready to get started. Here's what you can do:</p>
      <ul style="color: #374151; padding-left: 20px;">
        <li style="padding: 4px 0;">View your case dashboard</li>
        <li style="padding: 4px 0;">Communicate securely with your legal team</li>
        <li style="padding: 4px 0;">Upload and manage documents</li>
        <li style="padding: 4px 0;">Track deadlines and tasks</li>
      </ul>`,
      'Go to Dashboard',
      '{{action_url}}'
    ),
    text: `Hi {{recipient_name}},\n\nWelcome to Unbind - your divorce collaboration platform.\n\nYour account has been set up. Log in to get started:\n{{action_url}}`,
  },
}
