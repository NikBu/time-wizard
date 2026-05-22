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
