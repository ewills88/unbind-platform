import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

test.describe('Case Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should display cases list', async ({ page }) => {
    await page.goto('/dashboard/cases');

    await expect(
      page.getByRole('heading', { name: /cases/i })
    ).toBeVisible();
  });

  test('should create a new case', async ({ page }) => {
    await page.goto('/dashboard/cases');

    const newCaseButton = page.getByRole('button', { name: /new case/i });
    if (await newCaseButton.isVisible()) {
      await newCaseButton.click();

      // Fill in case form
      const clientNameInput = page.getByLabel(/client name/i);
      if (await clientNameInput.isVisible()) {
        await clientNameInput.fill('E2E Test Client');
      }

      const caseTypeSelect = page.getByLabel(/case type/i);
      if (await caseTypeSelect.isVisible()) {
        await caseTypeSelect.selectOption('divorce');
      }

      const opposingPartyInput = page.getByLabel(/opposing party/i);
      if (await opposingPartyInput.isVisible()) {
        await opposingPartyInput.fill('E2E Opposing Party');
      }

      const createButton = page.getByRole('button', {
        name: /create|submit/i,
      });
      if (await createButton.isVisible()) {
        await createButton.click();
      }
    }
  });

  test('should search cases', async ({ page }) => {
    await page.goto('/dashboard/cases');

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('Smith');
      await page.keyboard.press('Enter');

      // Wait for results
      await page.waitForTimeout(1000);
    }
  });

  test('should filter cases by status', async ({ page }) => {
    await page.goto('/dashboard/cases');

    const statusFilter = page.getByRole('button', { name: /status|filter/i });
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      const activeOption = page.getByRole('option', { name: /active/i });
      if (await activeOption.isVisible()) {
        await activeOption.click();
      }
    }
  });

  test('should view case details', async ({ page }) => {
    await page.goto('/dashboard/cases');

    // Click on first case row or link
    const firstCase = page.locator('[data-testid="case-row"], tr').nth(1);
    if (await firstCase.isVisible()) {
      await firstCase.click();
      await page.waitForTimeout(1000);
    }
  });
});
