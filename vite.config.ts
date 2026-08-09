import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Relative asset paths instead of domain-root-absolute ones — this is a
  // single-HTML-file SPA (svelte-spa-router is hash-based, so the document
  // path/depth never changes), so the same dist/ output works unmodified
  // at any subpath (e.g. GitHub Pages project sites) or custom domain,
  // with no rebuild.
  base: './',
  server: {
    port: 8080,
    host: true,
  },
})
