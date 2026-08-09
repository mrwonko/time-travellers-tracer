import { test, expect } from '@playwright/test';

// Deliberately minimal — component behavior belongs in Vitest browser
// tests (src/**/*.browser.test.ts), not here. This just covers what a
// component-level test structurally can't: that the router, main.ts
// bootstrap, and global CSS/font loading actually work together for
// each real route, and that ToastHost (mounted once in App.svelte)
// works end-to-end from a real page at least once.

test('all three routes render without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/#/');
  await expect(page.getByText("TIME TRAVELLER'S TRACER")).toBeVisible();

  await page.goto('/#/editor');
  await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Universes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Observers' })).toBeVisible();

  await page.goto('/#/components');
  await expect(page.getByRole('heading', { name: 'MultiSelectCombobox' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('a delete on the editor page produces a visible, globally-mounted toast', async ({ page }) => {
  await page.goto('/#/editor');
  await page.getByRole('heading', { name: 'Events' }).waitFor();

  await page.locator('.data-table').nth(0).locator('tbody tr').nth(0).getByLabel('Delete event').click();
  await expect(page.locator('.toast-host .undo-toast')).toBeVisible();
});
