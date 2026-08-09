import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DragBoxFixture from './DragBoxFixture.svelte';

// Real drag gestures need genuine multi-step OS-level pointer input, which
// Vitest browser mode's userEvent can't produce (same reasoning as
// IconButton.browser.test.ts / MultiSelectCombobox.browser.test.ts) — that
// waits for Playwright specs once real box components exist to drag. This
// covers what's testable at this layer: the actions register/clean up
// without throwing, and dragHandle enforces its data-drag-box contract.

describe('dragHandle / dropBox action wrappers', () => {
  test('register and clean up without throwing when properly nested', async () => {
    const { container, unmount } = await render(DragBoxFixture, {
      props: { data: { level: 'moment', id: 'm1' } },
    });
    expect(container.querySelector('[data-testid="handle"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="dropzone"]')).not.toBeNull();
    expect(() => unmount()).not.toThrow();
  });

  test('dragHandle throws when not nested inside a data-drag-box element', async () => {
    await expect(
      render(DragBoxFixture, { props: { data: { level: 'moment', id: 'm1' }, wrapInBox: false } }),
    ).rejects.toThrow(/data-drag-box/);
  });
});
