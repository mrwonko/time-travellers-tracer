import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EventChip from './EventChip.svelte';

// Real drag gestures need genuine multi-step OS-level pointer input (or,
// for this native-HTML5-drag-based library, manually dispatched
// DragEvents — see tests/dragDrop.ts), neither of which Vitest browser
// mode's userEvent can produce (same reasoning as MomentBox/actions'
// own browser tests). This covers what's testable at this layer:
// rendering, and the drag-and-drop wiring contract (data-drag-box +
// handle) being present.

describe('EventChip', () => {
  test('renders the label inside a chip', async () => {
    const { container } = await render(EventChip, {
      props: { eventId: 'e1', momentId: 'm1', label: 'Signal received at the depot', onReorder: () => {} },
    });

    const chip = container.querySelector('.event-chip');
    expect(chip).not.toBeNull();
    expect(chip!.textContent?.trim()).toBe('Signal received at the depot');
  });

  test('exposes a drag handle and a data-drag-box root for drag-and-drop', async () => {
    const { container } = await render(EventChip, {
      props: { eventId: 'e1', momentId: 'm1', label: 'Signal received at the depot', onReorder: () => {} },
    });

    expect(container.querySelector('[data-drag-box]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Drag to reorder event"]')).not.toBeNull();
  });
});
