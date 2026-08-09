import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MomentBox from './MomentBox.svelte';
import type { Moment } from '../types';

// MomentBox replaces the old table-row-based MomentRow — same row-scoped
// local edit state (own `editing`/draft, not a list-level `editingId`),
// now rendered as a box instead of a <tr>. These tests carry over what
// mattered about that behavior in the new shape.

const eventOptions = [
  { id: 'e1', label: 'Signal received at the depot' },
  { id: 'e2', label: 'Handoff at the overpass' },
];
const eventLabel = (id: string) => eventOptions.find((e) => e.id === id)?.label ?? id;

function makeMoment(overrides: Partial<Moment> = {}): Moment {
  return { id: 'm1', events: ['e1'], direction: 'forward', ...overrides };
}

describe('MomentBox', () => {
  test('read view shows index, one chip per event, and a direction badge', async () => {
    const { container } = await render(MomentBox, {
      props: {
        moment: makeMoment({ events: ['e1', 'e2'] }),
        index: 3,
        eventOptions,
        eventLabel,
        onSave: () => {},
        onDelete: () => {},
      },
    });

    expect(container.textContent).toContain('#3');
    const chips = container.querySelectorAll('.event-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent?.trim()).toBe('Signal received at the depot');
    expect(chips[1].textContent?.trim()).toBe('Handoff at the overpass');
    expect(container.textContent).toContain('FWD');
  });

  test('edit -> save calls onSave with the updated patch and returns to read view', async () => {
    let saved: { events: string[]; direction: 'forward' | 'inverted' } | null = null;
    const { container } = await render(MomentBox, {
      props: {
        moment: makeMoment(),
        index: 1,
        eventOptions,
        eventLabel,
        onSave: (patch) => (saved = patch),
        onDelete: () => {},
      },
    });

    await userEvent.click(container.querySelector('button[aria-label="Edit moment"]')!);
    expect(container.querySelector('.combobox-trigger')).not.toBeNull();

    await userEvent.click(container.querySelector('.direction-toggle button:last-child')!);
    await userEvent.click(container.querySelector('button[aria-label="Save moment"]')!);

    expect(saved).toEqual({ events: ['e1'], direction: 'inverted' });
    expect(container.querySelector('button[aria-label="Edit moment"]')).not.toBeNull();
  });

  test('edit -> cancel discards the draft and does not call onSave', async () => {
    let saveCalled = false;
    const { container } = await render(MomentBox, {
      props: {
        moment: makeMoment(),
        index: 1,
        eventOptions,
        eventLabel,
        onSave: () => (saveCalled = true),
        onDelete: () => {},
      },
    });

    await userEvent.click(container.querySelector('button[aria-label="Edit moment"]')!);
    await userEvent.click(container.querySelector('button[aria-label="Cancel edit"]')!);

    expect(saveCalled).toBe(false);
    expect(container.querySelector('button[aria-label="Edit moment"]')).not.toBeNull();
  });

  test('delete calls onDelete', async () => {
    let deleted = false;
    const { container } = await render(MomentBox, {
      props: {
        moment: makeMoment(),
        index: 1,
        eventOptions,
        eventLabel,
        onSave: () => {},
        onDelete: () => (deleted = true),
      },
    });

    await userEvent.click(container.querySelector('button[aria-label="Delete moment"]')!);
    expect(deleted).toBe(true);
  });

  test('two moment boxes can be edited simultaneously without losing either draft', async () => {
    const boxA = await render(MomentBox, {
      props: {
        moment: makeMoment({ id: 'a' }),
        index: 1,
        eventOptions,
        eventLabel,
        onSave: () => {},
        onDelete: () => {},
      },
    });
    const boxB = await render(MomentBox, {
      props: {
        moment: makeMoment({ id: 'b' }),
        index: 2,
        eventOptions,
        eventLabel,
        onSave: () => {},
        onDelete: () => {},
      },
    });

    await userEvent.click(boxA.container.querySelector('button[aria-label="Edit moment"]')!);
    await userEvent.click(boxB.container.querySelector('button[aria-label="Edit moment"]')!);

    expect(boxA.container.querySelector('.combobox-trigger')).not.toBeNull();
    expect(boxB.container.querySelector('.combobox-trigger')).not.toBeNull();
  });
});
