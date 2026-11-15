import { useEffect, useRef, useState } from 'react'
import { clientToLocal } from '../localPoint'

/**
 * A small Paint app: pencil, brush, eraser, line, rectangle, ellipse and
 * flood fill on one <canvas>, a colour palette, Clear and Save as PNG.
 *
 * Pointer coordinates go through clientToLocal (os/localPoint.js). The whole
 * OS sits under drei's <Html transform> (perspective + matrix3d) plus the
 * EMBED_SCALE upscale, and under that both bounding-rect math and the
 * browser's own offsetX/offsetY are wrong.
 *
 * The canvas bitmap is kept at layout size (1 bitmap px per CSS px) and
 * drawn with image-rendering: pixelated, so strokes stay crisp blocks
 * through the upscale instead of blurring. It resizes with the window and
 * keeps what was drawn.
 */

const TOOLS = [
  { id: 'pencil', label: 'Pencil', glyph: '✏️' },
  { id: 'brush', label: 'Brush', glyph: '\u{1F58C}️' },
  { id: 'eraser', label: 'Eraser', glyph: '\u{1F9FD}' },
  { id: 'fill', label: 'Fill', glyph: '\u{1FAA3}' },
  { id: 'line', label: 'Line', glyph: '╱' },
  { id: 'rect', label: 'Rectangle', glyph: '▭' },
  { id: 'ellipse', label: 'Ellipse', glyph: '⬭' },
]

const PALETTE = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
]

const SIZES = { pencil: 1, brush: 5, eraser: 12 }
const SHAPES = new Set(['line', 'rect', 'ellipse'])

function hexToRgba(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}

// Iterative scanline flood fill on raw pixels (no recursion, so a large
// area can't blow the stack).
function floodFill(ctx, x, y, hex) {
  const { width: w, height: h } = ctx.canvas
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const at = (px, py) => (py * w + px) * 4
  const start = at(x, y)
  const target = [d[start], d[start + 1], d[start + 2], d[start + 3]]
  const fill = hexToRgba(hex)
  if (target.every((v, i) => v === fill[i])) return

  const matches = (i) =>
    d[i] === target[0] && d[i + 1] === target[1] && d[i + 2] === target[2] && d[i + 3] === target[3]

  const stack = [[x, y]]
  while (stack.length) {
    let [cx, cy] = stack.pop()
    while (cx >= 0 && matches(at(cx, cy))) cx--
    cx++
    let up = false
    let down = false
    while (cx < w && matches(at(cx, cy))) {
      const i = at(cx, cy)
      d[i] = fill[0]
      d[i + 1] = fill[1]
      d[i + 2] = fill[2]
      d[i + 3] = 255
      if (cy > 0) {
        const m = matches(at(cx, cy - 1))
        if (m && !up) stack.push([cx, cy - 1])
        up = m
      }
      if (cy < h - 1) {
        const m = matches(at(cx, cy + 1))
        if (m && !down) stack.push([cx, cy + 1])
        down = m
      }
      cx++
    }
  }
  ctx.putImageData(img, 0, 0)
}

export default function PaintWindow() {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const markersRef = useRef(null)
  const drag = useRef(null) // { x, y, snapshot } while a stroke/shape is in progress
  const [tool, setTool] = useState('pencil')
  const [color, setColor] = useState('#000000')

  // Size the bitmap to the canvas area, and keep the drawing when the
  // window is resized (changing canvas.width wipes it otherwise).
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let painted = false // the default 300x150 bitmap is blank, never copy it

    const fit = () => {
      const w = Math.max(1, wrap.clientWidth)
      const h = Math.max(1, wrap.clientHeight)
      if (painted && w === canvas.width && h === canvas.height) return
      const old = painted ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null
      painted = true
      canvas.width = w
      canvas.height = h
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      if (old) ctx.putImageData(old, 0, 0)
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  const point = (e) => {
    const c = canvasRef.current
    const p = clientToLocal(markersRef.current, e.clientX, e.clientY, c.clientWidth, c.clientHeight)
    if (!p) return null
    return {
      x: Math.round(p.x * (c.width / c.clientWidth)),
      y: Math.round(p.y * (c.height / c.clientHeight)),
    }
  }

  const strokeStyle = (ctx) => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = SIZES[tool] ?? 2
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
  }

  const drawShape = (ctx, a, b) => {
    ctx.beginPath()
    if (tool === 'line') {
      ctx.moveTo(a.x + 0.5, a.y + 0.5)
      ctx.lineTo(b.x + 0.5, b.y + 0.5)
    } else if (tool === 'rect') {
      ctx.rect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y)
    } else {
      const rx = Math.abs(b.x - a.x) / 2
      const ry = Math.abs(b.y - a.y) / 2
      ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, rx, ry, 0, 0, Math.PI * 2)
    }
    ctx.stroke()
  }

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const p = point(e)
    if (!p) return

    if (tool === 'fill') {
      if (p.x >= 0 && p.y >= 0 && p.x < canvas.width && p.y < canvas.height) {
        floodFill(ctx, p.x, p.y, color)
      }
      return
    }

    canvas.setPointerCapture(e.pointerId)
    drag.current = {
      ...p,
      snapshot: SHAPES.has(tool) ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null,
    }

    if (!SHAPES.has(tool)) {
      // A single click still leaves a dot.
      strokeStyle(ctx)
      ctx.beginPath()
      ctx.moveTo(p.x + 0.5, p.y + 0.5)
      ctx.lineTo(p.x + 0.5, p.y + 0.5)
      ctx.stroke()
    }
  }

  const onPointerMove = (e) => {
    const start = drag.current
    if (!start) return
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true })
    const p = point(e)
    if (!p) return
    strokeStyle(ctx)

    if (SHAPES.has(tool)) {
      ctx.putImageData(start.snapshot, 0, 0)
      drawShape(ctx, start, p)
      return
    }

    ctx.beginPath()
    ctx.moveTo(start.x + 0.5, start.y + 0.5)
    ctx.lineTo(p.x + 0.5, p.y + 0.5)
    ctx.stroke()
    start.x = p.x
    start.y = p.y
  }

  const endStroke = () => {
    drag.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const save = () => {
    canvasRef.current.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'untitled.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }

  return (
    <div className="paint">
      <div className="paint-menu">
        <button type="button" onClick={clear}>Clear</button>
        <button type="button" onClick={save}>Save as PNG</button>
      </div>

      <div className="paint-main">
        <div className="paint-tools" role="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`paint-tool${tool === t.id ? ' active' : ''}`}
              title={t.label}
              aria-label={t.label}
              aria-pressed={tool === t.id}
              onClick={() => setTool(t.id)}
            >
              <span aria-hidden="true">{t.glyph}</span>
            </button>
          ))}
        </div>

        <div className="paint-canvas-wrap" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            className={`paint-canvas paint-cursor-${tool}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
          />
          {/* Corner positions for clientToLocal, see os/localPoint.js. */}
          <div className="corner-markers" ref={markersRef} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="paint-palette">
        <span className="paint-current" style={{ background: color }} aria-label={`Current colour ${color}`} />
        <div className="paint-swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={`paint-swatch${color === c ? ' active' : ''}`}
              style={{ background: c }}
              aria-label={`Colour ${c}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
