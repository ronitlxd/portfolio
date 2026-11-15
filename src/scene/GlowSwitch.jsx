import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneControlsState, toggleLights } from './sceneControlsStore'

// -----------------------------------------------------------------------------
// Small glowing push buttons placed on real objects in the office pack.
// Each one toggles something in sceneControlsStore (currently just the desk
// lamp's lights).
//
// They glow warm while their thing is on and dim red while off, so they stay
// findable in the dark. toneMapped={false} lets the emissive colour go past
// 1.0 so the Bloom pass in Experience.jsx picks it up as a glow.
//
// CameraRig.jsx raycasts against `switchMeshes` on pointerdown and ignores
// clicks that land on one, so pressing a switch doesn't also move the camera
// (its canvas listener runs before R3F's own event handlers).
// -----------------------------------------------------------------------------

export const switchMeshes = new Set()

const UP = new THREE.Vector3(0, 1, 0)

function GlowSwitch({ position, normal = [0, 1, 0], radius = 0.011, on, onToggle, label }) {
  const [hovered, setHovered] = useState(false)
  const mat = useRef()
  const cap = useRef()

  // Cylinders stand along +Y, so turn +Y to face out along `normal`.
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...normal).normalize()),
    [normal],
  )

  useEffect(() => {
    const mesh = cap.current
    switchMeshes.add(mesh)
    return () => switchMeshes.delete(mesh)
  }, [])

  // Slow breathing pulse so it reads as "press me".
  useFrame(({ clock }) => {
    if (!mat.current) return
    const pulse = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 2.4)
    mat.current.emissiveIntensity = (on ? 6 : 2.5) * pulse * (hovered ? 1.5 : 1)
  })

  return (
    <group position={position} quaternion={quaternion}>
      {/* Dark collar, so the lit cap reads as a button set into the surface. */}
      <mesh position={[0, -0.002, 0]}>
        <cylinderGeometry args={[radius * 1.35, radius * 1.45, 0.004, 24]} />
        <meshStandardMaterial color="#111" roughness={0.6} />
      </mesh>
      <mesh
        ref={cap}
        name={label}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
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
        <cylinderGeometry args={[radius, radius, 0.006, 24]} />
        <meshStandardMaterial
          ref={mat}
          color={on ? '#ffd27a' : '#5a1a10'}
          emissive={on ? '#ffb347' : '#ff3b1f'}
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>
      {/* Small halo of light on the surface around the button. */}
      <pointLight
        color={on ? '#ffb347' : '#ff3b1f'}
        intensity={on ? 0.06 : 0.03}
        distance={0.15}
        decay={2}
        position={[0, 0.01, 0]}
      />
    </group>
  )
}

// Desk lamp (Node_25_117). Its round base sits on the desk centred at
// (5.622, 0.738, 3.357), about 18cm across, top face at y 0.745; the button
// sits near the front (+x, camera-facing) edge.
const LAMP_SWITCH = [5.675, 0.749, 3.357]

// A fan switch on the hub cap was tried and removed at Ronit's request. If
// it comes back: the cap's front face is at (5.2711, 0.8766, 5.4668) plus
// 0.021 along the fan's spin axis (0.6815, 0, -0.7318), radius 0.009.

export default function SceneSwitches() {
  const { lightsOn } = useSceneControlsState()
  return <GlowSwitch label="lamp-switch" position={LAMP_SWITCH} on={lightsOn} onToggle={toggleLights} />
}
