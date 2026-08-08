import { useState } from 'react'
import Boot from './Boot'
import Desktop from './Desktop'
import Taskbar from './Taskbar'
import StartMenu from './StartMenu'
import ShutDown from './ShutDown'
import Window from './Window'
import { WINDOWS } from './windows/registry'
import { requestZoomOut } from '../scene/sceneControlsStore'
import './xp.css'
import './os.css'

/**
 * The whole Windows 98 desktop, rendered inside a fixed 800x600 .win98-screen.
 * That fixed size lets it be scaled onto the CRT glass (drei <Html>) or shown
 * full-screen for local testing. Nothing here depends on the 3D scene.
 */
export default function OS() {
  const [phase, setPhase] = useState('boot') // 'boot' | 'desktop' | 'shutdown'
  const [stack, setStack] = useState([]) // z-order, last entry is top + active
  const [startOpen, setStartOpen] = useState(false)

  const activeId = stack[stack.length - 1] ?? null

  const focus = (id) => setStack((s) => [...s.filter((x) => x !== id), id])
  const open = (id) => {
    setStack((s) => [...s.filter((x) => x !== id), id])
    setStartOpen(false)
  }
  const close = (id) => setStack((s) => s.filter((x) => x !== id))
  const external = (url) => window.open(url, '_blank', 'noopener')

  const bootDone = () => {
    setPhase('desktop')
    setStack(['showcase']) // Showcase opens on boot
  }
  const shutDown = () => {
    setStartOpen(false)
    setPhase('shutdown')
  }
  const restart = () => {
    setStack([])
    setStartOpen(false)
    setPhase('boot')
  }

  if (phase === 'boot') {
    return (
      <div className="win98-screen">
        <Boot onDone={bootDone} />
      </div>
    )
  }

  if (phase === 'shutdown') {
    return (
      <div className="win98-screen">
        <ShutDown onRestart={restart} />
      </div>
    )
  }

  return (
    <div
      className="win98-screen"
      onMouseDown={(e) => {
        // clicking empty desktop closes the Start menu, and (Henry-style
        // click-to-zoom-out) tells CameraRig to ease back out to the desk
        // shot - this DOM element sits on top of the canvas once zoomed in,
        // so a canvas-level click listener alone can't see this click.
        if (e.target === e.currentTarget) {
          if (startOpen) setStartOpen(false)
          requestZoomOut()
        }
      }}
    >
      <Desktop onOpen={open} />

      {stack.map((id, i) => {
        const win = WINDOWS[id]
        const Body = win.Component
        return (
          <Window
            key={id}
            win={win}
            zIndex={10 + i}
            active={id === activeId}
            onFocus={() => focus(id)}
            onClose={() => close(id)}
          >
            <Body openWindow={open} onClose={() => close(id)} />
          </Window>
        )
      })}

      {startOpen && (
        <StartMenu
          onOpen={open}
          onExternal={external}
          onShutDown={shutDown}
          onClose={() => setStartOpen(false)}
        />
      )}

      <Taskbar
        openIds={stack}
        activeId={activeId}
        startOpen={startOpen}
        onStartToggle={() => setStartOpen((v) => !v)}
        onTabClick={focus}
      />
    </div>
  )
}
