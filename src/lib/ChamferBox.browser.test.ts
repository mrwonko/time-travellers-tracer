import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChamferBox, { chamferClass } from './ChamferBox.svelte';

describe('chamferClass (pure)', () => {
  test('defaults to md, bordered', () => {
    expect(chamferClass()).toBe('chamfer-bordered');
  });

  test('covers all size/bordered combinations', () => {
    expect(chamferClass('md', true)).toBe('chamfer-bordered');
    expect(chamferClass('sm', true)).toBe('chamfer-sm-bordered');
    expect(chamferClass('md', false)).toBe('chamfer');
    expect(chamferClass('sm', false)).toBe('chamfer-sm');
  });
});

describe('ChamferBox component', () => {
  test('renders the requested tag with a real chamfer clip-path applied', async () => {
    const { container } = await render(ChamferBox, { props: { tag: 'section', size: 'sm' } });
    const el = container.querySelector('section');
    expect(el).not.toBeNull();
    expect(el!.className).toContain('chamfer-sm-bordered');
    const clipPath = getComputedStyle(el!).clipPath;
    expect(clipPath).not.toBe('none');
    expect(clipPath).toContain('polygon');
  });

  test('merges a consumer-supplied class alongside the chamfer class', async () => {
    const { container } = await render(ChamferBox, { props: { class: 'my-box' } });
    const el = container.querySelector('div');
    expect(el!.className).toContain('my-box');
    expect(el!.className).toContain('chamfer-bordered');
  });
});
