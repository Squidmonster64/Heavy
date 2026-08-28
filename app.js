import { STORES, getAll, getOne, putOne, putMany, deleteOne, clearStore } from './db.js';
import { seedExercises, normalise } from './exercises.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const state = {
  view: 'routines',
  routines: [],
  exercises: [],
  editingRoutine: null,
  libraryQuery: '',
  equipmentFilter: 'all',
  selectedExerciseId: null,
  openMenuId: null,
  activeWorkout: null,
  sessions: [],
  selectedRoutineId: null,
  selectedSessionId: null
};

const equipmentLabels = {
  all: 'All', bodyweight: 'Bodyweight', dumbbell: 'Dumbbell', kettlebell: 'Kettlebell',
  barbell: 'Barbell', cable: 'Cable', machine: 'Machine', band: 'Bands', other: 'Other'
};
const FAMILY_CONTROL_HREF = 'https://control.bloodydaves.com';
const compactControlLink = `<a class="family-control compact-control" href="${FAMILY_CONTROL_HREF}">Control</a>`;

start().catch(handleFatalError);

async function start() {
  await seedLibraryIfNeeded();
  await refreshData();
  state.sessions = await getAll(STORES.workoutSessions);
  await enforceSessionRetention();
  state.sessions = await getAll(STORES.workoutSessions);
  state.activeWorkout = (await getAll(STORES.activeWorkout))[0] || null;
  registerServiceWorker();
  render();
}

async function seedLibraryIfNeeded() {
  const existing = await getAll(STORES.exercises);
  if (existing.length === 0) await putMany(STORES.exercises, seedExercises);
}

async function refreshData() {
  [state.routines, state.exercises] = await Promise.all([
    getAll(STORES.routines),
    getAll(STORES.exercises)
  ]);
  state.routines.sort((a, b) => a.name.localeCompare(b.name));
  state.exercises.sort((a, b) => a.name.localeCompare(b.name));
}

function render() {
  if (state.view === 'routines') renderRoutines();
  if (state.view === 'builder') renderBuilder();
  if (state.view === 'library') renderLibrary();
  if (state.view === 'workout') renderWorkout();
  if (state.view === 'recent') renderRecentSessions();
  if (state.view === 'sessionDetail') renderSessionDetail();
  if (state.view === 'progression') renderProgression();
}

function renderRoutines() {
  const cards = state.routines.map(routine => {
    const names = routine.exerciseBlocks.map(block => exerciseName(block.exerciseId));
    const summary = names.length ? names.slice(0, 4).join(', ') + (names.length > 4 ? '…' : '') : 'No exercises';
    const recent = recentSessionsForRoutine(routine.id)[0];
    const lastVolume = recent ? formatNumber(recent.totalVolumeKg ?? calculateVolume(recent)) : null;
    const lastText = recent?.completedAt ? formatDate(recent.completedAt) : 'No sessions';
    return `
      <article class="card routine-card">
        <div class="routine-metrics">
          <strong>${lastVolume ?? '—'}</strong><span>kg</span>
          <em>${escapeHtml(lastText)}</em>
        </div>
        <h3>${escapeHtml(routine.name)}</h3>
        <p class="routine-summary">${escapeHtml(summary)}</p>
        <p class="small muted">${routine.exerciseBlocks.length} exercise${routine.exerciseBlocks.length === 1 ? '' : 's'}</p>
        <div class="card-actions">
          <button class="btn btn-primary" data-action="start-routine" data-id="${routine.id}">Start</button>
          <div class="menu-wrap">
            <button class="btn btn-icon" aria-label="Routine options" data-action="toggle-menu" data-id="${routine.id}">⋯</button>
            ${state.openMenuId === routine.id ? `
              <div class="menu">
                <button data-action="edit-routine" data-id="${routine.id}">Edit</button>
                <button data-action="duplicate-routine" data-id="${routine.id}">Duplicate</button>
                <button data-action="recent-sessions" data-id="${routine.id}">Recent sessions</button>
                <button data-action="progression" data-id="${routine.id}">Progression</button>
                <button data-action="export-routine" data-id="${routine.id}">Export</button>
                <button class="btn-danger" data-action="delete-routine" data-id="${routine.id}">Delete</button>
              </div>` : ''}
          </div>
        </div>
      </article>`;
  }).join('');

  const latest = state.sessions.filter(session => session.status === 'completed').sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))[0];
  app.innerHTML = `
    <main class="screen">
      <header class="topbar lift-topbar">
        <div class="suite-heading">
          <a class="family-control" href="${FAMILY_CONTROL_HREF}">Bloody Dave's</a>
          <h1 class="app-name">Lift Log</h1>
        </div>
        ${state.activeWorkout ? '<button class="btn btn-primary" data-action="resume-workout">Resume</button>' : ''}
      </header>
      <div class="content">
        <div class="toolbar">
          ${latest ? `<button class="btn btn-primary start-last" data-action="start-last" data-id="${latest.routineId}">Start last · ${escapeHtml(latest.routineName || 'routine')}</button>` : ''}
        </div>
        <div class="section-heading"><h2>Routines (${state.routines.length})</h2></div>
        ${cards || `
          <section class="empty">
            <h2>No routines yet</h2>
            <p class="muted">Create a routine, then log sets.</p>
            <button class="btn btn-primary" data-action="new-routine">New routine</button>
          </section>`}
        ${state.routines.length ? '<button class="btn btn-full" data-action="new-routine">＋ New routine</button>' : ''}
        <details class="more-tools">
          <summary>Library &amp; backups</summary>
          <div class="more-tools-actions">
            <button class="btn" data-action="open-library">Exercise library</button>
            <button class="btn" data-action="import-file">Import</button>
            <button class="btn" data-action="export-all">Export</button>
            <button class="btn" data-action="export-encrypted">Encrypted backup</button>
            <button class="btn" data-action="import-encrypted">Restore encrypted</button>
          </div>
        </details>
      </div>
    </main>`;
  bindActions();
}

function recentSessionsForRoutine(routineId) {
  return state.sessions
    .filter(session => session.routineId === routineId && session.status === 'completed')
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
    .slice(0, 5);
}

function renderRecentSessions() {
  const routine = state.routines.find(item => item.id === state.selectedRoutineId);
  if (!routine) { state.view = 'routines'; return render(); }
  const sessions = recentSessionsForRoutine(routine.id);
  app.innerHTML = `
    <main class="screen">
      <header class="topbar lift-topbar">
        <button class="btn btn-icon" aria-label="Back" data-action="back-routines">‹</button>
        ${compactControlLink}
        <h1 class="compact-title">Recent Sessions</h1>
      </header>
      <div class="content">
        <section class="session-routine-head">
          <h2>${escapeHtml(routine.name)}</h2>
          <p class="muted">Newest five completed sessions retained locally.</p>
        </section>
        <div class="session-list">
          ${sessions.map(session => `
            <button class="session-card" data-action="view-session" data-id="${session.id}">
              <span>
                <strong>${escapeHtml(formatDateTime(session.completedAt || session.updatedAt))}</strong>
                <em>${session.exercises?.length || 0} exercise${(session.exercises?.length || 0) === 1 ? '' : 's'} · ${session.completedSetCount ?? countCompletedSets(session)} of ${session.totalSetCount ?? countTotalSets(session)} sets</em>
              </span>
              <b>${escapeHtml(formatNumber(session.totalVolumeKg ?? calculateVolume(session)))} kg</b>
            </button>`).join('') || `
              <section class="empty">
                <h2>No completed sessions</h2>
                <p class="muted">Finish a workout to create the first retained session.</p>
              </section>`}
        </div>
      </div>
    </main>`;
  bindActions();
}

function renderProgression() {
  const routine = state.routines.find(item => item.id === state.selectedRoutineId);
  if (!routine) { state.view = 'routines'; return render(); }
  const sessions = recentSessionsForRoutine(routine.id).slice().reverse();
  const volumes = sessions.map(session => Number(session.totalVolumeKg ?? calculateVolume(session)) || 0);
  const max = Math.max(...volumes, 1);
  app.innerHTML = `
    <main class="screen">
      <header class="topbar lift-topbar"><button class="btn btn-icon" aria-label="Back" data-action="back-routines">‹</button>${compactControlLink}<h1 class="compact-title">Progression</h1></header>
      <div class="content"><section class="session-routine-head"><h2>${escapeHtml(routine.name)}</h2><p class="muted">Volume across the retained local sessions.</p></section>
      <section class="card progression-card">${sessions.length ? sessions.map((session, index) => `<div class="progress-row"><span>${escapeHtml(formatDate(session.completedAt))}</span><div class="progress-bar"><i style="width:${Math.max(4, Math.round((volumes[index] / max) * 100))}%"></i></div><strong>${escapeHtml(formatNumber(volumes[index]))} kg</strong></div>`).join('') : '<p class="muted">Complete a workout to see local progression.</p>'}</section>
      <section class="card"><h2>Repeat well</h2><p class="muted">Start last opens this routine with the most recent completed weight and rep values already filled. Adjust them before completing each set.</p></section></div>
    </main>`;
  bindActions();
}

function renderSessionDetail() {
  const session = state.sessions.find(item => item.id === state.selectedSessionId);
  if (!session) { state.view = 'recent'; return render(); }
  app.innerHTML = `
    <main class="screen">
      <header class="topbar lift-topbar">
        <button class="btn btn-icon" aria-label="Back" data-action="back-recent">‹</button>
        ${compactControlLink}
        <div class="workout-title"><h1 class="compact-title">${escapeHtml(session.routineName || 'Session')}</h1><span class="small muted">${escapeHtml(formatDateTime(session.completedAt || session.updatedAt))}</span></div>
      </header>
      <div class="workout-summary">
        <div><strong>${countCompletedSets(session)}</strong><span>Completed</span></div>
        <div><strong>${countTotalSets(session)}</strong><span>Total sets</span></div>
        <div><strong>${formatNumber(session.totalVolumeKg ?? calculateVolume(session))}</strong><span>Volume kg</span></div>
      </div>
      <div class="content workout-content">
        ${renderSessionBlocks(session)}
        <div style="height:40px"></div>
      </div>
    </main>`;
  bindActions();
}

function renderSessionBlocks(session) {
  const exercises = (session.exercises || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const seen = new Set();
  return exercises.map(exercise => {
    if (!exercise.supersetGroupId) return renderSessionExercise(exercise);
    if (seen.has(exercise.supersetGroupId)) return '';
    seen.add(exercise.supersetGroupId);
    const group = exercises.filter(item => item.supersetGroupId === exercise.supersetGroupId).sort((a, b) => (a.supersetPosition ?? 0) - (b.supersetPosition ?? 0));
    const label = group[0]?.supersetLabel || 'A';
    return `
      <section class="superset-card">
        <div class="superset-card-head"><strong>Superset ${escapeHtml(label)}</strong><span>Recorded</span></div>
        ${group.map((item, index) => renderSessionExercise(item, `${label}${index + 1}`)).join('')}
      </section>`;
  }).join('') || '<p class="muted">No exercise data recorded.</p>';
}

function renderSessionExercise(exercise, labelPrefix = '') {
  return `
    <article class="card workout-exercise ${labelPrefix ? 'inside-superset' : ''}">
      <div class="workout-exercise-head">
        <div>
          <h2>${labelPrefix ? `<span class="superset-prefix">${escapeHtml(labelPrefix)}</span>` : ''}${escapeHtml(exercise.exerciseName)}</h2>
          ${exercise.notes ? `<p>${escapeHtml(exercise.notes)}</p>` : ''}
        </div>
      </div>
      <div class="workout-set-grid workout-set-head"><div>Set</div><div>Status</div><div>kg</div><div>Reps</div><div></div></div>
      ${(exercise.sets || []).map(set => `
        <div class="workout-set-grid ${set.isCompleted ? 'completed' : ''}">
          <div class="set-number">${set.setNumber}</div>
          <div class="previous-value">${set.isCompleted ? 'Done' : 'Skipped'}</div>
          <div class="readonly-value">${escapeHtml(formatNumber(set.weightKg))}</div>
          <div class="readonly-value">${escapeHtml(set.reps)}</div>
          <div>${set.isCompleted ? '✓' : '—'}</div>
        </div>`).join('')}
    </article>`;
}


function getSupersetGroups(routine) {
  const groups = new Map();
  for (const block of routine?.exerciseBlocks || []) {
    if (!block.supersetGroupId) continue;
    if (!groups.has(block.supersetGroupId)) groups.set(block.supersetGroupId, []);
    groups.get(block.supersetGroupId).push(block);
  }
  return [...groups.entries()].map(([id, blocks]) => ({
    id,
    label: blocks[0]?.supersetLabel || supersetLabelFromIndex([...groups.keys()].indexOf(id)),
    blocks: blocks.slice().sort((a, b) => (a.supersetPosition ?? 0) - (b.supersetPosition ?? 0))
  }));
}

function supersetLabelFromIndex(index) {
  return String.fromCharCode(65 + Math.max(0, index % 26));
}

function nextSupersetLabel(routine) {
  const existing = getSupersetGroups(routine).map(group => group.label);
  let i = 0;
  while (existing.includes(supersetLabelFromIndex(i))) i += 1;
  return supersetLabelFromIndex(i);
}

function normaliseSupersets(routine) {
  const groups = getSupersetGroups(routine);
  for (const group of groups) {
    if (group.blocks.length < 2) {
      group.blocks.forEach(block => {
        delete block.supersetGroupId;
        delete block.supersetPosition;
        delete block.supersetLabel;
      });
      continue;
    }
    group.blocks.forEach((block, index) => {
      block.supersetPosition = index;
      block.supersetLabel = group.label;
    });
  }
}

function renderBuilder() {
  const routine = state.editingRoutine;
  normaliseSupersets(routine);
  const groups = getSupersetGroups(routine);
  const blocks = routine.exerciseBlocks.map((block, index) => {
    const exercise = state.exercises.find(item => item.id === block.exerciseId);
    const setSummary = block.sets.map(s => `${formatNumber(s.targetWeightKg)} kg × ${s.targetReps}`).join(' · ');
    const superset = block.supersetGroupId ? groups.find(group => group.id === block.supersetGroupId) : null;
    const supersetMeta = superset ? `Superset ${superset.label}${block.supersetPosition != null ? String.fromCharCode(49 + block.supersetPosition) : ''}` : '';
    return `
      <div class="exercise-row" draggable="true" data-block-id="${block.id}">
        <div class="drag" aria-hidden="true">≡</div>
        <div>
          <h3>${escapeHtml(exercise?.name || 'Unknown exercise')}</h3>
          <div class="exercise-meta">${escapeHtml(equipmentLabels[exercise?.equipment] || exercise?.equipment || '')}${supersetMeta ? ` · <span class="superset-pill">${escapeHtml(supersetMeta)}</span>` : ''}</div>
          <div class="exercise-meta">${block.sets.length} set${block.sets.length === 1 ? '' : 's'} · ${escapeHtml(setSummary)}</div>
          ${block.notes ? `<div class="exercise-meta">${escapeHtml(block.notes)}</div>` : ''}
        </div>
        <div class="row-actions">
          <button class="mini-btn" aria-label="Edit exercise" data-action="edit-block" data-id="${block.id}">✎</button>
          <button class="mini-btn" aria-label="Move up" data-action="move-block-up" data-id="${block.id}" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="mini-btn" aria-label="Move down" data-action="move-block-down" data-id="${block.id}" ${index === routine.exerciseBlocks.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
      </div>`;
  }).join('');

  app.innerHTML = `
    <main class="screen">
      <header class="topbar lift-topbar">
        <button class="btn btn-icon" aria-label="Back" data-action="back-routines">‹</button>
        ${compactControlLink}
        <h1 class="compact-title">${routine.persisted ? 'Edit Routine' : 'New Routine'}</h1>
        <button class="btn btn-primary" data-action="save-routine">Save</button>
      </header>
      <div class="content">
        <div class="field">
          <label for="routine-name">Routine name</label>
          <input id="routine-name" class="input" value="${escapeAttr(routine.name)}" placeholder="e.g. Legs 2" />
        </div>
        <div class="field">
          <label for="routine-tag">Tag</label>
          <select id="routine-tag" class="select">
            ${['','Gym','Home','Garage','Hotel','Travel','Rehabilitation','Other'].map(tag => `<option ${routine.tag === tag ? 'selected' : ''}>${tag}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="routine-notes">Notes</label>
          <textarea id="routine-notes" class="textarea" placeholder="Optional">${escapeHtml(routine.notes || '')}</textarea>
        </div>
        <div class="section-heading"><h2>Exercises</h2><span class="muted">${routine.exerciseBlocks.length}</span></div>
        <div class="exercise-list">${blocks || '<p class="muted">No exercises added.</p>'}</div>
        <div style="height: 90px"></div>
      </div>
      <footer class="footer-actions">
        <button class="btn" data-action="cancel-builder">Cancel</button>
        <button class="btn" data-action="create-superset">Link Superset</button>
        <button class="btn btn-primary" data-action="add-exercise">＋ Add Exercise</button>
      </footer>
    </main>`;
  bindActions();
  bindBuilderInputs();
  bindDragAndDrop();
}

function renderLibrary() {
  const query = normalise(state.libraryQuery);
  const results = state.exercises.filter(exercise => {
    if (exercise.isArchived) return false;
    if (state.equipmentFilter !== 'all' && exercise.equipment !== state.equipmentFilter) return false;
    if (!query) return true;
    const haystack = normalise([exercise.name, exercise.equipment, exercise.bodyArea, ...(exercise.aliases || [])].join(' '));
    return haystack.includes(query);
  }).slice(0, 100);

  app.innerHTML = `
    <main class="screen">
      <header class="topbar lift-topbar">
        <button class="btn btn-icon" aria-label="Back" data-action="library-back">‹</button>
        ${compactControlLink}
        <h1 class="compact-title">Exercise Library</h1>
        <button class="btn btn-link" data-action="custom-exercise">Custom</button>
      </header>
      <div class="content">
        <div class="search-wrap">
          <input id="exercise-search" class="input search" type="search" value="${escapeAttr(state.libraryQuery)}" placeholder="Search exercises" autofocus />
          <div class="chips">
            ${Object.entries(equipmentLabels).map(([value, label]) => `<button class="chip ${state.equipmentFilter === value ? 'active' : ''}" data-action="filter-equipment" data-value="${value}">${label}</button>`).join('')}
          </div>
        </div>
        <p class="small muted">${results.length} result${results.length === 1 ? '' : 's'}</p>
        <div class="library-list">
          ${results.map(exercise => `
            <button class="library-item" data-action="select-exercise" data-id="${exercise.id}">
              <strong>${escapeHtml(exercise.name)}</strong>
              <span>${escapeHtml(equipmentLabels[exercise.equipment] || exercise.equipment)} · ${escapeHtml(labelise(exercise.bodyArea))}${exercise.isCustom ? ' · Custom' : ''}</span>
            </button>`).join('') || '<p class="muted">No matching exercises.</p>'}
        </div>
      </div>
    </main>`;
  bindActions();
  const input = document.querySelector('#exercise-search');
  input?.addEventListener('input', event => {
    state.libraryQuery = event.target.value;
    renderLibrary();
    requestAnimationFrame(() => {
      const next = document.querySelector('#exercise-search');
      next?.focus();
      next?.setSelectionRange(next.value.length, next.value.length);
    });
  });
}

function bindActions() {
  app.querySelectorAll('[data-action]').forEach(element => {
    element.addEventListener('click', event => handleAction(event.currentTarget.dataset));
  });
}

async function handleAction({ action, id, value }) {
  switch (action) {
    case 'new-routine': return beginNewRoutine();
    case 'open-library': state.view = 'library'; state.editingRoutine = null; return render();
    case 'toggle-menu': state.openMenuId = state.openMenuId === id ? null : id; return render();
    case 'edit-routine': return editRoutine(id);
    case 'duplicate-routine': return duplicateRoutine(id);
    case 'delete-routine': return deleteRoutine(id);
    case 'recent-sessions': return openRecentSessions(id);
    case 'progression': state.selectedRoutineId = id; state.view = 'progression'; return render();
    case 'start-last': return startRoutine(id);
    case 'export-routine': return exportRoutines([id]);
    case 'export-all': return exportRoutines(state.routines.map(r => r.id));
    case 'export-encrypted': return exportEncryptedBackup();
    case 'import-file': return importFromFile();
    case 'import-encrypted': return importFromFile(true);
    case 'view-session': return openSessionDetail(id);
    case 'back-recent': state.view = 'recent'; return render();
    case 'start-routine': return startRoutine(id);
    case 'resume-workout': state.view = 'workout'; return render();
    case 'finish-workout': return finishWorkout();
    case 'cancel-workout': return cancelWorkout();
    case 'add-workout-set': return addWorkoutSet(id);
    case 'remove-workout-set': return removeWorkoutSet(id);
    case 'back-routines': return confirmBuilderExit();
    case 'cancel-builder': return confirmBuilderExit();
    case 'save-routine': return saveRoutine();
    case 'add-exercise': state.view = 'library'; state.libraryQuery = ''; return render();
    case 'create-superset': return openSupersetDialog();
    case 'library-back': return libraryBack();
    case 'filter-equipment': state.equipmentFilter = value; return render();
    case 'select-exercise': return selectExercise(id);
    case 'custom-exercise': return openCustomExerciseDialog();
    case 'edit-block': return openBlockDialog(id);
    case 'move-block-up': return moveBlock(id, -1);
    case 'move-block-down': return moveBlock(id, 1);
  }
}

function beginNewRoutine() {
  state.editingRoutine = {
    id: crypto.randomUUID(), name: '', tag: '', notes: '', exerciseBlocks: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), persisted: false
  };
  state.view = 'builder';
  render();
}

async function editRoutine(id) {
  const routine = await getOne(STORES.routines, id);
  state.editingRoutine = structuredClone({ ...routine, persisted: true });
  state.openMenuId = null;
  state.view = 'builder';
  render();
}

function duplicateBlocksWithNewIds(blocks) {
  const groupIdMap = new Map();
  return blocks.map((block, order) => {
    let supersetGroupId = block.supersetGroupId;
    if (supersetGroupId) {
      if (!groupIdMap.has(supersetGroupId)) groupIdMap.set(supersetGroupId, crypto.randomUUID());
      supersetGroupId = groupIdMap.get(supersetGroupId);
    }
    return {
      ...structuredClone(block), id: crypto.randomUUID(), order, supersetGroupId,
      sets: block.sets.map((set, setIndex) => ({ ...set, id: crypto.randomUUID(), setNumber: setIndex + 1 }))
    };
  });
}

async function duplicateRoutine(id) {
  const source = await getOne(STORES.routines, id);
  const now = new Date().toISOString();
  const copy = {
    ...structuredClone(source), id: crypto.randomUUID(), name: `${source.name} Copy`,
    exerciseBlocks: duplicateBlocksWithNewIds(source.exerciseBlocks),
    createdAt: now, updatedAt: now
  };
  await putOne(STORES.routines, copy);
  await refreshData();
  state.openMenuId = null;
  showToast('Routine duplicated.');
  render();
}

async function deleteRoutine(id) {
  const routine = state.routines.find(item => item.id === id);
  if (!confirm(`Delete “${routine?.name || 'this routine'}”? This will delete its retained sessions.`)) return;
  await deleteOne(STORES.routines, id);
  const sessions = await getAll(STORES.workoutSessions);
  for (const session of sessions.filter(item => item.routineId === id)) await deleteOne(STORES.workoutSessions, session.id);
  await refreshData();
  state.sessions = await getAll(STORES.workoutSessions);
  state.openMenuId = null;
  showToast('Routine deleted.');
  render();
}

function openRecentSessions(id) {
  state.selectedRoutineId = id;
  state.selectedSessionId = null;
  state.openMenuId = null;
  state.view = 'recent';
  render();
}

function openSessionDetail(id) {
  state.selectedSessionId = id;
  state.view = 'sessionDetail';
  render();
}

function bindBuilderInputs() {
  document.querySelector('#routine-name')?.addEventListener('input', e => state.editingRoutine.name = e.target.value);
  document.querySelector('#routine-tag')?.addEventListener('change', e => state.editingRoutine.tag = e.target.value);
  document.querySelector('#routine-notes')?.addEventListener('input', e => state.editingRoutine.notes = e.target.value);
}

async function saveRoutine() {
  const routine = state.editingRoutine;
  routine.name = routine.name.trim();
  if (!routine.name) return alert('Enter a routine name.');
  if (!routine.exerciseBlocks.length) return alert('Add at least one exercise.');
  routine.exerciseBlocks.forEach((block, index) => block.order = index);
  normaliseSupersets(routine);
  routine.updatedAt = new Date().toISOString();
  const record = structuredClone(routine);
  delete record.persisted;
  await putOne(STORES.routines, record);
  await refreshData();
  state.editingRoutine = null;
  state.view = 'routines';
  showToast('Routine saved.');
  render();
}

function confirmBuilderExit() {
  if (!state.editingRoutine || confirm('Discard unsaved routine changes?')) {
    state.editingRoutine = null;
    state.view = 'routines';
    render();
  }
}

function libraryBack() {
  if (state.editingRoutine) state.view = 'builder';
  else state.view = 'routines';
  render();
}

function selectExercise(id) {
  state.selectedExerciseId = id;
  openBlockDialog();
}

function openBlockDialog(blockId = null) {
  const routine = state.editingRoutine;
  if (!routine && !blockId) {
    showToast('Create or edit a routine before adding an exercise.');
    return;
  }
  const existing = blockId ? routine.exerciseBlocks.find(item => item.id === blockId) : null;
  const exerciseId = existing?.exerciseId || state.selectedExerciseId;
  const exercise = state.exercises.find(item => item.id === exerciseId);
  if (!exercise) return;
  const working = existing ? structuredClone(existing) : {
    id: crypto.randomUUID(), exerciseId, order: routine.exerciseBlocks.length, notes: '',
    sets: Array.from({ length: 3 }, (_, i) => ({ id: crypto.randomUUID(), setNumber: i + 1, targetWeightKg: 0, targetReps: 10 }))
  };

  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  backdrop.innerHTML = `
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="config-title">
      <h2 id="config-title">${escapeHtml(exercise.name)}</h2>
      <div class="field"><label for="set-count">Number of sets</label><input id="set-count" class="input" type="number" inputmode="numeric" min="1" max="20" value="${working.sets.length}" /></div>
      <div class="set-grid" id="set-grid"></div>
      <div class="field" style="margin-top:16px"><label for="exercise-notes">Exercise notes</label><textarea id="exercise-notes" class="textarea" placeholder="Optional">${escapeHtml(working.notes || '')}</textarea></div>
      ${working.supersetGroupId ? `<button class="btn btn-full" id="remove-from-superset">Remove from Superset ${escapeHtml(working.supersetLabel || '')}</button>` : ''}
      <div class="dialog-actions">
        ${existing ? '<button class="btn btn-danger" id="remove-exercise">Remove</button>' : '<button class="btn" id="cancel-config">Cancel</button>'}
        <button class="btn btn-primary" id="save-config">${existing ? 'Save changes' : 'Add exercise'}</button>
      </div>
    </section>`;
  document.body.append(backdrop);

  const drawSets = () => {
    const grid = backdrop.querySelector('#set-grid');
    grid.innerHTML = `<div class="head">Set</div><div class="head">kg</div><div class="head">Reps</div><div></div>` + working.sets.map((set, index) => `
      <div>${index + 1}</div>
      <input class="input" type="number" inputmode="decimal" min="0" max="999.9" step="0.5" data-set-weight="${index}" value="${formatNumber(set.targetWeightKg)}" />
      <input class="input" type="number" inputmode="numeric" min="0" max="999" step="1" data-set-reps="${index}" value="${set.targetReps}" />
      <button class="mini-btn" data-copy-set="${index}" aria-label="Copy this set to all">↧</button>`).join('');
    grid.querySelectorAll('[data-set-weight]').forEach(input => input.addEventListener('input', e => working.sets[Number(e.target.dataset.setWeight)].targetWeightKg = clampNumber(e.target.value, 0, 999.9)));
    grid.querySelectorAll('[data-set-reps]').forEach(input => input.addEventListener('input', e => working.sets[Number(e.target.dataset.setReps)].targetReps = Math.round(clampNumber(e.target.value, 0, 999))));
    grid.querySelectorAll('[data-copy-set]').forEach(button => button.addEventListener('click', e => {
      const source = working.sets[Number(e.currentTarget.dataset.copySet)];
      working.sets.forEach(set => { set.targetWeightKg = source.targetWeightKg; set.targetReps = source.targetReps; });
      drawSets();
    }));
  };
  drawSets();

  backdrop.querySelector('#set-count').addEventListener('change', e => {
    const count = Math.max(1, Math.min(20, Number(e.target.value) || 1));
    while (working.sets.length < count) {
      const previous = working.sets.at(-1) || { targetWeightKg: 0, targetReps: 10 };
      working.sets.push({ id: crypto.randomUUID(), setNumber: working.sets.length + 1, targetWeightKg: previous.targetWeightKg, targetReps: previous.targetReps });
    }
    working.sets = working.sets.slice(0, count).map((set, index) => ({ ...set, setNumber: index + 1 }));
    e.target.value = count;
    drawSets();
  });
  backdrop.querySelector('#exercise-notes').addEventListener('input', e => working.notes = e.target.value);
  backdrop.querySelector('#remove-from-superset')?.addEventListener('click', () => {
    delete working.supersetGroupId;
    delete working.supersetPosition;
    delete working.supersetLabel;
    showToast('Removed from superset. Save changes to keep it.');
  });
  backdrop.querySelector('#cancel-config')?.addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#remove-exercise')?.addEventListener('click', () => {
    if (confirm(`Remove ${exercise.name} from this routine?`)) {
      routine.exerciseBlocks = routine.exerciseBlocks.filter(item => item.id !== working.id);
      normaliseSupersets(routine);
      backdrop.remove(); renderBuilder();
    }
  });
  backdrop.querySelector('#save-config').addEventListener('click', () => {
    if (existing) Object.assign(existing, working);
    else routine.exerciseBlocks.push(working);
    state.selectedExerciseId = null;
    backdrop.remove();
    state.view = 'builder';
    renderBuilder();
  });
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
}

function openCustomExerciseDialog() {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  backdrop.innerHTML = `
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="custom-title">
      <h2 id="custom-title">Custom exercise</h2>
      <div class="field"><label for="custom-name">Name</label><input id="custom-name" class="input" placeholder="Exercise name" /></div>
      <div class="field"><label for="custom-equipment">Equipment</label><select id="custom-equipment" class="select">${Object.entries(equipmentLabels).filter(([v]) => v !== 'all').map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
      <div class="field"><label for="custom-area">Body area</label><select id="custom-area" class="select">${['legs','push','pull','shoulders','arms','core','full-body','mobility','rehabilitation','other'].map(v => `<option value="${v}">${labelise(v)}</option>`).join('')}</select></div>
      <div class="field"><label for="custom-aliases">Search aliases</label><input id="custom-aliases" class="input" placeholder="Comma separated" /></div>
      <div class="dialog-actions"><button class="btn" id="cancel-custom">Cancel</button><button class="btn btn-primary" id="save-custom">Save</button></div>
    </section>`;
  document.body.append(backdrop);
  backdrop.querySelector('#cancel-custom').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#save-custom').addEventListener('click', async () => {
    const name = backdrop.querySelector('#custom-name').value.trim();
    if (!name) return alert('Enter an exercise name.');
    const equipment = backdrop.querySelector('#custom-equipment').value;
    const similar = state.exercises.find(exercise => normalise(exercise.name) === normalise(name) && exercise.equipment === equipment);
    if (similar && !confirm(`A similar exercise already exists: ${similar.name}. Create another anyway?`)) return;
    const now = new Date().toISOString();
    const exercise = {
      id: crypto.randomUUID(), name, normalizedName: normalise(name), equipment,
      bodyArea: backdrop.querySelector('#custom-area').value,
      isBodyweight: equipment === 'bodyweight',
      aliases: backdrop.querySelector('#custom-aliases').value.split(',').map(v => v.trim()).filter(Boolean),
      isCustom: true, isArchived: false, createdAt: now, updatedAt: now
    };
    await putOne(STORES.exercises, exercise);
    await refreshData();
    backdrop.remove();
    showToast('Custom exercise saved.');
    renderLibrary();
  });
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
}

function moveBlock(id, delta) {
  const list = state.editingRoutine.exerciseBlocks;
  const index = list.findIndex(item => item.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  renderBuilder();
}

function bindDragAndDrop() {
  let sourceId = null;
  app.querySelectorAll('[draggable="true"]').forEach(row => {
    row.addEventListener('dragstart', e => { sourceId = e.currentTarget.dataset.blockId; e.dataTransfer.effectAllowed = 'move'; });
    row.addEventListener('dragover', e => e.preventDefault());
    row.addEventListener('drop', e => {
      e.preventDefault();
      const targetId = e.currentTarget.dataset.blockId;
      const list = state.editingRoutine.exerciseBlocks;
      const from = list.findIndex(item => item.id === sourceId);
      const to = list.findIndex(item => item.id === targetId);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      renderBuilder();
    });
  });
}


function openSupersetDialog() {
  const routine = state.editingRoutine;
  if (!routine?.exerciseBlocks?.length || routine.exerciseBlocks.length < 2) return alert('Add at least two exercises before creating a superset.');
  normaliseSupersets(routine);
  const label = nextSupersetLabel(routine);
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  backdrop.innerHTML = `
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="superset-title">
      <h2 id="superset-title">Create Superset ${escapeHtml(label)}</h2>
      <p class="muted">Select two or more exercises. They will run by round: A1 set 1, A2 set 1, then round 2.</p>
      <div class="superset-select-list">
        ${routine.exerciseBlocks.map((block, index) => `
          <label class="superset-select-row">
            <input type="checkbox" data-superset-block="${block.id}" ${block.supersetGroupId ? 'disabled' : ''} />
            <span><strong>${index + 1}. ${escapeHtml(exerciseName(block.exerciseId))}</strong>${block.supersetGroupId ? `<em>Already in Superset ${escapeHtml(block.supersetLabel || '')}</em>` : ''}</span>
          </label>`).join('')}
      </div>
      <div class="dialog-actions"><button class="btn" id="cancel-superset">Cancel</button><button class="btn btn-primary" id="save-superset">Create</button></div>
    </section>`;
  document.body.append(backdrop);
  backdrop.querySelector('#cancel-superset').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#save-superset').addEventListener('click', () => {
    const selected = [...backdrop.querySelectorAll('[data-superset-block]:checked')].map(input => input.dataset.supersetBlock);
    if (selected.length < 2) return alert('Select at least two exercises.');
    const groupId = crypto.randomUUID();
    selected.forEach((blockId, position) => {
      const block = routine.exerciseBlocks.find(item => item.id === blockId);
      if (!block) return;
      block.supersetGroupId = groupId;
      block.supersetPosition = position;
      block.supersetLabel = label;
    });
    backdrop.remove();
    showToast(`Superset ${label} created.`);
    renderBuilder();
  });
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
}

function workoutSequence(workout) {
  const exercises = (workout?.exercises || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const sequence = [];
  const seen = new Set();
  for (const exercise of exercises) {
    if (!exercise.supersetGroupId) {
      exercise.sets.forEach((set, setIndex) => sequence.push({ exercise, set, setIndex, round: setIndex }));
      continue;
    }
    if (seen.has(exercise.supersetGroupId)) continue;
    seen.add(exercise.supersetGroupId);
    const groupExercises = exercises
      .filter(item => item.supersetGroupId === exercise.supersetGroupId)
      .sort((a, b) => (a.supersetPosition ?? 0) - (b.supersetPosition ?? 0));
    const maxSets = Math.max(...groupExercises.map(item => item.sets.length));
    for (let round = 0; round < maxSets; round++) {
      for (const grouped of groupExercises) {
        const set = grouped.sets[round];
        if (set) sequence.push({ exercise: grouped, set, setIndex: round, round });
      }
    }
  }
  return sequence;
}

function nextWorkoutSetId(workout) {
  return workoutSequence(workout).find(item => !item.set.isCompleted)?.set.id || null;
}

function renderWorkoutExercise(exercise, nextSetId, labelPrefix = '') {
  return `
    <section class="workout-exercise card ${labelPrefix ? 'inside-superset' : ''}">
      <div class="workout-exercise-head"><div><h2>${labelPrefix ? `<span class="superset-prefix">${escapeHtml(labelPrefix)}</span> ` : ''}${escapeHtml(exercise.exerciseName)}</h2>${exercise.notes ? `<p>${escapeHtml(exercise.notes)}</p>` : ''}</div><button class="mini-btn" data-action="add-workout-set" data-id="${exercise.id}">＋ Set</button></div>
      <div class="workout-set-grid workout-set-head"><span>Set</span><span>Prev</span><span>kg</span><span>Reps</span><span>Log</span></div>
      ${exercise.sets.map((set, setIndex) => `
        <div class="workout-set-grid ${set.isCompleted ? 'completed' : ''} ${set.id === nextSetId ? 'next-set' : ''}" data-set-id="${set.id}">
          <span class="set-number">${setIndex + 1}</span>
          <span class="previous-value">${set.previousWeightKg == null ? '—' : `${formatNumber(set.previousWeightKg)} × ${set.previousReps}`}</span>
          <input class="workout-input" aria-label="${escapeAttr(exercise.exerciseName)} set ${setIndex + 1} kilograms" type="number" inputmode="decimal" min="0" max="999.9" step="0.5" data-workout-weight="${set.id}" value="${formatNumber(set.weightKg)}" />
          <input class="workout-input" aria-label="${escapeAttr(exercise.exerciseName)} set ${setIndex + 1} repetitions" type="number" inputmode="numeric" min="0" max="999" step="1" data-workout-reps="${set.id}" value="${set.reps}" />
          <button class="log-set-btn complete-btn ${set.isCompleted ? 'done' : ''}" aria-label="${set.isCompleted ? 'Unlog' : 'Log'} ${exercise.exerciseName} set ${setIndex + 1}" data-workout-complete="${set.id}">${set.isCompleted ? '✓' : 'Log'}</button>
          ${exercise.sets.length > 1 ? `<button class="remove-set-btn" aria-label="Remove set" data-action="remove-workout-set" data-id="${set.id}">−</button>` : ''}
        </div>`).join('')}
    </section>`;
}

function renderWorkoutBlocks(workout, nextSetId) {
  const exercises = workout.exercises.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const seen = new Set();
  return exercises.map(exercise => {
    if (!exercise.supersetGroupId) return renderWorkoutExercise(exercise, nextSetId);
    if (seen.has(exercise.supersetGroupId)) return '';
    seen.add(exercise.supersetGroupId);
    const group = exercises.filter(item => item.supersetGroupId === exercise.supersetGroupId).sort((a, b) => (a.supersetPosition ?? 0) - (b.supersetPosition ?? 0));
    const label = group[0]?.supersetLabel || 'A';
    const current = workoutSequence({ exercises: group }).find(item => !item.set.isCompleted);
    return `
      <section class="superset-card">
        <div class="superset-card-head"><strong>Superset ${escapeHtml(label)}</strong><span>${current ? `Round ${current.round + 1}` : 'Complete'}</span></div>
        ${group.map((item, index) => renderWorkoutExercise(item, nextSetId, `${label}${index + 1}`)).join('')}
      </section>`;
  }).join('');
}

async function startRoutine(routineId) {
  if (state.activeWorkout) {
    const resume = confirm('An unfinished workout exists. Press OK to resume it, or Cancel to discard it and start this routine.');
    if (resume) { state.view = 'workout'; return render(); }
    await clearStore(STORES.activeWorkout);
    state.activeWorkout = null;
  }
  const routine = await getOne(STORES.routines, routineId);
  if (!routine) return showToast('Routine not found.');
  const previous = state.sessions
    .filter(session => session.routineId === routineId && session.status === 'completed')
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))[0];
  const now = new Date().toISOString();
  const exercises = routine.exerciseBlocks.map((block, order) => {
    const exercise = state.exercises.find(item => item.id === block.exerciseId);
    const previousExercise = previous?.exercises?.find(item => item.exerciseId === block.exerciseId);
    return {
      id: crypto.randomUUID(), exerciseId: block.exerciseId,
      exerciseName: exercise?.name || 'Unknown exercise', equipment: exercise?.equipment || 'other',
      order, notes: block.notes || '', supersetGroupId: block.supersetGroupId, supersetPosition: block.supersetPosition, supersetLabel: block.supersetLabel,
      sets: block.sets.map((template, index) => {
        const prior = previousExercise?.sets?.[index];
        const weightKg = prior?.weightKg ?? template.targetWeightKg ?? 0;
        const reps = prior?.reps ?? template.targetReps ?? 0;
        return { id: crypto.randomUUID(), setNumber: index + 1, weightKg, reps, isCompleted: false,
          previousWeightKg: prior?.weightKg, previousReps: prior?.reps };
      })
    };
  });
  state.activeWorkout = {
    id: 'current', sessionId: crypto.randomUUID(), routineId, routineName: routine.name,
    status: 'active', startedAt: now, updatedAt: now, exercises
  };
  await saveActiveWorkout();
  state.view = 'workout';
  render();
}

function renderWorkout() {
  const workout = state.activeWorkout;
  if (!workout) { state.view = 'routines'; return render(); }
  const sets = workout.exercises.flatMap(exercise => exercise.sets);
  const completed = sets.filter(set => set.isCompleted).length;
  const volume = sets.filter(set => set.isCompleted).reduce((sum, set) => sum + (Number(set.weightKg) || 0) * (Number(set.reps) || 0), 0);
  app.innerHTML = `
    <main class="screen">
      <header class="topbar lift-topbar workout-topbar">
        <button class="btn btn-icon" aria-label="Back to routines" data-action="back-from-workout">‹</button>
        ${compactControlLink}
        <div class="workout-title"><h1 class="compact-title">${escapeHtml(workout.routineName)}</h1><span class="small muted">Autosaved locally</span></div>
        <button class="btn btn-primary" data-action="finish-workout">Finish</button>
      </header>
      <div class="workout-summary">
        <div><strong>${completed}</strong><span>Completed</span></div>
        <div><strong>${sets.length}</strong><span>Total sets</span></div>
        <div><strong>${formatNumber(volume)}</strong><span>Volume kg</span></div>
      </div>
      <div class="content workout-content">
        ${renderWorkoutBlocks(workout, nextWorkoutSetId(workout))}
        <button class="btn btn-danger btn-full" data-action="cancel-workout">Cancel Workout</button>
        <div style="height:40px"></div>
      </div>
    </main>`;
  bindActions();
  app.querySelector('[data-action="back-from-workout"]')?.addEventListener('click', () => { state.view = 'routines'; render(); });
  bindWorkoutInputs();
}

function bindWorkoutInputs() {
  app.querySelectorAll('[data-workout-weight]').forEach(input => input.addEventListener('input', event => {
    const set = findWorkoutSet(event.target.dataset.workoutWeight);
    if (!set) return;
    set.weightKg = clampNumber(event.target.value, 0, 999.9);
    queueActiveSave();
  }));
  app.querySelectorAll('[data-workout-reps]').forEach(input => input.addEventListener('input', event => {
    const set = findWorkoutSet(event.target.dataset.workoutReps);
    if (!set) return;
    set.reps = Math.round(clampNumber(event.target.value, 0, 999));
    queueActiveSave();
  }));
  app.querySelectorAll('[data-workout-complete]').forEach(button => button.addEventListener('click', async event => {
    const set = findWorkoutSet(event.currentTarget.dataset.workoutComplete);
    if (!set) return;
    set.isCompleted = !set.isCompleted;
    set.completedAt = set.isCompleted ? new Date().toISOString() : undefined;
    await saveActiveWorkout();
    renderWorkout();
    requestAnimationFrame(() => document.querySelector('.next-set')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }));
}

function findWorkoutSet(id) {
  for (const exercise of state.activeWorkout?.exercises || []) {
    const set = exercise.sets.find(item => item.id === id);
    if (set) return set;
  }
  return null;
}

function queueActiveSave() {
  clearTimeout(queueActiveSave.timer);
  queueActiveSave.timer = setTimeout(() => saveActiveWorkout().catch(handleFatalError), 300);
}

async function saveActiveWorkout() {
  if (!state.activeWorkout) return;
  state.activeWorkout.updatedAt = new Date().toISOString();
  await putOne(STORES.activeWorkout, structuredClone(state.activeWorkout));
}

async function addWorkoutSet(exerciseId) {
  const exercise = state.activeWorkout.exercises.find(item => item.id === exerciseId);
  if (!exercise) return;
  const previous = exercise.sets.at(-1) || { weightKg: 0, reps: 10 };
  exercise.sets.push({ id: crypto.randomUUID(), setNumber: exercise.sets.length + 1, weightKg: previous.weightKg, reps: previous.reps, isCompleted: false });
  await saveActiveWorkout();
  renderWorkout();
}

async function removeWorkoutSet(setId) {
  for (const exercise of state.activeWorkout.exercises) {
    const index = exercise.sets.findIndex(item => item.id === setId);
    if (index < 0) continue;
    if (exercise.sets[index].isCompleted && !confirm('Remove this completed set?')) return;
    exercise.sets.splice(index, 1);
    exercise.sets.forEach((set, i) => set.setNumber = i + 1);
    await saveActiveWorkout();
    return renderWorkout();
  }
}

async function finishWorkout() {
  const workout = state.activeWorkout;
  if (!workout) return;
  const sets = workout.exercises.flatMap(exercise => exercise.sets);
  const incomplete = sets.filter(set => !set.isCompleted).length;
  if (incomplete && !confirm(`${incomplete} set${incomplete === 1 ? ' is' : 's are'} incomplete. Finish anyway?`)) return;
  const completedAt = new Date().toISOString();
  const record = { ...structuredClone(workout), id: workout.sessionId, status: 'completed', completedAt,
    completedSetCount: sets.filter(set => set.isCompleted).length,
    totalSetCount: sets.length,
    totalVolumeKg: sets.filter(set => set.isCompleted).reduce((sum, set) => sum + set.weightKg * set.reps, 0) };
  delete record.sessionId;
  await putOne(STORES.workoutSessions, record);
  const sessions = (await getAll(STORES.workoutSessions)).filter(item => item.routineId === workout.routineId).sort((a,b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  for (const old of sessions.slice(5)) await deleteOne(STORES.workoutSessions, old.id);
  await clearStore(STORES.activeWorkout);
  state.sessions = await getAll(STORES.workoutSessions);
  state.activeWorkout = null;
  state.view = 'routines';
  showToast('Workout saved.');
  render();
}

async function cancelWorkout() {
  if (!confirm('Cancel this workout? The recorded data will be discarded.')) return;
  await clearStore(STORES.activeWorkout);
  state.activeWorkout = null;
  state.view = 'routines';
  showToast('Workout cancelled.');
  render();
}



function bytesToBase64(bytes) { return btoa(String.fromCharCode(...bytes)); }
function base64ToBytes(value) { return Uint8Array.from(atob(value), character => character.charCodeAt(0)); }

async function backupKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

function makeBackupEnvelope(includeHistory = true) {
  const referencedExerciseIds = new Set();
  state.routines.forEach(routine => routine.exerciseBlocks.forEach(block => referencedExerciseIds.add(block.exerciseId)));
  const exercises = state.exercises.filter(exercise => referencedExerciseIds.has(exercise.id) || exercise.isCustom).map(exercise => ({ ...structuredClone(exercise) }));
  return { format: 'workout-pwa-export', schemaVersion: 1, appVersion: 'bloody-daves-lift-log', exportedAt: new Date().toISOString(), includesRecentHistory: includeHistory, exercises, routines: state.routines.map(routine => structuredClone(routine)), sessions: includeHistory ? state.sessions.filter(session => session.status === 'completed').map(session => structuredClone(session)) : [] };
}

async function exportEncryptedBackup() {
  if (!crypto.subtle) return alert('This browser does not provide the cryptography needed for an encrypted backup.');
  const password = prompt('Create a backup password. It is not stored anywhere; losing it means the backup cannot be restored.');
  if (!password) return;
  const verify = prompt('Confirm the backup password.');
  if (password !== verify) return alert('Passwords did not match. No backup was created.');
  const includeHistory = confirm('Include retained local session history in this encrypted backup?');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await backupKey(password, salt);
  const payload = new TextEncoder().encode(JSON.stringify(makeBackupEnvelope(includeHistory)));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload));
  const encrypted = { format: 'bloody-daves/encrypted-lift-log-backup/v1', createdAt: new Date().toISOString(), kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 210000, salt: bytesToBase64(salt) }, cipher: { name: 'AES-GCM', iv: bytesToBase64(iv), data: bytesToBase64(ciphertext) } };
  const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `bloody-daves-lift-log-encrypted-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Encrypted backup exported. Keep the password separately.');
}

async function decryptBackup(envelope) {
  if (envelope?.format !== 'bloody-daves/encrypted-lift-log-backup/v1') throw new Error('This is not an encrypted Lift Log backup.');
  const password = prompt('Enter the password for this encrypted backup.');
  if (!password) throw new Error('Restore cancelled.');
  try {
    const key = await backupKey(password, base64ToBytes(envelope.kdf.salt));
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(envelope.cipher.iv) }, key, base64ToBytes(envelope.cipher.data));
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch { throw new Error('The password is incorrect or this backup is damaged.'); }
}

async function exportRoutines(routineIds) {
  const selected = state.routines.filter(routine => routineIds.includes(routine.id));
  if (!selected.length) return alert('No routines selected for export.');
  const includeHistory = confirm('Include the retained five-session history for selected routines?\n\nCancel exports routines only.');
  const referencedExerciseIds = new Set();
  selected.forEach(routine => routine.exerciseBlocks.forEach(block => referencedExerciseIds.add(block.exerciseId)));
  const exercises = state.exercises
    .filter(exercise => referencedExerciseIds.has(exercise.id) || exercise.isCustom)
    .map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      normalizedName: exercise.normalizedName || normalise(exercise.name),
      equipment: exercise.equipment,
      bodyArea: exercise.bodyArea,
      isBodyweight: !!exercise.isBodyweight,
      aliases: exercise.aliases || [],
      isCustom: !!exercise.isCustom,
      isArchived: !!exercise.isArchived,
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt
    }));
  const routineIdSet = new Set(selected.map(routine => routine.id));
  const sessions = includeHistory
    ? state.sessions
        .filter(session => routineIdSet.has(session.routineId) && session.status === 'completed')
        .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
        .reduce((acc, session) => {
          const count = acc.filter(item => item.routineId === session.routineId).length;
          if (count < 5) acc.push(session);
          return acc;
        }, [])
    : [];
  const envelope = {
    format: 'workout-pwa-export',
    schemaVersion: 1,
    appVersion: 'phase-5',
    exportedAt: new Date().toISOString(),
    includesRecentHistory: includeHistory,
    exercises,
    routines: selected.map(routine => structuredClone(routine)),
    sessions: sessions.map(session => structuredClone(session))
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = selected.length === 1
    ? `workout-${slugify(selected[0].name)}-${date}.json`
    : `workout-routines-${date}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  state.openMenuId = null;
  showToast(includeHistory ? 'Routines and retained history exported.' : 'Routines exported.');
  render();
}

function importFromFile(encryptedOnly = false) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let envelope = JSON.parse(text);
      if (encryptedOnly || envelope?.format === 'bloody-daves/encrypted-lift-log-backup/v1') envelope = await decryptBackup(envelope);
      await importEnvelope(envelope);
    } catch (error) {
      alert(`Import failed: ${error?.message || 'Invalid file.'}`);
    }
  });
  input.click();
}

async function importEnvelope(envelope) {
  validateImportEnvelope(envelope);
  const now = new Date().toISOString();
  const exerciseIdMap = new Map();
  for (const incoming of envelope.exercises || []) {
    const existing = state.exercises.find(exercise =>
      exercise.id === incoming.id ||
      (normalise(exercise.name) === normalise(incoming.name) && exercise.equipment === incoming.equipment)
    );
    if (existing) {
      exerciseIdMap.set(incoming.id, existing.id);
      continue;
    }
    const imported = {
      id: incoming.id || crypto.randomUUID(),
      name: incoming.name,
      normalizedName: incoming.normalizedName || normalise(incoming.name),
      equipment: incoming.equipment || 'other',
      bodyArea: incoming.bodyArea || 'other',
      isBodyweight: !!incoming.isBodyweight || incoming.equipment === 'bodyweight',
      aliases: Array.isArray(incoming.aliases) ? incoming.aliases : [],
      isCustom: true,
      isArchived: false,
      createdAt: incoming.createdAt || now,
      updatedAt: now
    };
    exerciseIdMap.set(incoming.id, imported.id);
    await putOne(STORES.exercises, imported);
  }

  const importedRoutineIds = new Map();
  for (const source of envelope.routines) {
    const existing = state.routines.find(routine => normalise(routine.name) === normalise(source.name));
    let targetId = source.id || crypto.randomUUID();
    let targetName = source.name;
    if (existing) {
      const choice = prompt(`Routine “${source.name}” already exists. Type replace, keep, or cancel.`, 'keep');
      if (choice === null || normalise(choice) === 'cancel') continue;
      if (normalise(choice) === 'replace') targetId = existing.id;
      else targetName = uniqueRoutineName(source.name);
    }
    const routine = {
      id: targetId,
      name: targetName,
      tag: source.tag || '',
      notes: source.notes || '',
      exerciseBlocks: (source.exerciseBlocks || []).map((block, index) => ({
        ...structuredClone(block),
        id: block.id || crypto.randomUUID(),
        exerciseId: exerciseIdMap.get(block.exerciseId) || block.exerciseId,
        order: index,
        sets: (block.sets || []).map((set, setIndex) => ({
          id: set.id || crypto.randomUUID(),
          setNumber: setIndex + 1,
          targetWeightKg: clampNumber(set.targetWeightKg ?? 0, 0, 999.9),
          targetReps: Math.round(clampNumber(set.targetReps ?? 0, 0, 999))
        }))
      })),
      createdAt: source.createdAt || now,
      updatedAt: now
    };
    normaliseSupersets(routine);
    await putOne(STORES.routines, routine);
    importedRoutineIds.set(source.id, routine.id);
  }

  if (envelope.includesRecentHistory && Array.isArray(envelope.sessions)) {
    const byRoutine = new Map();
    for (const session of envelope.sessions.filter(s => s?.status === 'completed')) {
      const mappedRoutineId = importedRoutineIds.get(session.routineId);
      if (!mappedRoutineId) continue;
      if (!byRoutine.has(mappedRoutineId)) byRoutine.set(mappedRoutineId, []);
      byRoutine.get(mappedRoutineId).push(session);
    }
    for (const [routineId, sessions] of byRoutine.entries()) {
      sessions.sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
      for (const session of sessions.slice(0, 5)) {
        const copy = structuredClone(session);
        copy.id = crypto.randomUUID();
        copy.routineId = routineId;
        copy.exercises = (copy.exercises || []).map(exercise => ({
          ...exercise,
          exerciseId: exerciseIdMap.get(exercise.exerciseId) || exercise.exerciseId
        }));
        await putOne(STORES.workoutSessions, copy);
      }
    }
  }

  await refreshData();
  state.sessions = await getAll(STORES.workoutSessions);
  await enforceSessionRetention();
  state.sessions = await getAll(STORES.workoutSessions);
  state.view = 'routines';
  showToast('Import complete.');
  render();
}

function validateImportEnvelope(envelope) {
  if (!envelope || envelope.format !== 'workout-pwa-export') throw new Error('Unsupported export format.');
  if (envelope.schemaVersion !== 1) throw new Error('Unsupported schema version.');
  if (!Array.isArray(envelope.routines)) throw new Error('No routines found.');
  for (const routine of envelope.routines) {
    if (!routine?.name || !Array.isArray(routine.exerciseBlocks)) throw new Error('A routine is missing its name or exercise list.');
    for (const block of routine.exerciseBlocks) {
      if (!block.exerciseId) throw new Error(`Routine “${routine.name}” contains an exercise without an ID.`);
      if (!Array.isArray(block.sets) || block.sets.length === 0) throw new Error(`Routine “${routine.name}” contains an exercise with no sets.`);
      for (const set of block.sets) {
        if (Number(set.targetWeightKg) < 0 || Number(set.targetReps) < 0) throw new Error(`Routine “${routine.name}” contains invalid set values.`);
      }
    }
  }
}

function uniqueRoutineName(baseName) {
  const names = new Set(state.routines.map(routine => normalise(routine.name)));
  let index = 2;
  let candidate = `${baseName} Copy`;
  while (names.has(normalise(candidate))) {
    candidate = `${baseName} Copy ${index}`;
    index += 1;
  }
  return candidate;
}

function slugify(value) {
  return normalise(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'routine';
}

async function enforceSessionRetention() {
  const all = await getAll(STORES.workoutSessions);
  const byRoutine = new Map();
  for (const session of all.filter(item => item.status === 'completed')) {
    if (!byRoutine.has(session.routineId)) byRoutine.set(session.routineId, []);
    byRoutine.get(session.routineId).push(session);
  }
  for (const sessions of byRoutine.values()) {
    sessions.sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
    for (const old of sessions.slice(5)) await deleteOne(STORES.workoutSessions, old.id);
  }
}

function countCompletedSets(session) {
  return (session.exercises || []).flatMap(exercise => exercise.sets || []).filter(set => set.isCompleted).length;
}

function countTotalSets(session) {
  return (session.exercises || []).flatMap(exercise => exercise.sets || []).length;
}

function calculateVolume(session) {
  return (session.exercises || [])
    .flatMap(exercise => exercise.sets || [])
    .filter(set => set.isCompleted)
    .reduce((sum, set) => sum + (Number(set.weightKg) || 0) * (Number(set.reps) || 0), 0);
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function exerciseName(id) { return state.exercises.find(item => item.id === id)?.name || 'Unknown exercise'; }
function labelise(value) { return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function clampNumber(value, min, max) { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; }
function formatNumber(value) { return Number(value || 0).toLocaleString('en-AU', { maximumFractionDigits: 2 }); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char])); }
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function handleFatalError(error) {
  console.error(error);
  app.innerHTML = `<main class="screen"><div class="content"><h1>Unable to open Workout</h1><p>${escapeHtml(error?.message || 'Unknown error')}</p><button class="btn" onclick="location.reload()">Retry</button></div></main>`;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
}
