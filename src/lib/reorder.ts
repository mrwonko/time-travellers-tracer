export type Edge = 'top' | 'bottom';

// Move `draggedId` within `list` to just before ('top') or after ('bottom')
// `targetId`. Returns a new array (never mutates `list`); returns the same
// array reference unchanged if draggedId/targetId are equal or either id
// isn't present, so callers can cheaply no-op on a degenerate drop.
export function moveWithinList<T extends { id: string }>(
  list: T[],
  draggedId: string,
  targetId: string,
  edge: Edge,
): T[] {
  if (draggedId === targetId) return list;
  const draggedIndex = list.findIndex((item) => item.id === draggedId);
  const targetIndex = list.findIndex((item) => item.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return list;

  const dragged = list[draggedIndex];
  const withoutDragged = list.filter((_, i) => i !== draggedIndex);
  // Re-locate the target in the array with `dragged` already removed —
  // its index may have shifted by one if `dragged` was before it.
  const targetIndexAfterRemoval = withoutDragged.findIndex((item) => item.id === targetId);
  const insertAt = edge === 'top' ? targetIndexAfterRemoval : targetIndexAfterRemoval + 1;

  return [...withoutDragged.slice(0, insertAt), dragged, ...withoutDragged.slice(insertAt)];
}

// Insert all of `source`'s items into `target` at the position implied by
// `targetItemId`/`edge`. `targetItemId: null` (edge is then ignored) means
// append at the end — the empty-target-list / whole-container-drop case.
// Does not mutate either input array.
export function spliceListInto<T extends { id: string }>(
  source: T[],
  target: T[],
  targetItemId: string | null,
  edge: Edge | null,
): T[] {
  if (targetItemId === null) return [...target, ...source];

  const targetIndex = target.findIndex((item) => item.id === targetItemId);
  if (targetIndex === -1) return [...target, ...source];

  const insertAt = edge === 'top' ? targetIndex : targetIndex + 1;
  return [...target.slice(0, insertAt), ...source, ...target.slice(insertAt)];
}
