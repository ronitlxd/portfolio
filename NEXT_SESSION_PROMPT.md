# Next session — paste this to Claude Code

Read `HANDOFF.md` in this repo root first — full architecture, the
paste-and-bake edit-mode workflow, and known gotchas live there. Don't
re-derive any of that; this file is only the task list for this session.

Verify every visual change live (`npm run dev`, click through WIDE → TABLE →
SCREEN_SHOT) before marking a task done — don't rely on config values looking
right on paper. **This is not optional** — the previous attempt below marked
things done without verifying, and shipped a broken result.

## STATUS: verified directly against current code (don't re-diagnose)

A previous Claude Code attempt at Tasks 1–4 left the repo in a specific,
now-understood state. Read this before touching anything — it tells you
exactly what's actually true today, not what any prior summary claimed:

- **Root cause of the broken taskbar/icons layout, confirmed by reading the
  files:** `os.css` was refactored down to *content-only* CSS (About/Skills/
  Projects/Contact/terminal/showcase styling) — its own header comment now
  says "The OS chrome itself ... lives in `xp.css`". But **`src/os/xp.css`
  does not exist** (confirmed via glob — no such file anywhere in the repo),
  and `OS.jsx` no longer imports `98.css` either. Net effect: **zero CSS
  currently defines `.win98-screen`, `.taskbar`, `.desktop-icons`,
  `.start-button`, `.tabs`, `.tray`, `.title-bar`, `.window`, `.rnd-window`,
  `.start-menu`, etc.** Every one of those elements is rendering as
  unstyled, statically-positioned HTML, which is exactly why the taskbar
  (Start button / running-window tab / clock) appeared stacked underneath
  the desktop icons instead of pinned to the bottom — there's no
  `position: absolute` on either of them anymore, so they just flow in
  normal document order. This single missing file explains the whole
  screenshot, including the still-grey Win98-ish appearance (browser default
  styling, not actual Win98 CSS — 98.css is gone too).
- **The fix for Task 4 and the layout regression is the same fix**: writing
  `src/os/xp.css` (spec below) and importing it in `OS.jsx` simultaneously
  restores a working layout AND re-skins it to XP. There is no separate
  "just fix the regression first" step — do it as one pass.
- **Task 2 (CRT fade) is actually already correctly implemented** — verified
  by reading `sceneControlsStore.js` (has `zoomedToScreen` + `setZoomedToScreen`,
  idempotent, same external-store pattern as `fanOn`), `CameraRig.jsx` (calls
  `setZoomedToScreen(hoveringRef.current)` each frame when `started`, and
  `setZoomedToScreen(false)` otherwise), and `ScreenBridge.jsx` (reads
  `zoomedToScreen` via `useSceneControlsState()`, sets `.crt-overlay`'s
  inline `opacity` to 0 when true, and `os.css` has
  `transition: opacity 0.4s ease` on `.crt-overlay` for the fade). **Don't
  redo this** — just confirm it still fades correctly live once `xp.css`
  exists and the screen is visible/testable again.
- **Task 1 (flatten SCREEN_SHOT) is partially done, one likely bug remains.**
  `SCREEN_SHOT.position` in `CameraRig.jsx` is already recomputed to sit
  exactly on the line through `SCREEN_POSITION` along the screen's front
  normal (see the detailed comment above the `SCREEN_SHOT` constant — normal
  derived via `new THREE.Vector3(0,0,1).applyEuler(euler)`, not eyeballed).
  That fixes true keystone/perspective distortion from being off-axis. What
  it does **not** fix: the camera's `up` vector is never touched anywhere in
  `CameraRig.jsx` — it stays at three.js's default `(0,1,0)` (world up) for
  every shot, including `SCREEN_SHOT`. `SCREEN_ROTATION` (`[-2.865, 1.565,
  2.866]` rad) is a very non-trivial rotation, so the screen's own *local*
  "up" direction is almost certainly not world `(0,1,0)`. `camera.lookAt()`
  builds its orientation from `camera.up` + position + target — if the
  screen's actual up doesn't match world up, the projected rectangle comes
  out **rotated/skewed relative to the frame** (a parallelogram look) even
  though the camera is sitting perfectly on-axis. This is a very plausible
  explanation for the screenshot's persistent trapezoid look, and is a
  different bug from the one already fixed. See the Task 1 fix below.

Do not report a task complete without a live screenshot showing the change
actually present.

**Update: Tasks 1 and 6 are now done, verified.** Task 1's `camera.up`
alignment is live in `CameraRig.jsx` - `SCREEN_SHOT` now renders as a flat,
unskewed rectangle (confirmed via screenshot).

**Task 6 was corrected after an initial wrong implementation** - first pass
wrongly built one long scrolling document with a sticky header (anchor-
scroll nav). The user clarified with reference screenshots: it's NOT scroll-
to-anchor. It's **page-swapping inside the one window**, like tabs -
`ShowcaseWindow.jsx` now holds `useState('home' | 'about' | 'experience' |
'projects' | 'contact')`. Home is a centered splash with NO sidebar (name,
tagline, 4 inline links - unchanged from before). Clicking any link (or a
sidebar item once on another page) swaps to a two-column layout: a
persistent left sidebar (name + "Showcase '26" + Home/About/Experience/
Projects/Contact stacked vertically, active item marked with a small circle
+ bold, matching the reference) and a content pane on the right showing
ONLY the current page - other pages are not mounted. Confirmed twice this
is the correct structure (sidebar hidden only on Home, shown on every other
page). Verified via DOM inspection (clicking nav links actually swaps
`.showcase` <-> `.showcase-layout`, correct sidebar item gets `.active`,
correct page heading renders) since the automated pane's screenshot camera-
zoom trigger was unreliable this session (see environment note below) -
DOM-level verification was used as the reliable fallback, consistent with
HANDOFF.md's guidance.

`registry.jsx`/`StartMenu.jsx`/`Desktop.jsx` icons updated to match
(About/Skills/Projects/Contact windows removed, SOC_Lab and firewall.sys
kept separate per explicit decision).

**One loose end:** `AboutWindow.jsx`, `SkillsWindow.jsx`, `ProjectsWindow.jsx`,
`ContactWindow.jsx` are now fully unreferenced (their content was folded
into `ShowcaseWindow.jsx`) but could not be deleted from this session's
sandbox (permission denied on the mounted folder). Delete these four files
next time - they're dead code, not a "keep it around unreferenced on
purpose" case like the old `desk.glb` path in `DeskPC.jsx`.

**Environment note, not a code bug:** after clicking a nav link inside the
showcase window (triggering the `scrollIntoView` in Task 6), the automated
Chrome pane in this sandbox sometimes renders the CRT screen as solid black
in screenshots afterward, even though DOM inspection proves the app state is
completely correct (right classes, right scroll position, right opacity,
correct wallpaper/background colors all still present in computed styles).
A full page reload always fixes it and re-verifies clean. This matches
HANDOFF.md's already-documented "automated Browser pane can't always
composite this scene" quirk - don't chase it further if it recurs, and
don't mistake it for a real regression. Rely on the user's own browser for
final visual confirmation after interactions, same as HANDOFF.md already
advises.

## Task 1 — Flatten the SCREEN_SHOT camera angle (remaining part: camera.up)

Position is already correct (see STATUS above) — leave `SCREEN_SHOT.position`
alone. What's needed now: align the camera's `up` vector to the screen's own
local up when at/approaching `SCREEN_SHOT`, instead of leaving it at world
`(0,1,0)` for every shot.

- Derive the screen's local up the same way the front normal was derived:
  `new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...SCREEN_ROTATION))`
  (module-level constant, next to the existing normal-derivation comment —
  compute once, don't redo it every frame).
- In the `useFrame` loop, lerp `camera.up` toward that vector when `shot ===
  SCREEN_SHOT`, and toward world `(0,1,0)` for `WIDE`/`TABLE` — same
  `t = 1 - Math.exp(-LERP_SPEED * delta)` easing already used for position/
  look/fov, so all four properties transition together at the same rate.
  Call `camera.up.normalize()` after lerping (lerped vectors drift off unit
  length). `camera.lookAt()` already runs every frame after this, so the new
  `up` takes effect automatically — no other change needed.
- Verify by looking at the actual shape of the glass at `SCREEN_SHOT`: it
  should read as a flat, unrotated rectangle (like the henryheffernan.com
  reference screenshot on file), not a parallelogram/trapezoid. Check both
  edges (left/right) and top/bottom margins are even.

## Task 2 — CRT vintage filter fade — DONE, just verify

Already correctly implemented (see STATUS above): `sceneControlsStore.js`'s
`zoomedToScreen`, `CameraRig.jsx` setting it, `ScreenBridge.jsx` reading it
and fading `.crt-overlay`'s opacity, `os.css`'s `transition: opacity 0.4s
ease`. Once `xp.css` exists and the screen renders again, just confirm live
that the grain/vignette fades out at `SCREEN_SHOT` and back in at `TABLE`.
No code changes expected here unless the live check reveals otherwise.

## Task 3 — Wallpaper

`public/media/wallpaper.png` already exists (classic hills-and-sky image).
The CSS that applies it as `.win98-screen`'s background was lost when the
chrome rules moved out of `os.css` — it needs to be re-added as part of the
new `.win98-screen` rule in `xp.css` (see Task 4 spec below):
`background: #008080 url('/media/wallpaper.png') center center / cover
no-repeat;`. Don't recreate the image or touch anything under `public/`.

## Task 4 — Rebuild the OS theme: Win98 → Windows XP (also fixes the layout regression)

Decisions already made (don't re-ask): replace Win98 entirely (no
theme-switcher), keep `react-rnd` exactly as-is functionally (only restyle
`Window.jsx`'s chrome classes, don't touch its drag/resize/centering logic —
see `HANDOFF.md` for why `Window.jsx`'s `useLayoutEffect`/`updatePosition`
exists, do not "simplify" it away), hand-roll CSS (no `xp.css` npm package).

**Create `src/os/xp.css` from scratch** (it does not exist — this is the
main gap) and add `import './xp.css'` to `OS.jsx`. This one file needs to
define every OS-chrome selector currently referenced by `OS.jsx`/`Desktop.jsx`
/`Taskbar.jsx`/`StartMenu.jsx`/`Window.jsx` with no styling backing them at
all right now:

- **`.win98-screen`** — the 800×600 root. Needs `position: relative`,
  `overflow: hidden`, and the wallpaper background from Task 3. (Keep the
  class name `win98-screen` as-is throughout — it's just a class name, not
  worth a rename-everywhere pass.)
- **`.desktop-icons`** — `position: absolute; top/left` column, matching the
  reference XP desktop screenshot on file (icon + white drop-shadowed label
  stacked vertically, left-aligned column). This rule existing at all (with
  `position: absolute`) is what stops it from pushing the taskbar down the
  page — this is the actual regression fix, not just a style choice.
- **`.desktop-icon` / `.glyph` / `.label`** — icon glyph + white text with a
  dark drop-shadow for legibility over the wallpaper photo (see reference
  screenshot).
- **`.taskbar`** — `position: absolute; left: 0; right: 0; bottom: 0;` fixed
  height (~30px), XP's blue gradient (roughly `linear-gradient(to bottom,
  #2a8ae0, #1941a5 6%, #1941a5 94%, #1941a5)`), NOT Win98 grey. This
  `position: absolute` is the other half of the regression fix.
- **`.start-button`** — green gradient (roughly `#52c15d` → `#1a7a2d`),
  rounded right edge, bold white "start" text, Windows flag icon — matches
  the reference XP screenshot's Start button exactly, not the old Win98 grey
  button-with-flag-emoji look.
- **`.tabs` / `.tab`** — running-window tabs in the taskbar's middle,
  XP-style (slightly lighter blue than the taskbar background, active tab
  visually pressed-in).
- **`.tray`** — system tray on the right (clock, speaker icon), XP styling
  (no inset Win98 border).
- **`.start-menu`** — XP start menu look if reachable in the time available;
  lower priority than taskbar/window/icons since it's a secondary surface.
- **`.title-bar` / `.title-bar-text` / `.title-bar-controls` / `.window` /
  `.window-body` / `.rnd-window`** — this is Task 5's job: blue gradient
  title bar, rounded top corners (~6px), small icon + bold white title text,
  square minimize/restore/close buttons top-right (close red, per the
  "Form1" reference screenshot on file), plain white `.window-body`, thin
  blue window border. `.rnd-window`'s `z-index` behavior stays as-is.
- Boot screen (`.bios`) and shutdown screen (`.shutdown-screen`) stay in
  `os.css` and are **not** restyled — they're intentionally out of scope,
  already black full-screen text overlays independent of any theme.

**`xp.css` now exists and is fixed — don't rewrite it, extend it.** A prior
attempt wrote the whole file but omitted `width: 800px; height: 600px;` on
`.win98-screen`. Since nearly every child (`Desktop`, `Window`, `Taskbar`,
`StartMenu`) is `position: absolute`, that left `.win98-screen` with zero
in-flow content — its `height: auto` collapsed to 0, and combined with
`overflow: hidden` this clipped the *entire desktop* invisible. All that was
visible was the outer `<Html>` wrapper's inline fallback `background:
'#008080'` in `ScreenBridge.jsx` (plain teal, no wallpaper, no icons, no
taskbar — looked like a totally empty screen). Fixed by adding the explicit
`width`/`height` back. Verified live end-to-end: boot → desktop with
wallpaper + icon column → XP taskbar (green Start, blue bar) → showcase
window with blue-gradient chrome and a red close button. If `.win98-screen`
or its sizing is touched again, keep the explicit `800px`/`600px` — don't
rely on `auto` given how many children are absolutely positioned.

Verify live end-to-end after writing `xp.css`: fresh page load → boot →
desktop shows wallpaper with icons in a left column → taskbar is a blue bar
pinned to the bottom with a green Start button, tabs, and tray all in the
right places → opening a window shows XP-style blue-gradient chrome → CRT
fade (Task 2) still works when moving in/out of `SCREEN_SHOT`.

## Task 5 — Window chrome reference for Task 4

Reference screenshot on file: a classic XP window ("Form1") — blue gradient
title bar, small icon top-left, minimize/restore/close as square buttons
top-right (close in red), plain white body, thin blue border, resize grip
bottom-right corner. This is the exact chrome Task 4's window restyle should
match for every OS window (About, Skills, Projects, SOC_Lab, Contact,
Showcase) — not a separate/new window type, just the concrete visual target
for `Window.jsx`'s `.title-bar`/`.window` styling. Portfolio content renders
inside this chrome exactly like a Notepad-style document window.

## Task 6 — Single-window content layout (replaces the multi-window showcase)

Reference screenshot on file: henryheffernan.com's about page — name/title
stacked top-left, nav links below it, one long scrollable document to the
right/below containing every section, links scroll-jump down to their
section. Apply that structure here, inside the one Task-5-style window
chrome.

**This replaces the whole current multi-window content system, not just the
showcase window.** Today `windows/registry.jsx` opens a separate draggable
window per section (about/skills/projects/soclab/contact via desktop icons
or Start menu). After this task there is **one window total** for all
portfolio content — no separate About/Projects/Experience/Contact windows
left to open.

Layout inside that one window, top to bottom:

1. Name (Ronit Lad)
2. Tagline: "Cybersecurity Enthusiast"
3. Four links: **About, Projects, Experience, Contact** — no "Skills" (Skills
   as its own section is dropped; fold any content worth keeping into
   About/Experience rather than deleting it outright, use judgment or ask).
4. Below the links, one long scrollable page containing the About, Projects,
   Experience, and Contact sections stacked in that order. Clicking a link
   smooth-scrolls down to its section (anchor-scroll within the window body,
   like the reference) — it does NOT open a new window or replace/hide other
   sections.

Implementation notes:

- `windows/registry.jsx`'s `WINDOWS` map collapses to a single entry (or the
  registry concept may not be needed at all anymore — use judgment, but
  don't leave dead/unreachable code for the old per-section windows behind).
- Desktop icons / Start menu items for the now-gone separate windows should
  be removed or repointed to scroll/focus the one window — don't leave icons
  that do nothing.
- SOC_Lab (terminal easter egg) was explicitly out of scope for Task 4's
  re-skin — confirm with the user whether it also gets folded into this one
  window or stays a separate thing before touching it; don't assume.
- This interacts directly with Task 4/5 (XP re-skin, window chrome) and
  Task 2 (CRT filter fade at SCREEN_SHOT) — build content structure and
  chrome together rather than as two unrelated passes, since it's the same
  window.

## Open, not yet decided — do not act without asking

- **Fonts.** Discussed options (web-safe system fonts, Google Fonts CDN via
  `index.html`, self-hosted `@font-face`) but no specific font was chosen for
  either the OS UI or the showcase name. Confirm with the user before adding
  any font dependency or changing `font-family` anywhere.
