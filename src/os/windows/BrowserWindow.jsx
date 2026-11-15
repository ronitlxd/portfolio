import { useEffect, useRef, useState } from 'react'
import { projectReplicas } from '../../data/content'
import { showReplica, useCurrentReplica } from '../browserStore'

/**
 * Internet Explorer style window that shows a project replica (a static
 * page under public/demos/, sample data only) in an <iframe>.
 *
 * The replicas are desktop web apps laid out for ~1100px+ screens, and this
 * window is ~700px wide, so the page is rendered at PAGE_WIDTH and scaled
 * down to fit instead of reflowing into its cramped/mobile layout. "Open in
 * new tab" shows the same replica full size.
 */

const PAGE_WIDTH = 1100
const BASE = import.meta.env.BASE_URL

export default function BrowserWindow() {
  const currentId = useCurrentReplica()
  const project = projectReplicas.find((p) => p.id === currentId) ?? projectReplicas[0]
  const viewRef = useRef(null)
  const frameRef = useRef(null)
  const [view, setView] = useState({ w: 0, h: 0 })
  const [reloads, setReloads] = useState(0)

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
      <div className="browser-toolbar">
        <button type="button" onClick={() => frameRef.current?.contentWindow?.history.back()} disabled={!src}>
          {'◀'} Back
        </button>
        <button type="button" onClick={() => setReloads((n) => n + 1)} disabled={!src}>
          {'↻'} Refresh
        </button>
        <span className="browser-label">Address</span>
        <div className="browser-address">{project.address}</div>
        <button type="button" onClick={() => src && window.open(src, '_blank', 'noopener')} disabled={!src} title="Open the replica full size in a new tab">
          Open in new tab
        </button>
      </div>

      <div className="browser-links">
        <span className="browser-label">Links</span>
        {projectReplicas.map((p) => (
          <a
            key={p.id}
            tabIndex={0}
            className={p.id === project.id ? 'active' : ''}
            onClick={() => showReplica(p.id)}
          >
            {p.title}
          </a>
        ))}
      </div>

      <div className="browser-notice">
        Interactive replica of {project.title}. Everything shown is sample data, nothing connects to a real system.
      </div>

      <div className="browser-view" ref={viewRef}>
        {src ? (
          <iframe
            key={`${project.id}-${reloads}`}
            ref={frameRef}
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
    </div>
  )
}
