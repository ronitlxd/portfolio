import { useEffect, useState } from 'react'
import { WINDOWS } from './windows/registry'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15)
    return () => clearInterval(t)
  }, [])
  let h = now.getHours()
  const m = String(now.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ap}`
}

export default function Taskbar({
  openIds,
  activeId,
  onStartToggle,
  startOpen,
  onTabClick,
}) {
  const clock = useClock()
  return (
    <div className="taskbar">
      <button
        className={`start-button${startOpen ? ' active' : ''}`}
        onClick={onStartToggle}
        aria-haspopup="true"
        aria-expanded={startOpen}
      >
        <span className="flag-icon" aria-hidden="true">
          {'\u{1F3C1}'}
        </span>
        Start
      </button>

      <div className="tabs">
        {openIds.map((id) => (
          <button
            key={id}
            className={`tab${activeId === id ? ' active' : ''}`}
            onClick={() => onTabClick(id)}
          >
            <span aria-hidden="true">{WINDOWS[id].icon}</span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {WINDOWS[id].title}
            </span>
          </button>
        ))}
      </div>

      <div className="tray">
        <span aria-hidden="true">{'\u{1F50A}'}</span>
        <span className="clock" aria-label={`Clock ${clock}`}>
          {clock}
        </span>
      </div>
    </div>
  )
}
