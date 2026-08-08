import { useState, Fragment } from 'react'
import ScrollArea from '../ScrollArea'
import {
  profile,
  aboutPage,
  educationPage,
  experience,
  projectsIntro,
  projectCategories,
  securityProjects,
  devProjects,
  links,
} from '../../data/content'

// -----------------------------------------------------------------------------
// TASK 6 (corrected): NOT one long scrolling page - separate pages that swap
// inside this ONE window, like the henryheffernan.com reference (three
// screenshots on file): a centered Home/landing splash with no sidebar, and
// then About/Education/Experience/Projects/Contact each render as their own
// page with a persistent left sidebar (name + "Showcase '26" + nav, active
// item marked) and a single content pane on the right showing ONLY that
// page. Sidebar is NOT shown on the Home page - explicit user decision,
// confirmed twice (first attempt wrongly stacked everything into one
// scrollable document with a sticky header - this replaces that). Still one
// window total - no separate windows open.
//
// Education got its own nav entry/page (previously folded into Experience,
// alongside Certifications/Skills - explicit user decision to split it out).
// It's intentionally empty for now - content to be added later. Experience
// was rewritten to match experience.txt exactly: a single CAD Consultant
// role (company/role/when headings + 4 bullets), with the old Education/
// Certifications/Skills blocks removed from this page (Education moved to
// its own page above; Certifications/Skills data in content.js is currently
// unused - left there, not deleted, same "don't rip out, just unlink"
// convention as the rest of this project).
// -----------------------------------------------------------------------------

const NAV = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
]

// About page copy comes straight from Ronit's about.txt upload (see
// aboutPage in data/content.js) - a heading, an intro paragraph, two
// labeled subsections ("About", "Side quests"), and a closing paragraph.
// "Figure N: rest" -> bold the "Figure N:" label, plain text after,
// matching henryheffernan.com's caption style. `extraClass` lets a given
// figure opt into a layout variant (e.g. "about-figure-float-left") on top
// of the shared plain-rectangle look in .about-figure.
function AboutFigure({ fig, extraClass }) {
  const m = fig.caption.match(/^(Figure \d+:)\s*(.*)$/)
  return (
    <figure className={`about-figure${extraClass ? ` ${extraClass}` : ''}`}>
      <img src={fig.src} alt={fig.caption} />
      <figcaption>
        {m ? (
          <>
            <strong>{m[1]}</strong> {m[2]}
          </>
        ) : (
          fig.caption
        )}
      </figcaption>
    </figure>
  )
}

function AboutPage() {
  return (
    <>
      <h1 className="welcome-heading">{aboutPage.heading}</h1>
      <p>{aboutPage.intro}</p>
      {aboutPage.figures?.map((fig) => (
        <AboutFigure key={fig.src} fig={fig} />
      ))}
      {aboutPage.sections.map((s) => (
        <div key={s.heading}>
          <h3 className="about-subhead">{s.heading}</h3>
          {s.paragraphs.map((para, i) => (
            <Fragment key={i}>
              {/* Inline section figure - floated right at half width, so
                  this paragraph and the next wrap around it on the left. */}
              {s.figure?.beforeParagraph === i && (
                <AboutFigure fig={s.figure} extraClass="about-figure-float-right" />
              )}
              <p>{para}</p>
            </Fragment>
          ))}
        </div>
      ))}
      <p>{aboutPage.closing}</p>
      <div style={{ clear: 'both' }} />
    </>
  )
}

// Projects landing (henryheffernan.com-style): a big "Projects" heading,
// intro paragraph, and two clickable XP-style category cards (Security Ops
// / Dev Projects) instead of one long list. Each card's icon slot now
// renders its real artwork (projectCategories[].icon in data/content.js) -
// .project-category-icon in os.css keeps the dashed border as a fallback
// for whichever category doesn't have one yet.
function ProjectsLanding({ setPage }) {
  return (
    <>
      <h1 className="welcome-heading">Projects</h1>
      <p className="projects-subhead">&amp; Security</p>
      <p>{projectsIntro}</p>
      <div className="project-category-grid">
        {projectCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="project-category-card"
            onClick={() => setPage(`projects-${cat.id}`)}
          >
            {cat.icon ? (
              <img className="project-category-icon" src={cat.icon} alt="" aria-hidden="true" />
            ) : (
              <span className="project-category-icon" aria-hidden="true" />
            )}
            <span className="project-category-text">
              <span className="project-category-title">{cat.label}</span>
              <span className="project-category-sub">{cat.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

// One category's project list - no section heading, no card/box borders
// (both explicitly removed), just each project stacked with its own (h1)
// title, a plain (not chip/button-styled) line of tech stack text under the
// description, and a "More" button that opens the full detail page for
// that project (see ProjectDetailPage below).
function ProjectList({ backTo, items, setPage, setActiveProject }) {
  return (
    <>
      <a
        className="linklike back-link"
        tabIndex={0}
        onClick={() => setPage('projects')}
      >
        &larr; Back to Projects
      </a>
      {items.map((p) => (
        <div className="project" key={p.title}>
          <h1 className="project-title">
            {p.title}
            {p.flagship && <span className="flag">flagship</span>}
          </h1>
          <p>{p.description}</p>
          <p className="project-tech-plain">{p.tech.join(', ')}</p>
          <button
            type="button"
            className="linklike more-btn"
            onClick={() => {
              setActiveProject({ ...p, backTo })
              setPage('project-detail')
            }}
          >
            More
          </button>
        </div>
      ))}
    </>
  )
}

function SecurityProjectsPage({ setPage, setActiveProject }) {
  return (
    <ProjectList
      backTo="projects-security"
      items={securityProjects}
      setPage={setPage}
      setActiveProject={setActiveProject}
    />
  )
}

function DevProjectsPage({ setPage, setActiveProject }) {
  return (
    <ProjectList
      backTo="projects-dev"
      items={devProjects}
      setPage={setPage}
      setActiveProject={setActiveProject}
    />
  )
}

// Full detail page for a single project, opened via its "More" button.
// Swaps into the same floating window (still one window total) rather than
// opening anything new - `activeProject` carries the project's own fields
// plus which category list to return to (`backTo`, set by ProjectList
// above).
function ProjectDetailPage({ setPage, activeProject }) {
  if (!activeProject) {
    // Shouldn't normally happen (this page is only reachable via a "More"
    // click, which always sets activeProject first) - falls back to the
    // Projects landing instead of rendering nothing.
    return (
      <a className="linklike back-link" tabIndex={0} onClick={() => setPage('projects')}>
        &larr; Back to Projects
      </a>
    )
  }

  return (
    <>
      <a
        className="linklike back-link"
        tabIndex={0}
        onClick={() => setPage(activeProject.backTo)}
      >
        &larr; Back to {activeProject.backTo === 'projects-security' ? 'Security Ops' : 'Dev Projects'}
      </a>
      <h1 className="project-title">
        {activeProject.title}
        {activeProject.flagship && <span className="flag">flagship</span>}
      </h1>
      <p className="project-tech-plain">{activeProject.tech.join(', ')}</p>
      <p>{activeProject.description}</p>
      {/* Agentic SOC's "More" page (only this one): entirely agent-focused -
          the full architecture diagram at full size, then each of the six
          agents as a name + 1-2 line description. Checked first, ahead of
          `detailParagraphs`/`detail`. */}
      {activeProject.detailAgents ? (
        <>
          {activeProject.detailImages?.map((img) => (
            <figure key={img.src} className="project-figure">
              <img src={img.src} alt={img.caption} />
              {img.caption && <figcaption>{img.caption}</figcaption>}
            </figure>
          ))}
          <div className="agent-list">
            {activeProject.detailAgents.map((agent) => (
              <div key={agent.name} className="agent-item">
                <h4 className="agent-name">{agent.name}</h4>
                <p>{agent.description}</p>
              </div>
            ))}
          </div>
        </>
      ) : activeProject.detailParagraphs ? (
        /* Home Lab's "More" page: plain paragraphs instead of bullets, with
           real dashboard/lab screenshots dropped in - same
           plain-rectangle-plus-caption look as the About page's figures. */
        <>
          {activeProject.detailParagraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {activeProject.detailImages?.map((img) => (
            <figure key={img.src} className="project-figure">
              <img src={img.src} alt={img.caption} />
              {img.caption && <figcaption>{img.caption}</figcaption>}
            </figure>
          ))}
        </>
      ) : (
        /* Longer read pulled from the project's actual README, as bullet
           points ("small paragraphs" per Ronit's request) - only present for
           projects with a real repo behind them (see data/content.js). */
        activeProject.detail && (
          <ul className="exp-bullets">
            {activeProject.detail.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )
      )}
      <a href={activeProject.code} target="_blank" rel="noreferrer">
        <button>View on GitHub</button>
      </a>
    </>
  )
}

// Each entry: degree+institute as an (h1), CGPA as an (h2), then bullets on
// what that degree actually covered - same voice as AboutPage above
// (educationPage lives in data/content.js).
function EducationPage() {
  return (
    <>
      <h2>Education</h2>
      {educationPage.map((ed) => (
        <div className="edu-item" key={ed.degree}>
          <h1 className="edu-degree">{ed.degree}</h1>
          <h2 className="edu-cgpa">{ed.cgpa}</h2>
          <ul className="exp-bullets">
            {ed.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

// Matches experience.txt exactly: company as an (h1), role and when/location
// as two (h2) lines, then the 4 bullets - see the `experience` entry in
// data/content.js for the source fields.
function ExperiencePage() {
  return (
    <>
      <h2>Experience</h2>
      {experience.map((e) => (
        <div className="exp-item" key={e.company}>
          <h1 className="exp-company">{e.company}</h1>
          <h2 className="exp-role">{e.role}</h2>
          <h2 className="exp-when">{e.when}</h2>
          <ul className="exp-bullets">
            {e.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

// Small inline SVG glyphs, not an icon-library dependency (none installed
// in this project) - just enough to read clearly at ~28px in the top-right
// icon row, matching the reference's GitHub/LinkedIn square badges.
function GithubGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.2.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"
      />
    </svg>
  )
}

function LinkedinGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.5 9.5h5v12h-5v-12Zm7.5 0h4.79v1.64h.07c.67-1.2 2.3-2.47 4.73-2.47C24 8.67 24 12.05 24 15.4V21.5h-5v-5.28c0-1.26-.02-2.87-1.75-2.87-1.76 0-2.03 1.37-2.03 2.78v5.37h-5v-12Z"
      />
    </svg>
  )
}

// Same page layout/wording as the henryheffernan.com reference Ronit
// shared: big "Contact" title, GitHub/LinkedIn icon row top-right, an
// intro line, an email link, then a real form (name/email/company/
// message). Submits via FormSubmit's AJAX endpoint (no backend of our own
// needed) straight to profile.email - the FIRST message ever sent to that
// address through FormSubmit triggers a one-time confirmation email FROM
// FormSubmit that has to be clicked to activate delivery; every submission
// after that goes straight through automatically.
function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${profile.email}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company || '(not provided)',
          message: form.message,
          _subject: `Portfolio contact from ${form.name}`,
        }),
      })
      if (!res.ok) throw new Error('FormSubmit request failed')
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <div className="contact-header-row">
        <h1 className="contact-heading">Contact</h1>
        <div className="contact-social-icons">
          <a
            href={links.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="social-icon social-icon-github"
          >
            <GithubGlyph />
          </a>
          <a
            href={links.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="social-icon social-icon-linkedin"
          >
            <LinkedinGlyph />
          </a>
        </div>
      </div>

      <p>{profile.openTo} If you have a paid co-op opportunity, I'd love to chat. You can reach me via my personal email, or fill out the form below.</p>
      <p>
        Email: <a href={links.email}>{profile.email}</a>
      </p>

      {status === 'sent' ? (
        <p className="contact-sent-note">
          Thanks, that came through. I'll get back to you soon.
        </p>
      ) : (
        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            <span className="required">*</span>Your name:
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Name"
              required
            />
          </label>
          <label>
            <span className="required">*</span>Email:
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              required
            />
          </label>
          <label>
            Company (optional):
            <input
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="Company"
            />
          </label>
          <label>
            <span className="required">*</span>Message:
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Message"
              rows={5}
              required
            />
          </label>

          <div className="contact-form-footer">
            <button type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
            <span className="contact-form-note">
              All messages get forwarded straight to my personal email
            </span>
          </div>

          {status === 'error' && (
            <p className="contact-error-note">
              Something went wrong sending that. Email me directly instead at{' '}
              <a href={links.email}>{profile.email}</a>.
            </p>
          )}

          <p className="required-note">
            <span className="required">*</span> = required
          </p>
        </form>
      )}
    </>
  )
}

const PAGES = {
  about: AboutPage,
  education: EducationPage,
  experience: ExperiencePage,
  projects: ProjectsLanding,
  'projects-security': SecurityProjectsPage,
  'projects-dev': DevProjectsPage,
  'project-detail': ProjectDetailPage,
  contact: ContactPage,
}

export default function ShowcaseWindow() {
  const [page, setPage] = useState('home')
  // Which single project "More" was last clicked on, plus which category
  // list to return to - read by ProjectDetailPage, set by ProjectList.
  const [activeProject, setActiveProject] = useState(null)

  if (page === 'home') {
    return (
      <div className="showcase">
        <h1>{profile.name}</h1>
        <p className="subtitle">Cybersecurity Anthusist</p>
        <nav className="nav-row">
          <a tabIndex={0} onClick={() => setPage('about')}>ABOUT</a>
          <a tabIndex={0} onClick={() => setPage('education')}>EDUCATION</a>
          <a tabIndex={0} onClick={() => setPage('projects')}>PROJECTS</a>
          <a tabIndex={0} onClick={() => setPage('experience')}>EXPERIENCE</a>
          <a tabIndex={0} onClick={() => setPage('contact')}>CONTACT</a>
        </nav>
      </div>
    )
  }

  const Page = PAGES[page]
  const inProjects =
    page === 'projects' ||
    page === 'projects-security' ||
    page === 'projects-dev' ||
    page === 'project-detail'
  // While on the detail page, the sub-nav should still highlight whichever
  // category list the open project actually belongs to.
  const activeCategoryPage = page === 'project-detail' ? activeProject?.backTo : page

  return (
    <div className="showcase-layout">
      <aside className="showcase-sidebar">
        <h2>{profile.name}</h2>
        <p className="sidebar-tagline">Showcase &apos;26</p>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <div key={n.id}>
              <a
                tabIndex={0}
                className={(n.id === 'projects' ? inProjects : page === n.id) ? 'active' : ''}
                onClick={() => setPage(n.id)}
              >
                {n.label}
              </a>
              {/* Indented sub-links under Projects, matching Henry's
                  SOFTWARE/MUSIC/ART sub-nav - only shown while somewhere in
                  the Projects section (landing or either category list). */}
              {n.id === 'projects' && inProjects && (
                <div className="sidebar-subnav">
                  {projectCategories.map((cat) => (
                    <a
                      key={cat.id}
                      tabIndex={0}
                      className={activeCategoryPage === `projects-${cat.id}` ? 'active' : ''}
                      onClick={() => setPage(`projects-${cat.id}`)}
                    >
                      {cat.label.toUpperCase()}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
      {/* Sidebar above is a plain sibling, NOT inside the ScrollArea - it
          stays pinned in view while only this content pane scrolls (via
          ScrollArea's transform-based scroller, not native overflow - see
          ScrollArea.jsx for why: native overflow:auto was the cause of
          About/Experience/Projects rendering blurrier than Home/Contact). */}
      <ScrollArea className="showcase-content-scroll">
        <div className="showcase-content">
          <Page setPage={setPage} activeProject={activeProject} setActiveProject={setActiveProject} />
        </div>
      </ScrollArea>
    </div>
  )
}
