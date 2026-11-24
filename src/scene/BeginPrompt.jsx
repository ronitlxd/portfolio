import { useEffect, useRef, useState } from 'react'

// Shown over the 3D office once the boot screen has closed. The transparent
// layer catches the first click, so it starts the visit without also
// clicking whatever in the scene happens to be under the pointer.
export default function BeginPrompt({ ready }) {
  const [entered, setEntered] = useState(false)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (ready) buttonRef.current?.focus({ preventScroll: true })
  }, [ready])

  if (!ready || entered) return null

  return (
    <div className="begin-layer" onClick={() => setEntered(true)}>
      <button ref={buttonRef} type="button" className="begin-prompt">
        Click anywhere to begin <span className="begin-cursor" aria-hidden="true">_</span>
      </button>
    </div>
  )
}
