import { useMemo, useState } from 'react'
import { projectReplicas } from '../../data/content'
import { showReplica } from '../browserStore'

/**
 * "My Projects" as an XP Explorer window: menu bar, a Views switch
 * (Icons / Details), address bar, and one .html file per
 * project replica. Double click (or Enter, or a tap on touch) opens the file
 * in the Internet Explorer window.
 */

export const FOLDER_PATH = 'C:\\Documents and Settings\\Ronit\\My Projects'
const MODIFIED = '11/15/2026 4:12 PM'

// An XP-style HTML document icon, drawn here (not Microsoft's artwork): a
// page with a folded corner and a blue "e".
export function HtmlFileIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 2h14l7 7v21H6z" fill="#fff" stroke="#7a8aa6" strokeWidth="1" />
      <path d="M20 2v7h7" fill="#dfe6f3" stroke="#7a8aa6" strokeWidth="1" />
      <text x="16.5" y="25" textAnchor="middle" fontSize="15" fontWeight="700" fontStyle="italic" fontFamily="Georgia, serif" fill="#1d63c4">
        e
      </text>
      <path d="M8.5 21c4-6 13-8 17-4" fill="none" stroke="#f5a623" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const COLUMNS = [
  { id: 'file', label: 'Name' },
  { id: 'sizeKb', label: 'Size' },
  { id: 'type', label: 'Type' },
  { id: 'modified', label: 'Date Modified' },
]

export default function ProjectsFolderWindow({ openWindow }) {
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('icons') // 'icons' | 'details'
  const [sort, setSort] = useState({ by: 'file', dir: 1 })

  const files = useMemo(() => {
    const list = [...projectReplicas]
    list.sort((a, b) => {
      const x = a[sort.by] ?? '', y = b[sort.by] ?? ''
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir
    })
    return list
  }, [sort])

  const current = projectReplicas.find((p) => p.id === selected)

  const open = (id) => {
    showReplica(id)
    openWindow('browser')
  }

  const itemProps = (p) => ({
    role: 'option',
    'aria-selected': selected === p.id,
    tabIndex: 0,
    onClick: (e) => {
      setSelected(p.id)
      // Touch has no double click worth relying on: a tap opens.
      if (e.nativeEvent.pointerType === 'touch') open(p.id)
    },
    onDoubleClick: () => open(p.id),
    onKeyDown: (e) => e.key === 'Enter' && open(p.id),
  })

  return (
    <div className="explorer">
      <div className="explorer-menu" aria-hidden="true">
        {['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      <div className="explorer-toolbar">
        <span className="explorer-label">Views</span>
        <button type="button" className={view === 'icons' ? 'pressed' : ''} onClick={() => setView('icons')}>
          Icons
        </button>
        <button type="button" className={view === 'details' ? 'pressed' : ''} onClick={() => setView('details')}>
          Details
        </button>
      </div>

      <div className="explorer-bar">
        <span className="explorer-label">Address</span>
        <div className="explorer-address">
          <span aria-hidden="true">{'\u{1F4C1}'}</span> {FOLDER_PATH}
        </div>
      </div>

      <div className="explorer-main">
        {view === 'icons' ? (
          <div className="explorer-items" role="listbox" aria-label="Project files">
            {files.map((p) => (
              <div key={p.id} className={`explorer-item${selected === p.id ? ' selected' : ''}`} {...itemProps(p)}>
                <HtmlFileIcon size={34} />
                <span className="explorer-item-title">{p.file}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="explorer-details" role="listbox" aria-label="Project files">
            <div className="explorer-details-head">
              {COLUMNS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSort((s) => ({ by: c.id, dir: s.by === c.id ? -s.dir : 1 }))}
                >
                  {c.label}
                  {sort.by === c.id ? (sort.dir > 0 ? ' \u25B4' : ' \u25BE') : ''}
                </button>
              ))}
            </div>
            {files.map((p) => (
              <div key={p.id} className={`explorer-details-row${selected === p.id ? ' selected' : ''}`} {...itemProps(p)}>
                <span>
                  <HtmlFileIcon size={14} /> {p.file}
                </span>
                <span className="num">{p.sizeKb} KB</span>
                <span>HTML Document</span>
                <span>{MODIFIED}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="explorer-status">
        <span>{current ? `Type: HTML Document  Size: ${current.sizeKb} KB` : `${files.length} objects`}</span>
        <span>My Computer</span>
      </div>
    </div>
  )
}
