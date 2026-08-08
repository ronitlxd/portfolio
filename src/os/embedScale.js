// How much the 800x600 OS canvas is CSS `scale`d up before being placed onto
// the CRT glass (see scene/ScreenBridge.jsx, which doubles the source pixel
// density for sharper rendering on the glass). Window.jsx also needs this
// value: react-rnd's own internal position-correction math assumes NO
// external CSS scaling unless told via its own `scale` prop (separate from
// this CSS transform), and silently mispositions windows otherwise - it
// measures getBoundingClientRect() (which reflects the visual 2x scale) but
// compares it against un-scaled logical pixel positions.
// Bumped 2 -> 3 -> 4. The 3rd bump specifically targets the small (11-14px)
// body/sidebar text on the About/Experience/Projects pages, which still
// read visibly softer than the Home page's large heading even after fixing
// the nested-scroll-layer blur (see os.css history) - small glyphs need
// more source pixels per character to downsample cleanly through the
// <Html transform> onto the CRT glass than large ones do, so the fix is
// simply more source resolution across the board. SCREEN_SCALE in
// DeskPC.jsx was scaled by the same 3/4 factor to keep the on-screen size
// unchanged - if this changes again, that needs to move with it (see the
// comment on SCREEN_SCALE for the full list of things that depend on this).
export const EMBED_SCALE = 4
