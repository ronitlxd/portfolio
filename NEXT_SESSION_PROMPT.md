# Paste this into Claude Code to start a session

Read `HANDOFF.md` in this repo root first. It has the architecture, the data-driven content model, Ronit's writing rules, and the git cleanup steps. Don't re-derive any of that.

Then, before anything else:

1. Run the git cleanup in the "First things to do in this repo" section of `HANDOFF.md`, and confirm `main` is pushed to `origin`.
2. Run `npm install` and `npm run dev`, open `http://localhost:5173/portfolio/`, and click through the intro, the screen zoom, and the Projects pages.

Then ask me what I want to work on. Likely candidates are listed under "Open items" in `HANDOFF.md` (mobile tuning, more project detail pages, Trident results, `.gitattributes`).

Rules that always apply:

- Site copy is first person, plain, no em dashes, no colons in prose, never invent results or experience.
- Run `npm run build` before every push, a build error breaks the live site.
- Verify visual changes in a browser, don't assume they look right.
