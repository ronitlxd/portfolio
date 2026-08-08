// -----------------------------------------------------------------------------
// Henry's site shows a terminal-style loading screen while its 3D assets
// (desk model etc.) are still downloading, before you can interact with
// anything. Ours had a gap there too: Experience.jsx's <Suspense
// fallback={null}> means the office pack's .glb just renders nothing while
// it loads, a blank flash of the BG color. This fills that gap with a
// looping GIF (boot.gif) instead of a blank screen.
//
// `ready` comes from Experience.jsx's sceneReady state, which only flips
// true once SceneReady.jsx (mounted inside the same Suspense boundary as
// the actual scene content) has confirmed a real frame has painted - NOT
// just once Three.js's loading manager reports 100%. Those two moments
// aren't the same: loading-manager-done can land a beat before the GPU has
// actually uploaded/painted anything, which was showing as a white flash
// between this overlay disappearing and the model appearing. Gating on
// `ready` instead closes that gap.
//
// This always renders the same <img> (mounted once, never torn down) and
// only toggles visibility via a class - conditionally rendering (returning
// null while not ready) would unmount and remount the <img>, which resets
// the GIF back to frame 1 each time. Keeping it permanently mounted lets it
// play and loop continuously (it's authored with an infinite NETSCAPE loop
// count) the entire time it's visible.
export default function AssetLoader({ ready }) {
  return (
    <div className={`asset-loader${ready ? ' asset-loader-hidden' : ''}`}>
      <img src={`${import.meta.env.BASE_URL}media/boot.gif`} alt="Loading" />
    </div>
  )
}
