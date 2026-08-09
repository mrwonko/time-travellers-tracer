import { describe, test, expect } from 'vitest';
import { moveWithinList, spliceListInto } from './reorder';

// Plain Node-environment unit tests for the array-index math behind all
// three drag-and-drop reorder/splice operations (moments-within-sequence,
// sequences-among-siblings, events-within-moment, and sequence-into-
// sequence merge) — no DOM/Svelte needed, mirrors id.test.ts's approach.

interface Item {
  id: string;
}

const items = (...ids: string[]): Item[] => ids.map((id) => ({ id }));
const idsOf = (list: Item[]) => list.map((item) => item.id);

describe('moveWithinList', () => {
  test('moves an item before the target on a top edge', () => {
    const result = moveWithinList(items('a', 'b', 'c'), 'c', 'a', 'top');
    expect(idsOf(result)).toEqual(['c', 'a', 'b']);
  });

  test('moves an item after the target on a bottom edge', () => {
    const result = moveWithinList(items('a', 'b', 'c'), 'a', 'b', 'bottom');
    expect(idsOf(result)).toEqual(['b', 'a', 'c']);
  });

  test('moving an item to just after itself (bottom edge of its predecessor) is a no-op position-wise', () => {
    const result = moveWithinList(items('a', 'b', 'c'), 'b', 'a', 'bottom');
    expect(idsOf(result)).toEqual(['a', 'b', 'c']);
  });

  test('dragging an item onto itself is a no-op (same array reference)', () => {
    const list = items('a', 'b', 'c');
    expect(moveWithinList(list, 'b', 'b', 'top')).toBe(list);
  });

  test('an unknown draggedId is a no-op (same array reference)', () => {
    const list = items('a', 'b', 'c');
    expect(moveWithinList(list, 'z', 'a', 'top')).toBe(list);
  });

  test('an unknown targetId is a no-op (same array reference)', () => {
    const list = items('a', 'b', 'c');
    expect(moveWithinList(list, 'a', 'z', 'top')).toBe(list);
  });

  test('does not mutate the input array', () => {
    const list = items('a', 'b', 'c');
    const before = idsOf(list);
    moveWithinList(list, 'c', 'a', 'top');
    expect(idsOf(list)).toEqual(before);
  });
});

describe('spliceListInto', () => {
  test('null targetItemId appends source at the end of target', () => {
    const result = spliceListInto(items('x', 'y'), items('a', 'b'), null, null);
    expect(idsOf(result)).toEqual(['a', 'b', 'x', 'y']);
  });

  test('splices source before the target on a top edge', () => {
    const result = spliceListInto(items('x', 'y'), items('a', 'b'), 'a', 'top');
    expect(idsOf(result)).toEqual(['x', 'y', 'a', 'b']);
  });

  test('splices source after the target on a bottom edge (insert-after-last)', () => {
    const result = spliceListInto(items('x', 'y'), items('a', 'b'), 'b', 'bottom');
    expect(idsOf(result)).toEqual(['a', 'b', 'x', 'y']);
  });

  test('splices source into the middle of target', () => {
    const result = spliceListInto(items('x', 'y'), items('a', 'b', 'c'), 'b', 'top');
    expect(idsOf(result)).toEqual(['a', 'x', 'y', 'b', 'c']);
  });

  test('splicing into an empty target appends regardless of targetItemId', () => {
    const result = spliceListInto(items('x', 'y'), [], null, null);
    expect(idsOf(result)).toEqual(['x', 'y']);
  });

  test('an unknown targetItemId falls back to appending at the end', () => {
    const result = spliceListInto(items('x', 'y'), items('a', 'b'), 'z', 'top');
    expect(idsOf(result)).toEqual(['a', 'b', 'x', 'y']);
  });

  test('does not mutate either input array', () => {
    const source = items('x', 'y');
    const target = items('a', 'b');
    const sourceBefore = idsOf(source);
    const targetBefore = idsOf(target);
    spliceListInto(source, target, 'a', 'top');
    expect(idsOf(source)).toEqual(sourceBefore);
    expect(idsOf(target)).toEqual(targetBefore);
  });
});
