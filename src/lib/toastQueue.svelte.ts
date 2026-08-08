import { generateId } from './id';

export interface ToastEntry {
  id: string;
  message: string;
  onUndo: () => void;
}

// Module-level runes store — deliberately not a context/provider, since
// there's exactly one toast stack for the whole app (mounted once by
// ToastHost in App.svelte) and every list needs to reach it from wherever
// it happens to be in the component tree.
let toasts = $state<ToastEntry[]>([]);

export function getToasts(): ToastEntry[] {
  return toasts;
}

export function pushUndo(message: string, onUndo: () => void): void {
  toasts.push({ id: generateId(), message, onUndo });
}

export function dismiss(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
}
