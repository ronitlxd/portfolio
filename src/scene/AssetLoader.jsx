import { useModelProgress } from './modelLoader'

// -----------------------------------------------------------------------------
// XP-style boot screen shown while the office pack's .glb downloads. The bar
// fills with the REAL download percentage (modelLoader.js streams the file
// and counts bytes), then reads "Starting up" between 100% and the first
// painted frame.
//
// `ready` comes from Experience.jsx's sceneReady state, which only flips
// true once SceneReady.jsx (mounted inside the same Suspense boundary as
// the actual scene content) has confirmed a real frame has painted - NOT
// just once the download hits 100%. Those two moments aren't the same:
// the GPU still has to parse the model and upload textures, which showed
// as a white flash when the overlay hid too early. Gating on `ready`
// closes that gap.
//
// Always mounted, only hidden with a class, so the fade-out transition in
// index.css can run.
// -----------------------------------------------------------------------------

const SEGMENTS = 20

export default function AssetLoader({ ready }) {
  const progress = useModelProgress()
  const pct = Math.round(progress * 100)
  const lit = Math.round(progress * SEGMENTS)

  return (
    <div className={`asset-loader${ready ? ' asset-loader-hidden' : ''}`}>
      <div className="boot-xp">
        <div className="boot-xp-wordmark">
          <span className="boot-xp-name">Ronit Lad</span>
          <span className="boot-xp-sub">portfolio</span>
        </div>

        <div
          className="boot-xp-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span key={i} className={`boot-xp-seg${i < lit ? ' on' : ''}`} />
          ))}
        </div>

        <p className="boot-xp-status">
          {progress < 1 ? `Loading ${pct}%` : 'Starting up'}
        </p>
      </div>
    </div>
  )
}
