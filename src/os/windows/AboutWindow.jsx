import { about } from '../../data/content'

export default function AboutWindow() {
  return (
    <div className="notepad">
      {about.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  )
}
