import Prop from './Prop'

// -----------------------------------------------------------------------------
// HERO PROP (v2 - single combined model).
// Everything (desk, CRT, keyboard, mouse, speakers, drawers, phone, papers...)
// comes from ONE glb: objects/desk.glb -> public/models/desk.glb. The model was
// authored in centimetres with its base resting at y=0, so MODEL_SCALE (0.01)
// converts the whole thing to metres in one step - no per-part placement.
//
// The OS/CRT screen bridge lives in its own component (ScreenBridge.jsx) so it
// can be positioned independently and tuned live via the "screen" entry in the
// edit-mode layout editor, instead of being hardcoded here.
//
//   GROUP         where the whole desk+PC sits in the scene
//   MODEL_SCALE   cm -> m for the whole model
// -----------------------------------------------------------------------------
export const GROUP = [0, 0, 0]
export const MODEL_SCALE = 0.01

// Finalized via the "screen" entry in the edit-mode layout editor (drag,
// tilt, and scale the OS plane onto the glass, then "Copy all as code").
// World-space transform for the "screen" Editable in Experience.jsx.
//
// SCREEN_SCALE is inversely proportional to EMBED_SCALE (os/embedScale.js)
// - the outer <Html> pixel box grows by EMBED_SCALE, so this has to shrink
// by the same factor to keep the actual on-screen size/position on the
// glass unchanged. EMBED_SCALE went 2 -> 3 -> 4 for an increasingly
// clearer/sharper screen, so these values were multiplied by 3/4 (from
// [0.0056, 0.00533, 0.00267]) to match. If EMBED_SCALE changes again, scale
// these by (old/new) the same way.
export const SCREEN_POSITION = [5.409, 1.121, 4.105]
export const SCREEN_ROTATION = [-2.865, 1.565, 2.866]
// Re-baked from a live "Copy all as code" dump out of the edit-mode layout
// editor (screen nudged/rescaled by hand on the glass) - position/rotation
// unchanged, only the scale moved.
export const SCREEN_SCALE = [0.004, 0.004, 0.001]

// target OrbitControls aims at (see Experience.jsx)
export const SCREEN_TARGET = SCREEN_POSITION

// Fallback: a plain box roughly where the whole desk+PC footprint would be,
// only shown if desk.glb fails to load.
function FallbackPrimitive() {
  return (
    <mesh position={[0, 0.9, 0.3]} castShadow>
      <boxGeometry args={[1.9, 1.8, 1.0]} />
      <meshStandardMaterial color="#3a3440" roughness={0.7} />
    </mesh>
  )
}

export default function DeskPC({ position = GROUP }) {
  return (
    <group position={position}>
      {/* the whole desk+PC: real model when enabled, primitive otherwise */}
      <Prop name="desk" scale={MODEL_SCALE}>
        <FallbackPrimitive />
      </Prop>
    </group>
  )
}
