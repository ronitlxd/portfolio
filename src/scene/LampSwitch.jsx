import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSceneControlsState, toggleLights } from './sceneControlsStore'

// -----------------------------------------------------------------------------
// A small glowing push button on the base of the desk lamp (Node_25_117 in
// the office pack). Clicking it toggles both lamp spotlights, same as the
// "L" button in the corner HUD (toggleLights in sceneControlsStore.js).
//
// Placement comes from the lamp's real geometry: its round base sits on the
// desk centred at (5.622, 0.738, 3.357), about 18cm across, with its top
// face at y 0.745. The button sits near the front (+x, camera-facing) edge.
//
// It glows warm while the lights are on and dim red while off, so it stays
// findable in the dark. toneMapped={false} lets the emissive colour go past
// 1.0 so the Bloom pass in Experience.jsx picks it up as a glow.
//
// CameraRig.jsx raycasts against `lampSwitchRef` on pointerdown and ignores
// clicks that land on it, so pressing the switch doesn't also move the
// camera (its canvas listener runs before R3F's own event handlers).
// -----------------------------------------------------------------------------

export const lampSwitchRef = { current: null }

const POSITION = [5.675, 0.749, 3.357]
const RADIUS = 0.011

export default function LampSwitch() {
  const { lightsOn } = useSceneControlsState()
  const [hovered, setHovered] = useState(false)
  const mat = useRef()

  // Slow breathing pulse so it reads as "press me".
  useFrame(({ clock }) => {
    if (!mat.current) return
    const pulse = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 2.4)
    const base = lightsOn ? 6 : 2.5
    mat.current.emissiveIntensity = base * pulse * (hovered ? 1.5 : 1)
  })

  return (
    <group position={POSITION}>
      {/* Dark collar, so the lit cap reads as a button set into the base. */}
      <mesh position={[0, -0.002, 0]}>
        <cylinderGeometry args={[RADIUS * 1.35, RADIUS * 1.45, 0.004, 24]} />
        <meshStandardMaterial color="#111" roughness={0.6} />
      </mesh>
      <mesh
        ref={(m) => (lampSwitchRef.current = m)}
        onClick={(e) => {
          e.stopPropagation()
          toggleLights()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
      >
        <cylinderGeometry args={[RADIUS, RADIUS, 0.006, 24]} />
        <meshStandardMaterial
          ref={mat}
          color={lightsOn ? '#ffd27a' : '#5a1a10'}
          emissive={lightsOn ? '#ffb347' : '#ff3b1f'}
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>
      {/* Small halo of light on the lamp base around the button. */}
      <pointLight
        color={lightsOn ? '#ffb347' : '#ff3b1f'}
        intensity={lightsOn ? 0.06 : 0.03}
        distance={0.15}
        decay={2}
        position={[0, 0.01, 0]}
      />
    </group>
  )
}
