<script lang="ts">
  import Router, { type RouteDefinition } from 'svelte-spa-router';
  import Landing from './routes/Landing.svelte';

  const routes: RouteDefinition = {
    '/': Landing,
  };
</script>

<Router {routes} />
