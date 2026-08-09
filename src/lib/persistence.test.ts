import { describe, test, expect } from 'vitest';
import { CURRENT_SCHEMA_VERSION, emptyStory, serializeStory, parseStoredDocument } from './persistence';
import type { Story } from './types';

// Plain Node-environment unit tests, same style as id.test.ts — this module
// touches no DOM/localStorage, only JSON + object shape.

const sampleStory: Story = {
  events: [{ id: 'e1', label: 'Signal received', predecessors: [], universe: 'u1' }],
  observers: [
    {
      id: 'o1',
      name: 'K. Voss',
      sequences: [{ id: 's1', moments: [{ id: 'm1', events: ['e1'], direction: 'forward' }] }],
    },
  ],
  universes: [{ id: 'u1', label: 'Prime' }],
};

describe('emptyStory', () => {
  test('has empty arrays for every field', () => {
    expect(emptyStory()).toEqual({ events: [], observers: [], universes: [] });
  });
});

describe('serializeStory / parseStoredDocument round trip', () => {
  test('parses back to an equal Story', () => {
    const raw = serializeStory(sampleStory);
    expect(parseStoredDocument(raw)).toEqual(sampleStory);
  });

  test('serialized form embeds the current schemaVersion', () => {
    const raw = serializeStory(sampleStory);
    expect(JSON.parse(raw).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('round trip works for an empty story', () => {
    const raw = serializeStory(emptyStory());
    expect(parseStoredDocument(raw)).toEqual(emptyStory());
  });
});

describe('parseStoredDocument error handling', () => {
  test('throws on invalid JSON', () => {
    expect(() => parseStoredDocument('not json')).toThrow();
  });

  test('throws when the top level is not an object', () => {
    expect(() => parseStoredDocument('42')).toThrow(/not an object/);
  });

  test('throws when schemaVersion is missing', () => {
    expect(() => parseStoredDocument(JSON.stringify({ story: sampleStory }))).toThrow(/schemaVersion/);
  });

  test('throws when story is missing', () => {
    expect(() => parseStoredDocument(JSON.stringify({ schemaVersion: 1 }))).toThrow(/story field/);
  });

  test('throws when story fields are not arrays', () => {
    const raw = JSON.stringify({ schemaVersion: 1, story: { events: {}, observers: [], universes: [] } });
    expect(() => parseStoredDocument(raw)).toThrow(/malformed/);
  });

  test('throws on an unknown/future schemaVersion', () => {
    const raw = JSON.stringify({ schemaVersion: 999, story: sampleStory });
    expect(() => parseStoredDocument(raw)).toThrow(/Unsupported/);
  });
});
