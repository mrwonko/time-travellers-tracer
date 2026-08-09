<script lang="ts">
  import Router, { type RouteDefinition } from 'svelte-spa-router';
  import Landing from './routes/Landing.svelte';
  import Editor from './routes/Editor.svelte';
  import ComponentLibrary from './routes/ComponentLibrary.svelte';
  import ToastHost from './lib/ToastHost.svelte';
  import { initDragMonitor } from './lib/dnd/dragState.svelte';

  const routes: RouteDefinition = {
    '/': Landing,
    '/editor': Editor,
    // Deliberately not linked from anywhere in the app — reference/dev
    // tool only, reached by typing the URL directly.
    '/components': ComponentLibrary,
  };

  initDragMonitor();
</script>

<Router {routes} />
<ToastHost />
