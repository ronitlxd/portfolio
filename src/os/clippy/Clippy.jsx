import { useCallback, useEffect, useRef, useState } from 'react'
import { ANIMATIONS } from './animations'
import ClippyChat from './ClippyChat'

// -----------------------------------------------------------------------------
// Clippy, sitting in the bottom-right of the XP desktop above the taskbar.
// Click him to open or close the chat (ClippyChat.jsx), which talks to the
// ronit-clippy model on the home server through /api/chat.
//
// Behaviour follows github.com/felixrieseberg/clippy: "Show" on arrival,
// then a random idle animation every few seconds, "Thinking" while waiting
// for a reply, and whatever animation the model picks with a leading
// [AnimationName] tag on its reply.
//
// Each sprite is an animated PNG that plays once. Pointing the <img> at the
// same file again doesn't restart it, so a repeat of the last animation
// gets a ?r=N suffix, which makes the browser treat it as a new image.
// -----------------------------------------------------------------------------

const IDLE_GAP_MS = 6000
const IDLE_KEYS = Object.keys(ANIMATIONS).filter((k) => k.startsWith('Idle'))

export default function Clippy() {
  const [src, setSrc] = useState(ANIMATIONS.Default.src)
  const [chatOpen, setChatOpen] = useState(false)
  const [busy, setBusy] = useState(false) // a reply is in progress
  const animTimer = useRef(0) // returns the current animation to Default
  const idleTimer = useRef(0) // schedules the next idle animation
  const lastKey = useRef('')
  const replays = useRef(0)
  const busyRef = useRef(false)

  // Plays one animation, then settles on the still Default frame and calls
  // `then` (used to chain the idle loop).
  const play = useCallback((key, then) => {
    const anim = ANIMATIONS[key]
    if (!anim) return
    window.clearTimeout(animTimer.current)
    const repeat = key === lastKey.current
    lastKey.current = key
    setSrc(repeat ? `${anim.src}?r=${++replays.current}` : anim.src)
    animTimer.current = window.setTimeout(() => {
      setSrc(ANIMATIONS.Default.src)
      lastKey.current = 'Default'
      then?.()
    }, anim.length + 200)
  }, [])

  const idleLoop = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => {
      if (busyRef.current) return
      const options = IDLE_KEYS.filter((k) => k !== lastKey.current)
      play(options[Math.floor(Math.random() * options.length)], idleLoop)
    }, IDLE_GAP_MS)
  }, [play])

  // Arrive, then idle.
  useEffect(() => {
    play('Show', idleLoop)
    return () => {
      window.clearTimeout(animTimer.current)
      window.clearTimeout(idleTimer.current)
    }
  }, [play, idleLoop])

  const setReplyBusy = useCallback(
    (value) => {
      busyRef.current = value
      setBusy(value)
      if (value) {
        window.clearTimeout(idleTimer.current)
        play('Thinking')
      } else {
        idleLoop()
      }
    },
    [play, idleLoop],
  )

  const toggleChat = () => {
    if (!chatOpen && !busyRef.current) play('Wave', idleLoop)
    setChatOpen(!chatOpen)
  }

  return (
    <>
      {chatOpen && (
        <ClippyChat
          busy={busy}
          setBusy={setReplyBusy}
          onAnimate={(key) => play(key)}
          onClose={() => setChatOpen(false)}
        />
      )}
      <button
        type="button"
        className="clippy"
        onClick={toggleChat}
        aria-label={chatOpen ? 'Close chat with Clippy' : 'Chat with Clippy'}
        title="Ask Clippy about Ronit"
      >
        <img src={src} alt="" draggable={false} />
      </button>
    </>
  )
}
