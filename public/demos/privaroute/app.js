const form = document.querySelector('#prompt-form');

const input = document.querySelector('#prompt');

const status = document.querySelector('#status');

const traceRoot = document.querySelector('#architecture-trace');

const inspectorSelection = document.querySelector('#inspector-selection');

const inspectorJson = document.querySelector('#inspector-json');

const apiPreviewRoot = document.querySelector('#api-preview');

const apiPreviewContract = document.querySelector('#api-preview-contract');

const responseRoot = document.querySelector('#response-content');

const responseState = document.querySelector('#response-state');

const responseAnswer = document.querySelector('#response-answer');

const responseApiSection = document.querySelector('#response-api-section');

const historyRoot = document.querySelector('#prompt-history');

const historyCount = document.querySelector('#history-count');

const runSimulationButton = document.querySelector('#run-simulation');

const resetSessionButton = document.querySelector('#reset-session');

const simulationState = document.querySelector('#simulation-state');

const MAX_HISTORY = 20;

const STAKEHOLDER_BLOCKS = [

  ['driver_prompt', 'Driver Prompt'], ['prompt_cleanup', 'Spelling and Format Cleanup'], ['request_coordinator', 'Request Coordinator'],

  ['routing_profile', 'Routing Profile'], ['local_classifier', 'Existing Router'],

  ['routing_policy', 'Python Routing Policy'], ['private_database', 'Private Database'],

  ['session_store', 'Session Store'], ['context_resolver', 'Context Resolver'],

  ['context_gate', 'Required Context Available?'], ['local_worker', 'Local SLM Worker'],

  ['privacy_processing', 'Privacy Processing'], ['larger_worker', 'Configurable Larger Model'],

  ['placeholder_restore', 'Validate and Restore Placeholders'],

  ['tool_gateway', 'Validated Tool Gateway'], ['web_search', 'Public Web Search'],

  ['web_read', 'Public Page Reader'], ['map_resolve_address', 'Local Address Lookup'],

  ['map_find_places', 'Local Place Lookup'], ['map_route', 'Driving Route Calculation'],

  ['capability_registry', 'Capability Registry'], ['plan_validation', 'Validate Response or Action Plan'],

  ['confirmation', 'Confirmation When Required'], ['simulated_adapters', 'Simulated Application Adapters'],

  ['sample_api', 'Sample API Construction'],

  ['response', 'Respond'], ['session_update', 'Update Session'],

];

const STAGE_LABELS = Object.fromEntries([...STAKEHOLDER_BLOCKS,
  ['routing_logic', 'Routing Logic'], ['privacy_policy', 'Complexity × Privacy Decision'], ['action_gate', 'Action Requested?'], ['clarification', 'Ask for Clarification']]);

// Stakeholder view: twelve display groups over the unchanged backend trace.
const DISPLAY_GROUPS = [
  ['driver_prompt', 'Driver Prompt', ['driver_prompt']],
  ['cleanup_group', 'Prompt Cleanup', ['prompt_cleanup']],
  ['router_group', 'Router', ['routing_profile', 'local_classifier', 'routing_logic', 'routing_policy', 'privacy_policy']],
  ['context_group', 'Context Resolution', ['context_resolver', 'context_gate', 'clarification']],
  ['private_database', 'Private DB', ['private_database']],
  ['session_store', 'Session Store', ['session_store', 'session_update']],
  ['local_worker', 'Local SLM', ['local_worker']],
  ['privacy_group', 'Privacy Layer', ['privacy_processing', 'placeholder_restore']],
  ['larger_worker', 'Larger Model', ['larger_worker']],
  ['tools_group', 'Tools — Web & Maps', ['tool_gateway', 'web_search', 'web_read', 'map_resolve_address', 'map_find_places', 'map_route']],
  ['execution_group', 'Validate & Execute', ['capability_registry', 'plan_validation', 'action_gate', 'confirmation', 'simulated_adapters']],
  ['response', 'Response', ['request_coordinator', 'response', 'sample_api']],
];

function groupStatus(groupId, stages, data) {
  const reached = stages.filter(stage => stage.status && stage.status !== 'not_reached');
  if (!reached.length) return 'not_reached';
  const top = data?.status;
  if (reached.some(stage => stage.status === 'failed')) return 'failed';
  if (groupId === 'context_group') {
    if (top === 'awaiting_clarification') return 'awaiting_clarification';
    // A later resolved context supersedes the retained clarification event.
    const resolver = reached.find(stage => stage.id === 'context_resolver');
    if (['missing', 'ambiguous'].includes(resolver?.status)) return top === 'cancelled' ? 'cancelled' : 'failed';
  }
  if (groupId === 'execution_group') {
    if (top === 'awaiting_confirmation') return 'awaiting_confirmation';
    if (reached.find(stage => stage.id === 'confirmation')?.status === 'awaiting') return top === 'cancelled' ? 'cancelled' : 'awaiting_confirmation';
  }
  if (groupId === 'response' && top === 'cancelled') return 'cancelled';
  if (reached.some(stage => stage.status === 'running')) return 'running';
  return 'complete';
}

function buildDisplayBlocks(data) {
  // Last occurrence wins, matching the backend's map-based de-duplication.
  const last = new Map((data?.trace || []).map(item => [item.id, item]));
  const mapped = new Set(DISPLAY_GROUPS.flatMap(group => group[2]));
  const unmapped = [...last.keys()].filter(id => !mapped.has(id));
  return DISPLAY_GROUPS.map(([id, label, sources]) => {
    const ids = id === 'response' ? [...sources, ...unmapped] : sources;
    const stages = ids.filter(source => last.has(source)).map(source => {
      const raw = last.get(source);
      return {...raw, label: STAGE_LABELS[source] || raw.label || source};
    });
    const status = data ? groupStatus(id, stages, data) : id === 'driver_prompt' ? 'waiting' : 'not_reached';
    const single = sources.length === 1 ? stages[0] : null;
    return {id, label, status, stages, input: single?.input ?? {}, output: single?.output ?? {}};
  });
}

function describeStep(step, index) {
  const name = String(step.capability || 'step').replace(/[._]/g, ' ');
  const args = Object.entries(step.arguments || {}).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`).join('; ');
  return `${index + 1}. ${name}${args ? ` (${args})` : ''}`;
}

function receiptText(data) {
  return (data?.receipts || (data?.receipt ? [data.receipt] : [])).map(item => item?.message).filter(Boolean).join('\n');
}

// Pure: decides what the Response panel shows. Model text is never parsed as HTML or Markdown.
function responseContent(data, options = {}) {
  if (options.state === 'processing') return {state: 'processing', label: 'Processing', text: 'Processing your request…'};
  if (options.state === 'cancelled') return {state: 'cancelled', label: 'Cancelled', text: options.message || 'Request cancelled. No further steps were run.'};
  if (options.state === 'error') return {state: 'failed', label: 'Failed', text: `Request failed: ${options.message || 'Unknown error'}`};
  if (!data) return {state: 'initial', label: '', text: 'Your response will appear here.'};
  const partial = receiptText(data);
  if (data.status === 'awaiting_clarification') return {state: 'clarification', label: 'Needs clarification', text: data.clarification?.question || 'More information is needed.'};
  if (data.status === 'awaiting_confirmation') {
    const steps = (data.plan?.steps || []).map(describeStep).join('\n');
    const intro = data.confirmation_reason === 'interpretation_check' ? 'Please confirm I understood your request correctly.\n\n' : '';
    const unsaved = data.unsaved_contacts?.length ? `\n\nNot a saved contact: ${data.unsaved_contacts.join(', ')}.` : '';
    return {state: 'confirmation', label: 'Awaiting confirmation', text: `${intro}Proposed steps:\n${steps || 'No steps listed.'}${unsaved}\n\nUse Confirm plan or Cancel below.`};
  }
  if (data.status === 'failed' || data.status === 'partially_completed' || data.error) {
    const text = `Request failed: ${data.error || 'No error detail was returned.'}`;
    return {state: 'failed', label: data.status === 'partially_completed' ? 'Partially completed' : 'Failed', text: partial ? `${text}\n\nCompleted before the failure:\n${partial}` : text};
  }
  if (data.status === 'cancelled') return {state: 'cancelled', label: 'Cancelled', text: partial ? `Request cancelled. Completed before cancellation:\n${partial}` : 'Request cancelled. No action was taken.'};
  const reply = typeof data.answer === 'string' && data.answer.trim() ? data.answer.trim() : partial;
  // A privacy-driven routing decision is always shown with the answer.
  const answer = reply && data.routing_notice ? `${reply}\n\n${data.routing_notice}` : reply;
  const label = data.status === 'unsupported' ? 'Not supported' : partial ? 'Simulated result' : 'Reply';
  if (!answer) return {state: 'empty', label, text: 'No response text was returned.'};
  return {state: 'completed', label, text: answer, preview: data.status === 'completed' ? data.api_preview || null : null};
}

function renderResponse(data, options = {}) {
  const content = responseContent(data, options);
  responseRoot.dataset.state = content.state;
  responseState.textContent = content.label;
  responseAnswer.textContent = content.text;
  const preview = content.preview;
  responseApiSection.hidden = !preview;
  apiPreviewRoot.textContent = '';
  apiPreviewContract.textContent = '';
  if (!preview) return content;
  apiPreviewContract.textContent = preview.contract || 'Sample infotainment API—not a JLR integration.';
  const headers = Object.entries(preview.headers || {}).map(([key, value]) => `${key}: ${value}`).join('\n');
  apiPreviewRoot.textContent = `${preview.method || 'POST'} ${preview.path || '/'} HTTP/1.1\n${headers}\n\n${JSON.stringify(preview.body || {}, null, 2)}`;
  return content;
}

let analysisTimer = null;

let activeController = null;

let requestSequence = 0;

let currentData = null;

let selectedBlockId = 'driver_prompt';

let historyEntries = [];

let simulationSession = null;

let pendingSimulation = null;

let simulationBusy = false;

let v2Session = null;

let pendingV2 = null;

let pendingClarification = false;

const confirmationControls = document.querySelector('#confirmation-controls');

let activeJob = null;

let pendingTask = null;

let viewingHistory = false;

async function ensureV2Session() {

  if (v2Session) return;

  const response = await fetch('/api/v2/sessions', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'});

  if (!response.ok) throw new Error('Could not create session');

  v2Session = (await response.json()).session_id;

  sessionStorage.setItem('jlr-v2-session', v2Session);

}

function showResult(data, record = true) {

  pendingTask = ['awaiting_confirmation','awaiting_clarification'].includes(data.status) ? data : null;

  pendingV2 = data.status === 'awaiting_confirmation' ? data : null;

  pendingClarification = data.status === 'awaiting_clarification';

  confirmationControls.hidden = !pendingV2;

  document.querySelector('#clarification-controls').hidden = !pendingClarification;

  document.querySelector('#clarification-question').textContent = data.clarification?.question || '';

  document.querySelector('#clarification-answer').value = '';

  document.querySelector('#confirmation-summary').textContent = pendingV2 ? JSON.stringify(data.plan.steps, null, 2) : '';

  renderWorkspace(data, data.error ? 'response' : pendingClarification ? 'context_group' : 'response');

  renderResponse(data);

  setStatus(data);

  if(record) addHistory(data.prompt || input.value.trim(), data);

}

async function pollV2(job, controller) {

  const url = job.poll_url;

  if (!url || !url.startsWith('/api/v2/jobs/')) throw new Error('Invalid job URL');

  activeJob = job;

  sessionStorage.setItem('jlr-v2-job', job.job_id);

  for (;;) {

    const response = await fetch(url, {headers:{'X-JLR-Session':v2Session}, signal:AbortSignal.any([controller.signal, AbortSignal.timeout(30000)])});

    const data = await response.json();

    if(!response.ok) throw new Error(data.error || 'Could not retrieve request');

    if(data.status === 'completed') {

      if (!data.result) throw new Error('Request completed without a result');

      activeJob = null; sessionStorage.removeItem('jlr-v2-job'); return data.result;

    }

    if(['failed','cancelled'].includes(data.status)) {

      activeJob = null; sessionStorage.removeItem('jlr-v2-job');

      const error = new Error(data.error || 'Request cancelled');

      error.cancelled = data.status === 'cancelled';

      throw error;

    }

    if(!['queued','running','cancelling'].includes(data.status)) throw new Error('Invalid job status');

    status.textContent = `Request ${data.status}…`;

    await new Promise(resolve => setTimeout(resolve,700));

  }

}

async function submitV2(path, payload) {

  if(simulationBusy) return;

  const sequence = ++requestSequence;

  viewingHistory = false;

  simulationBusy = true; runSimulationButton.disabled = true;

  activeController = new AbortController();

  renderResponse(null, {state: 'processing'});

  try {

    await ensureV2Session();

    const response = await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-JLR-Session':v2Session,'Prefer':'respond-async','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(payload),signal:AbortSignal.any([activeController.signal,AbortSignal.timeout(30000)])});

    let data = await response.json();

    if(!response.ok) throw new Error(data.error || 'Request failed');

    if(response.status === 202) data = await pollV2(data,activeController);

    if(sequence !== requestSequence)return;

    showResult(data);

  } catch(error) {

    if(sequence !== requestSequence || error.name === 'AbortError') return;

    status.textContent = error.message;

    renderResponse(null, error.cancelled ? {state: 'cancelled'} : {state: 'error', message: error.message});

  }

  finally {if(sequence === requestSequence){simulationBusy=false;runSimulationButton.disabled=false;}}

}

async function confirmV2(approved) {

  if(!pendingV2 || viewingHistory) return;

  await submitV2('/api/v2/requests/confirmation',{request_id:pendingV2.request_id,plan_hash:pendingV2.plan_hash,approved});

}

async function cancelCurrent() {

  if(!v2Session)return;

  const endpoint=activeJob ? `/api/v2/jobs/${activeJob.job_id}/cancel` : '/api/v2/requests/cancel';

  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-JLR-Session':v2Session},body:JSON.stringify({request_id:pendingTask?.request_id})});

  const data=await response.json();

  if(!response.ok){status.textContent=data.error;return;}

  if(!activeJob)showResult(data);

}

async function resetSimulation() {

  ++requestSequence;

  if(activeController)activeController.abort();

  if(v2Session) {

    const response=await fetch('/api/v2/session/reset',{method:'POST',headers:{'Content-Type':'application/json','X-JLR-Session':v2Session},body:'{}'});

    if(!response.ok){status.textContent='Could not reset session';return;}

  }

  activeJob=null;pendingTask=null;pendingV2=null;pendingClarification=false;simulationBusy=false;

  sessionStorage.removeItem('jlr-v2-job');runSimulationButton.disabled=false;

  historyEntries=[];renderHistory();renderWorkspace(null,'driver_prompt');

  renderResponse(null);

  confirmationControls.hidden=true;document.querySelector('#clarification-controls').hidden=true;

  status.textContent='Session reset. Enter a request.';

}

async function recoverSession() {

  v2Session=sessionStorage.getItem('jlr-v2-session');

  if(!v2Session)return;

  try {

    const response=await fetch('/api/v2/session',{headers:{'X-JLR-Session':v2Session}});

    if(!response.ok){v2Session=null;sessionStorage.removeItem('jlr-v2-session');throw new Error('Session expired; submit a new request.');}

    const state=await response.json();
    // Requests made on the driver screen share this session: list them and open the latest.
    for(const turn of state.turns||[]) addHistory(turn.prompt||'',turn);

    const jid=sessionStorage.getItem('jlr-v2-job');

    if(jid){simulationBusy=true;runSimulationButton.disabled=true;activeController=new AbortController();showResult(await pollV2({job_id:jid,poll_url:`/api/v2/jobs/${jid}`},activeController));}

    else if(state.pending_result)showResult(state.pending_result,false);
    else if(state.turns?.length)showResult(state.turns.at(-1),false);

  } catch(error) {status.textContent=error.message;sessionStorage.removeItem('jlr-v2-job');}

  finally{simulationBusy=false;runSimulationButton.disabled=false;}

}

function pretty(value) {

  if (value === undefined || value === null) return '—';

  if (typeof value === 'string') return value;

  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  return JSON.stringify(value);

}

function compact(value, limit = 150) {

  const text = pretty(value).replace(/\s+/g, ' ').trim();

  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;

}

function createText(tag, text, className) {

  const node = document.createElement(tag);

  if (className) node.className = className;

  node.textContent = text;

  return node;

}

function statusLabel(value) {

  return value === 'needs_clarification' ? 'clarify' : String(value || 'waiting').replace(/_/g, ' ');

}

function traceItems(data) {

  return {built: buildDisplayBlocks(data), routes: [], traceById: new Map((data?.trace || []).map(item => [item.id, item]))};

}

function initialItems() {

  return {built: buildDisplayBlocks(null), routes: []};

}

function addFlowNode(item) {

  const button = document.createElement('button');

  button.type = 'button';

  button.className = 'flow-node';

  button.dataset.id = item.id;

  button.dataset.status = item.status || 'future';

  button.dataset.selected = String(item.id === selectedBlockId);

  button.setAttribute('aria-label', `Inspect ${item.label}`);

  button.addEventListener('click', () => selectBlock(item.id));

  const content = createText('span', '', 'flow-node-content');

  const titleRow = createText('span', '', 'flow-node-title-row');

  titleRow.append(createText('span', item.label, 'flow-node-title'));

  content.append(titleRow);

  button.append(content);

  return button;

}

// Coordinates keep the actual branches intact even on narrow screens; the panel scrolls.
// Blocks are 200 x 56; edge paths below are computed from these positions.

const ARCHITECTURE_NODES = [

  ['driver_prompt', 'Driver Prompt', 400, 10],
  ['cleanup_group', 'Prompt Cleanup', 400, 110],
  ['router_group', 'Router', 400, 210],
  ['private_database', 'Private DB', 100, 230],
  ['session_store', 'Session Store', 700, 230],
  ['context_group', 'Context Resolution', 400, 310],
  ['local_worker', 'Local SLM', 150, 430],
  ['privacy_group', 'Privacy Layer', 650, 430],
  ['tools_group', 'Tools — Web & Maps', 400, 540],
  ['larger_worker', 'Larger Model', 650, 540],
  ['execution_group', 'Validate & Execute', 400, 660],
  ['response', 'Response', 400, 770],

];

const CANVAS_SIZE = [1000, 850];

// [from, to, path, label, labelX, labelY, optional]
const ARCHITECTURE_EDGES = [

  ['driver_prompt', 'cleanup_group', 'M500 66 V110'],
  ['cleanup_group', 'router_group', 'M500 166 V210'],
  ['private_database', 'cleanup_group', 'M200 230 V138 H400', 'Saved names', 210, 182],
  ['router_group', 'context_group', 'M500 266 V310'],
  ['private_database', 'context_group', 'M200 286 V338 H400'],
  ['session_store', 'context_group', 'M800 286 V326 H600'],
  ['context_group', 'local_worker', 'M450 366 V398 H250 V430', 'Local', 300, 392],
  ['context_group', 'privacy_group', 'M550 366 V398 H750 V430', 'Stronger model', 610, 392],
  ['privacy_group', 'larger_worker', 'M750 486 V540'],
  ['tools_group', 'local_worker', 'M400 568 H250 V486', 'Optional', 285, 560, true],
  ['tools_group', 'larger_worker', 'M600 568 H650', 'Optional', 598, 590, true],
  ['local_worker', 'execution_group', 'M150 458 H110 V688 H400'],
  ['larger_worker', 'execution_group', 'M750 596 V688 H600'],
  ['execution_group', 'response', 'M500 716 V770'],
  ['context_group', 'response', 'M600 354 H970 V798 H600', 'Clarification', 880, 740],

];

function architectureEdgeActive(from, to, byId) {
  const reached = id => !['not_reached', 'waiting', undefined].includes(byId.get(id)?.status);
  if (!reached(from) || !reached(to)) return false;
  // Clarification and pre-worker failures answer directly from context resolution.
  if (from === 'context_group' && to === 'response') return !reached('local_worker') && !reached('larger_worker');
  return true;
}

function renderArchitecture(data) {

  const items = data ? traceItems(data).built : initialItems().built;

  const byId = new Map(items.map(item => [item.id, item]));

  const canvas = document.createElement('div');

  canvas.className = 'architecture-canvas';

  const ns = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(ns, 'svg');

  svg.setAttribute('viewBox', `0 0 ${CANVAS_SIZE[0]} ${CANVAS_SIZE[1]}`);

  svg.setAttribute('aria-hidden', 'true');

  const defs = document.createElementNS(ns, 'defs');

  const marker = document.createElementNS(ns, 'marker');

  for (const [key, value] of Object.entries({id: 'architecture-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse'})) marker.setAttribute(key, value);

  const tip = document.createElementNS(ns, 'path');

  tip.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z'); tip.setAttribute('fill', 'context-stroke');

  marker.append(tip); defs.append(marker); svg.append(defs);

  for (const [from, to, d, label, x, y, optional] of ARCHITECTURE_EDGES) {

    const path = document.createElementNS(ns, 'path');

    path.setAttribute('d', d); path.setAttribute('marker-end', 'url(#architecture-arrow)');

    if (optional) { path.setAttribute('marker-start', 'url(#architecture-arrow)'); path.classList.add('edge-optional'); }

    path.classList.toggle('edge-active', architectureEdgeActive(from, to, byId));

    svg.append(path);

    if (label) {

      const text = document.createElementNS(ns, 'text'); text.setAttribute('x', x); text.setAttribute('y', y);

      text.textContent = label; svg.append(text);

    }

  }

  canvas.append(svg);

  for (const [id, label, x, y] of ARCHITECTURE_NODES) {

    const item = byId.get(id) || {id, label, status: 'not_reached', input: {}, output: {}};

    const button = addFlowNode({...item, label});

    button.style.left = `${x}px`; button.style.top = `${y}px`;

    if (['private_database', 'session_store'].includes(id)) button.classList.add('store-node');

    if (id === 'tools_group') button.classList.add('tools-node');

    canvas.append(button);

  }

  const legend = createText('p', 'Simplified view; select a block for its stages.', 'architecture-legend');

  traceRoot.replaceChildren(legend, canvas);

}

function renderFlow(data) {

  renderArchitecture(data);

}

function blockForId(id, data = currentData) {

  const items = data ? traceItems(data) : initialItems();

  return [...items.built, ...items.routes].find(item => item.id === id) || {id, label: ARCHITECTURE_NODES.find(node => node[0] === id)?.[1] || id, status: 'not_reached', input: {}, output: {}};

}

function updateInspector(item) {

  const fullBlock = {

    id: item.id,

    label: item.label,

    status: item.status || 'waiting',

    input: item.input ?? {},

    output: item.output ?? {},

    ...(Array.isArray(item.stages) ? {stages: item.stages} : {}),

  };

  inspectorSelection.textContent = `${item.label} · ${statusLabel(item.statusLabel || item.status)}`;

  renderBlockDetails(inspectorJson, fullBlock, {
    prompt: currentData?.prompt || input.value,
    result: currentData,
    loadSnapshot: async () => {
      await ensureV2Session();
      const response = await fetch('/api/v2/inspector', {headers: {'X-JLR-Session': v2Session}});
      if (!response.ok) throw new Error('Session unavailable. Reset the session and try again.');
      return response.json();
    }
  });

}

function selectBlock(id) {

  selectedBlockId = id;

  const entry = historyEntries.find(item => item.data === currentData);
  if(entry)entry.selectedBlockId = id;

  const item = blockForId(id);

  document.querySelectorAll('.flow-node').forEach(node => {

    node.dataset.selected = String(node.dataset.id === id);

  });

  updateInspector(item);

}

function renderWorkspace(data, preferredId) {

  currentData = data;

  const available = data ? traceItems(data) : initialItems();

  const ids = [...available.built, ...available.routes].map(item => item.id);

  selectedBlockId = ids.includes(preferredId) ? preferredId : ids[0];

  renderFlow(data);

  updateInspector(blockForId(selectedBlockId, data));

}

function setStatus(data) {

  if (data.error) {

    status.textContent = `Request failed: ${data.error}`;

    return;

  }

  if (data.clarification?.question) {

    status.textContent = data.clarification.question;

    return;

  }

  const message = data.answer || data.receipt?.message || data.status;

  status.textContent = /^Simulation:/i.test(message) ? message : `Simulation: ${message}`;

}

function renderHistory() {

  historyCount.textContent = `${historyEntries.length} / ${MAX_HISTORY}`;

  if (!historyEntries.length) {

    historyRoot.replaceChildren(createText('p', 'Completed prompts will appear here.', 'history-empty'));

    return;

  }

  const entries = historyEntries.map((entry, index) => {

    const button = document.createElement('button');

    button.type = 'button';

    button.className = 'history-entry';

    button.addEventListener('click', () => restoreHistory(index));

    button.append(

      createText('span', entry.prompt, 'history-entry-prompt'),

      createText('span', `${entry.next_route || entry.routing_status || 'blocked'} · ${entry.timing} ms`, 'history-entry-meta'),

    );

    return button;

  });

  historyRoot.replaceChildren(...entries);

}

function addHistory(prompt, data) {

  if(data.request_id) historyEntries = historyEntries.filter(entry => entry.data.request_id !== data.request_id);

  historyEntries.unshift({

    prompt,

    data,

    next_route: data.next_route,

    routing_status: data.routing_status || data.status,

    selectedBlockId,

    timing: data.timing_ms?.total ?? '—',

  });

  historyEntries = historyEntries.slice(0, MAX_HISTORY);

  renderHistory();

}

function restoreHistory(index) {

  if (simulationBusy || pendingTask) { status.textContent = 'Finish or cancel the active request before inspecting history.'; return; }
  viewingHistory = true;

  confirmationControls.hidden = true;

  document.querySelector('#clarification-controls').hidden = true;

  if (simulationBusy) return;

  const entry = historyEntries[index];

  if (!entry) return;

  clearTimeout(analysisTimer);

  requestSequence += 1;

  if (activeController) activeController.abort();

  input.value = entry.prompt;

  updateHeight();

  renderWorkspace(entry.data, entry.selectedBlockId || 'response');

  renderResponse(entry.data);

  setStatus(entry.data);

  input.focus();

}

function updateHeight() {

  input.style.height = 'auto';

  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;

}

async function analyze() {

  const prompt=input.value.trim();

  if(!prompt)return;

  if(pendingTask){status.textContent='Complete or cancel the pending request first.';return;}

  await submitV2('/api/v2/requests',{prompt});

}

function scheduleAnalysis() {

  input.setCustomValidity('');updateHeight();

  if(!simulationBusy && !pendingTask)status.textContent='Press Enter or Run request.';

}

input.addEventListener('input', scheduleAnalysis);

input.addEventListener('keydown', event => {

  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {

    event.preventDefault();

    clearTimeout(analysisTimer);

    analyze();

  }

});

form.addEventListener('submit', event => {

  event.preventDefault();

  clearTimeout(analysisTimer);

  if (!input.value.trim()) {

    input.setCustomValidity('Write a prompt first.');

    input.reportValidity();

    return;

  }

  analyze();

});

runSimulationButton.addEventListener('click', analyze);

resetSessionButton.addEventListener('click', resetSimulation);

document.querySelector('#confirm-action').addEventListener('click', () => confirmV2(true));

document.querySelector('#cancel-action').addEventListener('click', () => confirmV2(false));

renderWorkspace(null, 'driver_prompt');

renderResponse(null);

renderHistory();

new ResizeObserver(() => document.documentElement.style.setProperty('--prompt-space', `${form.offsetHeight + 22}px`)).observe(form);

document.querySelector('#cancel-request').addEventListener('click',cancelCurrent);

document.querySelector('#answer-clarification').addEventListener('click',async()=>{

  const answer=document.querySelector('#clarification-answer').value.trim();

  if(answer && pendingTask && !viewingHistory) await submitV2('/api/v2/requests/clarification',{request_id:pendingTask.request_id,slot_id:pendingTask.clarification.slot_id,answer});

});

recoverSession();

