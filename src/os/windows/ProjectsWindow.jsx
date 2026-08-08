import { projects } from '../../data/content'

export default function ProjectsWindow() {
  return (
    <div>
      {projects.map((p) => (
        <div className="project" key={p.title}>
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
            <button>code</button>
          </a>
        </div>
      ))}
    </div>
  )
}
