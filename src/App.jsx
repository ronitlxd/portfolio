import Experience from './scene/Experience'

// Phones used to get a separate flat scroll page (MobilePage.jsx) instead of
// the 3D scene - Ronit asked for the real 3D desk on mobile too, with touch
// controls instead of mouse ones (see CameraRig.jsx's onDown/tap-to-zoom
// logic and index.css's touch-action:none on the canvas). MobilePage.jsx is
// left in place, just unused, in case a lightweight fallback is wanted again
// later (e.g. for very old devices) - nothing needs to change here to bring
// it back, just re-add the media-query branch that used to live in this
// file.
export default function App() {
  return <Experience />
}
