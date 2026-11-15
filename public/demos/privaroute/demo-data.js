// Sample data for the PrivaRoute replica (engineer view in index.html,
// driver screen in driver.html). Both pages are the real front end; this
// file answers their /api/v2/* requests with a scripted demo instead of the
// real routing, masking and model pipeline. Each answer carries the same
// fields the real server returns (trace, routing decision, context, masking,
// privacy receipt, sample API call) so the engineer view can show them.
// Nothing here contacts a model, YouTube or the microphone. Only the map
// tiles on the driver screen load from OpenStreetMap.
(function () {
  const UWINDSOR = { lat: 42.3043, lon: -83.0661, name: 'University of Windsor' }
  const PLACES = {
    'devonshire mall': { lat: 42.2786, lon: -83.0003, name: 'Devonshire Mall', address: '3100 Howard Ave, Windsor' },
    riverfront: { lat: 42.3201, lon: -83.0436, name: 'Windsor Riverfront', address: 'Riverside Dr W, Windsor' },
    airport: { lat: 42.2756, lon: -82.9556, name: 'Windsor International Airport', address: '3200 County Rd 42, Windsor' },
  }
  const COFFEE = { lat: 42.2958, lon: -83.0287, name: 'Coffee stop' }
  const MODELS = { local_worker: 'qwen3:4b (on this server)', larger_worker: 'hermes3:8b (local stand-in for a larger model)' }
  const CONTACTS = [
    { label: 'Sam (sample)', phone: '+1 555 0100', relationship: 'friend' },
    { label: 'Dr. Patel (sample)', phone: '+1 555 0142', relationship: 'dentist' },
  ]

  let profile = null // null = Guest
  const pending = new Map() // request_id -> what happens on confirmation
  const turns = []
  let nextId = 1

  // ---------- privacy receipts ----------
  const here = { where: 'this server' }
  const receipts = {
    rules: (extra = {}) => ({ answered_by: { by: 'system rules', ...here }, router: here, outside_services: [], ...extra }),
    local: (tier, tierName, because) => ({ answered_by: { by: 'local model', model: 'qwen3:4b', ...here }, router: here, tier, tier_name: tierName, kept_local_because: because, outside_services: [] }),
    masked: (n) => ({ answered_by: { by: 'larger model', model: 'hermes3:8b', ...here }, router: here, tier: 1, tier_name: 'personal', sent_to_larger_model: { placeholders: n, roles_described: n, private_values_sent: 0 }, outside_services: [] }),
  }

  // ---------- routes ----------
  function routeTo(dest, stops = []) {
    const pts = [UWINDSOR, ...stops, dest]
    const geometry = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]
      for (let t = 0; t <= 1; t += 0.1) {
        const k = Math.min(1, t * 1.6)
        geometry.push([a.lat + (b.lat - a.lat) * Math.max(0, (t - 0.35) / 0.65), a.lon + (b.lon - a.lon) * k])
      }
    }
    geometry.push([dest.lat, dest.lon])
    const km = 1 + Math.hypot(dest.lat - UWINDSOR.lat, (dest.lon - UWINDSOR.lon) * 0.74) * 111 * 1.25
    return {
      type: 'show_route', origin: UWINDSOR, destination: dest, stops, geometry,
      distance_m: Math.round(km * 1000), duration_seconds: Math.round(km * 95 + stops.length * 120),
      google_maps_url: `https://www.google.com/maps/dir/?api=1&origin=${UWINDSOR.lat},${UWINDSOR.lon}&destination=${dest.lat},${dest.lon}`,
      steps: [
        { text: 'Head east on Wyandotte St W', distance_m: 1200 },
        { text: 'Turn right onto Huron Church Rd', distance_m: 900 },
        ...stops.map((s) => ({ text: `Stop at ${s.name}`, distance_m: 0 })),
        { text: `Arrive at ${dest.name}`, distance_m: 0 },
      ],
    }
  }

  // ---------- engineer-view detail ----------
  const S = (id, input = {}, output = {}, status = 'complete') => ({ id, status, input, output })

  function cleanup(prompt) {
    const cleaned = prompt.trim().replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase())
    return { cleaned_prompt: cleaned, prompt_cleanup: { changes: cleaned === prompt ? [] : [{ kind: 'format', from: prompt, to: cleaned }] } }
  }

  // Builds the fields the engineer view reads, for one scenario.
  // kind: nav | call | message | media | appointment | pin | other
  // phase: 'plan' (awaiting confirmation) or 'done'
  function detail(prompt, kind, phase, extra = {}) {
    const c = cleanup(prompt)
    const local = kind !== 'message'
    const tiers = { nav: [0, 'public'], media: [0, 'public'], other: [0, 'public'], call: [1, 'personal'], message: [1, 'personal'], appointment: [2, 'sensitive'], pin: [3, 'restricted'] }
    const [tier, tierName] = tiers[kind]
    const contact = extra.contact
    const reason = {
      nav: 'Driving request handled by deterministic tools; no model answer needed.',
      media: 'Simple media command; handled locally.',
      other: 'Simple request; handled locally.',
      call: 'Uses a saved contact, so it stays on the local model.',
      appointment: 'Health information stays on the local model.',
      pin: 'Restricted data (PINs, card numbers, IDs) never leaves the vehicle.',
      message: 'The message needs stronger writing, so it goes to the larger model with private words masked.',
    }[kind]

    const findings = contact ? [{ text: contact.split(' ')[0], status: 'resolved', source: 'private_db', type: 'contact', label: `${contact} · ${CONTACTS[0].phone}`, detector: 'database_alias' }] : []
    const masked = kind === 'message' ? [{ original: contact.split(' ')[0], placeholder: '[CONTACT_1]' }, { original: extra.message, placeholder: '[MESSAGE_1]' }] : []

    const trace = [
      S('driver_prompt', { prompt }),
      S('prompt_cleanup', { prompt }, { cleaned_prompt: c.cleaned_prompt, changes: c.prompt_cleanup.changes.length }),
      S('request_coordinator', { request: 'new' }, { request_id: extra.request_id }),
      S('routing_profile', {}, { profile: profile ? profile.name : 'Guest' }),
      S('local_classifier', { cleaned_prompt: c.cleaned_prompt }, { intent: kind, complexity: kind === 'message' ? 'needs_stronger_model' : 'suitable' }),
      S('routing_policy', { tier, tier_name: tierName }, { next_route: local ? 'local_slm' : 'privacy_layer', reason }),
      S('session_store', {}, { turns_kept: turns.length }),
      S('context_resolver', { references: findings.map((f) => f.text) }, { resolved: findings.length }),
      S('context_gate', {}, { required_context_available: true }),
    ]
    if (contact) trace.push(S('private_database', { lookup: contact.split(' ')[0] }, { matched: contact }))
    if (local) {
      trace.push(S('local_worker', { route: 'local_slm' }, { kind: kind === 'nav' ? 'action_plan' : 'answer', model: 'qwen3:4b' }))
    } else {
      trace.push(
        S('privacy_processing', { words: masked.map((m) => m.original) }, { placeholders: masked.length, private_values_sent: 0 }),
        S('larger_worker', { prompt: 'masked request' }, { kind: 'action_plan', model: 'hermes3:8b' }),
        S('placeholder_restore', { placeholders: masked.length }, { restored: true }),
      )
    }
    if (kind === 'nav') {
      trace.push(
        S('tool_gateway', { tools: ['map_find_places', 'map_route'] }, { allowed: true }),
        S('map_find_places', { query: extra.dest.name }, { nearest: { name: extra.dest.name, distance_m: 120 } }),
        S('map_route', { from: 'coordinates', to: 'coordinates' }, { distance_m: extra.route ? extra.route.distance_m : 8600 }),
      )
    }
    const acts = ['nav', 'call', 'message', 'media']
    if (acts.includes(kind)) {
      trace.push(S('capability_registry', {}, { allowlisted: true }), S('plan_validation', {}, { steps_valid: true, dropped_steps: 0 }))
      trace.push(S('confirmation', {}, phase === 'plan' ? { waiting_for: 'driver' } : { approved: true }, phase === 'plan' ? 'awaiting' : 'complete'))
      if (phase === 'done') trace.push(S('simulated_adapters', {}, { result: 'simulated' }), S('sample_api', {}, { built: true }))
    }
    if (phase === 'done' || !acts.includes(kind)) trace.push(S('response', {}, { status: 'completed' }), S('session_update', {}, { turn_saved: true }))

    return {
      prompt,
      ...c,
      next_route: local ? 'local_slm' : 'privacy_layer',
      reason,
      routing: { reason, references: findings.map((f) => ({ text: f.text, type: f.type })) },
      privacy_routing: {
        tier, tier_name: tierName, policy_version: 'privacy-policy v4 (sample)',
        decision: { complexity: kind === 'message' ? 'needs_stronger_model' : 'suitable', next_route: local ? 'local_slm' : 'privacy_layer' },
        items: findings.map((f) => ({ text: f.text, tier: 1, category: 'contact_name', maskable: true, detector: 'router' })),
      },
      context: { findings, missing: [] },
      privacy: kind === 'message'
        ? { masked_words: masked, sanitized_prompt: 'Send a text to [CONTACT_1] saying [MESSAGE_1]', placeholders: { '[CONTACT_1]': 'a saved contact', '[MESSAGE_1]': 'the message text' } }
        : undefined,
      trace,
    }
  }

  function apiPreview(path, body) {
    return { contract: 'Sample infotainment API, a stand-in for a vehicle integration.', method: 'POST', path, headers: { 'Content-Type': 'application/json' }, body }
  }

  const words = (s) => s.replace(/[^a-z0-9' ]/gi, ' ').trim()
  const titleCase = (s) => s.replace(/\b\w/g, (ch) => ch.toUpperCase())

  function confirmation(prompt, kind, steps, extra, onApprove) {
    const id = `demo-${nextId++}`
    pending.set(id, onApprove)
    return { status: 'awaiting_confirmation', request_id: id, plan_hash: `hash-${id}`, confirmation_reason: 'interpretation_check', plan: { steps }, ...detail(prompt, kind, 'plan', { ...extra, request_id: id }) }
  }

  function handle(prompt) {
    const p = prompt.toLowerCase()
    const done = (kind, result, extra = {}) => ({ status: 'completed', ...result, ...detail(prompt, kind, 'done', extra) })

    if (/\b(end|hang up)\b.*\bcall\b|\bhang up\b/.test(p)) {
      return done('other', { answer: 'Call ended.', actions: [{ type: 'call', state: 'ended' }], privacy_receipt: receipts.rules() })
    }
    if (/\b(navigate|directions|take me|drive to|route|go to)\b/.test(p)) {
      const key = Object.keys(PLACES).find((k) => p.includes(k.split(' ')[0]))
      const dest = PLACES[key || 'devonshire mall']
      const stops = /coffee/.test(p) ? [COFFEE] : []
      const route = routeTo(dest, stops)
      const steps = [{ capability: 'navigation.start', arguments: { destination: dest.name } }, ...stops.map((s) => ({ capability: 'navigation.add_stop', arguments: { stop: s.name } }))]
      return confirmation(prompt, 'nav', steps, { dest, route }, () =>
        done('nav', {
          answer: `Starting navigation to ${dest.name}${stops.length ? ' with a coffee stop' : ''}.`,
          actions: [route],
          api_preview: apiPreview('/v1/navigation/route', { destination: dest.name, stops: stops.map((s) => s.name), distance_m: route.distance_m }),
          privacy_receipt: receipts.rules({ outside_services: [{ service: 'OSRM routing', received: 'coordinates only' }] }),
        }, { dest, route }),
      )
    }
    if (/\bcall\b/.test(p)) {
      const m = words(prompt).match(/call\s+([a-z]+)/i)
      const contact = `${m ? titleCase(m[1]) : 'Sam'} (sample)`
      return confirmation(prompt, 'call', [{ capability: 'phone.call', arguments: { contact } }], { contact }, () =>
        done('call', {
          answer: `Calling ${contact}.`, actions: [{ type: 'call', state: 'active', contact }],
          api_preview: apiPreview('/v1/phone/call', { contact_id: 'contact-0001' }),
          privacy_receipt: receipts.local(1, 'personal', 'contacts stay on this vehicle'),
        }, { contact }),
      )
    }
    if (/\b(message|text)\b/.test(p)) {
      const m = words(prompt).match(/(?:message|text)\s+([a-z]+)/i)
      const contact = `${m ? titleCase(m[1]) : 'Sam'} (sample)`
      const said = prompt.match(/(?:say|saying|that)\s+(.+)$/i)
      const message = said ? said[1].replace(/[.!?]+$/, '') : "I'm on my way"
      return confirmation(prompt, 'message', [{ capability: 'messaging.send', arguments: { contact, message } }], { contact, message }, () =>
        done('message', {
          answer: `Message sent to ${contact}.`, actions: [{ type: 'message_sent', contact, text: message }],
          api_preview: apiPreview('/v1/messaging/send', { contact_id: 'contact-0001', text: message }),
          privacy_receipt: receipts.masked(2),
        }, { contact, message }),
      )
    }
    if (/\b(play|music|song|put on|listen)\b/.test(p)) {
      const q = words(prompt).replace(/^(please\s+)?(play|put on|listen to)\s+/i, '').trim() || 'driving music'
      return done('media', { answer: `Playing ${q}.`, actions: [{ type: 'media', command: 'play', query: q }], api_preview: apiPreview('/v1/media/play', { query: q }), privacy_receipt: receipts.rules() })
    }
    if (/\b(appointment|calendar|schedule|meeting|dentist|doctor)\b/.test(p)) {
      return done('appointment', {
        answer: 'Your next appointment is a dental check-up tomorrow at 10:30.',
        actions: [{ type: 'info', title: 'Next appointment', text: 'Dental check-up · tomorrow 10:30' }],
        privacy_receipt: receipts.local(2, 'sensitive', 'health information is kept on the local model'),
      })
    }
    if (/\b(pin|card number|credit card|passport|sin)\b/.test(p)) {
      return done('pin', {
        answer: "PINs, card numbers and IDs never leave this vehicle, so I won't read them out or send them anywhere.",
        privacy_receipt: receipts.local(3, 'restricted', 'restricted data never leaves the vehicle'),
      })
    }
    return done('other', {
      answer: 'This is a replica running on sample data, so I can only act out a few things. Try asking for directions to Devonshire Mall, to play some music, to call or text Sam, or for your next appointment.',
      privacy_receipt: receipts.rules(),
    })
  }

  function record(prompt, result) {
    turns.push({ prompt, status: result.status, answer: result.answer || '' })
    if (turns.length > 6) turns.shift()
    return result
  }

  function snapshot() {
    return {
      profile: profile ? { ...profile } : { id: 'guest', name: 'Guest', protected: false },
      database: profile
        ? {
            contacts: CONTACTS,
            appointments: [{ label: 'Dental check-up (sample)', when: 'tomorrow 10:30', where: 'Sample Dental Clinic' }],
            entity_aliases: [{ alias: 'Sam', entity_key: 'contact-0001', kind: 'contact' }],
            preferences: [{ key: 'home_city', value: 'Windsor' }, { key: 'units', value: 'km' }],
          }
        : { contacts: CONTACTS, appointments: [{ label: 'Dental check-up (sample)', when: 'tomorrow 10:30', where: 'Sample Dental Clinic' }] },
      session: {
        session_id: 'demo-session', retained_turn_limit: 6, idle_expiry_minutes: 30,
        application_state: { navigation: 'idle', media: 'stopped', phone: 'idle' },
        clarified_references: [], references: {}, turns,
      },
      models: MODELS,
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
      case '/api/v2/session': return reply({ profile, session: snapshot().session })
      case '/api/v2/session/reset': turns.length = 0; return reply({ ok: true })
      case '/api/v2/inspector': return reply(snapshot())
      case '/api/v2/profiles':
        return reply({ enabled: true, profiles: [{ id: 'guest', name: 'Guest' }, { id: 'alex', name: 'Alex (sample)' }] })
      case '/api/v2/profile/guest':
        profile = null
        return reply({ profile: { id: 'guest', name: 'Guest', protected: false } })
      case '/api/v2/profile/login':
        if (!body.password) return reply({ error: 'Enter any password, this is a replica.' }, 400)
        profile = { id: 'alex', name: 'Alex (sample)', protected: true }
        return reply({ profile })
      case '/api/v2/profile/data': return reply({ error: 'Saving private data is turned off in this replica.' }, 400)
      case '/api/v2/requests': return reply(record(body.prompt || '', handle(body.prompt || '')), 200, 650)
      case '/api/v2/requests/clarification': return reply(record(body.answer || '', handle(body.answer || '')), 200, 650)
      case '/api/v2/requests/confirmation': {
        const next = pending.get(body.request_id)
        pending.delete(body.request_id)
        if (!body.approved || !next) return reply({ status: 'cancelled' }, 200, 300)
        const result = next()
        if (turns.length) turns[turns.length - 1] = { ...turns[turns.length - 1], status: result.status, answer: result.answer }
        return reply(result, 200, 650)
      }
      case '/api/v2/requests/cancel': return reply({ status: 'cancelled' })
      case '/api/v2/media/lookup': return reply({ error: 'Playback is turned off in this replica.' }, 400, 200)
      case '/api/v2/speech': return reply({ error: 'Voice input is turned off in this replica.' }, 400)
      default: return reply({ error: 'Not available in this replica.' }, 404)
    }
  }

  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('Voice input is turned off in this replica.'))
  }
})()
