// Sample data for the VoltLAB replica. The page in index.html is the real
// dashboard's HTML; this script answers its /api/* requests with made-up
// data so nothing here comes from, or talks to, the real server.
// Service start/stop/restart only changes this in-memory list.
(function () {
  const pad = (n) => String(n).padStart(2, '0')
  const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const hms = (d) => `${hhmm(d)}:${pad(d.getSeconds())}`
  const ago = (mins) => new Date(Date.now() - mins * 60000)
  const rand = (a, b) => a + Math.random() * (b - a)
  const round1 = (n) => Math.round(n * 10) / 10
  const started = Date.now() - (6 * 86400 + 4 * 3600 + 17 * 60) * 1000

  const services = [
    { id: 'splunk', name: 'Splunk', state: 'active', mem_mb: 1840.5, uptime: '6d 4h', url: 'demo' },
    { id: 'suricata', name: 'Suricata IDS', state: 'active', mem_mb: 612.3, uptime: '6d 4h', url: '' },
    { id: 'nextcloud', name: 'Nextcloud', state: 'active', mem_mb: 420.8, uptime: '6d 4h', url: 'demo' },
    { id: 'wireguard', name: 'WireGuard VPN', state: 'active', mem_mb: 12.4, uptime: '6d 4h', url: '' },
    { id: 'tor', name: 'Tor Proxy', state: 'inactive', mem_mb: 0, uptime: null, url: '' },
    { id: 'tailscale', name: 'Tailscale', state: 'active', mem_mb: 48.9, uptime: '6d 4h', url: '' },
  ]

  // Addresses are from the documentation ranges (RFC 5737), not real hosts.
  const logs = [
    [2, 'ssh', 'analyst', '10.0.0.24', 'low', 'Accepted publickey for analyst', 'success'],
    [5, 'suricata', '-', '203.0.113.47', 'high', 'ET SCAN Nmap TCP SYN scan detected'],
    [9, 'cmd', 'analyst', '10.0.0.24', 'low', 'sudo systemctl status suricata'],
    [14, 'ssh', 'root', '198.51.100.23', 'high', 'Failed password for root', 'failed'],
    [14, 'ssh', 'root', '198.51.100.23', 'high', 'Failed password for root', 'failed'],
    [15, 'ssh', 'admin', '198.51.100.23', 'high', 'Failed password for invalid user admin', 'failed'],
    [21, 'auth', 'analyst', '10.0.0.24', 'med', 'sudo session opened for user root'],
    [26, 'cmd', 'analyst', '10.0.0.24', 'low', 'tail -n 50 /var/log/suricata/fast.log'],
    [33, 'suricata', '-', '203.0.113.9', 'med', 'ET TOR Known Tor Exit Node traffic'],
    [41, 'cmd', 'analyst', '10.0.0.24', 'med', 'sudo ufw deny from 198.51.100.23'],
    [48, 'ssh', 'analyst', '10.0.0.31', 'low', 'Accepted publickey for analyst', 'success'],
    [57, 'suricata', '-', '192.0.2.77', 'low', 'ET POLICY curl User-Agent outbound'],
    [66, 'cmd', 'analyst', '10.0.0.31', 'low', 'df -h'],
    [79, 'auth', 'backup', '10.0.0.5', 'low', 'session opened for user backup (cron)'],
    [95, 'ssh', 'pi', '203.0.113.150', 'high', 'Failed password for invalid user pi', 'failed'],
    [118, 'suricata', '-', '203.0.113.150', 'high', 'ET SCAN Potential SSH brute force'],
  ].map(([mins, type, user, ip, sev, msg, subtype]) => ({ time: hms(ago(mins)), type, user, ip, sev, msg, subtype }))

  const net = Array.from({ length: 60 }, (_, i) => ({
    t: hhmm(ago(59 - i)),
    in: round1(2.2 + 1.6 * Math.sin(i / 6) + rand(0, 0.8)),
    out: round1(0.9 + 0.6 * Math.cos(i / 8) + rand(0, 0.4)),
  }))
  const events = Array.from({ length: 20 }, (_, i) => ({
    t: hhmm(ago((19 - i) * 15)),
    high: i === 14 || i === 18 ? 3 : Math.random() < 0.2 ? 1 : 0,
    med: Math.floor(rand(0, 4)),
    low: Math.floor(rand(2, 9)),
  }))

  const uptime = () => {
    const s = Math.floor((Date.now() - started) / 1000)
    return { s, str: `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ${Math.floor((s % 3600) / 60)}m` }
  }
  const live = () => ({ cpu: round1(rand(9, 24)), mem: round1(rand(56, 60)), nin: round1(rand(1.5, 4)), nout: round1(rand(0.5, 1.6)) })
  const online = () => services.filter((s) => s.state === 'active').length

  const routes = {
    '/api/stats': () => {
      const l = live(), u = uptime()
      return { cpu: l.cpu, mem_pct: l.mem, mem_used_gb: round1((l.mem / 100) * 15.5), mem_total_gb: 15.5, disk_pct: 11.8, disk_used_gb: 97.2, disk_total_gb: 914.0, net_in_mbps: l.nin, net_out_mbps: l.nout, uptime_secs: u.s, uptime_str: u.str }
    },
    '/api/metrics': () => {
      const l = live()
      return { cpu: l.cpu, mem_pct: l.mem, disk_pct: 11.8, net_in: l.nin, net_out: l.nout, active_alerts: logs.filter((e) => e.sev === 'high').length, connected_users: 1, services_online: online(), services_total: services.length, total_events: 1284, uptime: uptime().str }
    },
    '/api/services': () => ({ online: online(), total: services.length, services }),
    '/api/charts': () => ({ net, events }),
    '/api/users': () => ({ count: 1, users: [{ name: 'analyst', terminal: 'pts/0', host: '10.0.0.24', login_time: hhmm(ago(48)), idle: '2m', duration: '48m', status: 'active' }] }),
    '/api/logs': () => ({ logs, stats: { total: logs.length, ssh: logs.filter((e) => e.type === 'ssh').length, cmd: logs.filter((e) => e.type === 'cmd').length, high: logs.filter((e) => e.sev === 'high').length } }),
  }

  const json = (body) => Promise.resolve(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }))

  const realFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const path = String(typeof input === 'string' ? input : input.url).replace(location.origin, '').split('?')[0]
    if (routes[path]) return json(routes[path]())
    const svc = path.match(/^\/api\/service\/(.+)$/)
    if (svc) {
      const s = services.find((x) => x.id === svc[1])
      const action = JSON.parse((init && init.body) || '{}').action
      if (s) {
        s.state = action === 'stop' ? 'inactive' : 'active'
        s.uptime = action === 'stop' ? null : '0m'
        if (action === 'stop') s.mem_mb = 0
        else if (!s.mem_mb) s.mem_mb = 24.0
      }
      return json({ ok: true, msg: 'replica, nothing was changed on a real server' })
    }
    return path.startsWith('/api/') ? json({}) : realFetch(input, init)
  }

  // "Launch" opens the service's own web UI on the real lab. Not here.
  window.open = () => {
    if (typeof window.toast === 'function') window.toast('Replica: service UIs are not available here', 'warn')
    return null
  }
})()
