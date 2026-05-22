// Manifest for android
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration.scope))
        .catch(error => console.error('SW registration failed:', error));
    });
  }
// ── THEME TOGGLE ──────────────────────────────────
(function(){
  const btn = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let mode = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', mode);
  function updateIcon(){
    if(!btn) return;
    btn.innerHTML = mode === 'dark'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
  updateIcon();
  btn && btn.addEventListener('click', ()=>{
    mode = mode === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', mode);
    updateIcon();
    applyThemeVars();
  });
  window._getMode = () => mode;
})();

// ── TABS ──────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    lucide.createIcons();
  });
});

// ── INIT ──────────────────────────────────────────
lucide.createIcons();
renderThemes();
applyThemeVars();
renderSoundGrid();
initMusicUI();
archGreet();
renderFAQ();
archSetMode('idle');
lists.push({id:lidx++,name:'Getting Started',icon:'✨',tasks:[
  {id:tidxc++,text:'Start a timer from the Timers tab',pts:10,done:false,pid:null,note:''},
  {id:tidxc++,text:'Pet Archibald the owl',pts:5,done:false,pid:null,note:''},
  {id:tidxc++,text:'Try different themes',pts:5,done:false,pid:null,note:''},
  {id:tidxc++,text:'Create your own checklist',pts:15,done:false,pid:null,note:''},
]});
renderLists(); selectList(1);
