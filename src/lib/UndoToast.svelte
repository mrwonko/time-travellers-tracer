<script lang="ts">
  let {
    message,
    onUndo,
    onDismiss,
    duration = 6000,
  }: {
    message: string;
    onUndo: () => void;
    onDismiss: () => void;
    duration?: number;
  } = $props();

  $effect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  });
</script>

<div class="undo-toast chamfer-sm-bordered" role="status">
  <span>{message}</span>
  <button type="button" class="undo-action mono" onclick={onUndo}>UNDO</button>
</div>

<style>
  .undo-toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    margin-top: 0.75rem;
    font-size: 0.85rem;
  }

  .undo-action {
    background: none;
    border: none;
    color: var(--color-accent-ink);
    font-weight: 600;
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    padding: 0.3rem;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  .undo-action:hover,
  .undo-action:focus-visible {
    color: var(--color-accent);
  }
</style>
