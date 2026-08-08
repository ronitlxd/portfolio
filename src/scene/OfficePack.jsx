import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import Editable from './Editable'
import { useEditState } from './editStore'

const BASE = import.meta.env.BASE_URL
const URL = `${BASE}models/90s_retro_office_pack.glb`

// Node_25_117 is a lamp fixture - its world position (from the glb's own
// node transforms, same approach as CLOCK_PIVOT/CAMERA_TARGET) anchors the
// first real light in the scene (LAMP1). LAMP2 is a second light with no
// particular anchor yet - both are wrapped in <Editable> (see
// EditableSpotLight below) so they can be dragged into place the same way
// as every other object, instead of being fixed constants. Currently the
// only explicit lights in the whole scene - everything else still reads
// purely off the Environment/Lightformer IBL in Experience.jsx.
const LAMP1_POSITION = [5.524, 1.144, 3.511]
const LAMP1_ROTATION = [-0.67, -0.76, -0.016]
const LAMP1_SCALE = [0.343, 0.071, 0.138]
const LAMP2_POSITION = [4.63, 1.131, 4.184]
const LAMP2_ROTATION = [0, 0, 2.825]

// A cone (spotLight), not an omnidirectional pointLight, so the light reads
// as a downward "V" of illumination rather than spilling in all directions.
// The target is a sibling object3D nested in the SAME <Editable> group,
// offset straight down - so rotating the Editable (via its gizmo) tilts the
// cone instead of just moving a light that always points the same way.
function EditableSpotLight({ id, position, rotation, scale, color, intensity, angle, penumbra, distance, decay }) {
  const lightRef = useRef()
  const targetRef = useRef()
  const edit = useEditState()

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
    }
  }, [])

  return (
    <Editable id={id} position={position} rotation={rotation} scale={scale}>
      <spotLight
        ref={lightRef}
        color={color}
        intensity={intensity}
        angle={angle}
        penumbra={penumbra}
        distance={distance}
        decay={decay}
        castShadow
      />
      <object3D ref={targetRef} position={[0, -1, 0]} />

      {/* Edit-mode-only marker - the spotlight itself has no visible geometry,
          making it hard to tell where it actually sits while dragging it. */}
      {edit.enabled && (
        <mesh>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="white" />
        </mesh>
      )}
    </Editable>
  )
}

// -----------------------------------------------------------------------------
// 90s retro office pack - a single Sketchfab-style .glb containing ~130 named
// top-level props (desks, monitors, chairs, filing cabinets, mugs, papers...)
// nested under a couple of axis-correcting wrapper nodes (Sketchfab_model /
// root / GLTF_SceneRootNode).
//
// Per the edit-mode workflow used everywhere else in this scene, every one of
// those top-level props is exposed as its own <Editable>, so each can be
// individually selected/dragged in edit mode. To do that, each part's full
// WORLD transform (including the wrapper nodes' axis-correction rotation) is
// baked into the part's own local position/quaternion/scale before it's
// detached and re-parented as an independent top-level object - otherwise
// pulling it out from under its rotated ancestors would leave it tumbled
// sideways. Because the baked transform already IS the part's correct
// placement, each <Editable> is given a plain identity default (no position
// prop) - the panel/gizmo then represents a pure nudge on top of the pack's
// original layout, same convention as an unset Editable elsewhere.
// -----------------------------------------------------------------------------

// Parts flagged "Remove" in the edit-mode panel and pasted from "Copy all as
// code" - filtered out entirely rather than rendered, so they cost nothing
// (no draw calls, no Editable/gizmo overhead).
const REMOVED_PARTS = new Set([
  'Cubicle_Wall003_64',
  'Pen_Holder001_70',
  'Phone002_51',
  'Plane_0',
  'Pot002_21',
  'Printer_Base003_46',
  'Printer_Base004_48',
  'Printer_Top003_47',
  'Printer_Top004_49',
  'Top_Drawer003_20',
  'Trash_can003_44',
  'White_Lamp002_23',
  'paper022_29',
  'paper023_30',
  'paper024_31',
  'paper025_32',
  'paper026_33',
  'paper027_34',
  'paper028_35',
  'paper029_36',
  'paper030_37',
  'paper031_38',
  'paper032_39',
  'paper033_40',
  'Binder001_26',
  'Binder_2004_27',
  'Binder_3001_28',
  'Black_Lamp002_22',
  'Bottle002_50',
  'Bottom_Drawer003_18',
  'Center_Piece001_101',
  'Chair_1001_65',
  'Cooler003_25',
  'Creme_Lamp001_24',
  'Desk004_19',
  'Fan_Head_234',
  'File_Box_1001_83',
  'File_Box_2_Lid001_84',
  'Filing_Cainet_Base015_45',
  'KeyBoard_002005_52',
  'KeyBoard_002006_56',
  'KeyBoard_002007_62',
  'Monitor001_60',
  'Monitor_002007_53',
  'Monitor_002009_57',
  'Mug_1001_66',
  'Mug_2001_67',
  'Mug_3001_68',
  'Mug_4001_69',
  'PC_004004_88',
  'PC_004005_89',
  'PC_004009_59',
  'Clock001_102',
  'Fan_Blades_232',
  'Fan_Body_233',
  'File_Box_1005_41',
  'File_Box_2_Lid004_42',
  'Files004_43',
  'Filing_Cainet_Base006_85',
  'Filing_Cainet_Base007_86',
  'Filing_Cainet_Base008_87',
  'Hour_Arm001_103',
  'Minute_Arm001_104',
  'Mouse_001005_54',
  'Mouse_001006_58',
  'Mouse_001007_63',
  'NurbsPath012_71',
  'NurbsPath013_72',
  'NurbsPath014_73',
  'NurbsPath015_74',
  'NurbsPath016_75',
  'NurbsPath017_76',
  'NurbsPath018_77',
  'NurbsPath019_78',
  'NurbsPath020_79',
  'NurbsPath022_81',
  'NurbsPath023_82',
  'PC001_61',
  'PC_004007_55',
  'PC_004011_90',
  'NurbsPath021_80',
  'Node_31_131',
  'Node_33_137',
  'Node_34_141',
  'Node_55_184',
])

// Per-part nudges, also pasted from the edit-mode panel - applied ON TOP of
// each part's own baked (already-correct) position from the pack itself.
//
// Node_68_219/Node_69_222/Node_70_225 are the filing cabinet's drawer fronts
// - there used to be a click-Node_70_225-to-slide-them-open interaction here
// (DRAWER_NODE_NAMES/DRAWER_CLOSED_OFFSET/DRAWER_OPEN_OFFSET + a toggle
// effect and useFrame animation), removed at Ronit's request ("turn off the
// node 70 225 movement"). These three are now just static entries in this
// table like everything else, using what was the "close position" snapshot
// as the permanent default - no more click handler, no more per-frame
// position animation for them.
const PART_OFFSETS = {
  Cubicle_Wall004_97: { position: [0.042, 0, 0] },
  Chair_1002_99: { position: [0.466, 0.008, 7.918], rotation: [0, 1.238, 0] },
  Node_23_113: { position: [-0.175, 0, 0] },
  Node_24_115: { position: [-0.165, 0, 0] },
  Node_45_170: { position: [0, -0.01, -0.04] },
  Node_68_219: { position: [-0.171, 0, 0] },
  Node_69_222: { position: [-0.088, 0, 0] },
  Node_70_225: { position: [-0.072, 0, 0] },
  Node_71_227: { position: [-0.037, -0.1, 0.357] },
  Node_72_229: { position: [-0.034, -0.09, 0.341] },
  Node_73_231: { position: [-0.028, -0.095, 0.343] },
  Monitor_002001_93: { position: [0, 0, -0.818], scale: [1, 1, 1.199] },
}

// Real-time wall clock: Node_56_186 is the clock face, Node_57_188 the hour
// hand, Minute_Arm002_14 the minute hand (identified by inspecting the pack
// in edit mode, not by name - none of the three are named after a clock).
// Both hands' own spin axis was derived from their actual mesh geometry (the
// thinnest dimension of each hand's bounding box, rotated into world space)
// rather than guessed, and comes out ~world +X for both - which also happens
// to be this cubicle's screen/monitor-facing direction, consistent with the
// clock hanging on the same wall.
const HOUR_HAND_NAME = 'Node_57_188'
const MINUTE_HAND_NAME = 'Minute_Arm002_14'
const CLOCK_HAND_AXIS = new THREE.Vector3(1, 0, 0)

// Node_58_190's world position - the clock's actual center pivot. Each
// hand's own local origin isn't at this point, so rotating a hand in place
// (about its own origin) swings it off the face instead of sweeping around
// the center; hands are instead orbited around this fixed point explicitly.
const CLOCK_PIVOT = new THREE.Vector3(4.9953, 1.1359, 5.0684)

// Confirmed exact: at offset=0, displayed 6:06 vs actual 3:06 - precisely
// 3 hours ahead, with the minutes already matching (3h = exactly 3 full
// minute-hand revolutions, so it wraps back to the same spot and only the
// hour hand shows the error). Subtracting 3h from the input time cancels
// this real, fixed calibration offset without touching the minute hand.
const CLOCK_TIME_OFFSET_MS = -3 * 60 * 60 * 1000

const _deltaQuat = new THREE.Quaternion()
const _offset = new THREE.Vector3()

// Signed angle of a Y/Z offset from CLOCK_PIVOT, measured from "12 o'clock"
// (straight up, +Y). Deliberately atan2(z, y) - not (y, z) - to match the
// direction THREE's setFromAxisAngle(CLOCK_HAND_AXIS, +angle) actually
// rotates in (it sweeps +Y toward +Z for positive angles), so a rest angle
// measured this way can be subtracted directly from a target axis-angle
// without a sign mismatch between the two.
function angleFromPivot(worldPos) {
  return Math.atan2(worldPos.z - CLOCK_PIVOT.z, worldPos.y - CLOCK_PIVOT.y)
}

// Node_71_227 is the oscillating fan's blade disc (identified in edit mode,
// not by name - "Fan_Blades_232"/"Fan_Body_233"/"Fan_Head_234" are a
// DIFFERENT, already-removed fan; this is a separate one).
//
// Node_71_227's own node-level translation is [0,0,0] (its geometry, like
// the clock hands, is baked directly into vertex data rather than offset
// via the node) - spinning it in place around its own local origin swung it
// wildly off to the side instead of in place.
//
// FAN_PIVOT was originally set to Node_73_231 (the fan's stand) on the
// assumption that any nearby reference point would do, same as the clock's
// separate pivot marker - but that's a DIFFERENT object, not this blade's
// own center, so it wasn't actually spinning in place (still visibly
// orbiting, just less wildly). Since the blade's rest position/quaternion
// are [0,0,0]/identity, its own baked-in vertex data already sits at its
// final world position, and its own centroid (from the same PCA pass as the
// axis, below) IS the correct pivot - not a separate object's.
//
// The spin axis is NOT a clean world axis - an axis-aligned-bounding-box
// guess (world +Z, like the clock hands) caused a visible wobble, since the
// blade disc itself is tilted in the model. Recomputed properly via PCA
// over the mesh's actual vertex positions: the eigenvector with the
// smallest eigenvalue (0.00013, vs ~0.0053 for the other two - a disc is
// flat in exactly one direction and symmetric in the other two) gives the
// true rotational symmetry axis.
const FAN_BLADES_NAME = 'Node_71_227'
const FAN_SPIN_AXIS = new THREE.Vector3(0.6815, 0, -0.7318)
const FAN_SPIN_SPEED = 10 // rad/sec - tune to taste, not a real-world RPM
const FAN_PIVOT = new THREE.Vector3(5.3081, 0.9766, 5.1098)

const _fanQuat = new THREE.Quaternion()
const _fanOffset = new THREE.Vector3()

// Dialed down (was 25) - at that intensity, combined with ACES tone mapping
// off (the old default), the desk lamps' cones blew the keyboard and desk
// pad straight out to pure white. This is still bright enough to read as
// two warm little pools of light on the desk, just no longer clipping.
const LAMP_INTENSITY = 9

export default function OfficePack({ fanOn = true, lightsOn = true }) {
  const { scene } = useGLTF(URL)

  const parts = useMemo(() => {
    const clone = scene.clone(true)
    clone.updateMatrixWorld(true)

    const root = clone.getObjectByName('GLTF_SceneRootNode') ?? clone
    const children = [...root.children]
    const kept = []

    children.forEach((child, i) => {
      if (!child.name) child.name = `part_${i}`
      root.remove(child)
      if (REMOVED_PARTS.has(child.name)) return

      child.matrix.copy(child.matrixWorld)
      child.matrix.decompose(child.position, child.quaternion, child.scale)
      child.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true
          o.receiveShadow = true
        }
      })
      kept.push(child)
    })

    return kept
  }, [scene])

  const handsRef = useRef({
    hour: null,
    minute: null,
    hourRest: null,
    minuteRest: null,
    hourRestPos: null,
    minuteRestPos: null,
    hourRestAngle: 0,
    minuteRestAngle: 0,
  })

  useEffect(() => {
    const hour = parts.find((p) => p.name === HOUR_HAND_NAME) ?? null
    const minute = parts.find((p) => p.name === MINUTE_HAND_NAME) ?? null
    handsRef.current = {
      hour,
      minute,
      hourRest: hour ? hour.quaternion.clone() : null,
      minuteRest: minute ? minute.quaternion.clone() : null,
      hourRestPos: hour ? hour.position.clone() : null,
      minuteRestPos: minute ? minute.position.clone() : null,
      // whatever "time" the pack's own rest pose happened to be posed at,
      // read directly from its baked geometry (not assumed to be 12:00) -
      // real time is then applied as the DIFFERENCE from this, not as an
      // absolute angle, so the rest pose's own reading cancels out cleanly.
      hourRestAngle: hour ? angleFromPivot(hour.position) : 0,
      minuteRestAngle: minute ? angleFromPivot(minute.position) : 0,
    }
  }, [parts])

  const fanRef = useRef({ blades: null, restQuat: null, restPos: null, angle: 0 })

  useEffect(() => {
    const blades = parts.find((p) => p.name === FAN_BLADES_NAME) ?? null
    fanRef.current = {
      blades,
      restQuat: blades ? blades.quaternion.clone() : null,
      restPos: blades ? blades.position.clone() : null,
      angle: 0,
    }
  }, [parts])

  useFrame((_state, delta) => {
    const fan = fanRef.current
    if (!fan.blades || !fanOn) return
    fan.angle += FAN_SPIN_SPEED * delta
    _fanQuat.setFromAxisAngle(FAN_SPIN_AXIS, fan.angle)
    fan.blades.quaternion.copy(_fanQuat).multiply(fan.restQuat)
    fan.blades.position.copy(_fanOffset.copy(fan.restPos).sub(FAN_PIVOT).applyQuaternion(_fanQuat).add(FAN_PIVOT))
  })

  useFrame(() => {
    const { hour, minute, hourRest, minuteRest, hourRestPos, minuteRestPos, hourRestAngle, minuteRestAngle } = handsRef.current
    if (!hour || !minute) return

    const now = new Date(Date.now() + CLOCK_TIME_OFFSET_MS)
    const h = now.getHours() % 12
    const m = now.getMinutes()
    const s = now.getSeconds()
    // Standard clockwise clock-face angle: 0 at 12:00, increasing clockwise.
    const hourClockAngle = (h + m / 60) * (Math.PI / 6) // 30deg per hour
    const minuteClockAngle = (m + s / 60) * (Math.PI / 30) // 6deg per minute

    // Clockwise motion is a NEGATIVE axis-angle rotation here (confirmed
    // live - the +clockAngle version visibly ran the hands anticlockwise).
    // Target axis-angle for the current time is -clockAngle; the delta
    // applied on top of the rest pose is that minus whatever angle the rest
    // pose already encoded.
    const hourDelta = -hourClockAngle - hourRestAngle
    _deltaQuat.setFromAxisAngle(CLOCK_HAND_AXIS, hourDelta)
    hour.quaternion.copy(_deltaQuat).multiply(hourRest)
    hour.position.copy(_offset.copy(hourRestPos).sub(CLOCK_PIVOT).applyQuaternion(_deltaQuat).add(CLOCK_PIVOT))

    const minuteDelta = -minuteClockAngle - minuteRestAngle
    _deltaQuat.setFromAxisAngle(CLOCK_HAND_AXIS, minuteDelta)
    minute.quaternion.copy(_deltaQuat).multiply(minuteRest)
    minute.position.copy(_offset.copy(minuteRestPos).sub(CLOCK_PIVOT).applyQuaternion(_deltaQuat).add(CLOCK_PIVOT))
  })

  return (
    <>
      {parts.map((part) => (
        <Editable
          key={part.name}
          id={part.name}
          position={PART_OFFSETS[part.name]?.position}
          rotation={PART_OFFSETS[part.name]?.rotation}
          scale={PART_OFFSETS[part.name]?.scale}
        >
          <primitive object={part} />
        </Editable>
      ))}

      <EditableSpotLight
        id="lampLight1"
        position={LAMP1_POSITION}
        rotation={LAMP1_ROTATION}
        scale={LAMP1_SCALE}
        color="#ffdca8"
        intensity={lightsOn ? LAMP_INTENSITY : 0}
        angle={0.5}
        penumbra={0.35}
        distance={5}
        decay={2}
      />
      <EditableSpotLight
        id="lampLight2"
        position={LAMP2_POSITION}
        rotation={LAMP2_ROTATION}
        color="#ffdca8"
        intensity={lightsOn ? LAMP_INTENSITY : 0}
        angle={0.5}
        penumbra={0.35}
        distance={5}
        decay={2}
      />
    </>
  )
}

useGLTF.preload(URL)
