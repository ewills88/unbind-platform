// Session 21: Audit Service (functional)
import { createClient } from '@supabase/supabase-js'
import type { AuditLog, AuditAction, LoginAuditLog, LoginEventType } from '@/types/admin'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// ============================================================
// Log Audit Event
// ============================================================

export async function logAudit(params: {
  firmId: string
  userId: string
  action: AuditAction
  entityType: string
  entityId?: string
  entityName?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes?: { before?: Record<string, any>; after?: Record<string, any> }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}): Promise<void> {
  const service = getServiceClient()

  // Fetch user info
  const { data: user } = await (service as SupabaseClient)
    .from('profiles')
    .select('email, full_name')
    .eq('id', params.userId)
    .single()

  await (service as SupabaseClient).from('audit_logs').insert({
    firm_id: params.firmId,
    user_id: params.userId,
    user_email: user?.email,
    user_name: user?.full_name,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    entity_name: params.entityName,
    changes: params.changes,
    metadata: params.metadata,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    session_id: params.sessionId,
  })
}

// ============================================================
// Get Audit Logs
// ============================================================

export async function getAuditLogs(
  supabase: SupabaseClient,
  firmId: string,
  options: {
    entityType?: string
    entityId?: string
    userId?: string
    action?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }
): Promise<{ logs: AuditLog[]; total: number }> {
  let query = (supabase as SupabaseClient)
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })

  if (options.entityType) {
    query = query.eq('entity_type', options.entityType)
  }
  if (options.entityId) {
    query = query.eq('entity_id', options.entityId)
  }
  if (options.userId) {
    query = query.eq('user_id', options.userId)
  }
  if (options.action) {
    query = query.eq('action', options.action)
  }
  if (options.startDate) {
    query = query.gte('created_at', options.startDate)
  }
  if (options.endDate) {
    query = query.lte('created_at', options.endDate)
  }

  const limit = options.limit || 50
  const offset = options.offset || 0
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) throw error

  return {
    logs: data || [],
    total: count || 0,
  }
}

// ============================================================
// Login Audit
// ============================================================

export async function logLoginEvent(params: {
  userId: string
  firmId?: string
  eventType: LoginEventType
  ipAddress?: string
  userAgent?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deviceInfo?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  location?: Record<string, any>
  failureReason?: string
}): Promise<void> {
  const service = getServiceClient()

  await (service as SupabaseClient).from('login_audit').insert({
    user_id: params.userId,
    firm_id: params.firmId,
    event_type: params.eventType,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    device_info: params.deviceInfo,
    location: params.location,
    failure_reason: params.failureReason,
  })
}

export async function getLoginHistory(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 50
): Promise<LoginAuditLog[]> {
  const { data, error } = await (supabase as SupabaseClient)
    .from('login_audit')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}
