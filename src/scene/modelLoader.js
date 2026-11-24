import { useSyncExternalStore } from 'react'

// -----------------------------------------------------------------------------
// The office pack is one .glb, so Three's loading manager only ever
// reports 0% then 100% for it - useless for a progress bar. Instead this
// downloads the file itself as a stream, counts bytes as they arrive, and
// hands useGLTF a blob: URL of the finished file. The boot screen
// (AssetLoader.jsx) reads the byte count through useModelProgress().
//
// The download starts the moment this module is imported (same as the old
// useGLTF.preload), and happens exactly once - OfficePack suspends on the
// shared promise via useModelUrl().
// -----------------------------------------------------------------------------

// Built from the full-size original by scripts/optimize-model.mjs.
const URL_PATH = `${import.meta.env.BASE_URL}models/office_pack.opt.glb`

// Used only when the server sends no Content-Length (e.g. compressed
// transfer). Keep in sync with public/models/office_pack.opt.glb.
export const FALLBACK_BYTES = 4678260

let progress = 0 // 0..1
const listeners = new Set()
function setProgress(p) {
  progress = p
  listeners.forEach((l) => l())
}

let blobUrl = null
let error = null

async function download() {
  const res = await fetch(URL_PATH)
  if (!res.ok) throw new Error(`Model download failed: ${res.status}`)

  const total = Number(res.headers.get('Content-Length')) || FALLBACK_BYTES

  // No streaming support (very old browsers): no live progress, still works.
  if (!res.body) {
    const blob = await res.blob()
    setProgress(1)
    return URL.createObjectURL(blob)
  }

  const reader = res.body.getReader()
  const chunks = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    setProgress(Math.min(received / total, 0.99))
  }
  setProgress(1)
  return URL.createObjectURL(new Blob(chunks, { type: 'model/gltf-binary' }))
}

const promise = download().then(
  (url) => {
    blobUrl = url
  },
  (err) => {
    error = err
  },
)

/** Suspends until the model has downloaded, then returns its blob: URL. */
export function useModelUrl() {
  if (error) throw error
  if (!blobUrl) throw promise
  return blobUrl
}

/** Live download progress, 0..1. */
export function useModelProgress() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => progress,
  )
}
