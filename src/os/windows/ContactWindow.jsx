import { profile, links } from '../../data/content'

export default function ContactWindow() {
  return (
    <div className="contact-row">
      <div className="field">
        <span className="lbl">Email</span>
        <a href={links.email}>
          <button>{profile.email}</button>
        </a>
      </div>
      <div className="field">
        <span className="lbl">LinkedIn</span>
        <a href={links.linkedin} target="_blank" rel="noreferrer">
          <button>{profile.linkedinHandle}</button>
        </a>
      </div>
      <div className="field">
        <span className="lbl">GitHub</span>
        <a href={links.github} target="_blank" rel="noreferrer">
          <button>{profile.githubHandle}</button>
        </a>
      </div>
      <p style={{ fontSize: 11, marginTop: 6 }}>{profile.openTo}</p>
    </div>
  )
}
