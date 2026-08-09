import { test, expect } from '@playwright/test';
import { demoStory } from '../src/lib/demoStory';
import { STORAGE_KEY, serializeStory } from '../src/lib/persistence';

// Covers what persistence.test.ts's pure migrateLegacyDocument() unit tests
// can't: the real localStorage read/write/remove side effects, and the
// StoryPicker UI (switch/rename/delete-with-undo) driving story.svelte.ts's
// store. Each test gets a fresh browser context (Playwright default), so
// there's no cross-test localStorage leakage.

test.describe('multi-story support', () => {
  test('migrates a legacy single-story document into a registry on first load', async ({ page }) => {
    const raw = serializeStory(demoStory());
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [STORAGE_KEY, raw] as [string, string],
    );
    await page.goto('/#/editor');
    await page.getByRole('heading', { name: 'Events' }).waitFor();
    await expect(
      page.locator('.data-table').first().getByRole('cell', { name: 'Depot burns' }),
    ).toBeVisible();

    const keys = await page.evaluate(() => Object.keys(window.localStorage));
    expect(keys).not.toContain('time-travellers-tracer:story');
    expect(keys).toContain('time-travellers-tracer:index');
    expect(keys.some((k) => k.startsWith('time-travellers-tracer:story:'))).toBe(true);

    await expect(page.locator('.story-picker-trigger')).toContainText('My Story');
  });

  test('a newly created story starts isolated from the original', async ({ page }) => {
    await page.goto('/#/editor');
    await page.getByRole('heading', { name: 'Events' }).waitFor();

    const label = `First-story event ${Date.now()}`;
    await page.getByPlaceholder('New event label…').fill(label);
    await page.getByLabel('Add event').click();
    await expect(page.locator('.data-table').first().getByRole('cell', { name: label })).toBeVisible();

    await page.locator('.story-picker-trigger').click();
    await page.getByText('New story').click();
    await page.getByRole('heading', { name: 'Events' }).waitFor();
    await expect(page.locator('.data-table').first().getByRole('cell', { name: label })).toHaveCount(0);

    await page.locator('.story-picker-trigger').click();
    await page.locator('.story-picker-list').getByText('My Story').click();
    await expect(page.locator('.data-table').first().getByRole('cell', { name: label })).toBeVisible();
  });

  test('switching stories updates the URL and survives a reload', async ({ page }) => {
    await page.goto('/#/editor');
    await page.getByRole('heading', { name: 'Events' }).waitFor();
    const firstUrl = page.url();

    await page.locator('.story-picker-trigger').click();
    await page.getByText('Load example').click();
    await expect(page.locator('.data-table').first().getByRole('cell', { name: 'Depot burns' })).toBeVisible();

    const secondUrl = page.url();
    expect(secondUrl).not.toBe(firstUrl);
    expect(secondUrl).toMatch(/#\/editor\/[0-9a-f-]{36}$/);

    await page.reload();
    expect(page.url()).toBe(secondUrl);
    await expect(
      page.locator('.data-table').first().getByRole('cell', { name: 'Depot burns' }),
    ).toBeVisible();
  });

  test('renaming a story updates the picker trigger and header tag', async ({ page }) => {
    await page.goto('/#/editor');
    await page.getByRole('heading', { name: 'Events' }).waitFor();

    await page.locator('.story-picker-trigger').click();
    await page.getByLabel('Rename story').click();
    await page.locator('.story-picker-list input').fill('Chronicle A');
    await page.getByLabel('Save story name').click();

    await expect(page.locator('.story-picker-trigger')).toContainText('Chronicle A');
    await expect(page.locator('header')).toContainText('Chronicle A');
  });

  test('deleting the last remaining story is refused', async ({ page }) => {
    await page.goto('/#/editor');
    await page.getByRole('heading', { name: 'Events' }).waitFor();

    await page.locator('.story-picker-trigger').click();
    await expect(page.getByLabel('At least one story is required')).toBeDisabled();
  });

  test('deleting a non-active story shows an undo toast that restores it', async ({ page }) => {
    await page.goto('/#/editor');
    await page.getByRole('heading', { name: 'Events' }).waitFor();

    // Creating a second story switches to it, so "My Story" becomes the
    // non-active one — deletable, and safe to delete without also having
    // to navigate away from it first.
    await page.locator('.story-picker-trigger').click();
    await page.getByText('New story').click();
    await page.getByRole('heading', { name: 'Events' }).waitFor();

    await page.locator('.story-picker-trigger').click();
    await page.locator('.story-picker-list li', { hasText: 'My Story' }).getByLabel('Delete story').click();
    await expect(page.locator('.toast-host')).toContainText('Deleted "My Story"');

    await page.locator('.story-picker-trigger').click();
    await expect(page.locator('.story-picker-list')).not.toContainText('My Story');

    await page.getByText('UNDO').click();
    await page.locator('.story-picker-trigger').click();
    await expect(page.locator('.story-picker-list')).toContainText('My Story');
  });
});
