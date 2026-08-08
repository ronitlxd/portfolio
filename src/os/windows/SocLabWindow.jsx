import { useEffect, useRef, useState } from 'react'
import { socEvents, socHeader } from '../../data/content'

// pad helper
const p2 = (n) => String(n).padStart(2, '0')

function stamp() {
  const d = new Date()
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
}

export default function SocLabWindow() {
  const [lines, setLines] = useState([])
  const idx = useRef(0)
  const bodyRef = useRef(null)
  const reduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    // seed a couple of lines immediately so the window is never empty
    const seed = []
    for (let i = 0; i < 3; i++) {
      const e = socEvents[i % socEvents.length]
      seed.push({ id: `s${i}`, time: stamp(), ...e })
    }
    idx.current = 3
    setLines(seed)

    // If reduced motion is requested, do not stream; show a static snapshot.
    if (reduced.current) return

    const t = setInterval(() => {
      const e = socEvents[idx.current % socEvents.length]
      idx.current += 1
      setLines((prev) => {
        const next = [...prev, { id: `l${idx.current}`, time: stamp(), ...e }]
        // keep the buffer bounded
        return next.slice(-60)
      })
    }, 1500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [lines])

  return (
    <div className="terminal" ref={bodyRef}>
      {socHeader.map((h, i) => (
        <div className="t-header" key={`h${i}`}>
          {h || ' '}
        </div>
      ))}
      {lines.map((l) => (
        <div key={l.id}>
          <span className="t-time">[{l.time}]</span>{' '}
          <span className={`t-src src-${l.src}`}>{l.src}</span>:{' '}
          {l.msg}
        </div>
      ))}
      <div>
        <span className="t-cursor" />
      </div>
    </div>
  )
}
