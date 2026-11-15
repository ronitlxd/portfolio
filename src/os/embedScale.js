// How much the 800x600 OS canvas is CSS `scale`d up before being placed onto
// the CRT glass (see scene/ScreenBridge.jsx). Window.jsx also needs this
// value: react-rnd's own internal position-correction math assumes NO
// external CSS scaling unless told via its own `scale` prop (separate from
// this CSS transform), and silently mispositions windows otherwise - it
// measures getBoundingClientRect() (which reflects the visual scale) but
// compares it against un-scaled logical pixel positions.
//
// History: 2 -> 3 -> 4 -> back to 2. The bumps aimed at sharper small text,
// but once the glass fit was made exact and the Showcase text was shrunk,
// 4x meant drawing at 3200x2400 and then shrinking ~2.7x onto a typical
// screen. GPU texture filtering skips pixels past ~2x minification, so
// small text looked rough. Ronit compared 2/3/4 side by side and 2 was the
// sharpest. SCREEN_SCALE in DeskPC.jsx is computed from this value, so the
// on-screen size stays the same whatever it is.
//
// Dev-only A/B switch: open the dev site with ?embed=3 (or 1..6) to try
// another value without editing code. Production builds always use the
// default.
const devOverride = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('embed')) : 0
export const EMBED_SCALE = devOverride >= 1 && devOverride <= 6 ? devOverride : 2
