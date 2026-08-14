import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import TimelineList from './TimelineList.svelte';
import type { StoryTimeline } from '../types';

// The very first timeline can be added with a blank label — there's
// nothing yet to disambiguate it from. Every timeline after that needs a
// non-empty label, so multiple timelines stay tellable apart.

describe('TimelineList — add-row label requirement', () => {
  test('requires a label once a timeline already exists', async () => {
    const timelines: StoryTimeline[] = [{ id: 'u1', label: 'Prime' }];
    const { container } = await render(TimelineList, { props: { timelines, events: [] } });

    const addButton = container.querySelector('button[aria-label="Add timeline"]') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  test('allows a blank label for the very first timeline', async () => {
    const timelines: StoryTimeline[] = [];
    const { container } = await render(TimelineList, { props: { timelines, events: [] } });

    const addButton = container.querySelector('button[aria-label="Add timeline"]') as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);

    await userEvent.click(addButton);
    const rows = container.querySelectorAll('tbody tr');
    // The new (blank-label) row plus the add-row.
    expect(rows).toHaveLength(2);
    // With that first timeline now present, Add must require a label again.
    expect(addButton.disabled).toBe(true);
  });

  test('a filled-in label enables Add even with an existing timeline', async () => {
    const timelines: StoryTimeline[] = [{ id: 'u1', label: 'Prime' }];
    const { container } = await render(TimelineList, { props: { timelines, events: [] } });

    const addButton = container.querySelector('button[aria-label="Add timeline"]') as HTMLButtonElement;
    const labelInput = container.querySelector('input[placeholder="New timeline label…"]') as HTMLInputElement;

    await userEvent.fill(labelInput, 'Backup');
    expect(addButton.disabled).toBe(false);
  });
});
