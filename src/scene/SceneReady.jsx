import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// -----------------------------------------------------------------------------
// Fires onReady once the scene has actually painted, not just once assets
// have finished downloading. This lives INSIDE the same <Suspense> boundary
// as OfficePack/ScreenBridge/Environment in Experience.jsx, so React only
// mounts it after every one of their loading promises has resolved (that's
// how Suspense works - it renders nothing from the boundary until the whole
// subtree is ready, then commits it all in one go).
//
// Waiting for mount alone still isn't quite enough though - there's a real
// gap between "mounted" and "the GPU has actually uploaded textures/geometry
// and painted a frame" (shader compilation, texture upload, etc.), which is
// exactly the white-background flash Ronit saw between the loading gif
// disappearing and the model appearing. useFrame only fires once the
// renderer is actually mid-render-loop, and waiting two frames (not just
// one) gives the GPU a beat to finish that upload work before we drop the
// loading overlay.
export default function SceneReady({ onReady }) {
  const firedRef = useRef(false)
  const frameRef = useRef(0)

  useFrame(() => {
    if (firedRef.current) return
    frameRef.current += 1
    if (frameRef.current >= 2) {
      firedRef.current = true
      onReady()
    }
  })

  return null
}
