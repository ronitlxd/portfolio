import { useSyncExternalStore } from 'react'

// -----------------------------------------------------------------------------
// Fan/lights on-off toggles - a plain external store (same pattern as
// editStore.js) so the same booleans are readable both inside <Canvas>
// (OfficePack's fan spin + lamp lights) and outside it (IntroHUD's toggle
// buttons), with no context-bridging concerns. Both default to on, matching
// how the scene behaved before these toggles existed.
//
// zoomedToScreen: set by CameraRig.jsx (inside <Canvas>) whenever its
// hoveringRef flips - i.e. true exactly when the SCREEN_SHOT shot is
// active. Read by ScreenBridge.jsx (also inside <Canvas>, but a separate
// component with no direct link to CameraRig) to fade .crt-overlay out up
// close. Same store used for a Canvas-to-Canvas link here, not just
// Canvas-to-DOM like fanOn/lightsOn - the pattern doesn't care which side
// of the Canvas boundary either reader/writer sits on.
// -----------------------------------------------------------------------------

const listeners = new Set()

// crtDarkness/crtGrain: the CRT glass overlay's (.crt-overlay in os.css)
// flat-darkening alpha and grain/noise layer opacity, adjustable live from
// the edit-mode panel (EditModeOverlay.jsx) via setCrtDarkness/setCrtGrain
// below. Read by ScreenBridge.jsx, which passes them through as CSS custom
// properties (--crt-darkness/--crt-grain-opacity) on the overlay div itself
// - os.css's rgba()/opacity rules reference those vars (with a fallback) so
// this store is the only place the "current" value lives, same idea as
// fanOn/lightsOn above.
// crtDarkness/crtGrain default to Ronit's tuned values (0.08/0.89), set live
// via the "Screen" section of the edit-mode panel and confirmed as the
// desired look - a subtle vignette darkening plus a pronounced grain/noise
// layer. Still fully adjustable from that same panel.
let state = {
  fanOn: true,
  lightsOn: true,
  zoomedToScreen: false,
  zoomOutSignal: 0,
  crtDarkness: 0.08,
  crtGrain: 0.89,
}

function emit() {
  listeners.forEach((l) => l())
}

export function getSceneControlsState() {
  return state
}

export function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useSceneControlsState() {
  return useSyncExternalStore(subscribe, getSceneControlsState, getSceneControlsState)
}

export function toggleFan() {
  state = { ...state, fanOn: !state.fanOn }
  emit()
}

export function toggleLights() {
  state = { ...state, lightsOn: !state.lightsOn }
  emit()
}

// Idempotent on purpose - safe to call every frame from CameraRig's useFrame
// without worrying about tracking "did this just flip" separately; only
// actually updates/emits when the value changes.
export function setZoomedToScreen(value) {
  if (state.zoomedToScreen === value) return
  state = { ...state, zoomedToScreen: value }
  emit()
}

// Click-to-zoom-out signal: the OS desktop (OS.jsx, a real DOM node sitting
// on top of the canvas once zoomed into the screen) can't dispatch a canvas
// pointerdown for a click on its own empty wallpaper area - the click lands
// on that DOM element instead. Clicking empty desktop calls this so
// CameraRig (inside <Canvas>, no direct link to OS.jsx) can react. A plain
// incrementing counter rather than a boolean so two zoom-out clicks in a row
// (already zoomed out) still register as a distinct "event" a subscriber can
// diff against, same idea as a Redux action rather than a flag.
export function requestZoomOut() {
  state = { ...state, zoomOutSignal: state.zoomOutSignal + 1 }
  emit()
}

export function setCrtDarkness(value) {
  state = { ...state, crtDarkness: value }
  emit()
}

export function setCrtGrain(value) {
  state = { ...state, crtGrain: value }
  emit()
}
