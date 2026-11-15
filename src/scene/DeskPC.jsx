import Prop from './Prop'
import { EMBED_SCALE } from '../os/embedScale'

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

// World-space transform for the "screen" Editable in Experience.jsx, i.e.
// where the OS (<Html transform> in ScreenBridge.jsx) sits on the CRT.
//
// Fitted to the real glass, not hand-dragged. The glass is its own mesh in
// the office pack (node "Object_187", material "Monitor_Glass.001", inside
// Monitor_002.001_93). Its four corner vertices, in world space and
// including that monitor's PART_OFFSETS nudge in OfficePack.jsx (shift
// -0.818 and 1.199x stretch along z), lie in the plane x = 5.4143 and span
// z 3.9301..4.2822 and y 0.9991..1.2424. If the monitor's PART_OFFSETS
// change, these numbers must be recomputed from the glass again.
const GLASS_CENTER = [5.4143, 1.1208, 4.1062]
const GLASS_WIDTH = 0.3521 // along world z
const GLASS_HEIGHT = 0.2433 // along world y

export const SCREEN_POSITION = GLASS_CENTER
// Faces +X (towards the camera): a quarter turn about Y puts the OS's
// right edge along -z and its normal along +x.
export const SCREEN_ROTATION = [0, Math.PI / 2, 0]
// A thin strip of dark glass left showing around the picture, like a real
// CRT's unlit edge. In the OS's own pixels (800x600), on every side.
const GLASS_MARGIN_PX = 5

// drei's <Html transform> maps 40 CSS px to 1 world unit (times this
// scale), and the OS box is 800x600 * EMBED_SCALE px. So this fits it to
// the glass minus the margin. The glass is wider than 4:3 (because of the
// 1.199x monitor stretch), so x ends up about 8.5% larger than y.
const W = 800
const H = 600
export const SCREEN_SCALE = [
  (GLASS_WIDTH * ((W - 2 * GLASS_MARGIN_PX) / W) * 40) / (W * EMBED_SCALE),
  (GLASS_HEIGHT * ((H - 2 * GLASS_MARGIN_PX) / H) * 40) / (H * EMBED_SCALE),
  0.001,
]

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
