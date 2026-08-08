// Svelte action: moves `node` to `document.body` on mount, restoring its
// original position on destroy. Used by MultiSelectCombobox's popover —
// chamfered panels use `clip-path` for their cut corners, and clip-path
// clips its entire painted subtree, including position:absolute/fixed
// descendants (unlike `overflow: hidden`, which position:fixed can escape
// by anchoring to a further-out positioned ancestor). Portaling is the
// standard fix used by most popover/dropdown implementations for exactly
// this class of ancestor-clipping problem.
export function portal(node: HTMLElement) {
  document.body.appendChild(node);

  return {
    // Explicit removal rather than relying on Svelte's own teardown, which
    // assumes the node is still under its original parent — it no longer
    // is, since we moved it to <body> on mount.
    destroy() {
      node.remove();
    },
  };
}
