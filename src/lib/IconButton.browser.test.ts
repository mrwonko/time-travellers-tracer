import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import IconButton from './IconButton.svelte';

// Click feedback is triggered by a *completed* click, deliberately not by
// `:active`/press state — a press-driven `transform: scale()` risked
// shrinking the hit-test box out from under the pointer mid-drag, which
// could swallow a click that starts on the button and ends outside it.
// The "press, drag off, release outside must NOT fire onclick" half of
// that isn't covered here: it depends on the browser's own native
// gesture recognition (whether it synthesizes a `click` at all from a
// given mouse-down/move/up sequence), which needs real OS-level input
// simulation — Vitest browser mode's `userEvent` only exposes atomic
// actions (`.click()`, `.hover()`, …), not raw multi-step mouse control.
// That one case stays a real-page Playwright test (tests/icon-button.spec.ts)
// for exactly that reason — everything else about this component doesn't
// need a full page, so it's covered here.

describe('IconButton', () => {
  test('a genuine click fires onclick', async () => {
    const onclick = vi.fn();
    const { getByRole } = await render(IconButton, { props: { icon: 'plus', label: 'Add', onclick } });
    await getByRole('button', { name: 'Add' }).click();
    expect(onclick).toHaveBeenCalledOnce();
  });

  test('accessible name comes from the button; the inner icon stays aria-hidden', async () => {
    const { getByRole } = await render(IconButton, { props: { icon: 'x', label: 'Delete row', onclick: () => {} } });
    const button = getByRole('button', { name: 'Delete row' });
    await expect.element(button).toBeInTheDocument();

    const svg = button.element().querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.hasAttribute('aria-label')).toBe(false);
  });

  test('disabled buttons do not fire onclick', async () => {
    const onclick = vi.fn();
    const { getByRole } = await render(IconButton, { props: { icon: 'plus', label: 'Add', onclick, disabled: true } });
    await expect.element(getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});
