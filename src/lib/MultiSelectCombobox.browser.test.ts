import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MultiSelectCombobox from './MultiSelectCombobox.svelte';

const OPTIONS = [
  { id: '1', label: 'Signal received at the depot' },
  { id: '2', label: 'Handoff at the overpass' },
  { id: '3', label: 'Depot burns' },
];

describe('MultiSelectCombobox', () => {
  test('popover chrome renders with the chamfer applied and correct positioning', async () => {
    const { container } = await render(MultiSelectCombobox, { props: { options: OPTIONS } });
    await userEvent.click(container.querySelector('.combobox-trigger')!);

    const host = container.querySelector('.combobox-popover-host')!;
    const chamfer = container.querySelector('.combobox-chamfer')!;

    // Regression test for the bug this whole pass started from: the
    // popover host must keep the browser's native `position: fixed` (an
    // author `position: relative` on the same element used to clobber
    // it, which also made CSS anchor positioning silently inert), and
    // the nested ChamferBox must have a real chamfer clip-path (not just
    // a plain rectangle).
    expect(getComputedStyle(host).position).toBe('fixed');
    const clipPath = getComputedStyle(chamfer).clipPath;
    expect(clipPath).not.toBe('none');
    expect(clipPath).toContain('polygon');
  });

  test('open, filter, and select an option', async () => {
    const { container } = await render(MultiSelectCombobox, { props: { options: OPTIONS } });
    await userEvent.click(container.querySelector('.combobox-trigger')!);

    const filterInput = container.querySelector('input[placeholder="Filter…"]') as HTMLInputElement;
    expect(document.activeElement).toBe(filterInput);

    await userEvent.fill(filterInput, 'Depot burns');
    const visibleOptions = [...container.querySelectorAll('.combobox-options li')].filter(
      (li) => (li as HTMLElement).offsetParent !== null,
    );
    expect(visibleOptions).toHaveLength(1);

    const checkbox = visibleOptions[0].querySelector('input[type="checkbox"]') as HTMLInputElement;
    await userEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  test('outside click and Escape both dismiss the popover', async () => {
    const { container } = await render(MultiSelectCombobox, { props: { options: OPTIONS } });
    const host = container.querySelector('.combobox-popover-host') as HTMLElement;

    await userEvent.click(container.querySelector('.combobox-trigger')!);
    expect(host.matches(':popover-open')).toBe(true);

    await userEvent.click(document.body);
    expect(host.matches(':popover-open')).toBe(false);

    await userEvent.click(container.querySelector('.combobox-trigger')!);
    expect(host.matches(':popover-open')).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(host.matches(':popover-open')).toBe(false);
  });

  test('two instances on the page stay independent (unique anchor-name/popover id)', async () => {
    const first = await render(MultiSelectCombobox, { props: { options: OPTIONS } });
    const second = await render(MultiSelectCombobox, { props: { options: OPTIONS } });

    const firstId = first.container.querySelector('.combobox-popover-host')!.id;
    const secondId = second.container.querySelector('.combobox-popover-host')!.id;
    expect(firstId).not.toBe(secondId);

    await userEvent.click(first.container.querySelector('.combobox-trigger')!);
    const firstHost = first.container.querySelector('.combobox-popover-host') as HTMLElement;
    const secondHost = second.container.querySelector('.combobox-popover-host') as HTMLElement;
    expect(firstHost.matches(':popover-open')).toBe(true);
    expect(secondHost.matches(':popover-open')).toBe(false);
  });
});
