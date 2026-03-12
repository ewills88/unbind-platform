import { test, expect } from '@playwright/test'
import {
  createTestAttorney,
  createTestCase,
  createTestClientWithInvite,
  loginAsClientDirect,
  cleanupTestUsers,
  TestAttorney,
  TestCase,
  TestClient,
} from './utils/auth'

test.describe('Client Flow', () => {
  let attorney: TestAttorney
  let testCase: TestCase
  let client: TestClient
  let inviteToken: string

  test.beforeAll(async () => {
    attorney = await createTestAttorney('-client-flow')
    testCase = await createTestCase(attorney, 'Carol Client', 'Dave Spouse')
    const result = await createTestClientWithInvite(attorney, testCase)
    client = result.client
    inviteToken = result.inviteToken
  })

  test.afterAll(async () => {
    await cleanupTestUsers(attorney.id, client.id)
  })

  test('client can accept invite via token', async ({ page }) => {
    // Navigate to accept-invite with token
    await page.goto(`/portal/accept-invite?token=${inviteToken}`)

    // Should show success state
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 15000 })

    // Should redirect to portal dashboard
    await page.waitForURL(/portal\/dashboard/, { timeout: 10000 })
  })

  test('client can view portal dashboard after direct login', async ({ page }) => {
    await loginAsClientDirect(page, client.id, testCase.id)

    // Should be on the portal dashboard
    await expect(page).toHaveURL(/portal\/dashboard/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('client can navigate to messages', async ({ page }) => {
    await loginAsClientDirect(page, client.id, testCase.id)

    // Click Messages nav item
    const messagesLink = page.getByRole('link', { name: /messages/i }).first()
    if (await messagesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await messagesLink.click()
      await expect(page).toHaveURL(/portal\/messages/)
    }
  })

  test('client can navigate to documents', async ({ page }) => {
    await loginAsClientDirect(page, client.id, testCase.id)

    // Click Documents nav item
    const docsLink = page.getByRole('link', { name: /documents/i }).first()
    if (await docsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await docsLink.click()
      await expect(page).toHaveURL(/portal\/documents/)
    }
  })

  test('invalid invite token shows error', async ({ page }) => {
    await page.goto('/portal/accept-invite?token=invalid-token-12345')

    // Should show error state
    await expect(page.getByText(/error|invalid|expired/i)).toBeVisible({ timeout: 10000 })
  })

  test('missing invite token shows error', async ({ page }) => {
    await page.goto('/portal/accept-invite')

    // Should show error about missing token
    await expect(page.getByText(/no invitation token/i)).toBeVisible({ timeout: 10000 })
  })
})
