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

// ── DEFAULT LIST: Getting Started ─────────────────
// Showcases subtasks, collapsed groups, and drag-reorder.
// IDs are assigned via tidxc++ so they stay consistent with the counter.
(function seedGettingStarted(){
  // We need stable IDs to wire up pid references, so capture them before pushing.
  const id = (function(){ const ids = {};
    const keys = ['explore','t1','t2','t3','setup','s1','s2','s3','s4','earn','e1','e2','e3'];
    keys.forEach(k => { ids[k] = tidxc++; }); return ids;
  })();

  lists.push({ id: lidx++, name: 'Getting Started', icon: '✨', tasks: [

    // ── Group 1: Explore (expanded, has 3 subtasks) ──────────────────
    { id: id.explore, text: 'Explore the app',         pts: 5,  done: false, pid: null,       depth: 0, collapsed: false, note: 'Tap the ▼ button to collapse this group once you are done!' },
    { id: id.t1,      text: 'Switch between tabs',     pts: 5,  done: false, pid: id.explore, depth: 1, collapsed: false, note: '' },
    { id: id.t2,      text: 'Toggle light / dark mode',pts: 5,  done: false, pid: id.explore, depth: 1, collapsed: false, note: 'The sun/moon icon is in the top-right corner.' },
    { id: id.t3,      text: 'Meet Archibald the owl',  pts: 10, done: false, pid: id.explore, depth: 1, collapsed: false, note: 'Click him — he has things to say.' },

    // ── Group 2: Setup (collapsed, has 4 subtasks) ───────────────────
    { id: id.setup, text: 'Set yourself up',           pts: 5,  done: false, pid: null,      depth: 0, collapsed: true,  note: 'This group is collapsed — click ▶ to expand it.' },
    { id: id.s1,    text: 'Pick a colour theme',       pts: 5,  done: false, pid: id.setup,  depth: 1, collapsed: false, note: '' },
    { id: id.s2,    text: 'Create your first timer',   pts: 10, done: false, pid: id.setup,  depth: 1, collapsed: false, note: 'Head to the Timers tab and hit +.' },
    { id: id.s3,    text: 'Create your own checklist', pts: 15, done: false, pid: id.setup,  depth: 1, collapsed: false, note: 'Use the + List button in the sidebar.' },
    { id: id.s4,    text: 'Upload custom alarm sound', pts: 10, done: false, pid: id.setup,  depth: 1, collapsed: false, note: 'Timer settings → Custom sound.' },

    // ── Group 3: Earn points (leaf tasks, no children) ───────────────
    { id: id.earn, text: 'Earn your first points',     pts: 5,  done: false, pid: null,      depth: 0, collapsed: false, note: 'Complete any task to earn points and level up Archibald.' },
    { id: id.e1,   text: 'Complete 3 tasks',           pts: 15, done: false, pid: id.earn,   depth: 1, collapsed: false, note: '' },
    { id: id.e2,   text: 'Reach 50 pts',               pts: 20, done: false, pid: id.earn,   depth: 1, collapsed: false, note: '' },
    { id: id.e3,   text: 'Try dragging a task to reorder it', pts: 5, done: false, pid: id.earn, depth: 1, collapsed: false, note: 'Grab the ⠿ handle on the left of any task.' },

  ]});
})();

renderLists(); selectList(1);
