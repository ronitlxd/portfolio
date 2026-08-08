import {
  profile,
  about,
  skills,
  projects,
  education,
  experience,
  certifications,
  links,
} from '../data/content'
import './mobile.css'

/**
 * Clean, fast, accessible single-column page shown below ~820px (and to anyone
 * the 3D scene is not right for). Same content as the OS, no WebGL.
 */
export default function MobilePage() {
  return (
    <main className="mobile">
      <header className="hero">
        <h1>{profile.name}</h1>
        <p className="role">{profile.role}</p>
        <p className="pitch">{profile.tagline}</p>
        <div className="actions">
          <a className="btn primary" href={links.email}>
            Email
          </a>
          <a className="btn" href={links.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a
            className="btn"
            href={links.linkedin}
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
        </div>
      </header>

      <section aria-labelledby="about-h">
        <h2 id="about-h">About</h2>
        {about.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <section aria-labelledby="skills-h">
        <h2 id="skills-h">Skills</h2>
        {skills.map((g) => (
          <div className="chip-group" key={g.group}>
            <h3>{g.group}</h3>
            <div className="chips">
              {g.items.map((s) => (
                <span className="chip" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="projects-h">
        <h2 id="projects-h">Projects</h2>
        {projects.map((p) => (
          <article className="project" key={p.title}>
            <h3>
              {p.title}
              {p.flagship && <span className="flag">flagship</span>}
            </h3>
            <p>{p.description}</p>
            <div className="tags">
              {p.tech.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <a href={p.code} target="_blank" rel="noreferrer">
              View code
            </a>
          </article>
        ))}
      </section>

      <section aria-labelledby="edu-h">
        <h2 id="edu-h">Education</h2>
        {education.map((e) => (
          <div className="entry" key={e.degree}>
            <div className="top">
              <span className="title">{e.degree}</span>
              <span className="when">{e.when}</span>
            </div>
            <div className="sub">{e.school}</div>
            <div className="detail">{e.detail}</div>
          </div>
        ))}
      </section>

      <section aria-labelledby="exp-h">
        <h2 id="exp-h">Experience</h2>
        {experience.map((e) => (
          <div className="entry" key={e.role}>
            <div className="top">
              <span className="title">{e.role}</span>
              <span className="when">{e.when}</span>
            </div>
            <div className="sub">{e.org}</div>
            <div className="detail">{e.detail}</div>
          </div>
        ))}
      </section>

      <section aria-labelledby="certs-h">
        <h2 id="certs-h">Certifications</h2>
        <ul className="plain">
          {certifications.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <p className="note">
        Open this on a desktop for the full retro experience (a 3D 90s bedroom
        with a working Windows 98 desktop).
      </p>

      <footer>
        {profile.name} · {profile.locationShort} · {profile.openTo}
      </footer>
    </main>
  )
}
