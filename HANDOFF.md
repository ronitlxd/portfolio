# pv1 handoff (current as of Nov 2026)

Ronit Lad's 3D portfolio. Vite + React + React Three Fiber (`@react-three/fiber`, `drei`, `postprocessing`). One scene, a 90s office cubicle, viewed through a scripted camera, with a Windows XP style OS (`react-rnd` windows) projected onto the monitor glass via drei `<Html transform>`. Ronit is a cybersecurity Master's student (University of Windsor) looking for a paid co-op in Canada, so this site is also his main job-search asset.

- Live: https://ronitlxd.github.io/portfolio/
- Repo: https://github.com/ronitlxd/portfolio (branch `main`)
- Local: `npm install`, then `npm run dev`, open `http://localhost:5173/portfolio/` (the `/portfolio/` base path matters, it is set in `vite.config.js` for GitHub Pages)
- Phone testing on the same Wi-Fi: `npm run dev -- --host`, open the printed Network URL

## Deploy

Push to `main` and `.github/workflows/deploy.yml` builds and deploys to GitHub Pages automatically (Settings > Pages > Source is already "GitHub Actions"). Check the Actions tab if the site does not update. A build failure there almost always means a syntax error, so run `npm run build` locally before pushing.

## First things to do in this repo (git is messy, read this)

Most of the previous sessions ran in a sandbox that could create files but never delete them, so git was driven with plumbing commands and a hand-written `.git/refs/heads/main`. That left debris. In a normal Windows shell none of that restriction applies. Clean up first:

1. `git status` and `git log --oneline -8`. The latest local commit should be "Wire up real GitHub repo links for Argus and Trident". If `git status` shows nearly every file as modified, that is CRLF vs LF noise, not real changes. Do not `git add -A` blindly.
2. Delete stray lock files if any command complains: `Remove-Item .git\*.lock -Force`.
3. Delete the leftover `.git\idx_*` files (not tracked, just clutter) and the untracked `vite.config.js.timestamp-*.mjs` files in the repo root.
4. There is a stale local branch `master` (same as an old commit). Safe to delete with `git branch -D master`.
5. `git fetch origin`, confirm `origin/main` is behind or equal to local `main`, then `git push origin main` if the last few commits (Argus, Trident, repo links) are not up yet. The remote also has a `README.md` commit that is already merged locally.
6. Add a `.gitattributes` with `* text=auto eol=lf` so the CRLF noise stops. Ronit already agreed this is a good idea but it has not been added yet.

## Architecture (src/)

- `App.jsx` always renders `<Experience />`. There used to be a separate flat mobile page (`mobile/MobilePage.jsx`, `hooks/useMediaQuery.js`), now unused but left in place as an optional fallback.
- `scene/Experience.jsx` is the scene root: background and fog color, lights (one directional key light with shadows plus fill lights and an `Environment` made of `Lightformer`s), `EffectComposer` (Bloom, Vignette), camera mode, `AssetLoader`/`SceneReady` loading overlay. It owns two flags to know about:
  - `SHOW_EDIT_OVERLAY` (currently `false`) shows or hides the layout editor button. Flip to `true` to edit layout, flip back before pushing.
  - `isTouchDevice` (module level): on touch devices it uses a fixed dpr (max 1.5), skips `AdaptiveDpr`, and sets multisampling to 0. This was added to stop screen flicker on phones, it is unverified on a real device.
- `scene/OfficePack.jsx` loads `public/models/90s_retro_office_pack.glb` (about 56MB, about 141 top level parts with mostly meaningless names). Each part's full world transform is baked into the part, detached, and wrapped in its own `<Editable>`. It owns `REMOVED_PARTS` (parts deleted from render), `PART_OFFSETS` (per part nudges from the editor), a real time analog clock (hands rotate around `CLOCK_PIVOT`, calibrated with `CLOCK_TIME_OFFSET_MS = -3h`), an oscillating fan, and two spotlights (`lampLight1`, `lampLight2`). Axes for the clock and fan were derived with PCA over real vertex data, not bounding boxes, because bounding box guesses were wrong twice. Do not guess these again.
- `scene/CameraRig.jsx` runs four stages: IDLE (slow sine sweep), TABLE (after first click), SCREEN (zoomed to the glass), back to IDLE. All shots are centered on the monitor's real world position, not the pack origin. Details that matter:
  - Mouse: hovering near the screen zooms in, clicking far left or right edge backs out to IDLE.
  - Touch: there is no hover, so a tap on the screen's on-screen position zooms in (`isNearScreen`), and a tap outside the OS overlay zooms back out.
  - `fovForAspect()` keeps horizontal framing consistent across aspect ratios (desktop shots were tuned at 16:9, portrait phones would otherwise look hugely zoomed). `MOBILE_SCREEN_ZOOM = 0.6` further narrows the SCREEN_SHOT on touch devices so the CRT glass fills the phone width. That number was a guess and has not been tested on a device, tune it if it is too tight or too loose.
- `scene/ScreenBridge.jsx` projects the OS onto the glass via `<Html transform>`. Rendered at 800x600, magnified by `EMBED_SCALE` (currently 4, in `os/embedScale.js`) for sharper text. If `EMBED_SCALE` changes, `SCREEN_SCALE` in `scene/DeskPC.jsx` must be divided by the same factor (currently `[0.004, 0.004, 0.001]`). No occlusion on the `<Html>` on purpose, both occlusion modes were tried and break (blank screen with Bloom, or false hiding).
- `scene/DeskPC.jsx` now mostly just holds `SCREEN_POSITION`, `SCREEN_ROTATION`, `SCREEN_SCALE`. The rotation looks extreme (`[-2.865, 1.565, 2.866]`) but was arrived at by hand dragging, it is not wrong.
- `scene/AssetLoader.jsx` + `SceneReady.jsx`: a full screen looping `public/media/boot.gif` shows until the scene has actually painted (two frames after Suspense resolves, not when the loading manager says 100%). The `<img>` is never unmounted (unmounting restarts the GIF), only hidden with a CSS class.
- `scene/Editable.jsx`, `editStore.js`, `EditModeOverlay.jsx`: the layout editor. Hidden, not removed. Workflow when used: drag things in the browser, hit "Copy all as code", bake only the changed entries into `PART_OFFSETS` / `REMOVED_PARTS` / `SCREEN_*` / lamp constants.
- `os/` is the XP style UI: `OS.jsx`, `Desktop.jsx`, `Taskbar.jsx`, `StartMenu.jsx`, `Window.jsx` (react-rnd), `xp.css` (OS chrome), `os.css` (page content styling). `Window.jsx` has a `useLayoutEffect` that snaps position back after react-rnd's mount-time correction, because react-rnd cannot compute the right offset under a 3D `matrix3d` ancestor. Do not "simplify" it away. `.win98-screen` must keep explicit `800px` x `600px`.
- `os/ScrollArea.jsx` replaces native scrolling (native scroll layers came out blurry under the 3D transform). It handles mouse wheel and, newly, touch drag (pointer events gated to `pointerType === 'touch'`).
- `os/windows/ShowcaseWindow.jsx` is the main window: Home, About, Education, Experience, Projects (landing with Security Ops and Dev Projects categories, then project list, then project detail), Contact. `AboutWindow`, `SkillsWindow`, `ProjectsWindow`, `ContactWindow` in `os/windows/` are dead code from an earlier design and can be deleted.

## Content is data driven: `src/data/content.js`

All copy lives here and is rendered generically, so adding content is usually a data change plus, rarely, a render branch.

- `aboutPage` (intro, figures, sections, closing), `education`, `educationPage`, `experience`, `certifications`, `projectCategories` (each has an `icon`).
- `securityProjects`: Home Lab, Agentic SOC, Argus - Server Ops, Trident - Autonomous Pentesting, Packet Sniffer, AWS Security Scanner, Attacks.
- `devProjects`: Athlete Injury Dashboard, Food Redistribution, Educompare, Adaptive RAG Pipeline.
- A project is `{ title, description, tech[], code, ... }`. The detail ("More") page in `ProjectDetailPage` (in `ShowcaseWindow.jsx`) picks the first that exists: `detailAgents` (only Agentic SOC, renders a diagram then an agent list) then `detailParagraphs` (short paragraphs, plus optional `detailImages` with captions) then legacy `detail` bullets then plain `description`.
- Images go in `public/media/` and are referenced as `` `${import.meta.env.BASE_URL}media/name.png` `` always, never a hardcoded `/media/...`, or they break on GitHub Pages.
- Figures with a bold "Figure N:" caption prefix render through the shared `AboutFigure` component, floats via `.about-figure-float-left/right` in `os.css`.

## Writing rules for site copy (Ronit's standing preferences)

- First person, plain, confident, short sentences. No em dashes, no colons in prose. No filler, no buzzwords.
- Never fabricate experience or results. Anything in progress is written in present tense and says so. Benchmarks from papers are attributed to the paper, not claimed as his. Trident is the example (Phase 0, no engine yet).
- Tech tag lists only include things that are actually built or used.

## Open items

- Trident has no screenshots and no results yet. Once the engine and one adapter run, send real numbers and flip the copy to past tense.
- Argus has one screenshot (`public/media/argus.png`). More can be added to `detailImages` (full dashboard, the approval popup).
- Attacks, Food Redistribution, Educompare still only have a short `description` (no detail page). Same pattern as Home Lab if Ronit supplies details.
- Mobile 3D is new and untested on a real phone: check the zoom level (`MOBILE_SCREEN_ZOOM`), touch scrolling inside windows, and whether the flicker is really gone. Performance on weaker phones is the main unknown (heavy GLB, Bloom).
- Tidy the dead window files listed above, and `public/models/desk.glb` plus `FloorLamp.jsx`/`Prop.jsx` are unused leftovers from the first build, kept on purpose so far.
- Optional: LinkedIn post about the site and a headline/About rewrite were drafted in chat, not part of this repo.

## Environment gotchas

- The automated browser pane often cannot screenshot this scene (huge textures, hidden document). Check the console for errors after edits and let the user confirm visually.
- Windows git can warn "LF will be replaced by CRLF". Fix with the `.gitattributes` above.
- Vite dev may log WebGL context errors after many reloads in one browser session, close extra tabs before debugging them.
