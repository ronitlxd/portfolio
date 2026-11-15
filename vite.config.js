import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages base path.
// ---------------------------------------------------------------------------
// If you deploy to a PROJECT repo (github.com/<user>/<repo>), set this to
// '/<repo>/'  e.g. base: '/portfolio/'.
// If you deploy to a USER/ORG repo (<user>.github.io served at the root),
// leave it as '/'.
// This is the ONLY line you need to change when you name the repo.
// The home-server build overrides it with VITE_BASE=/ (see server/deploy.sh).
const base = process.env.VITE_BASE || '/portfolio/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    // Build output folders. Watching them crashed the dev server (EBUSY on
    // Windows) when server/deploy.sh rewrote dist-server while it was running.
    // Also public/demos: static project replicas, copied in by scripts. A
    // watcher on files being written crashes Vite on Windows (EBUSY).
    // Side effect: restart the dev server after adding new replica files,
    // or it won't serve them (production builds are unaffected).
    watch: { ignored: ['**/dist/**', '**/dist-server/**', '**/public/demos/**'] },
    // Clippy's chat API lives on the home server. In dev it is reached
    // through an SSH tunnel on localhost:8090 (see server/deploy.sh host).
    proxy: { '/api': 'http://localhost:8090' },
  },
  build: {
    outDir: 'dist',
    // Keep chunks readable; three/drei are large so we let Vite split them.
    chunkSizeWarningLimit: 1500,
  },
})
