// ── CHECKLISTS ─────────────────────────────────────────────────
// Task shape: { id, text, pts, done, pid, depth, collapsed, note, repeat, repeatCount, repeatGoal }
// repeat: bool — if true, checkbox becomes a + counter instead of a done toggle
// repeatCount: number of times the + has been pressed this session
// repeatGoal: if > 0, marks done when count reaches goal; 0 = no auto-complete
// depth: 0 = top-level, 1 = subtask, 2 = sub-subtask (max, no children)
// pid: parent task id, or null for top-level
// collapsed: if true, children are hidden in the renderer

const MAX_DEPTH = 2;
let lists=[], lidx=1, tidxc=1, activeList=null, totalPts=0;
let _dragSrcListId=null, _dragSrcTaskId=null;

// ── SETTINGS ────────────────────────────────────────────────────────────────
let checklistSettings = {
  fontSize: 'medium',      // 'small' | 'medium' | 'large'
  density: 'normal',       // 'supercompact' | 'compact' | 'normal' | 'relaxed'
  showPoints: true,
  defaultTaskPts: 10,
  defaultSubPts: 5,
  showProgressBar: true,
  confirmDelete: false,
  liveReorder: true,       // use pointer-events live reorder while dragging
  dragIndent: true         // allow horizontal drag to indent/dedent
};
