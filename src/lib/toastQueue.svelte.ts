import { generateId } from './id';

export interface ToastEntry {
  id: string;
  message: string;
  // Absent for a plain informational toast (e.g. "your saved story was
  // corrupt, starting fresh") — there's nothing meaningful to undo, so
  // UndoToast/ToastHost render without the UNDO button in that case.
  onUndo?: () => void;
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

export function pushToast(message: string): void {
  toasts.push({ id: generateId(), message });
}

export function dismiss(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
}
