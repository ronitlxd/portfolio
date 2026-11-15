import { useEffect, useRef, useState } from 'react'
import ScrollArea from '../ScrollArea'
import { ANIMATIONS } from './animations'

// -----------------------------------------------------------------------------
// The "Chat with Clippy" window. Streams replies from /api/chat (FastAPI on
// the home server, see server/app.py), which runs the ronit-clippy Ollama
// model. In dev, vite.config.js proxies /api to the server through an SSH
// tunnel on localhost:8090.
//
// The model starts each reply with an animation tag like [Wave]. The tag is
// stripped from the text and handed to Clippy to play, same idea as
// github.com/felixrieseberg/clippy's filterMessageContent.
// -----------------------------------------------------------------------------

const CHAT_URL = import.meta.env.VITE_CHAT_URL || '/api/chat'
const HISTORY = 6 // messages sent back to the server for context
const MAX_INPUT = 500 // matches the server's own limit

// Clippy is Ronit's avatar, so he speaks as Ronit in the first person.
const GREETING =
  "Hi, I'm Ronit, dressed up as Clippy! Ask me about my projects, education, experience, or how to reach me."

const OFFLINE =
  "My brain is offline right now, the server might be down. You can still email me at ronitlad.ca@gmail.com."

// Splits a leading [AnimationName] tag off a (possibly partial) reply.
// Returns { text, key, pending }: pending means the text so far might still
// be the start of a tag, so nothing should be shown yet.
function splitTag(raw) {
  const t = raw.trimStart()
  if (!t.startsWith('[')) return { text: raw, key: null, pending: false }
  const close = t.indexOf(']')
  if (close === -1) return { text: '', key: null, pending: t.length < 24 }
  const name = t.slice(1, close)
  const key = ANIMATIONS[name] ? name : null
  return { text: t.slice(close + 1).trimStart(), key, pending: false }
}

export default function ClippyChat({ busy, setBusy, onAnimate, onClose }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(null) // text of the reply in progress
  const abortRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
    return () => abortRef.current?.abort()
  }, [])

  const send = async (e) => {
    e.preventDefault()
    const text = draft.trim().slice(0, MAX_INPUT)
    if (!text || busy) return

    const history = [...messages, { role: 'user', content: text }]
    setMessages(history)
    setDraft('')
    setBusy(true)
    setStreaming('')

    const controller = new AbortController()
    abortRef.current = controller
    let raw = ''
    let shown = ''
    let animated = false

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The greeting is UI only, the model never wrote it.
        body: JSON.stringify({ messages: history.slice(1).slice(-HISTORY) }),
        signal: controller.signal,
      })

      if (res.status === 429) {
        shown = "Whoa, that's a lot of questions at once! Give me a few seconds and try again."
        onAnimate('Alert')
      } else if (!res.ok || !res.body) {
        throw new Error(`chat ${res.status}`)
      } else {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          raw += decoder.decode(value, { stream: true })
          const { text, key, pending } = splitTag(raw)
          if (pending) continue
          if (!animated) {
            animated = true
            onAnimate(key || 'Explain')
          }
          shown = text
          setStreaming(shown)
        }
        if (!shown.trim()) shown = "Hmm, I lost my train of thought. Could you ask that again?"
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        shown = shown ? `${shown} ...` : '(stopped)'
      } else {
        shown = OFFLINE
        onAnimate('Alert')
      }
    } finally {
      abortRef.current = null
      setMessages((m) => [...m, { role: 'assistant', content: shown }])
      setStreaming(null)
      setBusy(false)
    }
  }

  return (
    <div className="window clippy-chat" role="dialog" aria-label="Chat with Clippy">
      <div className="title-bar">
        <div className="title-bar-text">Chat with Clippy</div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={onClose} />
        </div>
      </div>

      <div className="clippy-chat-body">
        <ScrollArea className="clippy-chat-log" stickToBottom>
          {messages.map((m, i) => (
            <p key={i} className={`clippy-msg clippy-msg-${m.role}`}>
              {m.content}
            </p>
          ))}
          {streaming !== null && (
            <p className="clippy-msg clippy-msg-assistant">
              {streaming || <span className="clippy-typing">Clippy is thinking...</span>}
            </p>
          )}
        </ScrollArea>

        <form className="clippy-chat-input" onSubmit={send}>
          <input
            ref={inputRef}
            value={draft}
            maxLength={MAX_INPUT}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask me anything..."
            aria-label="Message"
            disabled={busy}
          />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()}>
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!draft.trim()}>
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
