import { useEffect, useState } from 'react'
import { FALLBACK_BYTES, useModelProgress } from './modelLoader'

// How long "All Content Loaded" stays on screen before the black loader
// gives way to the poster still (if the live scene isn't ready by then).
const POSTER_DELAY_MS = 600

// -----------------------------------------------------------------------------
// XP-style boot screen shown while the office pack's .glb downloads.
//
// Two stages:
//  - download: the bar's blocks fill left to right with the REAL download
//    progress (modelLoader.js streams the file and counts bytes).
//  - starting: download is done but the GPU is still parsing the model and
//    uploading textures. The bar switches to XP's sliding-blocks loop so the
//    screen doesn't look frozen.
// The overlay fades out once `ready` flips true, i.e. SceneReady.jsx (inside
// the scene's Suspense boundary) confirmed a real frame has painted. Gating
// on `ready` rather than on download-complete is what prevents a white flash
// before the model appears.
//
// Always mounted, only hidden with a class, so the fade-out transition in
// index.css can run.
// -----------------------------------------------------------------------------

const BLOCKS = 12

function Flag() {
  return (
    <svg className="boot-flag" viewBox="0 0 200 170" aria-hidden="true">
      <defs>
        <linearGradient id="bf-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2501f" />
          <stop offset="1" stopColor="#ff8a1a" />
        </linearGradient>
        <linearGradient id="bf-green" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#74b71b" />
          <stop offset="1" stopColor="#a6d83a" />
        </linearGradient>
        <linearGradient id="bf-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f9be8" />
          <stop offset="1" stopColor="#45c0fa" />
        </linearGradient>
        <linearGradient id="bf-yellow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb400" />
          <stop offset="1" stopColor="#ffd541" />
        </linearGradient>
      </defs>
      {/* Four panes, each with a wave along its top and bottom edge. */}
      <path d="M18 24 C44 10 68 14 94 26 L94 80 C68 68 44 64 18 78 Z" fill="url(#bf-red)" />
      <path d="M106 26 C132 38 156 42 182 28 L182 82 C156 96 132 92 106 80 Z" fill="url(#bf-green)" />
      <path d="M18 90 C44 76 68 80 94 92 L94 146 C68 134 44 130 18 144 Z" fill="url(#bf-blue)" />
      <path d="M106 92 C132 104 156 108 182 94 L182 148 C156 162 132 158 106 146 Z" fill="url(#bf-yellow)" />
    </svg>
  )
}

// BIOS-style readout in the top left. Every number comes from the real
// download: the one .glb is shown as 12 equal parts, matching the bar's blocks.
const PARTS = 12
const VISIBLE_ROWS = 7
const TOTAL_MB = FALLBACK_BYTES / 1e6
const partName = (n) => `office_pack.part${String(n).padStart(2, '0')}`
const row = (verb, n, pct) => `   ${verb} ${partName(n)}  ... ${pct}%`

function BiosReadout({ progress }) {
  const pct = Math.floor(progress * 100)
  const done = Math.floor(progress * PARTS)
  const rows = Array.from({ length: done }, (_, i) =>
    row('Loaded ', i + 1, Math.round(((i + 1) / PARTS) * 100)),
  )
  if (done < PARTS) rows.push(row('Loading', done + 1, pct))

  return (
    <pre className="boot-bios" aria-hidden="true">
      <strong>Ronit Inc.</strong>
      {'  RLBIOS (C)2026 Ronit Lad\n\n'}
      {`Checking model : ${(progress * TOTAL_MB).toFixed(1)} / ${TOTAL_MB.toFixed(1)} MB${
        done === PARTS ? ' OK' : ''
      }\n`}
      {`Total loaded   : ${pct}%\n\n`}
      {done === PARTS ? 'FINISHED LOADING RESOURCES\n' : 'LOADING RESOURCES\n'}
      <span className="boot-bios-rows">{rows.slice(-VISIBLE_ROWS).join('\n')}</span>
      {done === PARTS ? "\n\nAll Content Loaded, launching 'Ronit Lad Portfolio' V1.0" : ''}
    </pre>
  )
}

export default function AssetLoader({ ready }) {
  const progress = useModelProgress()
  const downloaded = progress >= 1
  const [showPoster, setShowPoster] = useState(false)

  useEffect(() => {
    if (!downloaded) return undefined
    const t = setTimeout(() => setShowPoster(true), POSTER_DELAY_MS)
    return () => clearTimeout(t)
  }, [downloaded])

  const showBlocks = progress < 1
  const lit = Math.round(progress * BLOCKS)

  return (
    <>
    {/* Pre-rendered still under the black loader, see .boot-poster in index.css. */}
    <div className={`boot-poster${ready ? ' boot-poster-hidden' : ''}`} aria-hidden="true" />
    <div className={`asset-loader${ready || showPoster ? ' asset-loader-hidden' : ''}`}>
      <BiosReadout progress={progress} />
      <div className="boot-xp">
        <div className="boot-logo">
          <Flag />
          <div className="boot-ms">
            Microsoft<sup>&reg;</sup>
          </div>
          <div className="boot-wordmark">
            <span className="boot-windows">Windows</span>
            <span className="boot-xp-tag">xp</span>
            <sup className="boot-tm">&trade;</sup>
          </div>
        </div>

        <div
          className="boot-bar"
          role="progressbar"
          aria-label="Loading"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          {showBlocks ? (
            <div className="boot-blocks">
              {Array.from({ length: BLOCKS }, (_, i) => (
                <span key={i} className={`boot-block${i < lit ? ' on' : ''}`} />
              ))}
            </div>
          ) : (
            <div className="boot-blocks boot-blocks-slide">
              <span className="boot-block on" />
              <span className="boot-block on" />
              <span className="boot-block on" />
            </div>
          )}
        </div>

        <div className="boot-foot boot-foot-left">Copyright &copy; Ronit Lad</div>
        <div className="boot-foot boot-foot-right">
          Portfolio<sup>&reg;</sup>
        </div>
      </div>
    </div>
    </>
  )
}
