import { describe, test, expect, vi, afterEach } from 'vitest';
import { generateId } from './id';

// Plain Node-environment unit tests for generateId()'s tiered fallback —
// no browser/DOM needed at all, which is a much more direct way to cover
// this than the old approach of loading a full page with
// crypto.randomUUID stubbed away via Playwright's page.addInitScript.

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateId', () => {
  test('uses crypto.randomUUID when available', () => {
    const id = generateId();
    expect(id).toMatch(UUID_V4_RE);
  });

  test('falls back to crypto.getRandomValues when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    });
    const id = generateId();
    expect(id).toMatch(UUID_V4_RE);
  });

  test('falls back to Math.random as a last resort when crypto is entirely unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    const id = generateId();
    expect(id).toMatch(UUID_V4_RE);
  });

  test('never throws and always returns a unique-looking id across tiers', () => {
    vi.stubGlobal('crypto', undefined);
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
  });
});
