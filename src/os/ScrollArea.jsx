import { useCallback, useEffect, useRef, useState } from 'react'

// -----------------------------------------------------------------------------
// Replaces native `overflow: auto` scrolling for window content. Native
// overflow:auto/scroll makes the browser split the scrollable element into
// its OWN compositing layer, rasterized at the page's normal screen
// resolution - decoupled from (and rasterized BEFORE) the EMBED_SCALE
// upscale + drei <Html transform> 3D matrix that projects the whole OS onto
// the tiny CRT glass. Every page long enough to actually need scrolling
// (About/Experience/Projects) was hitting this and coming out visibly
// blurrier than short pages (Home/Contact) that never triggered a scroll
// layer in the first place.
//
// Fix: no native overflow scrolling at all. The outer wrapper is
// `overflow: hidden` (never scrolls, never gets its own compositing layer);
// the inner content is nudged up/down via a plain CSS `transform:
// translateY()`, driven by wheel events - a transform on an element that's
// already inside the transformed <Html> tree stays in the SAME paint layer,
// so it gets upscaled/downsampled together with everything else, same as
// Home's static content. A small custom scrollbar thumb (visual only,
// non-interactive) replaces the native one so there's still a scroll
// position indicator.
// -----------------------------------------------------------------------------
export default function ScrollArea({ children, className = '' }) {
  const outerRef = useRef(null)
  const innerRef = useRef(null)
  const [offset, setOffset] = useState(0)
  const [maxOffset, setMaxOffset] = useState(0)
  // Touch-drag scrolling - onWheel below only ever fires for a real mouse
  // wheel, phones have no wheel events at all, so without this there was no
  // way to scroll these windows by touch whatsoever. Tracked as a ref (not
  // state) since it's read/written on every pointermove and shouldn't
  // trigger re-renders itself - only the resulting offset state does.
  const dragRef = useRef({ active: false, startY: 0, startOffset: 0 })

  const recompute = useCallback(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const max = Math.max(0, inner.scrollHeight - outer.clientHeight)
    setMaxOffset(max)
    setOffset((o) => Math.min(o, max))
  }, [])

  useEffect(() => {
    recompute()
    const ro = new ResizeObserver(recompute)
    if (innerRef.current) ro.observe(innerRef.current)
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [recompute, children])

  const onWheel = (e) => {
    if (maxOffset <= 0) return
    e.preventDefault()
    setOffset((o) => Math.min(maxOffset, Math.max(0, o + e.deltaY)))
  }

  // Touch-drag scrolling - pointer events cover both touch and mouse, but
  // this is only meant to kick in for touch (mouse already has onWheel);
  // gating on pointerType keeps a stray mouse drag on this area from also
  // scrolling it, which nobody expects on desktop.
  const onPointerDown = (e) => {
    if (e.pointerType !== 'touch' || maxOffset <= 0) return
    dragRef.current = { active: true, startY: e.clientY, startOffset: offset }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragRef.current.active) return
    const delta = dragRef.current.startY - e.clientY
    setOffset(Math.min(maxOffset, Math.max(0, dragRef.current.startOffset + delta)))
  }
  const endDrag = () => {
    dragRef.current.active = false
  }

  const outerHeight = outerRef.current?.clientHeight ?? 0
  const thumbHeightPct =
    maxOffset > 0 && outerHeight > 0
      ? Math.max(10, (outerHeight / (outerHeight + maxOffset)) * 100)
      : 100
  const thumbTopPct = maxOffset > 0 ? (offset / maxOffset) * (100 - thumbHeightPct) : 0

  return (
    <div
      ref={outerRef}
      className={`scroll-area ${className}`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{ touchAction: 'none' }}
    >
      <div
        ref={innerRef}
        className="scroll-area-inner"
        style={{ transform: `translateY(${-offset}px)` }}
      >
        {children}
      </div>
      {maxOffset > 0 && (
        <div className="scroll-area-track">
          <div
            className="scroll-area-thumb"
            style={{ height: `${thumbHeightPct}%`, top: `${thumbTopPct}%` }}
          />
        </div>
      )}
    </div>
  )
}
