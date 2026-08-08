import { useEffect, useRef, useState } from 'react'
import { bootLines, RAM_TARGET } from '../data/content'

/**
 * Security-flavoured BIOS boot sequence. Reveals lines progressively, ticks the
 * RAM count up to the target, then calls onDone. Click or ESC/DEL to skip.
 * Respects prefers-reduced-motion by rendering everything at once.
 */
export default function Boot({ onDone }) {
  const [n, setN] = useState(0)
  const [ram, setRam] = useState(0)
  const rootRef = useRef(null)
  const doneRef = useRef(false)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reduced) {
      setN(bootLines.length)
      setRam(RAM_TARGET)
      const t = setTimeout(finish, 600)
      return () => clearTimeout(t)
    }

    let alive = true
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

    async function run() {
      for (let i = 0; i < bootLines.length; i++) {
        if (!alive || doneRef.current) return
        const line = bootLines[i]
        setN(i + 1)
        if (line.includes('{RAM}')) {
          const steps = 22
          for (let s = 1; s <= steps; s++) {
            if (!alive || doneRef.current) return
            setRam(Math.round((RAM_TARGET * s) / steps))
            await sleep(22)
          }
          setRam(RAM_TARGET)
          await sleep(160)
        } else {
          await sleep(line === '' ? 45 : 85)
        }
      }
      if (!alive) return
      await sleep(650)
      finish()
    }

    run()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    rootRef.current?.focus()
    const onKey = (e) => {
      if (['Escape', 'Enter', 'Delete', ' '].includes(e.key)) skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const skip = () => {
    setN(bootLines.length)
    setRam(RAM_TARGET)
    setTimeout(finish, 200)
  }

  return (
    <div className="bios" ref={rootRef} tabIndex={0} onClick={skip}>
      {bootLines.slice(0, n).map((line, i) => {
        let text = line.replace('{RAM}', String(ram))
        if (line.includes('{RAM}') && ram >= RAM_TARGET) text += '  OK'
        return <div key={i}>{text || ' '}</div>
      })}
      <span className="cursor" />
      <div className="skip-hint">click or press ESC to skip</div>
    </div>
  )
}
