import { useLayoutEffect, useRef } from 'react'
import { Rnd } from 'react-rnd'
import { EMBED_SCALE } from './embedScale'

/**
 * A draggable, resizable Win98 window. Dragging is bound by the .win98-screen
 * parent so windows never leave the CRT. Title bar acts as the drag handle.
 *
 * THE CENTERING BUG (real root cause, take 2): `scale={EMBED_SCALE}` alone
 * does not fix this. react-rnd's own componentDidMount always runs a
 * getBoundingClientRect()-based "correction" (see updateOffsetFromParent in
 * react-rnd's source), which assumes the only ancestor transform in play is
 * a plain, uniform CSS `transform: scale(N)` - exactly what its `scale` prop
 * is for. Our real ancestor transform is drei's <Html transform> though: a
 * full 3D matrix3d built from the screen mesh's position/rotation/scale,
 * reprojected by the camera every frame - nothing like a uniform 2D scale,
 * and its effective magnification changes with whichever shot the camera is
 * currently on (WIDE / TABLE / SCREEN_SHOT put the screen at wildly
 * different apparent sizes on screen). No constant passed via `scale` can
 * make react-rnd's correction land on the right number here - it was never
 * going to be a fixed value, since the "right" value depends on the live
 * camera distance at the exact moment the window happens to mount.
 *
 * Rather than fight that measurement, this lets Rnd apply whatever (wrong)
 * correction it wants, then immediately snaps the position back to the real
 * intended default right after mount, via the imperative `updatePosition`
 * method react-rnd exposes on its ref - in a useLayoutEffect (fires before
 * the browser paints, so there's no visible flash of the wrong position).
 * `scale={EMBED_SCALE}` is kept for its OTHER job (converting real pointer
 * drag deltas into logical desktop pixels while actively dragging/resizing)
 * even though it's still an approximation for the same reason above.
 */
export default function Window({
  win, // registry entry: { title, icon, size, pos, statusBar }
  zIndex,
  active,
  onFocus,
  onClose,
  children,
}) {
  const rndRef = useRef(null)

  useLayoutEffect(() => {
    rndRef.current?.updatePosition({ x: win.pos.x, y: win.pos.y })
    // Only ever re-run this for a genuinely different window instance -
    // win.pos itself is deliberately excluded so dragging the window
    // afterward doesn't get stomped back to center.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Rnd
      ref={rndRef}
      className="rnd-window"
      style={{ zIndex }}
      default={{
        x: win.pos.x,
        y: win.pos.y,
        width: win.size.width,
        height: win.size.height,
      }}
      minWidth={260}
      minHeight={140}
      bounds="parent"
      scale={EMBED_SCALE}
      dragHandleClassName="title-bar"
      onMouseDown={onFocus}
      enableResizing={{
        bottom: true,
        bottomRight: true,
        right: true,
        top: false,
        left: false,
        topLeft: false,
        topRight: false,
        bottomLeft: true,
      }}
    >
      <div className="window" style={{ height: '100%' }}>
        <div
          className="title-bar"
          style={active ? undefined : { background: '#7f7f7f' }}
        >
          <div className="title-bar-text">
            <span aria-hidden="true">{win.icon}</span>
            {win.title}
          </div>
          <div className="title-bar-controls">
            <button aria-label="Minimize" onClick={onClose} />
            <button aria-label="Maximize" disabled />
            <button aria-label="Close" onClick={onClose} />
          </div>
        </div>
        {/* No native overflow scrolling, and no generic scroller wrapper
            here either - ShowcaseWindow.jsx (the one window whose content
            actually gets tall enough to need scrolling) owns its own
            transform-based ScrollArea internally, scoped to just its
            content pane so its sidebar can stay pinned in view. See
            ScrollArea.jsx for why native overflow:auto was replaced. */}
        <div className="window-body">{children}</div>
        {win.statusBar && (
          <div className="status-bar">
            <p className="status-bar-field">{win.statusBar}</p>
          </div>
        )}
      </div>
    </Rnd>
  )
}
