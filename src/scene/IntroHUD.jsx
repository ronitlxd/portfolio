import { useEffect, useState } from 'react'
import { useSceneControlsState, toggleFan, toggleLights } from './sceneControlsStore'

// -----------------------------------------------------------------------------
// The corner text intro, modeled on henryheffernan.com: the moment you click
// to start, a stack of black monospace boxes types itself out top-left in
// sync with the camera's dolly-in (see CameraRig's onStart callback) - name,
// then title, then a live clock - and stays on screen afterward.
// -----------------------------------------------------------------------------
const LINES = ['Ronit Lad', "Cybersecurity Master's Student", 'Seeking a paid co-op in Canada']

const CHAR_MS = 35 // per-character typing speed
const LINE_PAUSE_MS = 200 // pause before the next line starts typing

// Round, minimal, transparent toggle buttons - .intro-hud itself is
// pointer-events:none (so the decorative text never blocks clicks), but a
// child can still opt back in with its own pointer-events:auto.
const toggleBtnStyle = (on) => ({
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: on ? '1px solid rgba(216, 201, 176, 0.7)' : '1px solid rgba(216, 201, 176, 0.25)',
  background: on ? 'rgba(216, 201, 176, 0.18)' : 'rgba(10, 6, 3, 0.35)',
  color: on ? '#f2ece2' : '#8c8378',
  fontFamily: 'Consolas, "Courier New", monospace',
  fontSize: 11,
  lineHeight: 1,
  cursor: 'pointer',
  pointerEvents: 'auto',
  transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
})

function useClock(active) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

export default function IntroHUD({ active }) {
  const [lineIndex, setLineIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const now = useClock(active)
  const controls = useSceneControlsState()

  // Reset the typewriter whenever the intro (re)starts.
  useEffect(() => {
    if (!active) return
    setLineIndex(0)
    setCharIndex(0)
  }, [active])

  useEffect(() => {
    if (!active || lineIndex >= LINES.length) return
    const line = LINES[lineIndex]
    if (charIndex < line.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), CHAR_MS)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setLineIndex((i) => i + 1)
      setCharIndex(0)
    }, LINE_PAUSE_MS)
    return () => clearTimeout(t)
  }, [active, lineIndex, charIndex])

  if (!active) return null

  const doneTyping = lineIndex >= LINES.length
  const clockText = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="intro-hud">
      {LINES.slice(0, Math.min(lineIndex + 1, LINES.length)).map((line, i) => {
        const isCurrent = i === lineIndex && !doneTyping
        const text = isCurrent ? line.slice(0, charIndex) : line
        return (
          <div key={line} className="intro-hud-line" aria-hidden="true">
            {text}
            {isCurrent && <span className="intro-hud-cursor">_</span>}
          </div>
        )
      })}
      {doneTyping && (
        <div className="intro-hud-line intro-hud-clock" aria-hidden="true">
          {clockText}
        </div>
      )}
      {doneTyping && (
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <button
            onClick={toggleFan}
            aria-label={controls.fanOn ? 'Turn fan off' : 'Turn fan on'}
            title={controls.fanOn ? 'Turn fan off' : 'Turn fan on'}
            style={toggleBtnStyle(controls.fanOn)}
          >
            F
          </button>
          <button
            onClick={toggleLights}
            aria-label={controls.lightsOn ? 'Turn lights off' : 'Turn lights on'}
            title={controls.lightsOn ? 'Turn lights off' : 'Turn lights on'}
            style={toggleBtnStyle(controls.lightsOn)}
          >
            L
          </button>
        </div>
      )}
    </div>
  )
}
