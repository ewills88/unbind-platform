// Webhook Service
// Session 15: Queue, sign, and deliver webhook payloads

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { WebhookPayload, Webhook } from '@/types/webhooks'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SENSITIVE_FIELDS = ['ssn', 'password', 'access_token', 'refresh_token', 'credit_card', 'secret_key']

function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data }
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      delete sanitized[field]
    }
  }
  return sanitized
}

function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

/**
 * Trigger all active webhooks for a firm that subscribe to the given event.
 */
export async function triggerWebhooks(
  firmId: string,
  eventType: string,
  data: Record<string, unknown>
) {
  const supabase = getServiceClient()

  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('firm_id', firmId)
    .eq('is_active', true)
    .contains('events', [eventType])

  if (!webhooks || webhooks.length === 0) return

  const payload: WebhookPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    firm_id: firmId,
    data: sanitizeData(data),
  }

  for (const webhook of webhooks) {
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload,
      status: 'pending',
      attempt_number: 1,
    })
  }
}

/**
 * Process pending webhook deliveries from the queue.
 */
export async function processWebhookQueue(): Promise<{
  processed: number
  success: number
  failed: number
}> {
  const supabase = getServiceClient()

  const { data: deliveries } = await supabase
    .from('webhook_deliveries')
    .select('*, webhook:webhooks(*)')
    .in('status', ['pending', 'retrying'])
    .order('created_at', { ascending: true })
    .limit(50)

  if (!deliveries || deliveries.length === 0) {
    return { processed: 0, success: 0, failed: 0 }
  }

  let success = 0
  let failed = 0

  for (const delivery of deliveries) {
    const webhook = delivery.webhook as Webhook
    if (!webhook) {
      failed++
      continue
    }

    // Skip if attempts exceeded
    if (delivery.attempt_number > (webhook.retry_count || 3)) {
      await supabase
        .from('webhook_deliveries')
        .update({ status: 'failed', error_message: 'Max retries exceeded' })
        .eq('id', delivery.id)
      failed++
      continue
    }

    const result = await sendWebhook(delivery, webhook)
    if (result.success) {
      success++
    } else {
      failed++
    }
  }

  return { processed: deliveries.length, success, failed }
}

async function sendWebhook(
  delivery: { id: string; payload: WebhookPayload; event_type: string; attempt_number: number },
  webhook: Webhook
): Promise<{ success: boolean }> {
  const supabase = getServiceClient()
  const startTime = Date.now()

  try {
    const payloadStr = JSON.stringify(delivery.payload)
    const signature = generateSignature(payloadStr, webhook.secret_key)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': delivery.event_type,
      'X-Webhook-Delivery-Id': delivery.id,
      'User-Agent': 'Unbind-Webhooks/1.0',
      ...(webhook.headers || {}),
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadStr,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const duration = Date.now() - startTime
    const responseBody = await response.text().catch(() => '')

    if (response.ok) {
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'success',
          response_status: response.status,
          response_body: responseBody.substring(0, 1000),
          duration_ms: duration,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', delivery.id)

      await supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          failure_count: 0,
        })
        .eq('id', webhook.id)

      return { success: true }
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const shouldRetry = delivery.attempt_number < (webhook.retry_count || 3)

    await supabase
      .from('webhook_deliveries')
      .update({
        status: shouldRetry ? 'retrying' : 'failed',
        error_message: errorMessage,
        duration_ms: duration,
        attempt_number: delivery.attempt_number + 1,
      })
      .eq('id', delivery.id)

    // Increment failure count
    const newFailureCount = (webhook.failure_count || 0) + 1
    const updateData: Record<string, unknown> = { failure_count: newFailureCount }

    // Auto-disable after 10 consecutive failures
    if (newFailureCount >= 10) {
      updateData.is_active = false
      updateData.disabled_at = new Date().toISOString()
    }

    await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', webhook.id)

    return { success: false }
  }
}

/**
 * Send a test webhook delivery.
 */
export async function sendTestWebhook(webhook: Webhook): Promise<{
  success: boolean
  status?: number
  error?: string
  duration?: number
}> {
  const startTime = Date.now()
  const testPayload: WebhookPayload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    firm_id: webhook.firm_id,
    data: {
      message: 'This is a test webhook from Unbind.',
      webhook_name: webhook.name,
    },
  }

  try {
    const payloadStr = JSON.stringify(testPayload)
    const signature = generateSignature(payloadStr, webhook.secret_key)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'test',
        'User-Agent': 'Unbind-Webhooks/1.0',
        ...(webhook.headers || {}),
      },
      body: payloadStr,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    return {
      success: response.ok,
      status: response.status,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}
