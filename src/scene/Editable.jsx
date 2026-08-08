import { useEffect, useRef, useState } from 'react'
import { TransformControls } from '@react-three/drei'
import { useEditState, registerDefault, select, updateTransform } from './editStore'

// -----------------------------------------------------------------------------
// TEMPORARY LAYOUT EDITOR - wraps one prop so it can be click-selected and
// dragged/rotated/scaled with a gizmo when edit mode is on. Outside edit mode
// it is a plain, inert <group> - zero behavior change to the normal scene.
//
// Usage: <Editable id="desk" position={POS.desk.position}><Desk /></Editable>
// -----------------------------------------------------------------------------
export default function Editable({ id, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, children }) {
  const groupRef = useRef()
  const edit = useEditState()
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    registerDefault(id, { position, rotation, scale })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // groupRef.current exists only after the first render; nudge once so
    // TransformControls has a real object to attach to when first selected.
    forceUpdate((n) => n + 1)
  }, [])

  const t = edit.transforms[id] ?? { position, rotation, scale }
  const isSelected = edit.enabled && edit.selected === id

  return (
    <>
      {/* TransformControls must be a SIBLING of the group it targets, not a
          child - nesting it inside doubles the transform (the gizmo would
          inherit the group's own position/rotation/scale on top of the
          target-matching transform TransformControls applies internally). */}
      <group
        ref={groupRef}
        position={t.position}
        rotation={t.rotation}
        scale={t.scale}
        onClick={(e) => {
          if (!edit.enabled) return
          e.stopPropagation()
          select(id)
        }}
      >
        {children}
      </group>
      {isSelected && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={edit.mode}
          onObjectChange={() => {
            const o = groupRef.current
            updateTransform(id, {
              position: o.position.toArray(),
              rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
              scale: o.scale.toArray(),
            })
          }}
        />
      )}
    </>
  )
}
