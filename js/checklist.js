// ── CHECKLISTS ────────────────────────────────────
let lists=[], lidx=1, tidxc=1, activeList=null, totalPts=0;


// ── IMPORT / EXPORT ─────────────────────────────────
function buildExportPayload(){
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    timers: timers.map(t => ({
      name: t.name,
      dur: t.dur,
      left: t.left,
      sound: t.sound,
      running: false,
      done: t.done,
      repeatType: t.repeatType,
      repeatDays: t.repeatDays || [],
      repeatCfg: t.repeatCfg || null,
      orig: t.orig ?? t.dur
    })),
    lists: lists.map(l => ({
      name: l.name,
      icon: l.icon,
      tasks: l.tasks.map(task => ({
        text: task.text,
        pts: task.pts,
        done: task.done,
        pid: task.pid,
        note: task.note || ''
      }))
    })),
    totalPts,
    arch: { enabled: arch.enabled, xp: arch.xp, mood: arch.mood, focus: arch.focus, energy: arch.energy, mode: arch.mode },
    theme: activeTheme,
    music: {
      alarmVol: Math.round((_alarmVol ?? 0.8) * 100),
      musicVol: Math.round((_musicVol ?? 0.6) * 100),
      ambient: currentAmbient || null,
      customMusicName: _customMusic?.name || null,
      customSoundNames: _customSounds.map(s => s.name)
    }
  };
}

function exportData(){
  try{
    const payload = buildExportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = url;
    a.download = `timewizard-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
    showToast('Backup exported');
    archNotify('export');
  } catch(e){
    console.error(e);
    showToast('Export failed', 'error');
  }
}

function handleImport(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      askConfirm('Importing will merge/replace your current in-memory workspace. Continue?', 'Import Backup', 'Import', ok => {
        if(!ok) return;
        applyImportedState(data);
      });
    } catch(e){
      console.error(e);
      showToast('Invalid backup file', 'error');
    } finally {
      input.value = '';
    }
  };
  reader.readAsText(file);
}

function applyImportedState(data){
  try{
    if(!data || typeof data !== 'object') throw new Error('Bad data');

    // timers
    timers = [];
    tidx = 1;
    (data.timers || []).forEach(t => {
      timers.push({
        id: tidx++,
        name: t.name || 'Timer',
        dur: Number(t.dur) || 0,
        left: Math.max(0, Number(t.left) || Number(t.dur) || 0),
        sound: t.sound || 'bell',
        running: false,
        done: !!t.done,
        repeatType: t.repeatType || 'none',
        repeatDays: Array.isArray(t.repeatDays) ? t.repeatDays : [],
        repeatCfg: t.repeatCfg || null,
        orig: Number(t.orig) || Number(t.dur) || 0
      });
    });

    // lists/tasks
    lists = [];
    lidx = 1;
    tidxc = 1;
    (data.lists || []).forEach(l => {
      const newList = { id: lidx++, name: l.name || 'List', icon: l.icon || '📋', tasks: [] };
      const tempTasks = [];
      (l.tasks || []).forEach(task => {
        tempTasks.push({
          oldPid: task.pid,
          task: {
            id: tidxc++,
            text: task.text || 'Task',
            pts: Number(task.pts) || 0,
            done: !!task.done,
            pid: null,
            note: task.note || ''
          }
        });
      });
      // Map parent-child by relative order among imported tasks with same array indexes
      tempTasks.forEach((entry, idx) => {
        if(entry.oldPid == null) return;
        const parentIdx = (l.tasks || []).findIndex(x => x && x.id === entry.oldPid);
        if(parentIdx >= 0 && tempTasks[parentIdx]) entry.task.pid = tempTasks[parentIdx].task.id;
      });
      newList.tasks = tempTasks.map(x => x.task);
      lists.push(newList);
    });
    activeList = lists[0] || null;

    totalPts = Number(data.totalPts) || 0;
    const gp=document.getElementById('globalPts'); if(gp) gp.textContent = totalPts;
    const hp=document.getElementById('headerPoints'); if(hp) hp.textContent = `✶ ${totalPts} pts`;

    if(data.arch){
      arch.enabled = data.arch.enabled !== false;
      arch.xp = Number(data.arch.xp) || 0;
      arch.mood = Number(data.arch.mood) || 70;
      arch.focus = Number(data.arch.focus) || 50;
      arch.energy = Number(data.arch.energy) || 80;
      arch.mode = data.arch.mode || 'idle';
      const cb=document.getElementById('archEnabled'); if(cb) cb.checked = arch.enabled;
    }

    if(data.theme){
      activeTheme = data.theme;
      applyThemeVars();
    }

    if(data.music){
      if(typeof data.music.alarmVol === 'number') setAlarmVol(data.music.alarmVol);
      if(typeof data.music.musicVol === 'number') setMusicVol(data.music.musicVol);
    }

    renderTimers();
    renderLists();
    renderTasks();
    updateStats();
    renderThemes();
    renderFAQ();
    archUpdateUI();
    updateMusicWidget();
    lucide.createIcons();

    showToast('Backup imported');
    archNotify('import');
  } catch(e){
    console.error(e);
    showToast('Import failed', 'error');
  }
}

// Optional convenience hotkeys
window.addEventListener('keydown', e => {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if(!mod) return;
  if(e.key.toLowerCase() === 's'){
    e.preventDefault();
    exportData();
  }
});

// ── SIMPLE LOCAL SESSION SAVE ───────────────────────
const AUTOSAVE_KEY = 'timewizard-session-v1';
function buildSessionPayload(){ return buildExportPayload(); }
function saveSession(){
  try{ localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(buildSessionPayload())); }
  catch(e){ /* ignore quota/private mode */ }
}
function loadSession(){
  try{
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    applyImportedState(data);
    showToast('Session restored');
  } catch(e){ console.warn('Session restore failed', e); }
}
function clearSession(){ try{ localStorage.removeItem(AUTOSAVE_KEY); }catch(e){} }

// Autosave on common state-changing events
setInterval(saveSession, 10000);
window.addEventListener('beforeunload', saveSession);

function openNewListModal(){ document.getElementById('newListModal').classList.remove('hidden'); document.getElementById('newListName').focus(); }
function closeModal(id){ document.getElementById('id').classList.add('hidden'); }
function createList(){
  const name=document.getElementById('newListName').value.trim(); if(!name) return;
  const icon=document.getElementById('newListIcon').value;
  lists.push({id:lidx++,name,icon,tasks:[]});
  document.getElementById('newListName').value='';
  closeModal('newListModal');
  renderLists();
  selectList(lists[lists.length-1].id);
  showToast('List created');
}
function selectList(id){ activeList=lists.find(l=>l.id===id)||null; renderLists(); renderTasks(); updateStats(); }
function renderLists(){
  const wrap=document.getElementById('listsSidebar');
  wrap.innerHTML=lists.map(l=>{
    const total=l.tasks.filter(t=>!t.pid).length, done=l.tasks.filter(t=>!t.pid&&t.done).length;
    return `<button class="list-item-btn${activeList&&activeList.id===l.id?' active':''}" onclick="selectList(${l.id})">
      <span>${l.icon} ${escHtml(l.name)}</span><span class="list-count">${done}/${total}</span>
    </button>`;
  }).join('');
}
function addTask(){
  if(!activeList) return showToast('Create or select a list first','error');
  const txt=document.getElementById('newTaskText').value.trim(); if(!txt) return;
  const pts=parseInt(document.getElementById('newTaskPts').value)||0;
  activeList.tasks.push({id:tidxc++,text:txt,pts,done:false,pid:null,note:''});
  document.getElementById('newTaskText').value='';
  document.getElementById('newTaskPts').value='5';
  renderTasks(); updateStats(); archNotify('task_add');
}
function addSubTask(pid){
  const txt=prompt('Sub-task name?'); if(!txt) return;
  activeList.tasks.push({id:tidxc++,text:txt.trim(),pts:2,done:false,pid,note:''});
  renderTasks(); updateStats();
}
function deleteTask(id){
  activeList.tasks = activeList.tasks.filter(t=>t.id!==id && t.pid!==id);
  renderTasks(); updateStats();
}
function toggleTask(id){
  const t=activeList.tasks.find(x=>x.id===id); if(!t) return;
  t.done=!t.done;
  if(t.done){ totalPts += t.pts||0; refreshHeaderPoints(); archNotify('task_done'); }
  renderTasks(); updateStats();
}
function saveNote(id,val){ const t=activeList.tasks.find(x=>x.id===id); if(t){ t.note=val.trim(); renderTasks(); } }
function toggleNote(id){ const el=document.getElementById('tnoteInput_'+id); if(el) el.classList.toggle('visible'); }
function startTaskEdit(id){
  const t=activeList.tasks.find(x=>x.id===id); if(!t) return;
  const next=prompt('Edit task', t.text); if(next && next.trim()){ t.text=next.trim(); renderTasks(); }
}
function toggleExpand(id,kind){
  const el=document.getElementById((kind==='note'?'tnote_':'ttx_')+id);
  const btn=document.getElementById((kind==='note'?'nexp_':'texp_')+id);
  if(!el||!btn) return;
  el.classList.toggle('expanded');
  btn.textContent = el.classList.contains('expanded') ? 'Show less' : 'Show more';
}
function renderTasks(){
  const main=document.getElementById('checklistMain');
  if(!activeList){
    main.innerHTML=`<div style="text-align:center;padding:var(--space-12);color:var(--color-text-faint);font-size:var(--text-sm);"><i data-lucide="list" style="width:36px;height:36px;margin:0 auto var(--space-3);opacity:.3;"></i><p>Select or create a list.</p></div>`;
    lucide.createIcons();
    return;
  }
  const roots=activeList.tasks.filter(t=>!t.pid);
  main.innerHTML=`
    <div class="checklist-header">
      <div>
        <div class="checklist-title" id="checklistTitle">${activeList.icon} ${escHtml(activeList.name)}</div>
        <div class="checklist-stats" id="checklistStats"></div>
      </div>
      <span class="badge gold">⭐ <span id="globalPts">${totalPts}</span></span>
    </div>
    <div class="checklist-progress-bar"><div class="checklist-progress-fill" id="checklistProgressFill"></div></div>
    <ul class="task-tree" id="tasksListInner">${roots.map(buildTaskHTML).join('')}</ul>
    <div class="add-task-row">
      <input type="text" id="newTaskText" placeholder="Add a task...">
      <input type="number" id="newTaskPts" class="points-input" value="5" min="0">
      <button class="btn btn-primary" onclick="addTask()"><i data-lucide="plus" style="width:13px;height:13px;"></i> Add</button>
    </div>`;
  updateStats();
  lucide.createIcons();
}
function buildTaskHTML(t){
  const kids=activeList.tasks.filter(x=>x.pid===t.id);
  const longText=(t.text||'').length>120;
  const longNote=(t.note||'').length>120;
  return `
    <li class="task-item${t.done?' done':''}${t.pid?' sub':''}">
      <button class="task-check" onclick="toggleTask(${t.id})">${t.done?'<i data-lucide="check" style="width:12px;height:12px;"></i>':''}</button>
      <div class="task-body">
        <div>
          <span class="task-text" id="ttx_${t.id}">${escHtml(t.text)}</span>
          ${t.pts?`<span class="task-points">+${t.pts}</span>`:''}
        </div>
        ${(t.text||'').length>120?`<button class="task-expand-btn visible" id="texp_${t.id}" onclick="toggleExpand(${t.id},'text')">Show more</button>`:''}
        ${t.note?`<div class="task-note" id="tnote_${t.id}">${escHtml(t.note)}</div>`:''}
        ${t.note&&longNote?`<button class="task-expand-btn visible" id="nexp_${t.id}" onclick="toggleExpand(${t.id},'note')">Show more</button>`:''}
        <textarea class="task-note-input" id="tnoteInput_${t.id}" placeholder="Write note..." onblur="saveNote(${t.id}, this.value)">${escHtml(t.note||'')}</textarea>
        ${kids.length?`<ul class="task-tree" style="margin-top:var(--space-2);">${kids.map(buildTaskHTML).join('')}</ul>`:''}
      </div>
      <div class="task-actions">
        ${!t.pid?`<button class="btn btn-ghost btn-sm" onclick="addSubTask(${t.id})" title="Add sub-task"><i data-lucide="corner-down-right" style="width:12px;height:12px;"></i></button>`:''}
        <button class="btn btn-ghost btn-sm" onclick="toggleNote(${t.id})" title="Add note"><i data-lucide="sticky-note" style="width:12px;height:12px;"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="startTaskEdit(${t.id})" title="Edit"><i data-lucide="pencil" style="width:12px;height:12px;"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="askConfirm('Delete this task?','Delete Task','Delete',ok=>{if(ok) deleteTask(${t.id})})" title="Delete"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
      </div>
    </li>`;
}
function updateStats(){
  if(!activeList) return;
  const roots=activeList.tasks.filter(t=>!t.pid), done=roots.filter(t=>t.done).length;
  const pct=roots.length?Math.round(done/roots.length*100):0;
  const stats=document.getElementById('checklistStats');
  if(stats) stats.innerHTML=`
    <div class="stat-pill"><strong>${roots.length}</strong> tasks</div>
    <div class="stat-pill"><strong>${done}</strong> completed</div>
    <div class="stat-pill"><strong>${pct}%</strong> progress</div>`;
  const fill=document.getElementById('checklistProgressFill'); if(fill) fill.style.width=pct+'%';
}
function refreshHeaderPoints(){
  const hp=document.getElementById('headerPoints');
  if(hp) hp.textContent=`✶ ${totalPts} pts`;
  const gp=document.getElementById('globalPts');
  if(gp) gp.textContent=totalPts;
  const lvl=document.getElementById('archLevel');
  if(lvl) lvl.textContent=Math.floor(totalPts/100)+1;
  const wiz=document.getElementById('owlWisdom');
  if(wiz) wiz.textContent=totalPts;
}
