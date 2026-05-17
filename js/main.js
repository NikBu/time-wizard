// ── PWA / SW ───────────────────────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
}

// ── THEME TOGGLE ───────────────────────────────────
(function(){
  const btn = document.querySelector('[data-theme-toggle]');
  if(!btn) return;
  let mode = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', mode);
  const render = ()=>{
    btn.setAttribute('aria-label', `Switch to ${mode==='dark'?'light':'dark'} mode`);
    btn.innerHTML = mode==='dark'
      ? '<i data-lucide="sun"></i>'
      : '<i data-lucide="moon"></i>';
    lucide.createIcons();
  };
  render();
  btn.addEventListener('click', ()=>{
    mode = mode==='dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', mode);
    render();
  });
})();

// ── TABS ────────────────────────────────────────────
function switchTab(id){
  $$('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  $$('.tab-panel').forEach(p=>p.classList.toggle('active', p.id===id));
}
window.switchTab = switchTab;

// ── INIT ──────────────────────────────────────────
lucide.createIcons();
renderThemes();
applyThemeVars();
renderSoundGrid();
initMusicUI();
archGreet();
renderFAQ();
archSetMode('idle');

// Restore persisted session (IndexedDB), fall back to sample list if nothing saved
restoreSession().then(restored => {
  if (!restored && !lists.length) {
    lists.push({id:lidx++,name:'Getting Started',icon:'✨',tasks:[
      {id:tidxc++,text:'Start a timer from the Timers tab',pts:10,done:false,pid:null,note:''},
      {id:tidxc++,text:'Pet Archibald the owl',pts:5,done:false,pid:null,note:''},
      {id:tidxc++,text:'Try different themes',pts:5,done:false,pid:null,note:''},
      {id:tidxc++,text:'Create your own checklist',pts:15,done:false,pid:null,note:''},
    ]});
    renderLists(); selectList(1);
  }
  requestPersistentStorage();
});
