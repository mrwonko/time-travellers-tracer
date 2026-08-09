<script lang="ts">
  let { text }: { text: string } = $props();
</script>

<footer class="meta mono">{text}</footer>

<style>
  .meta {
    margin-top: auto;
    padding-top: 2.5rem;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    opacity: 0.45;
    text-align: center;
  }
</style>
