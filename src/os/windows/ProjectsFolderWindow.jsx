import { useState } from 'react'
import { projectReplicas } from '../../data/content'
import { showReplica } from '../browserStore'

/**
 * "My Projects" folder in the style of an XP Explorer window: a task pane
 * on the left and a large icon per project on the right. Double click (or
 * Enter) opens the project's replica in the browser window.
 */
export default function ProjectsFolderWindow({ openWindow }) {
  const [selected, setSelected] = useState(null)

  const open = (id) => {
    showReplica(id)
    openWindow('browser')
  }

  return (
    <div className="explorer">
      <div className="explorer-bar">
        <span className="explorer-label">Address</span>
        <div className="explorer-address">
          <span aria-hidden="true">{'\u{1F4C1}'}</span> C:\Documents and Settings\Ronit\My Projects
        </div>
      </div>

      <div className="explorer-main">
        <aside className="explorer-tasks">
          <div className="explorer-task-box">
            <div className="explorer-task-title">Project Tasks</div>
            <a
              tabIndex={0}
              className={selected ? '' : 'disabled'}
              onClick={() => selected && open(selected)}
            >
              Open selected project
            </a>
          </div>
          <div className="explorer-task-box">
            <div className="explorer-task-title">Details</div>
            <p>
              Interactive replicas of my projects&apos; real interfaces. Every number and log line in
              them is sample data.
            </p>
          </div>
        </aside>

        <div className="explorer-items" role="listbox" aria-label="Projects">
          {projectReplicas.map((p) => (
            <div
              key={p.id}
              role="option"
              aria-selected={selected === p.id}
              tabIndex={0}
              className={`explorer-item${selected === p.id ? ' selected' : ''}`}
              onClick={(e) => {
                setSelected(p.id)
                // Touch has no double click worth relying on: a tap opens.
                if (e.nativeEvent.pointerType === 'touch') open(p.id)
              }}
              onDoubleClick={() => open(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && open(p.id)}
            >
              <span className="explorer-item-glyph" aria-hidden="true">
                {p.glyph}
              </span>
              <span className="explorer-item-title">{p.title}</span>
              <span className="explorer-item-sub">{p.subtitle}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
