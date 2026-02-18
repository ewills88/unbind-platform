import { Page } from '@playwright/test';

export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/);
}

export async function loginAsClient(page: Page): Promise<void> {
  await page.goto('/portal/login');
  await page.getByLabel(/email/i).fill('client@example.com');
  await page.getByRole('button', { name: /send.*link/i }).click();
}
