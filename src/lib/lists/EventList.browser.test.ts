import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import EventList from './EventList.svelte';
import type { StoryEvent, StoryTimeline } from '../types';

// Editing used to be list-scoped (one shared `editingId`), so starting a
// second edit silently discarded the first row's in-progress draft. Edit
// state is now row-scoped (each row is its own component instance with
// its own local state) — these two rows must be editable at once without
// either draft being lost.

describe('EventList — row-scoped independent editing', () => {
  test('two rows can be edited simultaneously without losing either draft', async () => {
    const timelines: StoryTimeline[] = [{ id: 'u1', label: 'Prime' }];
    const events: StoryEvent[] = [
      { id: 'e1', label: 'Signal received at the depot', predecessors: [], timeline: 'u1' },
      { id: 'e2', label: 'Handoff at the overpass', predecessors: ['e1'], timeline: 'u1' },
    ];
    const { container } = await render(EventList, { props: { events, timelines } });

    const rows = container.querySelectorAll('tbody tr');
    await userEvent.click(rows[0].querySelector('button[aria-label="Edit event"]')!);
    await userEvent.click(rows[1].querySelector('button[aria-label="Edit event"]')!);

    const row0Input = rows[0].querySelector('input.field') as HTMLInputElement;
    const row1Input = rows[1].querySelector('input.field') as HTMLInputElement;

    // Both rows must still be in edit mode — starting the second edit
    // must not have silently cancelled the first.
    expect(row0Input).not.toBeNull();
    expect(row1Input).not.toBeNull();

    await userEvent.fill(row0Input, 'Row zero edited');
    await userEvent.fill(row1Input, 'Row one edited');

    // Each row's draft must reflect only its own edit, not the other's.
    expect(row0Input.value).toBe('Row zero edited');
    expect(row1Input.value).toBe('Row one edited');

    await userEvent.click(rows[0].querySelector('button[aria-label="Save event"]')!);
    await userEvent.click(rows[1].querySelector('button[aria-label="Save event"]')!);

    expect(rows[0].textContent).toContain('Row zero edited');
    expect(rows[1].textContent).toContain('Row one edited');
  });
});
