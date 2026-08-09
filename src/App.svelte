<script lang="ts">
  import Router, { type RouteDefinition } from 'svelte-spa-router';
  import Landing from './routes/Landing.svelte';
  import Editor from './routes/Editor.svelte';
  import ComponentLibrary from './routes/ComponentLibrary.svelte';
  import ToastHost from './lib/ToastHost.svelte';
  import { initDragMonitor } from './lib/dnd/dragState.svelte';

  const routes: RouteDefinition = {
    '/': Landing,
    // Both map to the same component: '/editor' (no id) redirects to the
    // last-active story on mount (see Editor.svelte), '/editor/:id' is the
    // real, bookmarkable per-story URL — spec's "current story id tracked
    // via the URL" (multi-story support).
    '/editor': Editor,
    '/editor/:id': Editor,
    // Deliberately not linked from anywhere in the app — reference/dev
    // tool only, reached by typing the URL directly.
    '/components': ComponentLibrary,
  };

  initDragMonitor();
</script>

<Router {routes} />
<ToastHost />
