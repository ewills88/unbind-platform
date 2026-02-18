// Session 21: Firm Settings Service (functional)
import { createClient } from '@supabase/supabase-js'
import type { AllFirmSettings, FirmProfile, FirmBillingSettings, FirmCaseSettings, FirmNotificationSettings } from '@/types/admin'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// ============================================================
// Get All Settings
// ============================================================

export async function getFirmSettings(supabase: SupabaseClient, firmId: string): Promise<AllFirmSettings> {
  const [profileRes, billingRes, casesRes, notificationsRes] = await Promise.all([
    (supabase as SupabaseClient).from('firm_settings').select('*').eq('firm_id', firmId).single(),
    (supabase as SupabaseClient).from('firm_billing_settings').select('*').eq('firm_id', firmId).single(),
    (supabase as SupabaseClient).from('firm_case_settings').select('*').eq('firm_id', firmId).single(),
    (supabase as SupabaseClient).from('firm_notification_settings').select('*').eq('firm_id', firmId).single(),
  ])

  return {
    profile: profileRes.data || await createDefaultProfile(firmId),
    billing: billingRes.data || await createDefaultBillingSettings(firmId),
    cases: casesRes.data || await createDefaultCaseSettings(firmId),
    notifications: notificationsRes.data || await createDefaultNotificationSettings(firmId),
  }
}

// ============================================================
// Update Settings by Section
// ============================================================

export async function updateFirmProfile(
  supabase: SupabaseClient,
  firmId: string,
  updates: Partial<FirmProfile>
): Promise<FirmProfile> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, firm_id, created_at, updated_at, ...safeUpdates } = updates as FirmProfile

  const { data: existing } = await (supabase as SupabaseClient)
    .from('firm_settings')
    .select('id')
    .eq('firm_id', firmId)
    .single()

  if (!existing) {
    const { data, error } = await (supabase as SupabaseClient)
      .from('firm_settings')
      .insert({ firm_id: firmId, ...safeUpdates })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await (supabase as SupabaseClient)
    .from('firm_settings')
    .update(safeUpdates)
    .eq('firm_id', firmId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBillingSettings(
  supabase: SupabaseClient,
  firmId: string,
  updates: Partial<FirmBillingSettings>
): Promise<FirmBillingSettings> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, firm_id, created_at, updated_at, ...safeUpdates } = updates as FirmBillingSettings

  const { data: existing } = await (supabase as SupabaseClient)
    .from('firm_billing_settings')
    .select('id')
    .eq('firm_id', firmId)
    .single()

  if (!existing) {
    const { data, error } = await (supabase as SupabaseClient)
      .from('firm_billing_settings')
      .insert({ firm_id: firmId, ...safeUpdates })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await (supabase as SupabaseClient)
    .from('firm_billing_settings')
    .update(safeUpdates)
    .eq('firm_id', firmId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCaseSettings(
  supabase: SupabaseClient,
  firmId: string,
  updates: Partial<FirmCaseSettings>
): Promise<FirmCaseSettings> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, firm_id, created_at, updated_at, ...safeUpdates } = updates as FirmCaseSettings

  const { data: existing } = await (supabase as SupabaseClient)
    .from('firm_case_settings')
    .select('id')
    .eq('firm_id', firmId)
    .single()

  if (!existing) {
    const { data, error } = await (supabase as SupabaseClient)
      .from('firm_case_settings')
      .insert({ firm_id: firmId, ...safeUpdates })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await (supabase as SupabaseClient)
    .from('firm_case_settings')
    .update(safeUpdates)
    .eq('firm_id', firmId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateNotificationSettings(
  supabase: SupabaseClient,
  firmId: string,
  updates: Partial<FirmNotificationSettings>
): Promise<FirmNotificationSettings> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, firm_id, created_at, updated_at, ...safeUpdates } = updates as FirmNotificationSettings

  const { data: existing } = await (supabase as SupabaseClient)
    .from('firm_notification_settings')
    .select('id')
    .eq('firm_id', firmId)
    .single()

  if (!existing) {
    const { data, error } = await (supabase as SupabaseClient)
      .from('firm_notification_settings')
      .insert({ firm_id: firmId, ...safeUpdates })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await (supabase as SupabaseClient)
    .from('firm_notification_settings')
    .update(safeUpdates)
    .eq('firm_id', firmId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// Case Number Preview
// ============================================================

export function getCaseNumberPreview(format: string, prefix: string, sequence: number): string {
  const now = new Date()
  return format
    .replace('{PREFIX}', prefix)
    .replace('{YEAR}', now.getFullYear().toString())
    .replace('{YY}', now.getFullYear().toString().slice(-2))
    .replace('{MONTH}', String(now.getMonth() + 1).padStart(2, '0'))
    .replace('{SEQ}', String(sequence).padStart(5, '0'))
    .replace('{SEQ4}', String(sequence).padStart(4, '0'))
}

// ============================================================
// Default Settings Creators
// ============================================================

async function createDefaultProfile(firmId: string): Promise<FirmProfile> {
  const service = getServiceClient()
  const { data, error } = await (service as SupabaseClient)
    .from('firm_settings')
    .insert({ firm_id: firmId })
    .select()
    .single()
  if (error) throw error
  return data
}

async function createDefaultBillingSettings(firmId: string): Promise<FirmBillingSettings> {
  const service = getServiceClient()
  const { data, error } = await (service as SupabaseClient)
    .from('firm_billing_settings')
    .insert({ firm_id: firmId })
    .select()
    .single()
  if (error) throw error
  return data
}

async function createDefaultCaseSettings(firmId: string): Promise<FirmCaseSettings> {
  const service = getServiceClient()
  const { data, error } = await (service as SupabaseClient)
    .from('firm_case_settings')
    .insert({ firm_id: firmId })
    .select()
    .single()
  if (error) throw error
  return data
}

async function createDefaultNotificationSettings(firmId: string): Promise<FirmNotificationSettings> {
  const service = getServiceClient()
  const { data, error } = await (service as SupabaseClient)
    .from('firm_notification_settings')
    .insert({ firm_id: firmId })
    .select()
    .single()
  if (error) throw error
  return data
}
