/* Driver screen: sends requests to this server and shows the results in this browser.
   Shares the browser session with the inspector (/inspector), so both show the same requests.
   Model and server text is always inserted as text, never as HTML. */
// YouTube refuses most music videos on pages served from a bare IP address (player error 150),
// but accepts the same page at "localhost". Same machine, same tunnel, so switch before anything loads.
if (['127.0.0.1', '[::1]'].includes(location.hostname)) location.replace(location.href.replace(location.hostname, 'localhost'));
const $ = selector => document.querySelector(selector);
const SESSION_KEY = 'jlr-v2-session';
const ORIGIN = [42.3043, -83.0661]; // replica: University of Windsor
let session = sessionStorage.getItem(SESSION_KEY);
let busy = false;
let pending = null;        // result awaiting confirmation or clarification
let routeLayer = null, driveTimer = null, currentRoute = null;
let mediaQuery = null, callTimer = null;

/* ---------- small helpers ---------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
const minutes = s => s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : `${Math.max(1, Math.round(s / 60))} min`;
const km = m => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
const setStatus = text => { $('#status').textContent = text || ''; };

function showPanel(name, flash = true) {
  document.querySelectorAll('.tabs button').forEach(b => {
    const on = b.dataset.panel === name;
    b.classList.toggle('active', on);
    if (flash && on) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 1200); }
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  if (name === 'map') setTimeout(() => map.invalidateSize(), 50);
}

/* ---------- server calls ---------- */
async function ensureSession() {
  if (session) return;
  const response = await fetch('/api/v2/sessions', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
  if (!response.ok) throw new Error('Could not start a session');
  session = (await response.json()).session_id;
  sessionStorage.setItem(SESSION_KEY, session);
}

async function post(path, body, extra = {}) {
  await ensureSession();
  const response = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-JLR-Session': session, ...extra}, body: JSON.stringify(body || {})});
  const data = await response.json().catch(() => ({}));
  if (response.status === 404 && /session/i.test(data.error || '')) { session = null; sessionStorage.removeItem(SESSION_KEY); throw new Error('Your session expired. Please send the request again.'); }
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return {status: response.status, data};
}

async function runJob(path, body) {
  const started = Date.now();
  const {status, data} = await post(path, body, {'Prefer': 'respond-async', 'Idempotency-Key': crypto.randomUUID()});
  if (status !== 202) return data;
  for (;;) {
    await new Promise(resolve => setTimeout(resolve, 700));
    const response = await fetch(`/api/v2/jobs/${encodeURIComponent(data.job_id)}`, {headers: {'X-JLR-Session': session}});
    const job = await response.json();
    if (!response.ok) throw new Error(job.error || 'Could not read the request');
    if (job.status === 'completed') return job.result;
    if (job.status === 'failed' || job.status === 'cancelled') throw new Error(job.error || 'Request cancelled');
    const secs = Math.round((Date.now() - started) / 1000);
    setStatus(secs > 12 ? `Working… ${secs} s (the larger model can take up to a minute)` : 'Working…');
  }
}

/* ---------- conversation ---------- */
function addMessage(role, text, extraClass = '') {
  const node = el('div', `msg ${role} ${extraClass}`.trim(), text);
  $('#messages').append(node);
  node.scrollIntoView({block: 'end'});
  return node;
}

function privacyChip(result) {
  const r = result.privacy_receipt;
  if (!r) return null;
  const sent = r.sent_to_larger_model;
  let label, kind;
  if (sent) { label = `Masked · ${sent.placeholders} item${sent.placeholders === 1 ? '' : 's'} → larger model`; kind = 'masked'; }
  else if (r.kept_local_because) { label = `Kept on this vehicle${r.tier_name ? ` · ${r.tier_name}` : ''}`; kind = 'local'; }
  else if (r.answered_by?.by === 'larger model') { label = 'Larger model · nothing private in it'; kind = 'masked'; }
  else if (r.answered_by?.by === 'local model') { label = 'Answered on this vehicle'; kind = 'local'; }
  else { label = 'Handled by system rules'; kind = 'rules'; }
  const chip = el('button', `privacy ${kind}`, `🔒 ${label}`);
  chip.type = 'button'; chip.title = 'Show the privacy receipt';
  let details = null;
  chip.addEventListener('click', () => {
    if (details) { details.remove(); details = null; return; }
    details = el('div', 'receipt');
    const line = (k, v) => { const p = el('div'); p.append(el('b', '', `${k}: `), document.createTextNode(v)); details.append(p); };
    line('Answered by', `${r.answered_by?.by || '—'}${r.answered_by?.model ? ` (${r.answered_by.model})` : ''} · ${r.answered_by?.where || ''}`);
    if (r.tier) line('Privacy tier', `${r.tier}${r.tier_name ? ` · ${r.tier_name}` : ''}`);
    if (r.kept_local_because) line('Kept local because', r.kept_local_because);
    line('Sent to the larger model', sent ? `masked request, ${sent.placeholders} placeholder(s); private values sent: ${sent.private_values_sent}` : 'nothing');
    line('Outside services', (r.outside_services || []).map(s => `${s.service} (${s.received})`).join('; ') || 'none');
    if (r.saved_to_profile) line('Saved', `${r.saved_to_profile.kinds.join(', ')} · ${r.saved_to_profile.where}`);
    (r.warnings || []).forEach(w => line('Warning', w));
    chip.after(details);
  });
  return chip;
}

function describeStep(step) {
  const a = step.arguments || {};
  if (step.save) {
    const s = step.save;
    return `Save to ${s.profile}'s profile: ${s.summary}${s.replaces ? ` (replaces ${s.replaces})` : ''}`;
  }
  switch (step.capability) {
    case 'phone.call': return `Call ${a.contact}`;
    case 'phone.end_call': return 'End the call';
    case 'messaging.send': return `Send a message to ${a.contact}: “${a.message}”`;
    case 'navigation.start': return `Navigate to ${a.destination}`;
    case 'navigation.add_stop': return `Add a stop: ${a.stop}`;
    case 'media.play': return `Play ${a.query}`;
    default: return `${String(step.capability).replace(/[._]/g, ' ')} ${Object.values(a).join(', ')}`.trim();
  }
}

function replyText(result) {
  if (result.status === 'awaiting_clarification') return result.clarification?.question || 'Could you tell me more?';
  if (result.status === 'cancelled') return 'Cancelled. Nothing was done.';
  if (result.status === 'failed' || result.status === 'partially_completed') return `Sorry, that didn't work: ${result.error || 'no details'}`;
  let text = (typeof result.answer === 'string' && result.answer.trim()) || (result.receipts || []).map(x => x.message).filter(Boolean).join('\n') || '';
  text = text.replace(/^Simulation:\s*/gm, '');
  if (result.routing_notice) text = `${text}\n\n${result.routing_notice}`.trim();
  return text || 'Done.';
}

function showResult(result) {
  pending = null;
  $('#confirm-card').hidden = true;
  if (result.status === 'awaiting_confirmation') {
    pending = result;
    const list = $('#confirm-steps'); list.replaceChildren(...(result.plan?.steps || []).map(s => el('li', '', describeStep(s))));
    if (result.unsaved_contacts?.length) list.append(el('li', '', `Not a saved contact: ${result.unsaved_contacts.join(', ')}`));
    (result.plan?.steps || []).filter(s => s.save?.lookup).forEach(s => list.append(el('li', 'notice', s.save.lookup.notice)));
    const order = result.plan?.route_order;
    if (order) {
      const fastest = `Fastest order: ${order.fastest.order.join(' → ')}, about ${order.fastest.minutes} min`;
      const yours = order.your_order.order.join(' → ') !== order.fastest.order.join(' → ')
        ? ` · your order ${order.your_order.order.join(' → ')}: about ${order.your_order.minutes} min` : '';
      list.prepend(el('li', 'notice', `${fastest}${yours} (${order.orders_compared} orders compared; stops' own time not included)`));
    }
    $('#confirm-card').hidden = false;
    addMessage('assistant', {interpretation_check: 'Please check I understood you correctly.',
      saves_private_data: 'Save this to your profile? It stays encrypted on this vehicle.',
      fastest_order: 'I compared every order. Start navigation in the fastest one?'}[result.confirmation_reason] || 'Please confirm.');
    return;
  }
  const failed = ['failed', 'partially_completed'].includes(result.status);
  const node = addMessage('assistant', replyText(result), failed ? 'error' : '');
  const chip = privacyChip(result);
  if (chip) { node.append(el('br')); node.append(chip); }
  if (result.status === 'awaiting_clarification') {
    pending = result;
    $('#prompt').placeholder = 'Type your answer…';
  } else {
    $('#prompt').placeholder = 'Ask anything…';
  }
  (result.actions || []).forEach(runAction);
}

async function send(text) {
  if (busy || !text) return;
  busy = true; $('#send').disabled = true;
  addMessage('user', text);
  const thinking = addMessage('assistant', '…', 'thinking');
  try {
    const result = pending?.status === 'awaiting_clarification'
      ? await runJob('/api/v2/requests/clarification', {request_id: pending.request_id, slot_id: pending.clarification.slot_id, answer: text})
      : await runJob('/api/v2/requests', {prompt: text});
    thinking.remove();
    showResult(result);
  } catch (error) {
    thinking.remove();
    addMessage('assistant', error.message, 'error');
  } finally {
    busy = false; $('#send').disabled = false; setStatus('');
  }
}

async function confirm(approved) {
  if (!pending || busy) return;
  busy = true; $('#confirm-card').hidden = true;
  const thinking = addMessage('assistant', '…', 'thinking');
  try {
    const result = await runJob('/api/v2/requests/confirmation', {request_id: pending.request_id, plan_hash: pending.plan_hash, approved});
    thinking.remove(); showResult(result);
  } catch (error) { thinking.remove(); addMessage('assistant', error.message, 'error'); }
  finally { busy = false; setStatus(''); }
}

/* ---------- actions: what this browser shows ---------- */
function runAction(action) {
  switch (action.type) {
    case 'show_route': return showRoute(action);
    case 'media': return showMedia(action);
    case 'call': return showCall(action);
    case 'message_sent': return addCard('#message-cards', 'Message sent', `To ${action.contact}: ${action.text}`, 'phone');
    case 'info': return addCard('#info-cards', action.title, action.text, 'info');
    case 'profile_saved': return addCard('#info-cards', `Saved to ${action.profile}'s profile`, action.text.replace(/^Saved to .*?'s profile: /, ''), 'info');
  }
}

function addCard(container, title, text, panel) {
  const box = $(container);
  box.querySelector('.hint')?.remove();
  const card = el('div', 'card'); card.append(el('div', 'eyebrow', title), el('div', '', text));
  box.prepend(card);
  showPanel(panel);
}

/* Map */
const map = L.map('map', {zoomControl: true, attributionControl: true}).setView(ORIGIN, 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap contributors'}).addTo(map);
L.circleMarker(ORIGIN, {radius: 7, color: '#fff', weight: 2, fillColor: '#4fb3a9', fillOpacity: 1}).addTo(map).bindTooltip('Start (University of Windsor)');

function showRoute(route) {
  stopDrive();
  currentRoute = route;
  if (routeLayer) routeLayer.remove();
  routeLayer = L.layerGroup().addTo(map);
  const line = route.geometry?.length ? route.geometry : [[route.origin.lat, route.origin.lon], ...route.stops.map(s => [s.lat, s.lon]), [route.destination.lat, route.destination.lon]];
  L.polyline(line, {color: '#4fb3a9', weight: 6, opacity: .9}).addTo(routeLayer);
  route.stops.forEach(s => L.circleMarker([s.lat, s.lon], {radius: 7, color: '#fff', weight: 2, fillColor: '#e0b04f', fillOpacity: 1}).addTo(routeLayer).bindTooltip(s.name));
  L.circleMarker([route.destination.lat, route.destination.lon], {radius: 9, color: '#fff', weight: 2, fillColor: '#d9534f', fillOpacity: 1}).addTo(routeLayer).bindTooltip(route.destination.name);
  $('#route-dest').textContent = route.destination.name || 'Destination';
  $('#route-via').textContent = route.stops.length ? `via ${route.stops.map(s => s.name).join(', ')}` : (route.destination.address || '');
  $('#route-time').textContent = minutes(route.duration_seconds || 0);
  $('#route-dist').textContent = km(route.distance_m || 0);
  $('#gmaps-link').href = route.google_maps_url;
  $('#route-steps').replaceChildren(...(route.steps || []).map(s => {
    const li = el('li', '', s.text);
    if (s.distance_m) li.append(' ', el('small', '', km(s.distance_m)));
    return li;
  }));
  $('#drive-button').disabled = !route.geometry?.length;
  $('#route-card').hidden = false;
  showPanel('map');
  // Leave room for the route card on wide screens so it does not cover the route.
  const wide = $('#map').clientWidth > 700;
  map.fitBounds(L.latLngBounds(line), {paddingTopLeft: wide ? [400, 40] : [30, 230], paddingBottomRight: [40, 40]});
}

function stopDrive() {
  if (driveTimer) clearInterval(driveTimer);
  driveTimer = null; $('#drive-button').textContent = 'Simulate drive';
  routeLayer?.eachLayer(layer => { if (layer.options?.car) layer.remove(); });
}

function simulateDrive() {
  if (!currentRoute?.geometry?.length) return;
  if (driveTimer) return stopDrive();
  const pts = currentRoute.geometry, steps = currentRoute.steps || [], items = [...$('#route-steps').children];
  const car = L.circleMarker(pts[0], {radius: 9, color: '#fff', weight: 3, fillColor: '#2f7cf6', fillOpacity: 1, car: true}).addTo(routeLayer);
  const total = currentRoute.distance_m || 1, perPoint = total / Math.max(1, pts.length - 1);
  let i = 0; $('#drive-button').textContent = 'Stop';
  driveTimer = setInterval(() => {
    i += Math.max(1, Math.round(pts.length / 120));
    if (i >= pts.length - 1) { car.setLatLng(pts[pts.length - 1]); items.forEach(li => li.classList.remove('current')); items.at(-1)?.classList.add('current'); clearInterval(driveTimer); driveTimer = null; $('#drive-button').textContent = 'Simulate drive'; setStatus('Arrived (simulated).'); return; }
    car.setLatLng(pts[i]);
    let travelled = i * perPoint, index = 0;
    for (let k = 0, sum = 0; k < steps.length; k++) { sum += steps[k].distance_m; if (sum >= travelled) { index = k; break; } index = k; }
    items.forEach((li, k) => li.classList.toggle('current', k === index));
    setStatus(`Simulated drive · ${km(Math.max(0, total - travelled))} left`);
  }, 150);
}

/* Media */
function showMedia(action) {
  const player = $('#player');
  if (action.command === 'play') {
    mediaQuery = action.query;
    player.replaceChildren();
    $('#track-name').textContent = action.query || 'Music';
    $('#consent-query').textContent = `“${action.query}”`;
    $('#media-consent').hidden = !action.query;
    $('#media-note').textContent = 'Playing in the simulated vehicle player.';
  } else if (action.command === 'pause') {
    player.querySelector('iframe')?.contentWindow?.postMessage(JSON.stringify({event: 'command', func: 'pauseVideo', args: []}), 'https://www.youtube-nocookie.com');
    $('#media-note').textContent = 'Paused.';
  } else if (action.command === 'next') {
    $('#media-note').textContent = 'Skipped to the next track.';
  }
  showPanel('media');
}

async function playOnYoutube() {
  if (!mediaQuery) return;
  $('#youtube-play').disabled = true;
  try {
    const {data} = await post('/api/v2/media/lookup', {query: mediaQuery});
    $('#media-consent').hidden = true;
    playCandidates(data.video_ids?.length ? data.video_ids : (data.video_id ? [data.video_id] : []), data.search_url);
  } catch (error) {
    $('#media-note').textContent = error.message;
  } finally { $('#youtube-play').disabled = false; }
}

/* Many official music videos refuse to play on other sites (player error 150/101/100).
   The player reports this through postMessage, so the next candidate is tried automatically. */
const YT_ORIGIN = 'https://www.youtube-nocookie.com';
let ytListener = null;
function playCandidates(ids, searchUrl, index = 0) {
  if (ytListener) window.removeEventListener('message', ytListener);
  if (index >= ids.length) {
    const link = el('a', 'secondary', 'Watch on YouTube'); link.href = searchUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    $('#player').replaceChildren(link);
    $('#media-note').textContent = ids.length ? 'None of the found videos can be played inside this screen.' : 'YouTube could not be searched right now.';
    return;
  }
  const frame = document.createElement('iframe');
  frame.src = `${YT_ORIGIN}/embed/${encodeURIComponent(ids[index])}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  frame.allow = 'autoplay; encrypted-media; picture-in-picture';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.title = `YouTube: ${mediaQuery}`;
  $('#player').replaceChildren(frame);
  $('#media-note').textContent = index ? `Trying another video (${index + 1} of ${ids.length})…` : 'Sent to YouTube: the search text only.';
  let ready = false;
  ytListener = event => {
    if (event.origin !== YT_ORIGIN || event.source !== frame.contentWindow) return;
    let data; try { data = JSON.parse(event.data); } catch { return; }
    if (data.event === 'onReady') ready = true;
    if (data.event === 'onError') playCandidates(ids, searchUrl, index + 1);
    if (data.event === 'onStateChange' && data.info === 1) $('#media-note').textContent = 'Playing. Sent to YouTube: the search text only.';
  };
  window.addEventListener('message', ytListener);
  // The player only reports events after it is told someone is listening.
  frame.addEventListener('load', () => {
    const hello = setInterval(() => { if (ready || !frame.isConnected) return clearInterval(hello); frame.contentWindow?.postMessage(JSON.stringify({event: 'listening', id: 1, channel: 'widget'}), YT_ORIGIN); }, 250);
    setTimeout(() => clearInterval(hello), 8000);
  });
}

/* Phone */
function showCall(action) {
  clearInterval(callTimer);
  if (action.state === 'active') {
    $('#call-name').textContent = action.contact; $('#call-avatar').textContent = (action.contact || '?').trim()[0]?.toUpperCase() || '☎';
    const started = Date.now();
    const tick = () => { const s = Math.floor((Date.now() - started) / 1000); $('#call-state').textContent = `Simulated call · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    tick(); callTimer = setInterval(tick, 1000);
    $('#end-call').hidden = false;
  } else {
    $('#call-state').textContent = 'Call ended'; $('#end-call').hidden = true;
  }
  showPanel('phone');
}

/* ---------- profiles ---------- */
async function loadProfiles(selected) {
  const response = await fetch('/api/v2/profiles');
  const data = await response.json();
  $('.profile').hidden = !data.enabled;
  $('#profile-select').replaceChildren(...(data.profiles || []).map(p => {
    const option = el('option', '', p.name); option.value = p.id; option.selected = p.id === selected; return option;
  }));
  $('#password-row').hidden = $('#profile-select').value === 'guest';
}

function showProfile(profile) {
  $('#profile-button').textContent = `${profile?.name || 'Guest'} ▾`;
  $('#profile-button').title = profile?.protected ? 'Signed in · private data encrypted' : 'Guest · no private data';
}

async function switchProfile() {
  $('#profile-error').textContent = '';
  const id = $('#profile-select').value;
  $('#profile-switch').disabled = true;
  try {
    const {data} = id === 'guest' ? await post('/api/v2/profile/guest', {}) : await post('/api/v2/profile/login', {profile_id: id, password: $('#profile-password').value});
    $('#profile-password').value = '';
    showProfile(data.profile);
    $('#profile-panel').hidden = true;
    await post('/api/v2/session/reset', {});
    resetScreen();
    addMessage('assistant', data.profile.protected ? `Signed in as ${data.profile.name}. Their private data is decrypted for this session only.` : 'Switched to Guest. No private data is available.');
  } catch (error) {
    $('#profile-error').textContent = error.message;
  } finally { $('#profile-switch').disabled = false; }
}

function resetScreen() {
  pending = null; $('#confirm-card').hidden = true; $('#prompt').placeholder = 'Ask anything…';
  $('#messages').replaceChildren();
  stopDrive(); if (routeLayer) routeLayer.remove(); routeLayer = null; currentRoute = null; $('#route-card').hidden = true; map.setView(ORIGIN, 13);
  $('#player').replaceChildren(); $('#track-name').textContent = 'Nothing playing'; $('#media-consent').hidden = true; $('#media-note').textContent = '';
  clearInterval(callTimer); $('#call-name').textContent = 'No active call'; $('#call-state').textContent = 'Calls are simulated'; $('#end-call').hidden = true;
  $('#message-cards').replaceChildren(); $('#info-cards').replaceChildren(el('p', 'hint', 'Results such as your next appointment or latest message appear here.'));
}

/* ---------- voice input ----------
   Records a short clip and sends it only to this server, which transcribes it on the vehicle.
   The text is put in the request box for the driver to check; nothing is sent until they press Send. */
const MAX_RECORDING_MS = 30000;
let recorder = null, recordTimer = null;

function setMic(state) {
  const mic = $('#mic');
  mic.classList.toggle('recording', state === 'recording');
  mic.setAttribute('aria-pressed', String(state === 'recording'));
  mic.disabled = state === 'transcribing';
  mic.textContent = state === 'recording' ? '■' : '🎤';
  mic.setAttribute('aria-label', state === 'recording' ? 'Stop and transcribe' : 'Speak your request');
  setStatus({recording: 'Listening… press ■ when you are done.', transcribing: 'Turning your voice into text on this vehicle…'}[state] || '');
}

async function transcribe(blob) {
  await ensureSession();
  const type = (blob.type || 'audio/webm').split(';')[0];
  const response = await fetch('/api/v2/speech', {method: 'POST', headers: {'Content-Type': type, 'X-JLR-Session': session}, body: blob});
  const data = await response.json().catch(() => ({}));
  if (response.status === 503) $('#mic').hidden = true;
  if (!response.ok) throw new Error(data.error || 'Voice input failed');
  return data.text || '';
}

async function toggleRecording() {
  if (recorder) { recorder.stop(); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({audio: true}); }
  catch { addMessage('assistant', 'I need microphone access for voice input. Allow it in the browser and try again.', 'error'); return; }
  const chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
  recorder.addEventListener('stop', async () => {
    clearTimeout(recordTimer); stream.getTracks().forEach(track => track.stop());
    const blob = new Blob(chunks, {type: recorder.mimeType}); recorder = null;
    setMic('transcribing');
    try {
      const text = await transcribe(blob);
      if (text) { const box = $('#prompt'); box.value = (box.value.trim() + ' ' + text).trim(); box.focus(); }
      else addMessage('assistant', "I didn't catch that. Please try again.", 'error');
    } catch (error) { addMessage('assistant', error.message, 'error'); }
    finally { setMic('idle'); }
  });
  recorder.start();
  recordTimer = setTimeout(() => recorder?.state === 'recording' && recorder.stop(), MAX_RECORDING_MS);
  setMic('recording');
}

if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
  $('#mic').hidden = false;
  $('#mic').addEventListener('click', toggleRecording);
}

/* ---------- start ---------- */
async function start() {
  const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}); };
  tick(); setInterval(tick, 15000);
  let profile = null;
  if (session) {
    const response = await fetch('/api/v2/session', {headers: {'X-JLR-Session': session}});
    if (response.ok) profile = (await response.json()).profile;
    else { session = null; sessionStorage.removeItem(SESSION_KEY); }
  }
  showProfile(profile);
  await loadProfiles(profile?.id || 'guest').catch(() => { $('.profile').hidden = true; });
}

$('#composer').addEventListener('submit', event => { event.preventDefault(); const text = $('#prompt').value.trim(); $('#prompt').value = ''; send(text); });
$('#confirm-yes').addEventListener('click', () => confirm(true));
$('#confirm-no').addEventListener('click', () => confirm(false));
$('#drive-button').addEventListener('click', simulateDrive);
$('#youtube-play').addEventListener('click', playOnYoutube);
$('#end-call').addEventListener('click', () => send('End the call'));
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showPanel(b.dataset.panel, false)));
$('#profile-button').addEventListener('click', () => { const open = $('#profile-panel').hidden; $('#profile-panel').hidden = !open; $('#profile-button').setAttribute('aria-expanded', String(open)); });
$('#profile-select').addEventListener('change', () => { $('#password-row').hidden = $('#profile-select').value === 'guest'; });
$('#profile-password').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); switchProfile(); } });
$('#profile-switch').addEventListener('click', switchProfile);
start();
