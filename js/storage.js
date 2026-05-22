// ── IMPORT / EXPORT ─────────────────────────────────
function buildExportPayload(){
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    timers: timers.map(t => ({
      name: t.name,
      tot: t.orig || t.tot,
      sound: t.sound,
      rep: t.rep || {mode:'once'}
    })),
    lists: lists,
    activeList: activeList,
    totalPts: totalPts,
    settings: {
      theme: activeThemeId,
      mode: window._getMode ? window._getMode() : document.documentElement.getAttribute('data-theme') || 'dark',
      archEnabled: archEnabled
    }
  };
}
function exportData(){
  try{
    const data = buildExportPayload();
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'timewizard-state-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    showToast('State exported.','success');
  }catch(e){ console.error(e); showToast('Export failed.','error'); }
}
function handleImport(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const data = JSON.parse(e.target.result);
      applyImportedState(data);
      showToast('State imported.','success');
    }catch(err){
      console.error(err); showToast('Import failed: invalid file','error');
    }
    input.value = '';
  };
  reader.readAsText(file);
}
function applyImportedState(data){
  if(!data || typeof data !== 'object') throw new Error('Bad payload');
  // Timers
  clearInterval(tick); tick=null; timers=[]; tidx=1;
  if(Array.isArray(data.timers)){
    data.timers.forEach(t => {
      if(!t || typeof t !== 'object') return;
      const tot = Number(t.tot)||0; if(tot<=0) return;
      const id = tidx++;
      const rep = t.rep && typeof t.rep==='object' ? t.rep : {mode:'once'};
      timers.push({id,name:t.name||'Timer',tot,orig:tot,rem:tot,sound:t.sound||'bell',rep:JSON.parse(JSON.stringify(rep)),running:false,done:false,reps:0,capToMax:true});
    });
  }
  if(timers.length) renderTimers(); else document.getElementById('timersList').innerHTML='';
  // Lists
  lists = Array.isArray(data.lists) ? JSON.parse(JSON.stringify(data.lists)) : [];
  lidx = lists.reduce((m,l)=>Math.max(m,l.id||0),0)+1;
  tidxc = lists.reduce((m,l)=>Math.max(m, ...(Array.isArray(l.tasks)?l.tasks.map(t=>t.id||0):[0])),0)+1;
  totalPts = Number(data.totalPts)||0;
  updateHeaderPts();
  // Active list
  activeList = data.activeList;
  if(!lists.some(l=>l.id===activeList)) activeList = lists[0]?lists[0].id:null;
  renderLists();
  if(activeList) renderChecklist();
  else document.getElementById('checklistMain').innerHTML='<div style="text-align:center;padding:var(--space-12);color:var(--color-text-faint);font-size:var(--text-sm);"><p>Select or create a list.</p></div>';
  // Settings
  if(data.settings){
    if(data.settings.theme && THEMES.some(t=>t.id===data.settings.theme)){
      activeThemeId = data.settings.theme; applyThemeVars(); renderThemes();
    }
    if(typeof data.settings.archEnabled==='boolean'){
      setArchEnabled(data.settings.archEnabled);
      const cb = document.getElementById('archEnabled'); if(cb) cb.checked = data.settings.archEnabled;
    }
  }
}

// Hotkey: Ctrl/Cmd+S to export
window.addEventListener('keydown', e => {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if(!mod) return;
  if(e.key.toLowerCase() === 's'){ e.preventDefault(); exportData(); }
});

// ── SESSION AUTOSAVE ─────────────────────────────────
const AUTOSAVE_KEY = 'timewizard-session-v1';
function saveSession(){
  try{ localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(buildExportPayload())); }
  catch(e){ /* ignore quota/private mode */ }
}
function loadSession(){
  try{
    const raw = localStorage.getItem(AUTOSAVE_KEY); if(!raw) return;
    const data = JSON.parse(raw);
    applyImportedState(data);
    showToast('Session restored.');
  } catch(e){ console.warn('Session restore failed', e); }
}
function clearSession(){ try{ localStorage.removeItem(AUTOSAVE_KEY); }catch(e){} }

setInterval(saveSession, 10000);
window.addEventListener('beforeunload', saveSession);
