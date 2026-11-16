import ShowcaseWindow from './ShowcaseWindow'
import SocLabWindow from './SocLabWindow'
import FirewallWindow from './FirewallWindow'
import PaintWindow from './PaintWindow'
import ProjectsFolderWindow from './ProjectsFolderWindow'
import BrowserWindow from './BrowserWindow'
import Icon from '../icons'

// TASK 6: About/Skills/Projects/Contact used to be their own windows here -
// collapsed into one scrollable page inside ShowcaseWindow.jsx (see that
// file). AboutWindow.jsx/SkillsWindow.jsx/ProjectsWindow.jsx/ContactWindow.jsx
// were deleted, not just unlinked - their content lives on inside
// ShowcaseWindow.jsx instead of as dead files. SOC_Lab and firewall.sys stay
// separate windows, unchanged (explicit user decision, not an oversight).

// .win98-screen is a fixed 800x600 (see os.css), with a 30px .taskbar
// pinned to the bottom - so the true center of the actually-usable desktop
// area is NOT (800/2, 600/2), it's centered against (800, 600 - 30). Used
// to compute a window's default position from its size, instead of hand-
// guessing pixel offsets that go stale the moment the size changes.
const DESKTOP_WIDTH = 800
const DESKTOP_HEIGHT = 600
const TASKBAR_HEIGHT = 30

function centered({ width, height }) {
  return {
    x: (DESKTOP_WIDTH - width) / 2,
    y: (DESKTOP_HEIGHT - TASKBAR_HEIGHT - height) / 2,
  }
}

// Bumped up from 680x420 (still fits the 800x600 desktop with a small
// margin on all sides, above the 30px taskbar) - `centered()` below
// recomputes position from this size, so it stays centered automatically.
// Near full-screen, so the (dimmed) desktop is just a quiet frame around the
// content. It was 600x420 for a while, which showed more wallpaper.
const SHOWCASE_SIZE = { width: 760, height: 540 }
const PAINT_SIZE = { width: 600, height: 440 }
const FOLDER_SIZE = { width: 620, height: 400 }
const BROWSER_SIZE = { width: 740, height: 520 }

// Each window: id -> { title, icon (emoji glyph), Component, size, pos }
export const WINDOWS = {
  showcase: {
    title: 'Ronit Lad - Showcase 2026',
    icon: <Icon name="computer" />,
    Component: ShowcaseWindow,
    // Opens centered on the real usable desktop area (see `centered` above)
    // instead of a fixed guessed position - stays correct if size changes.
    //
    // Computed ONCE here, as a plain value - NOT a getter. A getter
    // recomputes a brand-new {x,y} object every single read, and Window
    // re-renders whenever ANY window's focus/stack changes (not just its
    // own) - react-rnd was reasserting that fresh "centered" position on
    // those re-renders, fighting the user's own drags so the window
    // couldn't be moved freely. `default` is meant to be a one-time initial
    // value, same as every other window below - it needs a stable object,
    // not a fresh one each access.
    size: SHOWCASE_SIZE,
    pos: centered(SHOWCASE_SIZE),
  },
  soclab: {
    title: 'SOC_Lab - /var/log/detections',
    icon: <Icon name="terminal" />,
    Component: SocLabWindow,
    size: { width: 520, height: 300 },
    pos: { x: 150, y: 130 },
  },
  firewall: {
    title: 'firewall.sys',
    icon: <Icon name="shield" />,
    Component: FirewallWindow,
    size: { width: 360, height: 190 },
    pos: { x: 240, y: 150 },
  },
  paint: {
    title: 'untitled - Paint',
    icon: <Icon name="paint" />,
    Component: PaintWindow,
    size: PAINT_SIZE,
    pos: centered(PAINT_SIZE),
  },
  projects: {
    title: 'My Projects',
    icon: <Icon name="folder" />,
    Component: ProjectsFolderWindow,
    size: FOLDER_SIZE,
    pos: centered(FOLDER_SIZE),
  },
  browser: {
    title: 'Internet Explorer',
    icon: <Icon name="globe" />,
    Component: BrowserWindow,
    size: BROWSER_SIZE,
    pos: centered(BROWSER_SIZE),
  },
}

// Desktop icons, in display order. Kept to three so the desktop stays quiet;
// SOC_Lab, firewall.sys, GitHub and LinkedIn are in the Start menu.
// (`external: url` on an entry still opens a URL instead of a window.)
export const DESKTOP_ICONS = [
  { id: 'showcase', label: 'My Showcase', glyph: <Icon name="computer" size={30} /> },
  { id: 'projects', label: 'My Projects', glyph: <Icon name="folder" size={30} /> },
  { id: 'paint', label: 'Paint', glyph: <Icon name="paint" size={30} /> },
]
