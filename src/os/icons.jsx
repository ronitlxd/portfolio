// Pixel-style icons for the desktop, title bars, taskbar and Start menu,
// drawn on a 16x16 grid in two colours (white lines, pale blue fill) so
// they stay quiet next to the content. They replace the multi-colour emoji
// the OS used before.

const LINE = '#ffffff'
const FILL = '#9cc3ff'

const SHAPES = {
  computer: (
    <>
      <rect x="2" y="2" width="12" height="9" fill={LINE} />
      <rect x="3" y="3" width="10" height="7" fill={FILL} />
      <rect x="6" y="11" width="4" height="2" fill={LINE} />
      <rect x="4" y="13" width="8" height="1" fill={LINE} />
    </>
  ),
  folder: (
    <>
      <rect x="2" y="3" width="5" height="2" fill={LINE} />
      <rect x="2" y="5" width="12" height="8" fill={LINE} />
      <rect x="3" y="6" width="10" height="6" fill={FILL} />
    </>
  ),
  paint: (
    <>
      <rect x="2" y="2" width="12" height="12" fill={LINE} />
      <rect x="3" y="3" width="10" height="10" fill={FILL} />
      <rect x="4" y="10" width="2" height="2" fill={LINE} />
      <rect x="6" y="8" width="2" height="2" fill={LINE} />
      <rect x="8" y="6" width="2" height="2" fill={LINE} />
      <rect x="10" y="4" width="2" height="2" fill={LINE} />
    </>
  ),
  globe: (
    <>
      <rect x="5" y="2" width="6" height="12" fill={LINE} />
      <rect x="3" y="3" width="10" height="10" fill={LINE} />
      <rect x="2" y="5" width="12" height="6" fill={LINE} />
      <rect x="5" y="3" width="6" height="10" fill={FILL} />
      <rect x="3" y="5" width="10" height="6" fill={FILL} />
      <rect x="7" y="2" width="2" height="12" fill={LINE} />
      <rect x="2" y="7" width="12" height="2" fill={LINE} />
    </>
  ),
  terminal: (
    <>
      <rect x="2" y="3" width="12" height="10" fill={LINE} />
      <rect x="3" y="4" width="10" height="8" fill="#1d2c4a" />
      <rect x="4" y="6" width="1" height="1" fill={FILL} />
      <rect x="5" y="7" width="1" height="1" fill={FILL} />
      <rect x="4" y="8" width="1" height="1" fill={FILL} />
      <rect x="7" y="9" width="4" height="1" fill={FILL} />
    </>
  ),
  shield: (
    <>
      <rect x="3" y="2" width="10" height="7" fill={LINE} />
      <rect x="4" y="9" width="8" height="2" fill={LINE} />
      <rect x="5" y="11" width="6" height="2" fill={LINE} />
      <rect x="7" y="13" width="2" height="1" fill={LINE} />
      <rect x="4" y="3" width="8" height="6" fill={FILL} />
      <rect x="5" y="9" width="6" height="2" fill={FILL} />
      <rect x="7" y="11" width="2" height="1" fill={FILL} />
    </>
  ),
}

export default function Icon({ name, size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ display: 'block', flex: 'none' }}
    >
      {SHAPES[name]}
    </svg>
  )
}
