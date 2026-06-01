// ── MAIN INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Theme toggle
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let theme = prefersDark ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
    });
  }

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('panel-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  // Seed "Getting Started" list (first run)
  (() => {
    if (lists.some(l => l.id === 1)) return;
    const id = {
      tour:  uid(), drag:  uid(), setup: uid(),
      s1: uid(), s2: uid(), s3: uid(), s4: uid(),
      earn:  uid(), e1: uid(), e2: uid(), e3: uid()
    };
    lists.push({ id: 1, name: 'Getting Started', icon: '✨', tasks: [

      // ── Group 1: Feature tour (collapsed) ────────────────────────
      { id: id.tour, text: 'Feature tour',               pts: 5,  done: false, pid: null,      depth: 0, collapsed: true,  note: 'This group is collapsed — click ▶ to expand it.' },
      { id: id.drag, text: 'Try drag-reorder',           pts: 5,  done: false, pid: id.tour,   depth: 1, collapsed: false, note: 'Grab the ⠿ handle on the left of any task.' },

      // ── Group 2: Setup checklist ──────────────────────────────────
      { id: id.setup, text: 'Setup checklist',           pts: 5,  done: false, pid: null,      depth: 0, collapsed: true,  note: 'This group is collapsed — click ▶ to expand it.' },
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
  renderQA('guide');
});
