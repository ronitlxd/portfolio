import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages base path.
// ---------------------------------------------------------------------------
// If you deploy to a PROJECT repo (github.com/<user>/<repo>), set this to
// '/<repo>/'  e.g. base: '/portfolio/'.
// If you deploy to a USER/ORG repo (<user>.github.io served at the root),
// leave it as '/'.
// This is the ONLY line you need to change when you name the repo.
const base = '/portfolio/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Keep chunks readable; three/drei are large so we let Vite split them.
    chunkSizeWarningLimit: 1500,
  },
})
