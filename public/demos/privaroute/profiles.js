/* Driver profile switcher (top right): guest by default, password to switch, create, edit private data. */
const profileButton = document.querySelector('#profile-button');
const profilePanel = document.querySelector('#profile-panel');
const profileSelect = document.querySelector('#profile-select');
const profilePassword = document.querySelector('#profile-password');
const profileError = document.querySelector('#profile-error');
const profileEditor = document.querySelector('#profile-editor');
let currentProfile = {id: 'guest', name: 'Guest', protected: false};

const PREFERENCE_NAMES = {usual_playlist: 'Usual music', usual_drink: 'Usual drink'};

async function profileCall(path, body) {
  await ensureV2Session();
  const response = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-JLR-Session': v2Session}, body: JSON.stringify(body || {})});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showProfile(profile) {
  currentProfile = profile || currentProfile;
  profileButton.textContent = `${currentProfile.name} ▾`;
  profileButton.title = currentProfile.protected ? 'Signed in · private data encrypted' : 'Guest · no private data';
  document.querySelector('#profile-edit-open').hidden = !currentProfile.protected;
}

async function loadProfiles() {
  const response = await fetch('/api/v2/profiles');
  const data = await response.json();
  document.querySelector('#profile-switcher').hidden = !data.enabled;
  document.querySelector('#new-password-label').textContent = `Password (${data.min_password || 8}+ characters)`;
  profileSelect.replaceChildren(...data.profiles.map(p => {
    const option = document.createElement('option');
    option.value = p.id; option.textContent = p.name; option.selected = p.id === currentProfile.id;
    return option;
  }));
  profilePassword.closest('label').hidden = profileSelect.value === 'guest';
}

async function afterSwitch(data) {
  profilePassword.value = ''; profileError.textContent = '';
  showProfile(data.profile);
  profilePanel.hidden = true; profileEditor.hidden = true;
  // The previous driver's conversation is gone on the server; clear it here too.
  await resetSimulation();
  status.textContent = `Signed in as ${data.profile.name}.`;
}

async function switchProfile() {
  profileError.textContent = '';
  try {
    const id = profileSelect.value;
    await afterSwitch(id === 'guest' ? await profileCall('/api/v2/profile/guest') : await profileCall('/api/v2/profile/login', {profile_id: id, password: profilePassword.value}));
  } catch (error) { profileError.textContent = error.message; }
}

async function createProfile() {
  profileError.textContent = '';
  try {
    const name = document.querySelector('#new-profile-name');
    const password = document.querySelector('#new-profile-password');
    const data = await profileCall('/api/v2/profiles/create', {name: name.value, password: password.value});
    name.value = ''; password.value = '';
    await afterSwitch(data); await loadProfiles();
  } catch (error) { profileError.textContent = error.message; }
}

function editorRow(text, onRemove) {
  const row = document.createElement('li');
  const label = document.createElement('span'); label.textContent = text;
  const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove';
  remove.addEventListener('click', onRemove);
  row.append(label, remove);
  return row;
}

async function renderEditor() {
  const error = document.querySelector('#editor-error');
  error.textContent = '';
  await ensureV2Session();
  const response = await fetch('/api/v2/inspector', {headers: {'X-JLR-Session': v2Session}});
  const data = await response.json();
  if (!response.ok) { error.textContent = data.error; return; }
  const db = data.database || {};
  const remove = (kind, key) => async () => {
    try { await profileCall('/api/v2/profile/data', {op: 'remove', kind, key}); await renderEditor(); }
    catch (e) { error.textContent = e.message; }
  };
  document.querySelector('#editor-contacts').replaceChildren(...(db.contacts || []).map(c => editorRow(`“${c.alias}” → ${c.label}${c.email ? ` (${c.email})` : ''}`, remove('contact', c.alias))));
  document.querySelector('#editor-places').replaceChildren(...(db.places || []).map(p => editorRow(`“${p.alias}” → ${p.label}${p.latitude != null ? ` · ${p.latitude}, ${p.longitude}` : ' · no coordinates'}`, remove('place', p.alias))));
  document.querySelector('#editor-preferences').replaceChildren(...(db.preferences || []).map(p => editorRow(`${PREFERENCE_NAMES[p.key] || p.key} → ${p.value}`, remove('preference', p.key))));
}

async function saveEntry(kind, form) {
  const error = document.querySelector('#editor-error');
  error.textContent = '';
  const record = Object.fromEntries(new FormData(form).entries());
  try { await profileCall('/api/v2/profile/data', {op: 'put', kind, record}); form.reset(); await renderEditor(); }
  catch (e) { error.textContent = e.message; }
}

profileButton.addEventListener('click', async () => {
  profilePanel.hidden = !profilePanel.hidden;
  if (!profilePanel.hidden) { profileError.textContent = ''; await loadProfiles(); }
});
profileSelect.addEventListener('change', () => { profilePassword.closest('label').hidden = profileSelect.value === 'guest'; profileError.textContent = ''; });
profilePassword.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); switchProfile(); } });
document.querySelector('#profile-switch').addEventListener('click', switchProfile);
document.querySelector('#profile-create').addEventListener('click', createProfile);
document.querySelector('#profile-edit-open').addEventListener('click', async () => { profilePanel.hidden = true; profileEditor.hidden = false; await renderEditor(); });
document.querySelector('#editor-close').addEventListener('click', () => { profileEditor.hidden = true; });
for (const [kind, id] of [['contact', '#add-contact'], ['place', '#add-place'], ['preference', '#add-preference']]) {
  const form = document.querySelector(id);
  form.addEventListener('submit', event => { event.preventDefault(); saveEntry(kind, form); });
}

(async () => {
  try {
    await loadProfiles();
    if (sessionStorage.getItem('jlr-v2-session')) {
      const response = await fetch('/api/v2/session', {headers: {'X-JLR-Session': sessionStorage.getItem('jlr-v2-session')}});
      if (response.ok) showProfile((await response.json()).profile);
    }
  } catch (error) { /* profiles are optional; the workspace still works as guest */ }
  showProfile();
})();
