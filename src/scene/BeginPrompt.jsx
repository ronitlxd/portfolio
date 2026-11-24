import { useEffect, useRef, useState } from 'react'

const TEXT = 'Click anywhere to begin'
const START_DELAY_MS = 300 // lets the boot screen finish fading first
const CHAR_MS = 45

// Shown over the 3D office once the boot screen has closed. The text types in
// one character at a time. The transparent layer catches the first click, so
// it starts the visit without also clicking whatever is under the pointer.
export default function BeginPrompt({ ready }) {
  const [entered, setEntered] = useState(false)
  const [count, setCount] = useState(0)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!ready) return undefined
    buttonRef.current?.focus({ preventScroll: true })

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(TEXT.length)
      return undefined
    }

    let interval
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setCount((c) => {
          if (c + 1 >= TEXT.length) clearInterval(interval)
          return Math.min(c + 1, TEXT.length)
        })
      }, CHAR_MS)
    }, START_DELAY_MS)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [ready])

  if (!ready || entered) return null

  const typing = count < TEXT.length

  return (
    <div className="begin-layer" onClick={() => setEntered(true)}>
      <button ref={buttonRef} type="button" className="begin-prompt" aria-label={TEXT}>
        <span aria-hidden="true">
          {TEXT.slice(0, count)}
          {!typing && ' '}
          <span className={`begin-cursor${typing ? ' begin-cursor-solid' : ''}`}>_</span>
          {/* Holds the bar at its final width so it doesn't grow while typing. */}
          <span className="begin-rest">{TEXT.slice(count)}{typing && ' '}</span>
        </span>
      </button>
    </div>
  )
}
