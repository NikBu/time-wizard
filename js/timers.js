// ── TIMERS STATE ───────────────────────────────────
let timers = [];
let tidx = 1;
let editingTimerId = null;
let selectedAlarm = 'temple';
let customSounds = [];
let soundPreviewAudio = null;
let soundPreviewKey = null;

const MAX_MS = 24*60*60*1000;

function normalizeTimerName(name){ return (name||'').trim() || 'Untitled timer'; }
function calcTotalSeconds(h,m,s){ return (+h||0)*3600 + (+m||0)*60 + (+s||0); }
function clampTimerSeconds(sec){ return Math.max(1, Math.min(sec|0, 86399)); }
function createTimerObject({name, h=0, m=25, s=0, repeatEnabled=false, repeatMode='infinite', repeatCount=1, alarm='temple'}){
  const total = clampTimerSeconds(calcTotalSeconds(h,m,s));
  return {
    id: tidx++,
    name: normalizeTimerName(name),
    orig: total,
    rem: total,
    running: false,
    done: false,
    repeatEnabled: !!repeatEnabled,
    repeatMode,
    repeatCount: Math.max(1, repeatCount|0),
    reps: 0,
    alarm,
    editing: false,
    _lastTick: null,
  };
}

function addTimerFromInputs(){
  const name = $('#timerName').value;
  const h = $('#th').value, m = $('#tm').value, s = $('#ts').value;
  const repeatEnabled = $('#repeatToggle').checked;
  const repeatMode = repeatEnabled ? $('#repeatMode').value : 'infinite';
  const repeatCount = repeatEnabled ? (+$('#repeatCount').value||1) : 1;
  const total = calcTotalSeconds(h,m,s);
  if(total <= 0) return showToast('Set a time greater than zero.', 'error');
  pushTimer(createTimerObject({name, h, m, s, repeatEnabled, repeatMode, repeatCount, alarm:selectedAlarm}));
  $('#timerName').value=''; $('#th').value='0'; $('#tm').value='25'; $('#ts').value='0';
  $('#repeatToggle').checked=false; $('#repeatCustomArea').style.maxHeight='0px';
  showToast('Timer added!', 'success');
}
function pushTimer(o){
  timers.push(o); renderTimers(); scheduleSave();
}

function updatePresetButtons(mode){
  $$('.preset-btn').forEach(btn=>btn.classList.toggle('active', btn.dataset.preset===mode));
}
function applyTimePreset(mode){
  const presets = {
    focus:[0,25,0], short:[0,5,0], long:[0,15,0], custom:[$('#th').value||0,$('#tm').value||25,$('#ts').value||0]
  };
  const [h,m,s] = presets[mode] || presets.custom;
  $('#th').value = h; $('#tm').value = m; $('#ts').value = s;
  updatePresetButtons(mode);
}

function renderTimers(){
  const host = $('#timersList');
  if(!timers.length){ host.innerHTML = `<div class="card text-muted">No timers yet. Add one above.</div>`; return; }
  host.innerHTML = timers.map(t=>{
    const prog = 100 - Math.round((t.rem / t.orig) * 100);
    const repeatLabel = !t.repeatEnabled ? 'Once' : t.repeatMode==='infinite' ? `∞ repeats` : `${Math.max(0, t.repeatCount - t.reps)} / ${t.repeatCount} left`;
    const customSound = customSounds.find(s=>s.id===t.alarm);
    const alarmLabel = customSound ? customSound.name : ({temple:'Temple Bell', bell:'Soft Bell', chime:'Wind Chime', gong:'Deep Gong', arcade:'Arcade Ping'}[t.alarm] || 'Temple Bell');
    return `
      <div class="timer-item ${t.running?'running':''} ${t.done?'done':''}" data-id="${t.id}">
        <div class="timer-header">
          <div>
            <input class="timer-name-input" value="${escapeHtml(t.name)}" onchange="renameTimer(${t.id}, this.value)">
            <div class="base-marker-line"><span class="base-marker-dot"></span><span>${repeatLabel} • ${alarmLabel}</span></div>
          </div>
          <div class="timer-controls">
            <button class="btn btn-ghost btn-icon" onclick="toggleTimer(${t.id})" aria-label="${t.running?'Pause':'Start'}">${t.running?'<i data-lucide="pause"></i>':'<i data-lucide="play"></i>'}</button>
            <button class="btn btn-ghost btn-icon" onclick="resetTimer(${t.id})" aria-label="Reset"><i data-lucide="rotate-ccw"></i></button>
            <button class="btn btn-ghost btn-icon" onclick="toggleEditTimer(${t.id})" aria-label="Edit"><i data-lucide="sliders-horizontal"></i></button>
            <button class="btn btn-ghost btn-icon" onclick="deleteTimer(${t.id})" aria-label="Delete"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
        <div class="timer-display">${fmt(t.rem)}</div>
        <div class="timer-prog"><div class="timer-prog-bar" style="width:${prog}%"></div></div>
        <input class="time-slider" type="range" min="0" max="${t.orig}" value="${Math.max(0, t.orig - t.rem)}" oninput="scrubTimer(${t.id}, this.value)">
        ${editingTimerId===t.id ? renderTimerEditPanel(t) : ''}
      </div>`;
  }).join('');
  lucide.createIcons();
}

function renderTimerEditPanel(t){
  const h = Math.floor(t.orig/3600), m = Math.floor((t.orig%3600)/60), s = t.orig%60;
  return `
    <div class="edit-panel">
      <div class="edit-row">
        <span class="edit-label">Time</span>
        <input class="time-input-sm" id="eh_${t.id}" type="number" min="0" max="23" value="${h}">
        <input class="time-input-sm" id="em_${t.id}" type="number" min="0" max="59" value="${m}">
        <input class="time-input-sm" id="es_${t.id}" type="number" min="0" max="59" value="${s}">
      </div>
      <div class="edit-row">
        <span class="edit-label">Repeat</span>
        <label><input type="checkbox" id="er_toggle_${t.id}" ${t.repeatEnabled?'checked':''} onchange="toggleEditRepeat(${t.id})"> Enable</label>
        <select id="er_mode_${t.id}" ${t.repeatEnabled?'':'disabled'}>
          <option value="infinite" ${t.repeatMode==='infinite'?'selected':''}>Infinite</option>
          <option value="count" ${t.repeatMode==='count'?'selected':''}>Custom</option>
        </select>
        <input class="time-input-sm" id="er_count_${t.id}" type="number" min="1" max="999" value="${t.repeatCount||1}" ${t.repeatEnabled && t.repeatMode==='count' ? '' : 'disabled'}>
      </div>
      <div class="edit-row">
        <span class="edit-label">Alarm</span>
        <select id="ea_${t.id}">
          ${renderSoundOptions(t.alarm)}
        </select>
        <button class="sound-preview-btn ${soundPreviewKey===`edit-${t.id}`?'playing':''}" onclick="previewEditSound(${t.id})" title="Preview selected sound">
          <i data-lucide="${soundPreviewKey===`edit-${t.id}`?'square':'play'}"></i><span>${soundPreviewKey===`edit-${t.id}`?'Stop':'Preview'}</span>
        </button>
      </div>
      <div class="edit-row mt-2">
        <button class="btn btn-primary btn-sm" onclick="saveTimerEdit(${t.id})">Save</button>
        <button class="btn btn-secondary btn-sm" onclick="cancelTimerEdit()">Cancel</button>
      </div>
    </div>`;
}
function renderSoundOptions(selected){
  const builtins = [
    ['temple','Temple Bell'],['bell','Soft Bell'],['chime','Wind Chime'],['gong','Deep Gong'],['arcade','Arcade Ping']
  ];
  return [...builtins.map(([id,name])=>`<option value="${id}" ${selected===id?'selected':''}>${name}</option>`),
    ...customSounds.map(s=>`<option value="${s.id}" ${selected===s.id?'selected':''}>${escapeHtml(s.name)}</option>`)].join('');
}

function renameTimer(id, val){ const t=timers.find(x=>x.id===id); if(!t) return; t.name = normalizeTimerName(val); scheduleSave(); }
function deleteTimer(id){ timers=timers.filter(x=>x.id!==id); renderTimers(); scheduleSave(); }
function toggleTimer(id){ const t=timers.find(x=>x.id===id); if(!t) return; t.running=!t.running; t.done=false; t._lastTick=performance.now(); renderTimers(); scheduleSave(); }
function resetTimer(id){ const t=timers.find(x=>x.id===id); if(!t) return; t.running=false;t.done=false;t.rem=t.orig;t.reps=0; renderTimers(); scheduleSave(); }
function scrubTimer(id, elapsed){
  const t=timers.find(x=>x.id===id); if(!t) return;
  const rem = Math.max(0, t.orig - (+elapsed||0));
  t.rem = rem;
  t.done = rem===0;
  renderTimers();
}
function toggleEditTimer(id){ editingTimerId = editingTimerId===id ? null : id; renderTimers(); }
function cancelTimerEdit(){ editingTimerId = null; renderTimers(); }
function toggleEditRepeat(id){
  const on = $(`#er_toggle_${id}`).checked;
  $(`#er_mode_${id}`).disabled = !on;
  $(`#er_count_${id}`).disabled = !on || $(`#er_mode_${id}`).value !== 'count';
}
function saveTimerEdit(id){
  const t = timers.find(x=>x.id===id); if(!t) return;
  const total = calcTotalSeconds($(`#eh_${id}`).value, $(`#em_${id}`).value, $(`#es_${id}`).value);
  if(total<=0) return showToast('Timer time must be greater than zero.', 'error');
  t.orig = clampTimerSeconds(total);
  t.rem = Math.min(t.rem, t.orig);
  t.repeatEnabled = $(`#er_toggle_${id}`).checked;
  t.repeatMode = t.repeatEnabled ? $(`#er_mode_${id}`).value : 'infinite';
  t.repeatCount = t.repeatMode==='count' ? Math.max(1, +$(`#er_count_${id}`).value||1) : 1;
  t.alarm = $(`#ea_${id}`).value;
  editingTimerId = null;
  renderTimers();
  scheduleSave();
  showToast('Timer updated.', 'success');
}

function previewEditSound(id){
  const sel = $(`#ea_${id}`); if(!sel) return;
  const val = sel.value;
  const key = `edit-${id}`;
  if(soundPreviewKey===key){ stopSoundPreview(); renderTimers(); return; }
  stopSoundPreview();
  soundPreviewKey = key;
  renderTimers();
  playSoundPreview(val, ()=>{ soundPreviewKey=null; renderTimers(); });
}
function stopSoundPreview(){
  if(soundPreviewAudio){ try{ soundPreviewAudio.pause(); soundPreviewAudio.currentTime=0; }catch{} soundPreviewAudio=null; }
  soundPreviewKey = null;
}
function playSoundPreview(key, onEnd){
  const s = customSounds.find(s=>s.id===key);
  if(s){
    const a = new Audio(s.url); a.volume=.9; soundPreviewAudio=a; a.onended=()=>{ soundPreviewAudio=null; onEnd?.(); }; a.play().catch(()=>{ soundPreviewAudio=null; onEnd?.(); });
    return;
  }
  playAlarmTone(key);
  setTimeout(()=>onEnd?.(), 1200);
}

// ticker loop
let _timerLoopStarted = false;
function startTimerLoop(){
  if(_timerLoopStarted) return; _timerLoopStarted = true;
  function frame(now){
    let dirty = false;
    timers.forEach(t=>{
      if(!t.running) return;
      if(t._lastTick == null) t._lastTick = now;
      const delta = Math.floor((now - t._lastTick) / 1000);
      if(delta > 0){
        t._lastTick += delta * 1000;
        t.rem = Math.max(0, t.rem - delta);
        dirty = true;
        if(t.rem <= 0){
          if(t.repeatEnabled && (t.repeatMode==='infinite' || t.reps + 1 < t.repeatCount)){
            t.reps += 1;
            t.rem = t.orig;
            playAlarmTone(t.alarm || selectedAlarm);
          } else {
            t.running = false;
            t.done = true;
            t.rem = 0;
            playAlarmTone(t.alarm || selectedAlarm);
          }
        }
      }
    });
    if(dirty) renderTimers();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
startTimerLoop();

// public handlers used by HTML
window.addTimerFromInputs = addTimerFromInputs;
window.applyTimePreset = applyTimePreset;
window.renameTimer = renameTimer;
window.deleteTimer = deleteTimer;
window.toggleTimer = toggleTimer;
window.resetTimer = resetTimer;
window.scrubTimer = scrubTimer;
window.toggleEditTimer = toggleEditTimer;
window.cancelTimerEdit = cancelTimerEdit;
window.toggleEditRepeat = toggleEditRepeat;
window.saveTimerEdit = saveTimerEdit;
window.previewEditSound = previewEditSound;
