<script lang="ts">
  import Router, { type RouteDefinition } from 'svelte-spa-router';
  import Landing from './routes/Landing.svelte';
  import Editor from './routes/Editor.svelte';

  const routes: RouteDefinition = {
    '/': Landing,
    '/editor': Editor,
  };
</script>

<Router {routes} />
