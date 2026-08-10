import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, AdaptiveDpr, Preload, Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { SCREEN_TARGET, SCREEN_POSITION, SCREEN_ROTATION, SCREEN_SCALE } from './DeskPC'
import ScreenBridge from './ScreenBridge'
import OfficePack from './OfficePack'
import CameraRig, { WIDE, FrozenCamera } from './CameraRig'
import IntroHUD from './IntroHUD'
import AssetLoader from './AssetLoader'
import SceneReady from './SceneReady'
import Editable from './Editable'
import EditModeOverlay from './EditModeOverlay'
import { select, useEditState } from './editStore'
import { useSceneControlsState } from './sceneControlsStore'

// Set to true to bring back the "Edit Layout" button/panel on the live site.
// Kept as a single switch (rather than deleting anything) so the whole
// drag/rotate/scale editor is one edit away when it's needed again.
const SHOW_EDIT_OVERLAY = false

// Background: matches the henryheffernan.com reference - a seamless studio
// cyclorama, not a visible floor plane meeting a separate backdrop color.
// The previous attempt (a radial-gradient-textured disc mesh) created a
// hard horizon line wherever its finite edge was seen at a grazing angle -
// removed entirely. Instead:
//  1. BG - a single flat color used for BOTH the Three.js scene.background
//     AND the fog, so there is no boundary for geometry to visibly cross:
//     anything far enough away (including the "floor", which no longer
//     exists as visible geometry) just fades to this exact color.
//  2. Fog (added directly on <Canvas>, args=[BG, near, far]) does the actual
//     "infinite backdrop" work - it's what makes the cubicle's far edges
//     dissolve into BG instead of ending in a hard silhouette.
const BG = '#d4d4d4'

// Floor/desk footprint center, read off the office pack's own baked node
// transforms (same source as CAMERA_TARGET in CameraRig.jsx and the various
// pivots in OfficePack.jsx) - used to center the contact-shadow catcher
// directly under the cubicle instead of at the world origin, which is empty
// space several meters off from the model.
const FLOOR_CENTER = [5.3, 0, 4.1]

// The scripted cinematic dolly (CameraRig), re-enabled now that WIDE/TABLE/
// SCREEN_SHOT in CameraRig.jsx are centered on the office pack's actual
// monitor instead of the old desk model's origin. Flip back to false to
// freeze on WIDE again (via FrozenCamera below) with no other changes.
const CAMERA_RIG_ENABLED = true

// Touch devices (now rendering the same 3D scene as desktop - see App.jsx)
// hit AdaptiveDpr's dynamic resolution stepping much harder: weaker mobile
// GPUs drop frames as soon as the camera starts moving (CameraRig's tweens),
// AdaptiveDpr responds by stepping the render resolution down, then back up
// once motion settles - each step is a visible pop/flicker in the CRT screen
// content. Rather than fight that, touch devices get ONE fixed, modest dpr
// (no adaptive stepping at all) so there's nothing to visibly snap between.
const isTouchDevice =
  typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
const CANVAS_DPR = isTouchDevice ? Math.min(window.devicePixelRatio || 1, 1.5) : [1, 2]

export default function Experience() {
  const edit = useEditState()
  const controls = useSceneControlsState()
  // Flips true the instant the user first clicks to start the camera rig
  // (see CameraRig's onStart) - drives the typewriter corner HUD so it types
  // in sync with the initial dolly-in, same as henryheffernan.com.
  const [heroStarted, setHeroStarted] = useState(false)
  // True only once the scene has actually painted a frame (see
  // SceneReady.jsx, mounted inside the Suspense boundary below) - NOT the
  // same moment as "assets finished downloading". Loading manager progress
  // can hit 100% a beat before the GPU has actually uploaded/painted
  // anything, which was showing as a white flash between the boot.gif
  // disappearing and the model appearing. AssetLoader now waits for this
  // instead of (or in addition to) useProgress.
  const [sceneReady, setSceneReady] = useState(false)

  return (
    <>
      {/* Layout editor overlay - disabled for the shipped site (Ronit's
          request). Flip SHOW_EDIT_OVERLAY back to true to bring the "Edit
          Layout" button back for future tweaking; nothing else needs to
          change, the whole editor (editStore.js, Editable.jsx,
          EditModeOverlay.jsx) is still intact. */}
      {SHOW_EDIT_OVERLAY && <EditModeOverlay />}

      <IntroHUD active={heroStarted} />

      {/* Looping boot.gif over the gap while the office pack's .glb (and
          any other tracked assets) are still downloading - see
          AssetLoader.jsx. Sits above the BG div below, disappears only once
          `sceneReady` flips true (SceneReady.jsx, inside the Suspense
          boundary), not just once loading progress hits 100%. */}
      <AssetLoader ready={sceneReady} />

      {/* Flat BG fallback behind the canvas (e.g. the instant before WebGL
          paints) - matches scene.background/fog exactly now, so there's no
          seam even in that brief window. */}
      <div style={{ position: 'fixed', inset: 0, background: BG }}>
        <Canvas
          shadows
          dpr={CANVAS_DPR}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.85,
          }}
          camera={{ position: WIDE.position, fov: WIDE.fov, near: 0.1, far: 100 }}
          onPointerMissed={() => select(null)}
        >
          {/* Solid scene background + fog in the SAME color - this pair is
              what actually erases the horizon: anything that fades into
              fog fades into exactly the color behind it, so there's no edge
              to see no matter what angle the cubicle/floor area is viewed
              from. near/far tuned so the fade starts just past the cubicle
              itself (~8-10m across) and is fully opaque well before the
              WIDE shot's far clipping plane. */}
          <color attach="background" args={[BG]} />
          <fog attach="fog" args={[BG, 10, 30]} />

          <Suspense fallback={null}>
          {/* Every prop (desk, floor lamp, CRT scene) from the old build is
              gone - just the 90s office pack, individually editable part by
              part (see OfficePack.jsx), plus the resume screen. */}
          <OfficePack fanOn={controls.fanOn} lightsOn={controls.lightsOn} />

          {/* Shadow-only ground catcher: ContactShadows renders its blurred
              shadow onto its OWN internal plane, which it draws with a
              shadow-only material (no visible floor tone, no geometry edge
              to catch light) - so this contributes a soft dark patch right
              under the desk/chair and nothing else. This replaces the
              earlier textured-disc "cyclorama" mesh, which was the actual
              source of the hard horizon line (a finite plane's edge, seen
              at a grazing angle, against the background). */}
          <ContactShadows
            position={[FLOOR_CENTER[0], FLOOR_CENTER[1] + 0.001, FLOOR_CENTER[2]]}
            opacity={0.35}
            scale={16}
            blur={2.5}
            far={10}
            resolution={1024}
            color="#3a3a3a"
            frames={1}
          />

          {/* Gentle scene-wide fill, keeps rear/shadow faces of the cubicle
              walls and desk items from ever reading as pitch black. Dialed
              back slightly (was 0.7) together with the key light below so
              bright materials (monitor bezel, filing cabinet drawers) don't
              blow out to flat white. */}
          <ambientLight color="#ffffff" intensity={0.75} />

          {/* Primary overhead "sun" - soft, low-bias, blurred drop shadows.
              Positioned high and slightly off-axis from the cubicle center
              (not straight overhead) for a natural, gently angled studio
              key light. Intensity dialed back further (0.85 -> 0.6) since
              ACES tone mapping + the raised ambient above are now doing
              more of the overall exposure work - this alone was still
              blowing out the keyboard/desk-pad highlights. */}
          <directionalLight
            color="#ffffff"
            intensity={0.6}
            position={[FLOOR_CENTER[0] + 3, FLOOR_CENTER[1] + 8, FLOOR_CENTER[2] + 2]}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
            shadow-radius={8}
          >
            <object3D attach="target" position={FLOOR_CENTER} />
          </directionalLight>

          {/* Rim/fill lights - low-intensity, no shadow casting - just
              enough to lift the cubicle's back and side faces out of
              silhouette without flattening the key light's modeling. */}
          <directionalLight
            color="#dfe6ff"
            intensity={0.35}
            position={[FLOOR_CENTER[0] - 6, FLOOR_CENTER[1] + 3, FLOOR_CENTER[2] - 5]}
          />
          <directionalLight
            color="#fff4e0"
            intensity={0.25}
            position={[FLOOR_CENTER[0] + 1, FLOOR_CENTER[1] + 2, FLOOR_CENTER[2] + 7]}
          />

          {/* The OS/CRT screen, independently editable so it can be nudged
              onto the glass live instead of hand-tuning constants. Its baked
              position is from the OLD desk model's monitor glass - expect to
              have to redrag this onto whichever monitor in the new pack you
              pick, via edit mode. */}
          <Editable
            id="screen"
            position={SCREEN_POSITION}
            rotation={SCREEN_ROTATION}
            scale={SCREEN_SCALE}
          >
            <ScreenBridge />
          </Editable>

          {/* No explicit scene lights in this build (removed along with the
              old desk/lamp) - visibility comes entirely from this neutral
              grayish-white image-based light, no external HDRI download. */}
          <Environment resolution={256} background={false}>
            <Lightformer intensity={0.9} color="#ffffff" position={[-2, 2, -1]} scale={[6, 6, 1]} />
            <Lightformer intensity={0.65} color="#f0f0ee" position={[2.5, 3, 2]} scale={[6, 6, 1]} />
            <Lightformer intensity={0.45} color={BG} position={[0, 5, 0]} scale={[10, 10, 1]} />
          </Environment>

          <Preload all />

          {/* Only mounts once every promise in this Suspense boundary has
              resolved (OfficePack's .glb, ScreenBridge, Environment/HDRI) -
              see SceneReady.jsx for why it waits a couple more frames past
              that before actually flipping sceneReady true. */}
          <SceneReady onReady={() => setSceneReady(true)} />
        </Suspense>

        {/* Edit mode: free orbit, so the new pack's ~130 parts can be laid
            out from any angle. Normal mode: either the scripted cinematic
            rig (CAMERA_RIG_ENABLED) or, while it's off, a frozen WIDE shot.
            Never more than one of these at once, they'd fight over the
            camera transform every frame. */}
        {edit.enabled ? (
          // Wider distance/pan than the old desk build - the office pack's
          // footprint (~22m across) is far bigger than the old compact desk,
          // and panning is needed to actually reach its far corners.
          <OrbitControls
            makeDefault
            target={SCREEN_TARGET}
            enableDamping
            dampingFactor={0.08}
            enablePan
            minDistance={0.5}
            maxDistance={40}
            minPolarAngle={0.05}
            maxPolarAngle={Math.PI / 2 - 0.02}
          />
        ) : CAMERA_RIG_ENABLED ? (
          <CameraRig onStart={() => setHeroStarted(true)} />
        ) : (
          <FrozenCamera />
        )}

        {/* Multisampling dropped to 0 on touch devices - mobile GPUs (Mali/
            Adreno in particular) are known to flicker/band when MSAA is
            combined with postprocessing passes like Bloom below; desktop
            keeps the full 4x for smoother edges. */}
        <EffectComposer multisampling={isTouchDevice ? 0 : 4} disableNormalPass>
          <Bloom
            intensity={0.7}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.9}
            mipmapBlur
            radius={0.6}
          />
          {/* Subtle re-add, explicitly requested this time as part of the
              studio-cyclorama look (a gentle corner falloff, not the earlier
              much stronger black vignette that was removed) - low darkness,
              small offset so it only lightly curves the outer corners
              rather than visibly darkening the scene. */}
          <Vignette eskil={false} offset={0.15} darkness={0.35} />
        </EffectComposer>

          {/* Touch devices already render at a fixed, modest dpr (see
              CANVAS_DPR above) - nothing left for AdaptiveDpr to step
              between, and skipping it avoids the resolution-snap flicker
              that was showing up mid camera-move on phones. */}
          {!isTouchDevice && <AdaptiveDpr pixelated />}
        </Canvas>
      </div>
    </>
  )
}
