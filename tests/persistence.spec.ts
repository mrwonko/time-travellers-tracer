import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { CURRENT_SCHEMA_VERSION } from '../src/lib/persistence';

// Covers what a component-level browser test can't: real localStorage
// persistence across a page reload, and the file download/upload mechanics
// of Story export/import (spec §10). Playwright gives every test its own
// fresh browser context, so localStorage doesn't leak between these tests.
//
// Assertions target getByRole('cell', ...) rather than getByText() — the
// add-row's predecessor MultiSelectCombobox renders a <label> per existing
// event (for its checkbox options) inside the same .data-table regardless
// of whether the popover is open, so getByText() ends up strict-mode
// ambiguous between the real table cell and that combobox option label.

test.describe('story persistence', () => {
  test('data survives a reload', async ({ page }) => {
    const label = `Persisted event ${Date.now()}`;
    await page.goto('/#/editor');
    await page.getByPlaceholder('New event label…').fill(label);
    await page.getByLabel('Add event').click();
    await expect(page.locator('.data-table').first().getByRole('cell', { name: label })).toBeVisible();

    await page.reload();
    await expect(page.locator('.data-table').first().getByRole('cell', { name: label })).toBeVisible();
  });

  test('export downloads a JSON file containing the current story', async ({ page }) => {
    const label = `Exported event ${Date.now()}`;
    await page.goto('/#/editor');
    await page.getByPlaceholder('New event label…').fill(label);
    await page.getByLabel('Add event').click();
    await expect(page.locator('.data-table').first().getByRole('cell', { name: label })).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByLabel('Export story as JSON').click(),
    ]);
    const path = await download.path();
    if (!path) throw new Error('download has no path');
    const contents = JSON.parse(readFileSync(path, 'utf-8'));
    expect(contents.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(contents.story.events.some((e: { label: string }) => e.label === label)).toBe(true);
  });

  test('import replaces the story after confirming', async ({ page }) => {
    await page.goto('/#/editor');
    await page.getByRole('heading', { name: 'Events' }).waitFor();

    page.once('dialog', (dialog) => dialog.accept());

    const importedLabel = 'Imported-only event';
    const doc = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      story: {
        events: [{ id: 'e1', label: importedLabel, predecessors: [], timeline: 'u1' }],
        observers: [],
        timelines: [{ id: 'u1', label: 'Prime' }],
      },
    };
    await page.locator('input[type="file"]').setInputFiles({
      name: 'story.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(doc)),
    });

    await expect(page.locator('.data-table').first().getByRole('cell', { name: importedLabel })).toBeVisible();
  });

  test('importing an invalid file shows an error toast and leaves the story untouched', async ({ page }) => {
    const label = `Untouched event ${Date.now()}`;
    await page.goto('/#/editor');
    await page.getByPlaceholder('New event label…').fill(label);
    await page.getByLabel('Add event').click();
    await expect(page.locator('.data-table').first().getByRole('cell', { name: label })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('not valid json'),
    });

    await expect(page.locator('.toast-host')).toContainText('Import failed');
    await expect(page.locator('.data-table').first().getByRole('cell', { name: label })).toBeVisible();
  });
});
