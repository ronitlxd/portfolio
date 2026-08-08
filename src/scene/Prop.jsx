import { Component, Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'

const BASE = import.meta.env.BASE_URL

// ---------------------------------------------------------------------------
// Which generated models to actually load. Empty = show the polished
// placeholder primitives for everything (the clean default).
//
// v2 (pv1): one combined desk+PC model is the whole scene. Add more names
// here later if this build grows beyond the single hero prop.
// ---------------------------------------------------------------------------
const ENABLED_MODELS = new Set(['desk'])

/** Resolve a model file name to its served URL (respects Vite base path). */
export const modelUrl = (name) => `${BASE}models/${name}.glb`

/**
 * Renders a loaded .glb. Clones the scene (so the same model can appear twice)
 * and enables shadows on every mesh.
 */
function Model({ name, ...props }) {
  const { scene } = useGLTF(modelUrl(name))
  const object = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return clone
  }, [scene])
  return <primitive object={object} {...props} />
}

/**
 * Error boundary that renders `fallback` if its children throw. useGLTF throws
 * when a .glb is missing (404), so this makes the primitive the automatic
 * fallback until you generate the model. No toggle, no config.
 */
class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    // A missing .glb is expected before you run the Blender scripts. Swallow it.
  }
  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

/**
 * Drop-in prop: shows the .glb when it exists, otherwise the placeholder.
 *
 *   <Prop name="desk" position={POS.desk}><Desk /></Prop>
 *
 * `children` is the placeholder primitive (also the loading + fallback view).
 * Transform props (position/rotation/scale) are applied to the loaded model;
 * the placeholder carries its own matching transform via the shared POS table.
 */
export default function Prop({ name, children, ...transform }) {
  // Not enabled yet -> just show the placeholder primitive.
  if (!ENABLED_MODELS.has(name)) return children
  return (
    <Boundary fallback={children}>
      <Suspense fallback={children}>
        <Model name={name} {...transform} />
      </Suspense>
    </Boundary>
  )
}
