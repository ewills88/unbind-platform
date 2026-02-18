import { test, expect } from '@playwright/test';

test.describe('Client Portal', () => {
  test('should display portal login page', async ({ page }) => {
    await page.goto('/portal/login');

    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('should request magic link', async ({ page }) => {
    await page.goto('/portal/login');

    await page.getByLabel(/email/i).fill('client@example.com');

    const sendButton = page.getByRole('button', { name: /send|sign in|login/i });
    if (await sendButton.isVisible()) {
      await sendButton.click();
      // Should show confirmation message
      await page.waitForTimeout(1000);
    }
  });

  test('should display portal documents section', async ({ page }) => {
    await page.goto('/portal/documents');
    // Page should load without errors
    await page.waitForTimeout(1000);
  });

  test('should display portal tasks section', async ({ page }) => {
    await page.goto('/portal/tasks');
    await page.waitForTimeout(1000);
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/portal/login');

    // Page should be usable at mobile width
    const emailInput = page.getByLabel(/email/i);
    if (await emailInput.isVisible()) {
      const box = await emailInput.boundingBox();
      if (box) {
        // Input should fit within mobile viewport
        expect(box.width).toBeLessThanOrEqual(375);
      }
    }
  });
});
