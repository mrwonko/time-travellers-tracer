import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import UniverseList from './UniverseList.svelte';
import type { StoryUniverse } from '../types';

// The very first universe can be added with a blank label — there's
// nothing yet to disambiguate it from. Every universe after that needs a
// non-empty label, so multiple universes stay tellable apart.

describe('UniverseList — add-row label requirement', () => {
  test('requires a label once a universe already exists', async () => {
    const universes: StoryUniverse[] = [{ id: 'u1', label: 'Prime' }];
    const { container } = await render(UniverseList, { props: { universes, events: [] } });

    const addButton = container.querySelector('button[aria-label="Add universe"]') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  test('allows a blank label for the very first universe', async () => {
    const universes: StoryUniverse[] = [];
    const { container } = await render(UniverseList, { props: { universes, events: [] } });

    const addButton = container.querySelector('button[aria-label="Add universe"]') as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);

    await userEvent.click(addButton);
    const rows = container.querySelectorAll('tbody tr');
    // The new (blank-label) row plus the add-row.
    expect(rows).toHaveLength(2);
    // With that first universe now present, Add must require a label again.
    expect(addButton.disabled).toBe(true);
  });

  test('a filled-in label enables Add even with an existing universe', async () => {
    const universes: StoryUniverse[] = [{ id: 'u1', label: 'Prime' }];
    const { container } = await render(UniverseList, { props: { universes, events: [] } });

    const addButton = container.querySelector('button[aria-label="Add universe"]') as HTMLButtonElement;
    const labelInput = container.querySelector('input[placeholder="New universe label…"]') as HTMLInputElement;

    await userEvent.fill(labelInput, 'Backup');
    expect(addButton.disabled).toBe(false);
  });
});
