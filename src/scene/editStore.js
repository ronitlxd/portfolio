import { useSyncExternalStore } from 'react'

// -----------------------------------------------------------------------------
// TEMPORARY LAYOUT EDITOR - shared state.
//
// A plain external store (not React context) so the same state is readable
// both inside <Canvas> (a separate react-three-fiber renderer) and outside it
// (the plain HTML overlay button/panel), with no context-bridging concerns.
//
// This whole file, Editable.jsx, and EditModeOverlay.jsx exist ONLY to let you
// drag/rotate/scale objects in the browser to find positions you like. Once
// you're happy, read the numbers off the panel (or hit "Copy as code") and
// they get baked into the real POS table in props.jsx / CRT.jsx. Nothing here
// affects the shipped site unless edit mode is switched on.
// -----------------------------------------------------------------------------

const listeners = new Set()

let state = {
  // Defaults off (Ronit's request) - this is a temporary dev tool, not part
  // of the shipped experience, so visitors should land straight in the
  // scripted camera dolly, not the free-orbit editor. Still one click away
  // via the "Edit Layout" button (EditModeOverlay.jsx) whenever it's needed
  // again.
  enabled: false,
  mode: 'translate', // 'translate' | 'rotate' | 'scale'
  selected: null,
  transforms: {}, // { [id]: { position:[x,y,z], rotation:[x,y,z], scale:[x,y,z] } } - live, editable
  defaults: {}, // same shape - the ORIGINAL scene position, used by "Reset this object"
  // { [id]: true } - marks an object for deletion from the SOURCE, not the live
  // scene (there are ~130 of these on the office pack; toggling one off here
  // does not hide/unmount anything). It only changes what "Copy all as code"
  // prints, so you can go delete the flagged ones from the actual code
  // yourself afterward.
  removed: {},
}

function emit() {
  listeners.forEach((l) => l())
}

export function getEditState() {
  return state
}

export function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useEditState() {
  return useSyncExternalStore(subscribe, getEditState, getEditState)
}

export function setEnabled(v) {
  state = { ...state, enabled: v, selected: v ? state.selected : null }
  emit()
}

export function setMode(m) {
  state = { ...state, mode: m }
  emit()
}

export function select(id) {
  state = { ...state, selected: id }
  emit()
}

// Called once by each <Editable> on mount so the panel has starting values
// even before you touch the gizmo. Also remembers the ORIGINAL scene position
// (state.defaults) so "Reset this object" can restore it, not snap to [0,0,0].
export function registerDefault(id, def) {
  if (state.transforms[id]) return
  state = {
    ...state,
    transforms: { ...state.transforms, [id]: def },
    defaults: { ...state.defaults, [id]: def },
  }
  emit()
}

export function updateTransform(id, t) {
  state = { ...state, transforms: { ...state.transforms, [id]: { ...state.transforms[id], ...t } } }
  emit()
}

export function resetTransform(id, def) {
  state = { ...state, transforms: { ...state.transforms, [id]: def } }
  emit()
}

export function toggleRemoved(id) {
  state = { ...state, removed: { ...state.removed, [id]: !state.removed[id] } }
  emit()
}
