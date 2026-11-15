import { useEffect, useRef, useState } from 'react'
import { projectReplicas } from '../../data/content'
import { useCurrentReplica } from '../browserStore'

/**
 * Internet Explorer style window that shows a project replica (a static
 * page under public/demos/, sample data only) in an <iframe>. No toolbar,
 * address or links bars (removed at Ronit's request): just the page, and an
 * IE-style status bar at the bottom that keeps the "sample data" note.
 *
 * The replicas are desktop web apps laid out for ~1100px+ screens, and this
 * window is ~700px wide, so the page is rendered at PAGE_WIDTH and scaled
 * down to fit instead of reflowing into its cramped/mobile layout.
 */

const PAGE_WIDTH = 1100
const BASE = import.meta.env.BASE_URL

export default function BrowserWindow() {
  const currentId = useCurrentReplica()
  const project = projectReplicas.find((p) => p.id === currentId) ?? projectReplicas[0]
  const viewRef = useRef(null)
  const [view, setView] = useState({ w: 0, h: 0 })

  // Track the viewport's layout size (unaffected by the 3D transform).
  useEffect(() => {
    const el = viewRef.current
    const fit = () => setView({ w: el.clientWidth, h: el.clientHeight })
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = view.w ? view.w / PAGE_WIDTH : 1
  const src = project.path ? `${BASE}${project.path}` : null

  return (
    <div className="browser">
      <div className="browser-view" ref={viewRef}>
        {src ? (
          <iframe
            key={project.id}
            title={`${project.title} replica`}
            src={src}
            sandbox="allow-scripts allow-same-origin"
            style={{
              width: PAGE_WIDTH,
              height: view.h / scale,
              transform: `scale(${scale})`,
            }}
          />
        ) : (
          <div className="browser-placeholder">
            <span aria-hidden="true">{project.glyph}</span>
            <strong>{project.title}</strong>
            <p>This replica is still being built. Check back soon.</p>
          </div>
        )}
      </div>

      <div className="browser-status">
        <span>Done</span>
        <span>{project.file} · Replica with sample data only</span>
      </div>
    </div>
  )
}
