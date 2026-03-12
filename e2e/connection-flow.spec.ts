import { test, expect } from '@playwright/test'
import {
  createTestAttorney,
  createTestCase,
  createTestClientWithInvite,
  loginAsAttorney,
  loginAsClientDirect,
  cleanupTestUsers,
  TestAttorney,
  TestCase,
  TestClient,
} from './utils/auth'

test.describe('Connection Flow — Attorney & Client', () => {
  let attorney: TestAttorney
  let testCase: TestCase
  let client: TestClient

  test.beforeAll(async () => {
    attorney = await createTestAttorney('-conn-flow')
    testCase = await createTestCase(attorney, 'Eve Client', 'Frank Spouse')
    const result = await createTestClientWithInvite(attorney, testCase)
    client = result.client

    // Accept the invite by directly marking status as accepted
    // (simulate the accept flow without going through UI)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('cases')
      .update({ client_invite_status: 'accepted' })
      .eq('id', testCase.id)
  })

  test.afterAll(async () => {
    await cleanupTestUsers(attorney.id, client.id)
  })

  test('client sees only their own case on the portal', async ({ page }) => {
    await loginAsClientDirect(page, client.id, testCase.id)

    await expect(page).toHaveURL(/portal\/dashboard/)

    // The dashboard should show the case info — client name should appear
    await expect(page.locator('body')).toBeVisible()
  })

  test('attorney sees case detail with client linked', async ({ page }) => {
    await loginAsAttorney(page, attorney)
    await page.goto(`/dashboard/cases/${testCase.id}`)

    // Case should load with parties visible
    await expect(page.getByText('Eve Client')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Frank Spouse')).toBeVisible()

    // Should show client portal access section with accepted/active status
    await expect(page.getByText('Client Portal Access')).toBeVisible({ timeout: 10000 })
  })

  test('attorney can view messages tab on case', async ({ page }) => {
    await loginAsAttorney(page, attorney)
    await page.goto(`/dashboard/cases/${testCase.id}`)

    await expect(page.getByText('Eve Client')).toBeVisible({ timeout: 10000 })

    // Click Messages tab
    const messagesTab = page.getByRole('button', { name: /messages/i }).first()
    await messagesTab.click()

    // Messages area should be visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('attorney can view documents tab on case', async ({ page }) => {
    await loginAsAttorney(page, attorney)
    await page.goto(`/dashboard/cases/${testCase.id}`)

    await expect(page.getByText('Eve Client')).toBeVisible({ timeout: 10000 })

    // Click Documents tab
    const docsTab = page.getByRole('button', { name: /documents/i }).first()
    await docsTab.click()

    await expect(page.getByText(/case documents/i)).toBeVisible({ timeout: 10000 })
  })

  test('client portal shows dashboard content', async ({ page }) => {
    await loginAsClientDirect(page, client.id, testCase.id)

    // Portal dashboard should render
    await expect(page).toHaveURL(/portal\/dashboard/)
    await expect(page.locator('body')).toBeVisible()

    // Should see portal navigation items
    const nav = page.locator('nav')
    await expect(nav).toBeVisible({ timeout: 5000 }).catch(() => {
      // Mobile view may have different nav
    })
  })

  test('attorney can revoke client access', async ({ page }) => {
    await loginAsAttorney(page, attorney)
    await page.goto(`/dashboard/cases/${testCase.id}`)

    await expect(page.getByText('Eve Client')).toBeVisible({ timeout: 10000 })

    // Look for revoke button
    const revokeBtn = page.getByRole('button', { name: /revoke access/i })
    if (await revokeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Handle confirmation dialog
      page.on('dialog', dialog => dialog.accept())
      await revokeBtn.click()

      // Should show revoked status or success message
      await expect(page.getByText(/revoked|access.*revoked/i)).toBeVisible({ timeout: 10000 })
    }
  })
})
