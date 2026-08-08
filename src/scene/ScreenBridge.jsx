import { Html } from '@react-three/drei'
import OS from '../os/OS'
import { EMBED_SCALE } from '../os/embedScale'
import { useSceneControlsState } from './sceneControlsStore'

// -----------------------------------------------------------------------------
// THE UI BRIDGE: the Win98 OS, projected onto the CRT glass via drei's
// <Html transform>. Split out from DeskPC so it's independently editable -
// see the "screen" entry in the edit-mode layout editor (EditModeOverlay).
// Position/rotation/scale are owned entirely by the wrapping <Editable> in
// Experience.jsx; this component just renders the plane at its own local
// origin.
//
// No occlusion here, deliberately:
// - occlude="blending" (real per-pixel depth occlusion) needs the raw WebGL
//   depth buffer, which conflicts with the Bloom/Vignette EffectComposer
//   pass in Experience.jsx and blanked the screen entirely.
// - Plain `occlude` (the cheaper raycast mode) was tried too, but it only
//   tests one point (the plane's anchor) against nearby geometry - too
//   close to the monitor's own casing and that single ray gets blocked by
//   it, hiding the whole screen; back it off enough to stop that and it
//   reads as floating off the glass instead. There's no offset where both
//   sides of that tradeoff are acceptable.
// Instead this relies on CameraRig's shots (WIDE/TABLE/SCREEN_SHOT, all
// re-centered on this screen's actual front normal) keeping the camera at
// reasonable viewing angles in normal mode - free OrbitControls (edit mode
// only) is the one place a bad grazing angle is actually reachable.
//
// RESOLUTION: this is a real DOM element, CSS-transformed down to the CRT
// glass's tiny physical footprint (SCREEN_SCALE in DeskPC.jsx is ~0.014),
// so the browser has to downsample from whatever pixel size the outer
// <Html> declares. Rather than touch any os/*.jsx layout code (all of it
// assumes an 800x600 canvas), the OS + crt-overlay are rendered into an
// 800x600 wrapper and then magnified via a plain CSS `scale` transform (see
// EMBED_SCALE, shared with Window.jsx - it also needs to know about this
// external scale) - the outer <Html> box grows by the same factor so
// nothing clips, and SCREEN_SCALE is divided by the same factor so the
// final on-screen size/position is unchanged. Net effect: same look, same
// fit, more source pixels for the browser to downsample from - i.e. more
// resolution, not a bigger screen.

export default function ScreenBridge() {
  // crtDarkness/crtGrain: live-adjustable from the edit-mode panel's
  // "Screen" sliders (EditModeOverlay.jsx) - see sceneControlsStore.js.
  // Both default to 0 (matching the earlier "remove the vintage filter"
  // request), so .crt-overlay renders but is fully invisible until turned
  // up. Passed through as CSS custom properties rather than computed inline
  // styles so os.css keeps owning the actual visual formula (box-shadow
  // ratios, blend modes, etc) - this component just supplies the two raw
  // numbers.
  const { crtDarkness, crtGrain } = useSceneControlsState()

  return (
    <Html
      transform
      zIndexRange={[10, 0]}
      style={{
        position: 'relative',
        width: `${800 * EMBED_SCALE}px`,
        height: `${600 * EMBED_SCALE}px`,
        overflow: 'hidden',
        background: '#008080',
      }}
    >
      <div
        style={{
          width: '800px',
          height: '600px',
          transform: `scale(${EMBED_SCALE})`,
          transformOrigin: 'top left',
        }}
      >
        <OS />
        <div
          className="crt-overlay"
          style={{ '--crt-darkness': crtDarkness, '--crt-grain-opacity': crtGrain }}
        />
      </div>
    </Html>
  )
}
