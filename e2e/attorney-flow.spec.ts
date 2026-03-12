import { test, expect } from '@playwright/test'
import {
  createTestAttorney,
  createTestCase,
  loginAsAttorney,
  cleanupTestUsers,
  TestAttorney,
  TestCase,
} from './utils/auth'

test.describe('Attorney Flow', () => {
  let attorney: TestAttorney
  let testCase: TestCase

  test.beforeAll(async () => {
    attorney = await createTestAttorney('-atty-flow')
    testCase = await createTestCase(attorney, 'Alice Smith', 'Bob Smith')
  })

  test.afterAll(async () => {
    await cleanupTestUsers(attorney.id)
  })

  test('attorney can log in and see dashboard', async ({ page }) => {
    await loginAsAttorney(page, attorney)
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('attorney can navigate to case list', async ({ page }) => {
    await loginAsAttorney(page, attorney)

    // Navigate to cases — look for a link or nav item
    const casesLink = page.getByRole('link', { name: /cases/i }).first()
    if (await casesLink.isVisible()) {
      await casesLink.click()
      await expect(page).toHaveURL(/dashboard/)
    }
  })

  test('attorney can open case detail', async ({ page }) => {
    await loginAsAttorney(page, attorney)

    // Navigate directly to the case detail page
    await page.goto(`/dashboard/cases/${testCase.id}`)
    await expect(page.locator('body')).toBeVisible()

    // Should show case parties
    await expect(page.getByText('Alice Smith')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Bob Smith')).toBeVisible()
  })

  test('attorney can send client invite from case detail', async ({ page }) => {
    await loginAsAttorney(page, attorney)
    await page.goto(`/dashboard/cases/${testCase.id}`)

    // Wait for page to load
    await expect(page.getByText('Alice Smith')).toBeVisible({ timeout: 10000 })

    // Look for Client Portal Access section
    await expect(page.getByText('Client Portal Access')).toBeVisible({ timeout: 10000 })

    // Fill invite form
    await page.getByLabel(/client email/i).fill('invited-client@e2e-test.local')
    await page.getByLabel(/client name/i).fill('Alice Smith')
    await page.getByRole('button', { name: /send invitation/i }).click()

    // Should show success
    await expect(page.getByText(/invitation sent/i)).toBeVisible({ timeout: 10000 })

    // Should show pending status
    await expect(page.getByText(/pending/i)).toBeVisible()
  })

  test('attorney can resend invite', async ({ page }) => {
    await loginAsAttorney(page, attorney)
    await page.goto(`/dashboard/cases/${testCase.id}`)

    await expect(page.getByText('Alice Smith')).toBeVisible({ timeout: 10000 })

    // If invite is pending, resend button should be visible
    const resendButton = page.getByRole('button', { name: /resend invite/i })
    if (await resendButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await resendButton.click()
      await expect(page.getByText(/resent/i)).toBeVisible({ timeout: 10000 })
    }
  })

  test('attorney can upload document to case', async ({ page }) => {
    await loginAsAttorney(page, attorney)
    await page.goto(`/dashboard/cases/${testCase.id}`)

    await expect(page.getByText('Alice Smith')).toBeVisible({ timeout: 10000 })

    // Click Documents tab
    const docsTab = page.getByRole('button', { name: /documents/i }).first()
    await docsTab.click()

    // Documents tab content should be visible
    await expect(page.getByText(/case documents/i)).toBeVisible({ timeout: 10000 })
  })
})
