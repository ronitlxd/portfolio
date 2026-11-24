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

// Content Security Policy, injected into production builds only (the dev
// server needs inline scripts for hot reload). Scripts may only come from
// this site; network calls only go to this site, the contact form service
// and Clippy's chat API (VITE_CHAT_URL on the GitHub Pages build). blob: is
// for the 3D model (downloaded as a blob, see scene/modelLoader.js) and the
// textures inside it.
function contentSecurityPolicy() {
  const chat = process.env.VITE_CHAT_URL ? new URL(process.env.VITE_CHAT_URL).origin : ''
  const policy = [
    "default-src 'self'",
    // wasm-unsafe-eval: drei/three compile a WebAssembly decoder at load.
    // It allows WebAssembly only, not JavaScript eval().
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' blob: https://formsubmit.co ${chat}`.trim(),
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://formsubmit.co",
  ].join('; ')
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
    ],
  }
}

// Starts the 3D model download while the JavaScript is still loading. The
// fetch in scene/modelLoader.js picks up this same request.
function preloadModel() {
  return {
    name: 'preload-model',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'link',
        attrs: {
          rel: 'preload',
          href: `${base}models/office_pack.opt.glb`,
          as: 'fetch',
          type: 'model/gltf-binary',
          crossorigin: 'anonymous',
        },
        injectTo: 'head',
      },
    ],
  }
}

// Large libraries get their own files, so a content update doesn't make
// returning visitors download them again.
function vendorChunk(id) {
  if (!id.includes('node_modules')) return undefined
  if (/node_modules[\\/]three[\\/]/.test(id)) return 'three'
  if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
  return 'scene-libs'
}

export default defineConfig({
  base,
  plugins: [react(), contentSecurityPolicy(), preloadModel()],
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
    rollupOptions: { output: { manualChunks: vendorChunk } },
  },
})
