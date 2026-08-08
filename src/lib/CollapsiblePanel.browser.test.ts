import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { createRawSnippet } from 'svelte';
import CollapsiblePanel from './CollapsiblePanel.svelte';

function textSnippet(text: string, onclick?: () => void) {
  return createRawSnippet(() => ({
    render: () => `<span data-testid="snippet">${text}</span>`,
    setup: (el) => {
      if (onclick) el.addEventListener('click', onclick);
    },
  }));
}

function buttonSnippet(text: string, onclick?: () => void) {
  return createRawSnippet(() => ({
    render: () => `<button type="button" data-testid="snippet">${text}</button>`,
    setup: (el) => {
      if (onclick) el.addEventListener('click', onclick);
    },
  }));
}

describe('CollapsiblePanel', () => {
  test('starts open by default and toggles via the summary', async () => {
    const { container } = await render(CollapsiblePanel, {
      props: { title: 'Events', count: 3, children: textSnippet('body') },
    });
    const details = container.querySelector('details')!;
    expect(details.open).toBe(true);

    await userEvent.click(container.querySelector('summary')!);
    expect(details.open).toBe(false);

    await userEvent.click(container.querySelector('summary')!);
    expect(details.open).toBe(true);
  });

  test('actions inside the summary do not toggle the disclosure', async () => {
    const onAction = vi.fn();
    const { container } = await render(CollapsiblePanel, {
      props: {
        title: 'Events',
        children: textSnippet('body'),
        actions: buttonSnippet('Delete', onAction),
      },
    });
    const details = container.querySelector('details')!;
    expect(details.open).toBe(true);

    await userEvent.click(container.querySelector('.panel-actions [data-testid="snippet"]')!);
    expect(onAction).toHaveBeenCalledOnce();
    // The whole point of the stopPropagation wrapper: clicking a control
    // inside <summary> must not also collapse/expand the panel.
    expect(details.open).toBe(true);
  });

  test('the chamfer border is applied directly to the <details> element', async () => {
    const { container } = await render(CollapsiblePanel, {
      props: { title: 'Events', children: textSnippet('body') },
    });
    const details = container.querySelector('details')!;
    expect(details.className).toContain('chamfer-bordered');
    expect(getComputedStyle(details).clipPath).toContain('polygon');
  });
});
