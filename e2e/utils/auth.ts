import { Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ============================================================
// Service client for test setup/teardown
// ============================================================

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Ensure .env.local is loaded in playwright.config.ts'
    )
  }

  return createClient(url, key)
}

// ============================================================
// Test user types
// ============================================================

export interface TestAttorney {
  id: string
  email: string
  password: string
  fullName: string
  firmId: string
  firmName: string
}

export interface TestClient {
  id: string
  email: string
  fullName: string
}

export interface TestCase {
  id: string
  caseNumber: string
  clientName: string
  spouseName: string
  attorneyId: string
  firmId: string
  clientId?: string
}

// ============================================================
// Create test attorney (auth user + profile + firm + firm_member)
// ============================================================

export async function createTestAttorney(suffix = ''): Promise<TestAttorney> {
  const supabase = getServiceClient()
  const timestamp = Date.now()
  const email = `test-attorney-${timestamp}${suffix}@e2e-test.local`
  const password = `TestPass${timestamp}!`
  const fullName = `Test Attorney ${timestamp}${suffix}`
  const firmName = `Test Firm ${timestamp}${suffix}`

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'admin' },
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create test attorney: ${authError?.message}`)
  }

  const userId = authData.user.id

  // Create profile
  await supabase.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    role: 'admin',
  })

  // Create firm
  const { data: firm, error: firmError } = await supabase
    .from('firms')
    .insert({
      name: firmName,
      slug: `test-firm-${timestamp}${suffix}`.toLowerCase(),
    })
    .select()
    .single()

  if (firmError || !firm) {
    throw new Error(`Failed to create test firm: ${firmError?.message}`)
  }

  // Add as firm member
  await supabase.from('firm_members').insert({
    firm_id: firm.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
    invited_email: email,
  })

  // Set current_firm_id on profile
  await supabase
    .from('profiles')
    .update({ current_firm_id: firm.id })
    .eq('id', userId)

  return {
    id: userId,
    email,
    password,
    fullName,
    firmId: firm.id,
    firmName,
  }
}

// ============================================================
// Create test case
// ============================================================

export async function createTestCase(
  attorney: TestAttorney,
  clientName = 'Jane Doe',
  spouseName = 'John Doe'
): Promise<TestCase> {
  const supabase = getServiceClient()
  const caseNumber = `E2E-${Date.now()}`

  const { data: caseData, error } = await supabase
    .from('cases')
    .insert({
      case_number: caseNumber,
      client_name: clientName,
      spouse_name: spouseName,
      attorney_id: attorney.id,
      firm_id: attorney.firmId,
      status: 'active',
      current_step: 'Initial Filing',
      progress_percentage: 10,
      state: 'CA',
      case_type: 'divorce',
      has_children: false,
    })
    .select()
    .single()

  if (error || !caseData) {
    throw new Error(`Failed to create test case: ${error?.message}`)
  }

  return {
    id: caseData.id,
    caseNumber,
    clientName,
    spouseName,
    attorneyId: attorney.id,
    firmId: attorney.firmId,
  }
}

// ============================================================
// Login as attorney via UI
// ============================================================

export async function loginAsAttorney(page: Page, attorney: TestAttorney): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(attorney.email)
  await page.getByLabel(/password/i).fill(attorney.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/dashboard/, { timeout: 15000 })
}

// ============================================================
// Login as client directly (bypasses email — inserts token + navigates)
// ============================================================

export async function loginAsClientDirect(
  page: Page,
  clientUserId: string,
  caseId: string
): Promise<void> {
  const supabase = getServiceClient()

  // Generate a token
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('portal_access_tokens').insert({
    user_id: clientUserId,
    case_id: caseId,
    token_hash: tokenHash,
    token_type: 'magic_link',
    email: 'test@e2e-test.local',
    expires_at: expiresAt.toISOString(),
  })

  // Navigate to callback with token
  await page.goto(`/portal/auth/callback?token=${rawToken}`)
  await page.waitForURL(/portal\/dashboard/, { timeout: 15000 })
}

// ============================================================
// Create a client user + link to case via invite token (for E2E)
// ============================================================

export async function createTestClientWithInvite(
  attorney: TestAttorney,
  testCase: TestCase,
  clientEmail?: string
): Promise<{ client: TestClient; inviteToken: string }> {
  const supabase = getServiceClient()
  const timestamp = Date.now()
  const email = clientEmail || `test-client-${timestamp}@e2e-test.local`
  const fullName = `Test Client ${timestamp}`

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'client' },
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create test client: ${authError?.message}`)
  }

  const clientId = authData.user.id

  // Create profile
  await supabase.from('profiles').upsert({
    id: clientId,
    email,
    full_name: fullName,
    role: 'client',
  })

  // Link client to case
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('cases')
    .update({
      client_id: clientId,
      client_email: email,
      client_invite_status: 'pending',
      client_invited_at: new Date().toISOString(),
    })
    .eq('id', testCase.id)

  // Generate invite token
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('portal_access_tokens').insert({
    user_id: clientId,
    case_id: testCase.id,
    token_hash: tokenHash,
    token_type: 'invite',
    email,
    expires_at: expiresAt.toISOString(),
    created_by: attorney.id,
  })

  return {
    client: { id: clientId, email, fullName },
    inviteToken: rawToken,
  }
}

// ============================================================
// Cleanup test user and all related data
// ============================================================

export async function cleanupTestUser(userId: string): Promise<void> {
  const supabase = getServiceClient()

  // Delete related rows (order matters for FK constraints)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  await s.from('case_activity_log').delete().eq('user_id', userId)
  await s.from('client_sessions').delete().eq('user_id', userId)
  await s.from('client_login_history').delete().eq('user_id', userId)
  await s.from('portal_access_tokens').delete().eq('user_id', userId)
  await s.from('notifications').delete().eq('user_id', userId)

  // Delete cases where user is attorney or client
  await s.from('cases').delete().eq('attorney_id', userId)
  await s.from('cases').delete().eq('client_id', userId)

  // Delete firm membership + firm
  const { data: memberships } = await s
    .from('firm_members')
    .select('firm_id')
    .eq('user_id', userId)

  await s.from('firm_members').delete().eq('user_id', userId)

  if (memberships) {
    for (const m of memberships) {
      // Only delete firms that have no other members
      const { count } = await s
        .from('firm_members')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', m.firm_id)

      if (count === 0) {
        await s.from('firms').delete().eq('id', m.firm_id)
      }
    }
  }

  // Delete profile
  await supabase.from('profiles').delete().eq('id', userId)

  // Delete auth user
  await supabase.auth.admin.deleteUser(userId)
}

// ============================================================
// Convenience: cleanup multiple users
// ============================================================

export async function cleanupTestUsers(...userIds: string[]): Promise<void> {
  for (const id of userIds) {
    try {
      await cleanupTestUser(id)
    } catch (e) {
      console.warn(`Cleanup failed for user ${id}:`, e)
    }
  }
}
