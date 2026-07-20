import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // The QA harness writes captures here mid-run; without this the watcher
      // reloads the page between sessions and wipes window.__RIG.
      ignored: ['**/qa-shots/**', '**/qa/**'],
    },
  },
})
