import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SCREEN_POSITION, SCREEN_ROTATION } from './DeskPC'
import { setZoomedToScreen, useSceneControlsState } from './sceneControlsStore'

// -----------------------------------------------------------------------------
// CINEMATIC CAMERA RIG - four stages, per Ronit's latest spec:
//
//   1. IDLE   - before the first click, the camera slowly dollies side to
//               side (a continuous sine-wave sweep, not a one-shot move),
//               idling until the user clicks anywhere.
//   2. TABLE  - a click eases the camera into a close, straight-on front
//               shot of the whole desk (same TABLE shot as before).
//   3. SCREEN - while on TABLE, simply HOVERING the cursor near the CRT
//               screen's on-screen position eases the camera in until the
//               glass fills the frame (no click needed) - moving the cursor
//               away eases back out to TABLE. This is a hover trigger, not a
//               click trigger (reverted from the click-based version from
//               last turn, per explicit request).
//   4. Back to IDLE - while on TABLE, clicking near the far left/right edge
//               of the browser viewport (not the 3D scene) eases back out to
//               IDLE, which then resumes its side-to-side sweep from scratch.
//
// Every stage CHANGE (idle->table, table->idle) is a fixed-duration eased
// dolly (DURATION/easeInOutCubic below). The table<->screen hover, like
// before, uses continuous proximity rather than a single tween trigger, but
// still animates via the same tween mechanism once it decides to move.
//
// Only active when NOT in the layout editor (see Experience.jsx, which swaps
// this out for a free OrbitControls while edit mode is on).
// -----------------------------------------------------------------------------

// World position of "Monitor_002001_93" in the office pack (computed from
// the .glb's own node transforms, not eyeballed).
const CAMERA_TARGET = [5.304, 1.009, 4.109]

const WIDE = { position: [8.604, 3.014, 7.291], look: CAMERA_TARGET, fov: 50 }
const TABLE = { position: [7.104, 1.362, 4.099], look: CAMERA_TARGET, fov: 45 }
const SCREEN_SHOT = { position: [5.909, 1.122, 4.103], look: SCREEN_POSITION, fov: 35 }

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const SCREEN_UP = new THREE.Vector3(0, 1, 0)
  .applyEuler(new THREE.Euler(...SCREEN_ROTATION))
  .normalize()

// Screen's own "right" direction in world space - used for the table/screen
// parallax+pan only.
const SCREEN_RIGHT = new THREE.Vector3(0, 0, -1)

// IDLE sweep: the camera's position slides side to side around WIDE.position
// (not just a look-direction pan) along the lateral axis perpendicular to
// WIDE's own view direction, continuously via a sine wave - so it's already
// smooth and naturally loops forever with no discrete tween needed.
const WIDE_POS = new THREE.Vector3(...WIDE.position)
const WIDE_VIEW_DIR = new THREE.Vector3(...CAMERA_TARGET).sub(WIDE_POS).normalize()
const WIDE_RIGHT = new THREE.Vector3().crossVectors(WORLD_UP, WIDE_VIEW_DIR).normalize()
const SWEEP_AMPLITUDE = 1.8 // world units each side of center
const SWEEP_PERIOD = 14 // seconds for one full left-right-left cycle - "slowly"

// Parallax strength while settled on TABLE/SCREEN_SHOT (unrelated to the
// IDLE sweep above) - only applied once a tween has finished, never mid-tween.
const TABLE_PARALLAX_X = 0.12
const TABLE_PARALLAX_Y = 0.07
const SCREEN_PAN_X = 0.06
const SCREEN_PAN_Y = 0.04
const PARALLAX_LERP_SPEED = 3.0

// How close (normalized device coords, -1..1) the cursor needs to be to the
// screen's on-screen position, while on TABLE, before the rig eases in on
// it. Exit radius is deliberately much larger than entry (see original
// reasoning below) - once zoomed in, the OS content fills nearly the whole
// frame, so only moving toward the very edges of the viewport backs out.
const HOVER_RADIUS_X = 0.22
const HOVER_RADIUS_Y = 0.3
const HOVER_RADIUS_X_EXIT = 0.92
const HOVER_RADIUS_Y_EXIT = 0.92

// A click within this many NDC units of the left/right viewport edge, while
// on TABLE, backs out to IDLE (requirement 3) - "edge of left or right
// screen", i.e. browser viewport edges, not 3D scene geometry.
const EDGE_CLICK_THRESHOLD = 0.8

// Fixed-duration eased dolly for every discrete stage change.
const DURATION = 1.3 // seconds
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const screenWorldPos = new THREE.Vector3(...SCREEN_POSITION)
const screenNDC = new THREE.Vector3()
const targetPos = new THREE.Vector3()
const shotLookVec = new THREE.Vector3()
const tableLookVec = new THREE.Vector3(...TABLE.look)

export default function CameraRig({ onStart }) {
  const { camera, gl, size } = useThree()
  // 'idle' | 'table' | 'screen' - a ref, not React state: nothing here
  // renders JSX off of it, everything reads/writes it inside the frame loop
  // or DOM event handlers, so a ref avoids unnecessary re-renders.
  const stageRef = useRef('idle')
  const lookRef = useRef(new THREE.Vector3(...WIDE.look))
  const pointerRef = useRef({ x: 0, y: 0 })
  const sweepStartTimeRef = useRef(performance.now() / 1000)
  const controls = useSceneControlsState()
  const lastZoomOutSignalRef = useRef(controls.zoomOutSignal)

  // A fixed reference camera matching the TABLE shot exactly, used ONLY to
  // decide table<->screen hover - never rendered, never moved by
  // parallax/transitions. Prevents a feedback loop where hovering toward the
  // screen moves the live camera, which moves the screen's projected
  // position, which changes the hover result, which moves the camera again.
  const refCameraRef = useRef(null)

  const tweenRef = useRef({
    active: false,
    startTime: 0,
    startPos: new THREE.Vector3(),
    startLook: new THREE.Vector3(),
    startUp: new THREE.Vector3(0, 1, 0),
    startFov: WIDE.fov,
    targetPos: new THREE.Vector3(),
    targetLook: new THREE.Vector3(),
    targetUp: new THREE.Vector3(0, 1, 0),
    targetFov: WIDE.fov,
  })

  const beginTween = (shot) => {
    const tw = tweenRef.current
    tw.startPos.copy(camera.position)
    tw.startLook.copy(lookRef.current)
    tw.startUp.copy(camera.up)
    tw.startFov = camera.fov
    tw.targetPos.set(...shot.position)
    tw.targetLook.set(...shot.look)
    tw.targetUp.copy(shot === SCREEN_SHOT ? SCREEN_UP : WORLD_UP)
    tw.targetFov = shot.fov
    tw.startTime = performance.now() / 1000
    tw.active = true
  }

  useEffect(() => {
    const el = gl.domElement

    const onDown = (e) => {
      if (tweenRef.current.active) return // ignore clicks mid-transition

      if (stageRef.current === 'idle') {
        stageRef.current = 'table'
        onStart?.()
        beginTween(TABLE)
        return
      }

      if (stageRef.current === 'table') {
        // Only an edge click does anything here now - zooming INTO the
        // screen is hover-driven (see useFrame below), not click-driven.
        const rect = el.getBoundingClientRect()
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
        if (Math.abs(nx) > EDGE_CLICK_THRESHOLD) {
          stageRef.current = 'idle'
          sweepStartTimeRef.current = performance.now() / 1000 // resume sweep from center, phase 0
          beginTween(WIDE)
        }
        return
      }

      // stageRef.current === 'screen': this only fires for a canvas-level
      // click that landed OUTSIDE the OS's own DOM overlay (the Html
      // element normally catches clicks first) - treat it as "back to
      // table", same as moving the cursor away would.
      stageRef.current = 'table'
      setZoomedToScreen(false)
      beginTween(TABLE)
    }
    el.addEventListener('pointerdown', onDown)

    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }
    window.addEventListener('pointermove', onMove)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
    }
  }, [gl, onStart])

  // Zoom-out requested from inside the OS (clicking empty desktop) - kept as
  // an extra fallback alongside the hover-out above; harmless since it's
  // idempotent with hover already exiting on its own.
  useEffect(() => {
    if (controls.zoomOutSignal === lastZoomOutSignalRef.current) return
    lastZoomOutSignalRef.current = controls.zoomOutSignal
    if (stageRef.current === 'screen' && !tweenRef.current.active) {
      stageRef.current = 'table'
      setZoomedToScreen(false)
      beginTween(TABLE)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.zoomOutSignal])

  useFrame((_state, delta) => {
    const tw = tweenRef.current

    // ---- IDLE: continuous side-to-side sweep, no tween/lerp needed - the
    // sine wave is already smooth and already loops. ----
    if (stageRef.current === 'idle' && !tw.active) {
      const now = performance.now() / 1000
      const phase = ((now - sweepStartTimeRef.current) / SWEEP_PERIOD) * Math.PI * 2
      const offset = Math.sin(phase) * SWEEP_AMPLITUDE
      targetPos.copy(WIDE_POS).addScaledVector(WIDE_RIGHT, offset)
      camera.position.copy(targetPos)
      lookRef.current.set(...CAMERA_TARGET)
      camera.up.copy(WORLD_UP)
      camera.lookAt(lookRef.current)
      if (camera.isPerspectiveCamera && camera.fov !== WIDE.fov) {
        camera.fov = WIDE.fov
        camera.updateProjectionMatrix()
      }
      return
    }

    // ---- TABLE/SCREEN hover check (only once settled, not mid-tween) ----
    if (!tw.active && (stageRef.current === 'table' || stageRef.current === 'screen')) {
      if (!refCameraRef.current) {
        refCameraRef.current = new THREE.PerspectiveCamera(TABLE.fov, 1, 0.1, 100)
      }
      const rc = refCameraRef.current
      rc.fov = TABLE.fov
      rc.aspect = size.width / size.height
      rc.position.set(...TABLE.position)
      rc.lookAt(tableLookVec)
      rc.updateProjectionMatrix()
      rc.updateMatrixWorld(true)

      screenNDC.copy(screenWorldPos).project(rc)
      const dx = pointerRef.current.x - screenNDC.x
      const dy = pointerRef.current.y - screenNDC.y
      const rx = stageRef.current === 'screen' ? HOVER_RADIUS_X_EXIT : HOVER_RADIUS_X
      const ry = stageRef.current === 'screen' ? HOVER_RADIUS_Y_EXIT : HOVER_RADIUS_Y
      const hovering = Math.abs(dx) < rx && Math.abs(dy) < ry

      if (hovering && stageRef.current === 'table') {
        stageRef.current = 'screen'
        setZoomedToScreen(true)
        beginTween(SCREEN_SHOT)
      } else if (!hovering && stageRef.current === 'screen') {
        stageRef.current = 'table'
        setZoomedToScreen(false)
        beginTween(TABLE)
      }
    }

    // ---- Active tween: fixed-duration eased dolly toward whatever shot
    // beginTween() was last called with. ----
    if (tw.active) {
      const elapsed = performance.now() / 1000 - tw.startTime
      const rawT = Math.min(elapsed / DURATION, 1)
      const t = easeInOutCubic(rawT)

      camera.position.lerpVectors(tw.startPos, tw.targetPos, t)
      lookRef.current.lerpVectors(tw.startLook, tw.targetLook, t)
      camera.up.lerpVectors(tw.startUp, tw.targetUp, t).normalize()
      if (camera.isPerspectiveCamera) {
        camera.fov = tw.startFov + (tw.targetFov - tw.startFov) * t
        camera.updateProjectionMatrix()
      }
      camera.lookAt(lookRef.current)

      if (rawT >= 1) tw.active = false
      return
    }

    // ---- Settled on TABLE or SCREEN: gentle cursor-parallax on top. ----
    const shot = stageRef.current === 'screen' ? SCREEN_SHOT : TABLE
    targetPos.set(...shot.position)
    if (stageRef.current === 'screen') {
      targetPos.x += SCREEN_RIGHT.x * pointerRef.current.x * SCREEN_PAN_X
      targetPos.z += SCREEN_RIGHT.z * pointerRef.current.x * SCREEN_PAN_X
      targetPos.y += pointerRef.current.y * SCREEN_PAN_Y
    } else {
      targetPos.x += SCREEN_RIGHT.x * pointerRef.current.x * TABLE_PARALLAX_X
      targetPos.z += SCREEN_RIGHT.z * pointerRef.current.x * TABLE_PARALLAX_X
      targetPos.y += pointerRef.current.y * TABLE_PARALLAX_Y
    }

    const t = 1 - Math.exp(-PARALLAX_LERP_SPEED * delta)
    camera.position.lerp(targetPos, t)

    shotLookVec.set(...shot.look)
    lookRef.current.lerp(shotLookVec, t)
    camera.up.lerp(shot === SCREEN_SHOT ? SCREEN_UP : WORLD_UP, t).normalize()
    camera.lookAt(lookRef.current)

    if (camera.isPerspectiveCamera && Math.abs(camera.fov - shot.fov) > 0.001) {
      camera.fov += (shot.fov - camera.fov) * t
      camera.updateProjectionMatrix()
    }
  })

  return null
}

// Companion to the CAMERA_RIG_ENABLED toggle in Experience.jsx: when the
// scripted dolly is disabled, this parks the camera at the WIDE shot once
// (no per-frame loop, no listeners) instead of leaving it wherever
// OrbitControls last left it.
export function FrozenCamera() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(...WIDE.position)
    camera.lookAt(...WIDE.look)
    if (camera.isPerspectiveCamera) {
      camera.fov = WIDE.fov
      camera.updateProjectionMatrix()
    }
  }, [camera])
  return null
}

export { WIDE, TABLE, SCREEN_SHOT }
