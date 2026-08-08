import { firewallEasterEgg } from '../../data/content'

export default function FirewallWindow({ onClose }) {
  return (
    <div>
      <div className="firewall">
        <div className="shield" role="img" aria-label="shield">
          {'\u{1F6E1}\u{FE0F}'}
        </div>
        <div className="msg">
          <strong>{firewallEasterEgg.heading}</strong>
          <p style={{ margin: '8px 0 0' }}>{firewallEasterEgg.body}</p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button onClick={onClose} style={{ minWidth: 70 }}>
          OK
        </button>
      </div>
    </div>
  )
}
