import { describe, test, expect } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  CURRENT_REGISTRY_SCHEMA_VERSION,
  emptyStory,
  serializeStory,
  parseStoredDocument,
  emptyRegistry,
  serializeRegistry,
  parseRegistryDocument,
  migrateLegacyDocument,
  storyStorageKey,
} from './persistence';
import type { StoryRegistryEntry } from './persistence';
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
  test('has empty events/observers but one nameless universe', () => {
    const story = emptyStory();
    expect(story.events).toEqual([]);
    expect(story.observers).toEqual([]);
    expect(story.universes).toHaveLength(1);
    expect(story.universes[0].label).toBeUndefined();
    expect(story.universes[0].id).toBeTruthy();
  });

  test('generates a fresh universe id on every call', () => {
    expect(emptyStory().universes[0].id).not.toBe(emptyStory().universes[0].id);
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
    const story = emptyStory();
    const raw = serializeStory(story);
    expect(parseStoredDocument(raw)).toEqual(story);
  });
});

describe('parseStoredDocument error handling', () => {
  test('throws on invalid JSON', () => {
    expect(() => parseStoredDocument('not json')).toThrow();
  });

  test('throws when the top level is not an object', () => {
    expect(() => parseStoredDocument('42')).toThrow(/expected object/);
  });

  test('throws when schemaVersion is missing', () => {
    expect(() => parseStoredDocument(JSON.stringify({ story: sampleStory }))).toThrow(/schemaVersion/);
  });

  test('throws when story is missing', () => {
    expect(() => parseStoredDocument(JSON.stringify({ schemaVersion: 1 }))).toThrow(/at story/);
  });

  test('throws when story fields are not arrays', () => {
    const raw = JSON.stringify({ schemaVersion: 1, story: { events: {}, observers: [], universes: [] } });
    expect(() => parseStoredDocument(raw)).toThrow(/expected array/);
  });

  test('throws on an unknown/future schemaVersion', () => {
    const raw = JSON.stringify({ schemaVersion: 999, story: sampleStory });
    expect(() => parseStoredDocument(raw)).toThrow(/Invalid discriminator/);
  });
});

describe('emptyRegistry', () => {
  test('has no stories and the current schemaVersion', () => {
    const registry = emptyRegistry();
    expect(registry.stories).toEqual([]);
    expect(registry.schemaVersion).toBe(CURRENT_REGISTRY_SCHEMA_VERSION);
  });
});

describe('serializeRegistry / parseRegistryDocument round trip', () => {
  const sampleEntries: StoryRegistryEntry[] = [
    { id: 'story-1', name: 'My Story', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];

  test('parses back to an equal stories list', () => {
    const raw = serializeRegistry({ schemaVersion: CURRENT_REGISTRY_SCHEMA_VERSION, stories: sampleEntries });
    expect(parseRegistryDocument(raw)).toEqual(sampleEntries);
  });

  test('round trip works for an empty registry', () => {
    const raw = serializeRegistry(emptyRegistry());
    expect(parseRegistryDocument(raw)).toEqual([]);
  });
});

describe('parseRegistryDocument error handling', () => {
  test('throws on invalid JSON', () => {
    expect(() => parseRegistryDocument('not json')).toThrow();
  });

  test('throws when the top level is not an object', () => {
    expect(() => parseRegistryDocument('42')).toThrow(/not an object/);
  });

  test('throws when schemaVersion is missing', () => {
    expect(() => parseRegistryDocument(JSON.stringify({ stories: [] }))).toThrow(/schemaVersion/);
  });

  test('throws when stories is not an array', () => {
    const raw = JSON.stringify({ schemaVersion: CURRENT_REGISTRY_SCHEMA_VERSION, stories: {} });
    expect(() => parseRegistryDocument(raw)).toThrow(/malformed/);
  });

  test('throws on an unknown/future schemaVersion', () => {
    const raw = JSON.stringify({ schemaVersion: 999, stories: [] });
    expect(() => parseRegistryDocument(raw)).toThrow(/Unsupported/);
  });
});

describe('migrateLegacyDocument', () => {
  test('wraps a legacy single-story document into a one-entry registry', () => {
    const legacyRaw = serializeStory(sampleStory);
    const result = migrateLegacyDocument(legacyRaw);

    expect(result.storedDoc).toEqual({ schemaVersion: CURRENT_SCHEMA_VERSION, story: sampleStory });
    expect(result.registry.schemaVersion).toBe(CURRENT_REGISTRY_SCHEMA_VERSION);
    expect(result.registry.stories).toHaveLength(1);
    expect(result.registry.stories[0]).toMatchObject({ id: result.storyId, name: 'My Story' });
    expect(result.registry.stories[0].updatedAt).toBeTruthy();
  });

  test('mints a fresh id each time', () => {
    const legacyRaw = serializeStory(sampleStory);
    expect(migrateLegacyDocument(legacyRaw).storyId).not.toBe(migrateLegacyDocument(legacyRaw).storyId);
  });

  test('rejects a malformed legacy document the same way parseStoredDocument does', () => {
    expect(() => migrateLegacyDocument('not json')).toThrow();
  });
});

describe('storyStorageKey', () => {
  test('namespaces by id', () => {
    expect(storyStorageKey('abc')).toBe('time-travellers-tracer:story:abc');
    expect(storyStorageKey('abc')).not.toBe(storyStorageKey('def'));
  });
});
