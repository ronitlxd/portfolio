import { links } from '../data/content'

/**
 * Classic Start menu. Internal items open OS windows; external items open URLs;
 * Shut Down triggers the "safe to turn off" screen.
 */
export default function StartMenu({ onOpen, onExternal, onShutDown, onClose }) {
  const item = (label, glyph, action) => (
    <div
      className="item"
      role="menuitem"
      tabIndex={0}
      onClick={() => {
        action()
        onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          action()
          onClose()
        }
      }}
    >
      <span aria-hidden="true">{glyph}</span>
      {label}
    </div>
  )

  return (
    <div className="start-menu" role="menu">
      <div className="rail">Ronit Lad</div>
      <div className="items">
        {item('My Showcase', '\u{1F5A5}\u{FE0F}', () => onOpen('showcase'))}
        {item('SOC_Lab', '\u{1F5B3}\u{FE0F}', () => onOpen('soclab'))}
        {item('firewall.sys', '\u{1F6E1}\u{FE0F}', () => onOpen('firewall'))}
        <div className="divider" />
        {item('GitHub', '\u{1F419}', () => onExternal(links.github))}
        {item('LinkedIn', '\u{1F4BC}', () => onExternal(links.linkedin))}
        {item('Email me', '\u{1F4E7}', () => onExternal(links.email))}
        <div className="divider" />
        {item('Shut Down...', '\u{23FB}', onShutDown)}
      </div>
    </div>
  )
}
