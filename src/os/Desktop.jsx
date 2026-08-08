import { useState } from 'react'
import { DESKTOP_ICONS } from './windows/registry'

/**
 * The teal desktop with its column of icons. Single click selects, double click
 * (or Enter) opens the window or external link.
 */
export default function Desktop({ onOpen }) {
  const [selected, setSelected] = useState(null)

  const activate = (icon) => {
    if (icon.external) {
      window.open(icon.external, '_blank', 'noopener')
    } else {
      onOpen(icon.id)
    }
  }

  return (
    <div className="desktop-icons">
      {DESKTOP_ICONS.map((icon) => (
        <div
          key={icon.id}
          className={`desktop-icon${selected === icon.id ? ' selected' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => setSelected(icon.id)}
          onDoubleClick={() => activate(icon)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') activate(icon)
          }}
        >
          <span className="glyph" aria-hidden="true">
            {icon.glyph}
          </span>
          <span className="label">{icon.label}</span>
        </div>
      ))}
    </div>
  )
}
