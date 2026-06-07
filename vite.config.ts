import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [foldkit()],
  server: {
    port: 5173,
    watch: {
      // The vendored Foldkit reference subtree is not part of this app.
      ignored: ['**/repos/**'],
    },
  },
  optimizeDeps: {
    // Only scan our own entry. Otherwise Vite globs every index.html under
    // repos/foldkit (its examples + website) and fails trying to resolve
    // their dependencies (maplibre-gl, monaco-editor, virtual:* plugins, ...).
    entries: ['index.html'],
  },
})
