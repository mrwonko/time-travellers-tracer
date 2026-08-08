import { describe, test, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import ToastHost from './ToastHost.svelte';
import { getToasts, pushUndo, dismiss } from './toastQueue.svelte';

// UndoToast used to render inline at the bottom of whatever list
// triggered it (inside CollapsiblePanel's unscrolled body), which could
// end up off-screen. It's now a single fixed-position stack driven by
// this shared queue + one globally-mounted host — these tests cover the
// queue/host directly, without needing a full page or any particular
// list component to trigger a delete from.

beforeEach(() => {
  for (const t of [...getToasts()]) dismiss(t.id);
});

describe('ToastHost + toastQueue', () => {
  test('pushing two toasts renders both, stacked, in a fixed-position host', async () => {
    pushUndo('Deleted "Signal received at the depot"', () => {});
    pushUndo('Deleted "Prime"', () => {});

    const { container } = await render(ToastHost);
    const host = container.querySelector('.toast-host')!;
    expect(getComputedStyle(host).position).toBe('fixed');

    const toasts = container.querySelectorAll('.undo-toast');
    expect(toasts).toHaveLength(2);
  });

  test('clicking undo calls the callback and removes that toast', async () => {
    let undone = false;
    pushUndo('Deleted "Depot burns"', () => (undone = true));

    const { container } = await render(ToastHost);
    expect(container.querySelectorAll('.undo-toast')).toHaveLength(1);

    await userEvent.click(container.querySelector('.undo-action')!);
    expect(undone).toBe(true);
    expect(container.querySelectorAll('.undo-toast')).toHaveLength(0);
  });

  test('each toast keeps its own undo callback independent of the others', async () => {
    const calls: string[] = [];
    pushUndo('Deleted A', () => calls.push('A'));
    pushUndo('Deleted B', () => calls.push('B'));

    const { container } = await render(ToastHost);
    const undoButtons = container.querySelectorAll('.undo-action');
    expect(undoButtons).toHaveLength(2);

    await userEvent.click(undoButtons[0]);
    expect(calls).toEqual(['A']);
    expect(container.querySelectorAll('.undo-toast')).toHaveLength(1);
  });
});
