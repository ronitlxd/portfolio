// Sample data for the PrivaRoute replica. driver.js is the real driver
// screen's script; this file answers its /api/v2/* requests with a scripted
// demo instead of the real routing, masking and model pipeline. Nothing here
// contacts a model, YouTube, or the microphone. Only the map tiles load
// from OpenStreetMap.
(function () {
  const UWINDSOR = { lat: 42.3043, lon: -83.0661, name: 'University of Windsor' }
  const PLACES = {
    'devonshire mall': { lat: 42.2786, lon: -83.0003, name: 'Devonshire Mall', address: '3100 Howard Ave, Windsor' },
    'riverfront': { lat: 42.3201, lon: -83.0436, name: 'Windsor Riverfront', address: 'Riverside Dr W, Windsor' },
    'airport': { lat: 42.2756, lon: -82.9556, name: 'Windsor International Airport', address: '3200 County Rd 42, Windsor' },
  }
  const COFFEE = { lat: 42.2958, lon: -83.0287, name: 'Coffee stop' }

  let profile = null // null = Guest
  const pending = new Map() // request_id -> what to do on confirmation
  let nextId = 1

  const receipts = {
    rules: (extra = {}) => ({ answered_by: { by: 'system rules', where: 'on this vehicle' }, outside_services: [], ...extra }),
    local: (tier, tierName, because) => ({ answered_by: { by: 'local model', model: 'qwen3:4b', where: 'on this vehicle' }, tier, tier_name: tierName, kept_local_because: because, outside_services: [] }),
    masked: (n) => ({ answered_by: { by: 'larger model', model: 'hermes3:8b', where: 'larger model (stand-in)' }, tier: 1, tier_name: 'personal', sent_to_larger_model: { placeholders: n, private_values_sent: 0 }, outside_services: [] }),
  }

  // A plausible-looking road path: an L-shaped route with a few bends.
  function routeTo(dest, stops = []) {
    const pts = [UWINDSOR, ...stops, dest]
    const geometry = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]
      for (let t = 0; t <= 1; t += 0.1) {
        // go mostly east first, then south: a grid-city look
        const k = Math.min(1, t * 1.6)
        geometry.push([a.lat + (b.lat - a.lat) * Math.max(0, (t - 0.35) / 0.65), a.lon + (b.lon - a.lon) * k])
      }
    }
    geometry.push([dest.lat, dest.lon])
    const km = 1 + Math.hypot(dest.lat - UWINDSOR.lat, (dest.lon - UWINDSOR.lon) * 0.74) * 111 * 1.25
    return {
      type: 'show_route',
      origin: UWINDSOR,
      destination: dest,
      stops,
      geometry,
      distance_m: Math.round(km * 1000),
      duration_seconds: Math.round(km * 95 + stops.length * 120),
      google_maps_url: `https://www.google.com/maps/dir/?api=1&origin=${UWINDSOR.lat},${UWINDSOR.lon}&destination=${dest.lat},${dest.lon}`,
      steps: [
        { text: 'Head east on Wyandotte St W', distance_m: 1200 },
        { text: 'Turn right onto Huron Church Rd', distance_m: 900 },
        ...stops.map((s) => ({ text: `Stop at ${s.name}`, distance_m: 0 })),
        { text: `Arrive at ${dest.name}`, distance_m: 0 },
      ],
    }
  }

  const words = (s) => s.replace(/[^a-z0-9' ]/gi, ' ').trim()
  const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())

  function confirmation(reason, steps, onApprove) {
    const id = `demo-${nextId++}`
    pending.set(id, onApprove)
    return { status: 'awaiting_confirmation', request_id: id, plan_hash: `hash-${id}`, confirmation_reason: reason, plan: { steps } }
  }

  function handle(prompt) {
    const p = prompt.toLowerCase()

    if (/\b(end|hang up)\b.*\bcall\b|\bhang up\b/.test(p)) {
      return { status: 'completed', answer: 'Call ended.', actions: [{ type: 'call', state: 'ended' }], privacy_receipt: receipts.rules() }
    }
    if (/\b(navigate|directions|take me|drive to|route|go to)\b/.test(p)) {
      const key = Object.keys(PLACES).find((k) => p.includes(k.split(' ')[0]))
      const dest = PLACES[key || 'devonshire mall']
      const stops = /coffee/.test(p) ? [COFFEE] : []
      const steps = [{ capability: 'navigation.start', arguments: { destination: dest.name } }, ...stops.map((s) => ({ capability: 'navigation.add_stop', arguments: { stop: s.name } }))]
      return confirmation('interpretation_check', steps, () => ({
        status: 'completed',
        answer: `Starting navigation to ${dest.name}${stops.length ? ' with a coffee stop' : ''}.`,
        actions: [routeTo(dest, stops)],
        privacy_receipt: receipts.rules({ outside_services: [{ service: 'OSRM routing', received: 'coordinates only' }] }),
      }))
    }
    if (/\bcall\b/.test(p)) {
      const m = words(prompt).match(/call\s+([a-z]+)/i)
      const contact = m ? titleCase(m[1]) : 'Sam'
      return confirmation('interpretation_check', [{ capability: 'phone.call', arguments: { contact } }], () => ({
        status: 'completed', answer: `Calling ${contact}.`, actions: [{ type: 'call', state: 'active', contact }],
        privacy_receipt: receipts.local(1, 'personal', 'contacts stay on this vehicle'),
      }))
    }
    if (/\b(message|text)\b/.test(p)) {
      const m = words(prompt).match(/(?:message|text)\s+([a-z]+)/i)
      const contact = m ? titleCase(m[1]) : 'Sam'
      const said = prompt.match(/(?:say|saying|that)\s+(.+)$/i)
      const message = said ? said[1].replace(/[.!?]+$/, '') : "I'm on my way"
      return confirmation('interpretation_check', [{ capability: 'messaging.send', arguments: { contact, message } }], () => ({
        status: 'completed', answer: `Message sent to ${contact}.`, actions: [{ type: 'message_sent', contact, text: message }],
        privacy_receipt: receipts.masked(2),
      }))
    }
    if (/\b(play|music|song|put on|listen)\b/.test(p)) {
      const q = words(prompt).replace(/^(please\s+)?(play|put on|listen to)\s+/i, '').trim() || 'driving music'
      return { status: 'completed', answer: `Playing ${q}.`, actions: [{ type: 'media', command: 'play', query: q }], privacy_receipt: receipts.rules() }
    }
    if (/\b(appointment|calendar|schedule|meeting|dentist|doctor)\b/.test(p)) {
      return {
        status: 'completed',
        answer: 'Your next appointment is a dental check-up tomorrow at 10:30.',
        actions: [{ type: 'info', title: 'Next appointment', text: 'Dental check-up · tomorrow 10:30' }],
        privacy_receipt: receipts.local(2, 'sensitive', 'health information is kept on the local model'),
      }
    }
    if (/\b(pin|card number|credit card|passport|sin)\b/.test(p)) {
      return {
        status: 'completed',
        answer: "PINs, card numbers and IDs never leave this vehicle, so I won't read them out or send them anywhere.",
        privacy_receipt: receipts.local(3, 'restricted', 'restricted data never leaves the vehicle'),
      }
    }
    return {
      status: 'completed',
      answer: 'This is a replica running on sample data, so I can only act out a few things. Try asking for directions to Devonshire Mall, to play some music, to call or text Sam, or for your next appointment.',
      privacy_receipt: receipts.rules(),
    }
  }

  const reply = (body, status = 200, delay = 0) =>
    new Promise((r) => setTimeout(() => r(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })), delay))

  const realFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const path = String(typeof input === 'string' ? input : input.url).replace(location.origin, '').split('?')[0]
    if (!path.startsWith('/api/')) return realFetch(input, init)
    const body = (() => { try { return JSON.parse(init.body || '{}') } catch { return {} } })()

    switch (path) {
      case '/api/v2/sessions': return reply({ session_id: 'demo-session' })
      case '/api/v2/session': return reply({ profile })
      case '/api/v2/session/reset': return reply({ ok: true })
      case '/api/v2/profiles':
        return reply({ enabled: true, profiles: [{ id: 'guest', name: 'Guest' }, { id: 'alex', name: 'Alex (sample)' }] })
      case '/api/v2/profile/guest':
        profile = null
        return reply({ profile: { id: 'guest', name: 'Guest', protected: false } })
      case '/api/v2/profile/login':
        if (!body.password) return reply({ error: 'Enter any password, this is a replica.' }, 400)
        profile = { id: 'alex', name: 'Alex (sample)', protected: true }
        return reply({ profile })
      case '/api/v2/requests': return reply(handle(body.prompt || ''), 200, 650)
      case '/api/v2/requests/clarification': return reply(handle(body.answer || ''), 200, 650)
      case '/api/v2/requests/confirmation': {
        const next = pending.get(body.request_id)
        pending.delete(body.request_id)
        if (!body.approved || !next) return reply({ status: 'cancelled' }, 200, 300)
        return reply(next(), 200, 650)
      }
      case '/api/v2/media/lookup': return reply({ error: 'Playback is turned off in this replica.' }, 400, 200)
      case '/api/v2/speech': return reply({ error: 'Voice input is turned off in this replica.' }, 400)
      default: return reply({ error: 'Not available in this replica.' }, 404)
    }
  }

  // No microphone in the replica.
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('Voice input is turned off in this replica.'))
  }
})()
