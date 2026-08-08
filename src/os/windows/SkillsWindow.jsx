import { skills } from '../../data/content'

export default function SkillsWindow() {
  return (
    <div>
      {skills.map((g) => (
        <div className="skills-group" key={g.group}>
          <h4>{g.group}</h4>
          <div className="skills-chips">
            {g.items.map((s) => (
              <span className="chip" key={s}>
                {s}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
