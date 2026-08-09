<script lang="ts">
  import { getToasts, dismiss } from './toastQueue.svelte';
  import UndoToast from './UndoToast.svelte';

  let toasts = $derived(getToasts());
</script>

<!-- Mounted once (App.svelte), so every list's delete handler can push
     into the same fixed-position stack regardless of where it sits in
     the page — this is what keeps the toast on-screen no matter how tall
     the triggering list/panel is or where the page is scrolled to. -->
<div class="toast-host">
  {#each toasts as toast (toast.id)}
    <UndoToast
      message={toast.message}
      onUndo={toast.onUndo
        ? () => {
            toast.onUndo?.();
            dismiss(toast.id);
          }
        : undefined}
      onDismiss={() => dismiss(toast.id)}
    />
  {/each}
</div>

<style>
  .toast-host {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    max-width: min(24rem, calc(100vw - 2rem));
  }
</style>
