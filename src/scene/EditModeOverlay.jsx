import { useState } from 'react'
import { useEditState, setEnabled, setMode, select, resetTransform, toggleRemoved } from './editStore'
import { useSceneControlsState, setCrtDarkness, setCrtGrain } from './sceneControlsStore'

// -----------------------------------------------------------------------------
// TEMPORARY LAYOUT EDITOR - plain HTML overlay (outside the WebGL canvas).
// A toggle button plus, once on, a small panel: translate/rotate/scale mode
// switcher, a list of every editable object (click a name to select it - much
// easier than hunting for a tiny prop in 3D), live numbers for the selection,
// reset, and "Copy all as code" to paste the final layout back into props.jsx.
// -----------------------------------------------------------------------------

const fmtNum = (n) => Math.round(n * 1000) / 1000
const fmtArr = (a) => `[${a.map(fmtNum).join(', ')}]`

function buildSnippet(transforms, removed) {
  const lines = Object.entries(transforms)
    .filter(([id]) => !removed?.[id])
    .map(([id, t]) => {
      const rot = Array.isArray(t.rotation) ? t.rotation : [0, 0, 0]
      const scl = Array.isArray(t.scale) ? t.scale : [t.scale, t.scale, t.scale]
      const rotChanged = rot.some((v) => Math.abs(v) > 0.0005)
      const sclChanged = scl.some((v) => Math.abs(v - 1) > 0.0005)
      let entry = `position: ${fmtArr(t.position)}`
      if (rotChanged) entry += `, rotation: ${fmtArr(rot)}`
      if (sclChanged) entry += `, scale: ${fmtArr(scl)}`
      return `  ${id}: { ${entry} },`
    })
  const body = `{\n${lines.join('\n')}\n}`

  const removedIds = Object.keys(removed || {})
    .filter((id) => removed[id])
    .sort()
  if (removedIds.length === 0) return body

  const removedBlock = `\n\n// removed - delete these from the scene/source:\n[\n${removedIds
    .map((id) => `  '${id}',`)
    .join('\n')}\n]`
  return body + removedBlock
}

const btnStyle = {
  font: '11px/1.3 monospace',
  padding: '4px 8px',
  borderRadius: 5,
  border: '1px solid #444',
  background: '#20202a',
  color: '#e8e8ef',
  cursor: 'pointer',
}
const btnActive = { ...btnStyle, background: '#4da6ff', color: '#05070c', borderColor: '#4da6ff' }
const btnRemoved = { ...btnStyle, opacity: 0.45, textDecoration: 'line-through' }
const btnDanger = { ...btnStyle, borderColor: '#c0392b', color: '#ff8a80' }

export default function EditModeOverlay() {
  const edit = useEditState()
  const controls = useSceneControlsState()
  const [copied, setCopied] = useState(false)

  const ids = Object.keys(edit.transforms).sort()
  const selectedT = edit.selected ? edit.transforms[edit.selected] : null

  const copyAll = async () => {
    const snippet = buildSnippet(edit.transforms, edit.removed)
    try {
      await navigator.clipboard.writeText(snippet)
    } catch {
      // clipboard API blocked -> fall back to a manual-copy textarea
      const ta = document.createElement('textarea')
      ta.value = snippet
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        fontFamily: 'monospace',
      }}
    >
      <button style={edit.enabled ? btnActive : btnStyle} onClick={() => setEnabled(!edit.enabled)}>
        {edit.enabled ? '✖ Exit Edit Layout' : '✎ Edit Layout'}
      </button>

      {edit.enabled && (
        <div
          style={{
            width: 300,
            maxHeight: '70vh',
            overflowY: 'auto',
            background: 'rgba(16,16,22,0.94)',
            border: '1px solid #333',
            borderRadius: 8,
            padding: 10,
            color: '#e8e8ef',
            fontSize: 11,
          }}
        >
          <div style={{ marginBottom: 8, color: '#9aa6b8' }}>
            Click an object in the scene (or a name below) to select it. Drag the
            gizmo to move it. Switch mode to rotate or scale. "Remove" doesn't
            delete it from the scene - it just gets listed for deletion in
            "Copy all as code".
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {['translate', 'rotate', 'scale'].map((m) => (
              <button key={m} style={edit.mode === m ? btnActive : btnStyle} onClick={() => setMode(m)}>
                {m}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {ids.map((id) => (
              <button
                key={id}
                style={edit.selected === id ? btnActive : edit.removed[id] ? btnRemoved : btnStyle}
                onClick={() => select(id)}
              >
                {id}
              </button>
            ))}
          </div>

          {edit.selected && selectedT && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: '#9aa6b8', marginBottom: 4 }}>
                {edit.selected}
                {edit.removed[edit.selected] ? ' (marked removed)' : ''}
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 10, lineHeight: 1.4 }}>
                {`position: ${fmtArr(selectedT.position)}\nrotation: ${fmtArr(
                  Array.isArray(selectedT.rotation) ? selectedT.rotation : [0, 0, 0]
                )}\nscale:    ${fmtArr(
                  Array.isArray(selectedT.scale) ? selectedT.scale : [selectedT.scale, selectedT.scale, selectedT.scale]
                )}`}
              </pre>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <button
                  style={btnStyle}
                  onClick={() => {
                    const def = edit.defaults[edit.selected]
                    if (def) resetTransform(edit.selected, def)
                  }}
                >
                  Reset this object
                </button>
                <button style={btnDanger} onClick={() => toggleRemoved(edit.selected)}>
                  {edit.removed[edit.selected] ? 'Restore' : 'Remove'}
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #333' }}>
            <div style={{ color: '#9aa6b8', marginBottom: 6 }}>
              Screen (CRT glass overlay - off by default)
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ width: 62, flexShrink: 0 }}>Brightness</span>
              <input
                type="range"
                min={0}
                max={0.3}
                step={0.005}
                value={controls.crtDarkness}
                onChange={(e) => setCrtDarkness(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ width: 34, textAlign: 'right', flexShrink: 0 }}>
                {fmtNum(controls.crtDarkness)}
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 62, flexShrink: 0 }}>Noise</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={controls.crtGrain}
                onChange={(e) => setCrtGrain(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ width: 34, textAlign: 'right', flexShrink: 0 }}>{fmtNum(controls.crtGrain)}</span>
            </label>
          </div>

          <button style={{ ...btnStyle, marginTop: 10 }} onClick={copyAll}>
            {copied ? 'Copied!' : 'Copy all as code'}
          </button>
        </div>
      )}
    </div>
  )
}
