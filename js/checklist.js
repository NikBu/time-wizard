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

// ── HELPERS ──────────────────────────────────────────────────
function _getList(){ return lists.find(l=>l.id===activeList); }
function _getTask(id){ const l=_getList(); return l&&l.tasks.find(t=>t.id===id); }
function _descendants(tasks, pid){
  const direct=tasks.filter(t=>t.pid===pid);
  return direct.flatMap(t=>[t,..._descendants(tasks,t.id)]);
}
function _children(tasks, pid){ return tasks.filter(t=>t.pid===pid); }
function _reDepth(tasks, id, newDepth){
  const t=tasks.find(x=>x.id===id); if(!t) return;
  t.depth=newDepth;
  _children(tasks,id).forEach(c=>_reDepth(tasks,c.id,newDepth+1));
}

// ── LIST MANAGEMENT ────────────────────────────────────────────────
function openNewListModal(){ document.getElementById('newListModal').classList.remove('hidden'); document.getElementById('newListName').focus(); }
function createList(){
  const name=document.getElementById('newListName').value.trim();
  if(!name){ showToast('Enter a list name.','error'); return; }
  const icon=document.getElementById('newListIcon').value, id=lidx++;
  lists.push({id,name,icon,tasks:[]});
  closeModal('newListModal');
  document.getElementById('newListName').value='';
  renderLists(); selectList(id); showToast(`"${name}" created!`);
}

// ── RENAME LIST ──────────────────────────────────────────────────
function startRenameList(id){
  const list=lists.find(l=>l.id===id); if(!list) return;
  const titleEl=document.getElementById('checklist-title-text');
  if(!titleEl||titleEl.querySelector('input')) return;
  const inp=document.createElement('input');
  inp.style.cssText='font-family:var(--font-display);font-size:var(--text-lg);font-weight:700;background:var(--color-surface-2);border:1px solid var(--color-primary);border-radius:var(--radius-sm);padding:0 var(--space-2);color:var(--color-text);outline:none;width:100%;max-width:320px;';
  inp.value=list.name; titleEl.innerHTML=''; titleEl.appendChild(inp);
  inp.focus(); inp.select();
  const commit=()=>{ const val=inp.value.trim(); if(val) list.name=val; renderChecklist(); renderLists(); };
  inp.addEventListener('blur',commit);
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();inp.blur();} if(e.key==='Escape'){inp.value=list.name;inp.blur();} e.stopPropagation(); });
}

// ── LIST DRAG-REORDER ───────────────────────────────────────────────
function _onListDragStart(e,id){ _dragSrcListId=id; e.dataTransfer.effectAllowed='move'; e.currentTarget.classList.add('dragging'); }
function _onListDragOver(e,id){ e.preventDefault(); if(_dragSrcListId===id) return; e.dataTransfer.dropEffect='move'; document.querySelectorAll('.list-item-btn').forEach(el=>el.classList.remove('drag-over')); e.currentTarget.classList.add('drag-over'); }
function _onListDrop(e,id){
  e.preventDefault();
  document.querySelectorAll('.list-item-btn').forEach(el=>el.classList.remove('drag-over','dragging'));
  if(_dragSrcListId===null||_dragSrcListId===id){ _dragSrcListId=null; return; }
  const from=lists.findIndex(l=>l.id===_dragSrcListId), to=lists.findIndex(l=>l.id===id);
  if(from<0||to<0){ _dragSrcListId=null; return; }
  const [moved]=lists.splice(from,1); lists.splice(to,0,moved);
  _dragSrcListId=null; renderLists();
}
function _onListDragEnd(){ document.querySelectorAll('.list-item-btn').forEach(el=>el.classList.remove('drag-over','dragging')); _dragSrcListId=null; }

function renderLists(){
  const sb=document.getElementById('listsSidebar');
  if(!lists.length){ sb.innerHTML='<p style="font-size:var(--text-xs);color:var(--color-text-faint);padding:var(--space-2);">No lists yet.</p>'; return; }
  sb.innerHTML=lists.map(l=>{
    const done=l.tasks.filter(t=>!t.pid&&t.done).length, tot=l.tasks.filter(t=>!t.pid).length;
    return `<div class="list-item-btn ${activeList===l.id?'active':''}"
      data-lid="${l.id}" draggable="true"
      onclick="if(!event.target.closest('.list-actions'))selectList(${l.id})"
      ondragstart="_onListDragStart(event,${l.id})" ondragover="_onListDragOver(event,${l.id})"
      ondrop="_onListDrop(event,${l.id})" ondragend="_onListDragEnd()" title="Drag to reorder" style="cursor:pointer;">
      <span class="list-label">${l.icon} ${l.name}</span>
      <span class="list-count">${done}/${tot}</span>
      <span class="list-actions" onclick="event.stopPropagation()">
        <button class="btn btn-icon btn-ghost btn-sm" title="Duplicate" onclick="duplicateList(${l.id})" style="width:22px;height:22px;"><i data-lucide="copy" style="width:10px;height:10px;"></i></button>
        <button class="btn btn-icon btn-danger btn-sm" title="Delete" onclick="deleteList(${l.id})" style="width:22px;height:22px;"><i data-lucide="trash-2" style="width:10px;height:10px;"></i></button>
      </span>
    </div>`;
  }).join('');
  lucide.createIcons();
}

function selectList(id){ activeList=id; renderLists(); renderChecklist(); }

// ── RENDER CHECKLIST ───────────────────────────────────────────────
function renderChecklist(){
  const main=document.getElementById('checklistMain'), list=_getList();
  if(!list) return;
  const top=list.tasks.filter(t=>!t.pid);
  const dpts=list.tasks.reduce((a,t)=>a+(t.done?t.pts:0),0);
  const tpts=list.tasks.reduce((a,t)=>a+t.pts,0);
  const dc=top.filter(t=>t.done).length, pct=top.length?Math.round(dc/top.length*100):0;
  main.innerHTML=`
    <div class="checklist-header">
      <div class="flex-row" style="gap:var(--space-2);min-width:0;">
        <span class="checklist-title" id="checklist-title-text">${list.icon} ${list.name}</span>
        <button class="btn btn-icon btn-ghost" style="width:26px;height:26px;flex-shrink:0;" title="Rename list" onclick="startRenameList(${list.id})">
          <i data-lucide="pencil" style="width:12px;height:12px;"></i>
        </button>
      </div>
      <div class="flex-row">
        <button class="btn btn-sm btn-ghost" onclick="clearDone()"><i data-lucide="check-check" style="width:12px;height:12px;"></i> Clear done</button>
        <button class="btn btn-sm btn-danger" onclick="deleteList(${list.id})"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
      </div>
    </div>
    <div class="checklist-progress-bar"><div class="checklist-progress-fill" style="width:${pct}%"></div></div>
    <div class="checklist-stats">
      <div class="stat-pill"><strong>${dc}</strong> / ${top.length} done</div>
      <div class="stat-pill"><strong>${pct}%</strong></div>
      <div class="stat-pill">✦ <strong>${dpts}</strong>/${tpts} pts</div>
    </div>
    <ul class="task-tree" id="taskTree"
      ondragover="_onTaskDragOver(event,null)" ondrop="_onTaskDrop(event,null)">${_renderNodes(list.tasks,null)}</ul>
    <div class="add-task-row mt-3">
      <input type="text" id="newTaskInput" placeholder="Add a task… (Enter)" onkeydown="if(event.key==='Enter')addTask()">
      <div class="num-wrap"><input type="number" class="points-input" id="newTaskPts" value="10" min="1" max="100" title="Points"><div class="num-spin"><button onclick="stepNum('newTaskPts',1)">▲</button><button onclick="stepNum('newTaskPts',-1)">▼</button></div></div>
      <button class="btn btn-primary" onclick="addTask()"><i data-lucide="plus" style="width:13px;height:13px;"></i></button>
    </div>`;
  lucide.createIcons();
  _initExpandBtns();
}

// ── RECURSIVE NODE RENDERER ───────────────────────────────────────────────
function _renderNodes(tasks, pid){
  return tasks.filter(t=>t.pid===pid).map(t=>{
    const children=tasks.filter(c=>c.pid===t.id);
    const hasChildren=children.length>0;
    const isCollapsed=!!t.collapsed;
    const hasNote=t.note&&t.note.trim();
    const canHaveChildren=t.depth<MAX_DEPTH;
    const depthClass=t.depth===0?'':t.depth===1?'depth-1':'depth-2';

    let collapseBtn='';
    if(canHaveChildren){
      if(!hasChildren){
        collapseBtn=`<span class="task-collapse-btn task-collapse-leaf" title="No subtasks yet">·</span>`;
      } else if(isCollapsed){
        collapseBtn=`<button class="task-collapse-btn task-collapse-closed" onclick="toggleCollapse(${t.id})" title="Expand subtasks">▶</button>`;
      } else {
        collapseBtn=`<button class="task-collapse-btn task-collapse-open" onclick="toggleCollapse(${t.id})" title="Collapse subtasks">▼</button>`;
      }
    }

    const childrenHtml=(!isCollapsed&&hasChildren)
      ? `<ul class="task-tree task-tree--nested" ondragover="_onTaskDragOver(event,${t.id})" ondrop="_onTaskDrop(event,${t.id})">${_renderNodes(tasks,t.id)}</ul>`
      : '';

    const isRepeat = !!t.repeat;
    const rCount   = t.repeatCount || 0;
    const rGoal    = t.repeatGoal  || 0;
    const goalMet  = isRepeat && rGoal > 0 && rCount >= rGoal;
    let checkWidget;
    if (isRepeat) {
      const label = rGoal > 0 ? `${rCount}/${rGoal}` : `+${rCount}`;
      checkWidget = `<button class="task-repeat-btn${goalMet?' goal-met':''}" onclick="incrementRepeat(${t.id})" title="${goalMet?'Goal reached — click to reset':'Click to count one repetition'}">${label}</button>`;
    } else {
      checkWidget = `<div class="task-check" onclick="toggleTask(${t.id})" role="checkbox" aria-checked="${t.done}">${t.done?'<i data-lucide="check" style="width:11px;height:11px;"></i>':''}</div>`;
    }

    return `<li class="task-item ${t.done?'done':''} ${depthClass}" id="task-li-${t.id}"
        draggable="true"
        ondragstart="_onTaskDragStart(event,${t.id})"
        ondragover="_onTaskDragOver(event,${t.id})"
        ondrop="_onTaskDrop(event,${t.id})"
        ondragend="_onTaskDragEnd()">
      <span class="task-drag-handle" title="Drag to reorder">⠷</span>
      ${collapseBtn}
      ${checkWidget}
      <div class="task-body">
        <div class="task-main-row">
          <span class="task-text" id="task-text-${t.id}">${t.text}</span>
          <span class="task-points">✦${t.pts}</span>
          <div class="task-actions">
            <button class="btn btn-icon btn-ghost btn-sm" title="Edit" onclick="editTask(${t.id})"><i data-lucide="pencil" style="width:11px;height:11px;"></i></button>
            <button class="btn btn-icon btn-ghost btn-sm" title="Note" onclick="toggleNote(${t.id})"><i data-lucide="sticky-note" style="width:11px;height:11px;"></i></button>
            <button class="btn btn-icon btn-ghost btn-sm" title="Copy" onclick="copyTask(${t.id})"><i data-lucide="copy" style="width:11px;height:11px;"></i></button>
            <button class="btn btn-icon btn-ghost btn-sm ${isRepeat?'text-primary':''}" title="${isRepeat?'Repeatable (click to disable)':'Make repeatable'}" onclick="toggleRepeat(${t.id})">
              <i data-lucide="repeat" style="width:11px;height:11px;${isRepeat?'color:var(--color-primary);':''}"></i>
            </button>
            ${canHaveChildren
              ? `<button class="btn btn-icon btn-ghost btn-sm" title="Add subtask" onclick="showSubAdd(${t.id})"><i data-lucide="corner-down-right" style="width:11px;height:11px;"></i></button>`
              : ''}
            <button class="btn btn-icon btn-danger btn-sm" onclick="delTask(${t.id})"><i data-lucide="x" style="width:11px;height:11px;"></i></button>
          </div>
        </div>
        <button class="task-expand-btn" id="task-expbtn-${t.id}" onclick="toggleTaskExpand(${t.id})">Show more</button>
        ${hasNote
          ?`<div class="task-note" id="task-note-${t.id}">${t.note}</div><button class="task-expand-btn" id="task-notebtn-${t.id}" onclick="toggleNoteExpand(${t.id})">Show more</button>`
          :`<div class="task-note" id="task-note-${t.id}" style="display:none;"></div>`}
        <textarea class="task-note-input" id="task-note-input-${t.id}" placeholder="Add a note…" onblur="saveNote(${t.id})">${t.note||''}</textarea>
        ${childrenHtml}
        ${canHaveChildren?`
        <div class="sub-add-row" id="sub-add-row-${t.id}">
          <input type="text" id="sub-input-${t.id}" placeholder="Subtask… (Enter adds · Tab indents · Shift+Tab dedents)"
            style="flex:1;font-size:var(--text-xs);" onkeydown="_onSubKey(event,${t.id})">
          <div class="num-wrap">
            <input type="number" id="sub-pts-${t.id}" value="5" min="1" max="100" style="width:48px;font-size:var(--text-xs);" title="Points">
            <div class="num-spin"><button onclick="stepNum('sub-pts-${t.id}',1)">▲</button><button onclick="stepNum('sub-pts-${t.id}',-1)">▼</button></div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="commitSub(${t.id})">Add</button>
          <button class="btn btn-ghost btn-sm" onclick="cancelSub(${t.id})">✕</button>
        </div>`:''}
      </div>
    </li>`;
  }).join('');
}

// ── COLLAPSE ─────────────────────────────────────────────────────────────────
function toggleCollapse(id){
  const t=_getTask(id); if(!t) return;
  t.collapsed=!t.collapsed;
  renderChecklist();
}

// ── REPEAT GOAL MODAL ────────────────────────────────────────────────────────
// A lightweight in-page modal that avoids prompt() for cross-device compatibility.
let _repeatGoalPendingId = null;

function _ensureRepeatGoalModal(){
  if(document.getElementById('repeatGoalModal')) return;
  const el = document.createElement('div');
  el.id = 'repeatGoalModal';
  el.className = 'repeat-goal-modal-overlay hidden';
  el.innerHTML = `
    <div class="repeat-goal-modal" role="dialog" aria-modal="true" aria-labelledby="rgmTitle">
      <h3 id="rgmTitle">Set repeat goal</h3>
      <p>How many repetitions = task complete?<br>Leave blank or set 0 for unlimited (no auto-complete).</p>
      <input type="number" id="rgmInput" min="0" placeholder="e.g. 10" />
      <div class="repeat-goal-modal-actions">
        <button class="btn btn-ghost" onclick="_cancelRepeatGoalModal()">Cancel</button>
        <button class="btn btn-primary" onclick="_confirmRepeatGoalModal()">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  // Close on backdrop click
  el.addEventListener('click', e => { if(e.target === el) _cancelRepeatGoalModal(); });
  // Confirm on Enter
  document.getElementById('rgmInput').addEventListener('keydown', e => {
    if(e.key === 'Enter') _confirmRepeatGoalModal();
    if(e.key === 'Escape') _cancelRepeatGoalModal();
  });
}

function _openRepeatGoalModal(taskId){
  _ensureRepeatGoalModal();
  _repeatGoalPendingId = taskId;
  const overlay = document.getElementById('repeatGoalModal');
  const inp = document.getElementById('rgmInput');
  inp.value = '';
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => inp.focus());
}

function _cancelRepeatGoalModal(){
  document.getElementById('repeatGoalModal').classList.add('hidden');
  _repeatGoalPendingId = null;
}

function _confirmRepeatGoalModal(){
  const id = _repeatGoalPendingId;
  document.getElementById('repeatGoalModal').classList.add('hidden');
  _repeatGoalPendingId = null;
  if(id === null) return;
  const raw = document.getElementById('rgmInput').value;
  const goal = Math.max(0, parseInt(raw) || 0);
  const list = _getList(); if(!list) return;
  const t = list.tasks.find(x => x.id === id); if(!t) return;
  t.repeat = true;
  t.repeatCount = 0;
  t.repeatGoal  = goal;
  t.done = false;
  renderChecklist();
}

// ── REPEAT TASK ─────────────────────────────────────────────────────────────
function toggleRepeat(id){
  const list=_getList(); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  if(!t.repeat){
    _openRepeatGoalModal(id);
  } else {
    t.repeat = false;
    t.repeatCount = 0;
    t.repeatGoal  = 0;
    renderChecklist();
  }
}

function incrementRepeat(id){
  const list=_getList(); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t||!t.repeat) return;

  const goalMet = t.repeatGoal > 0 && (t.repeatCount||0) >= t.repeatGoal;
  if(goalMet){
    // Reset for a new cycle
    t.repeatCount = 0;
    t.done = false;
    renderChecklist();
    return;
  }

  const prevCount = t.repeatCount || 0;
  t.repeatCount = prevCount + 1;

  // Bump animation
  requestAnimationFrame(()=>{
    const btn = document.querySelector(`#task-li-${id} .task-repeat-btn`);
    if(btn){ btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
  });

  if(t.repeatGoal > 0){
    // ── Limited repeats ──────────────────────────────────────────────────────
    // Award points using floor-difference so that:
    //   • every increment gives either floor(pts/goal) or ceil(pts/goal) pts
    //   • the sum over a full cycle equals exactly pts
    //   • on the final rep the remaining pts are awarded (making total = pts)
    //   • result over one full cycle = pts, over two full cycles = 2×pts ✓
    const pts   = t.pts;
    const goal  = t.repeatGoal;
    const after  = Math.floor(pts * t.repeatCount / goal);
    const before = Math.floor(pts * prevCount      / goal);
    const award  = after - before;  // always >= 0, sums to pts over full cycle

    if(award > 0){
      totalPts += award;
      updateHeaderPts();
      if(typeof rewardsRender==='function') rewardsRender();
    }

    if(t.repeatCount >= goal){
      t.done = true;
      archNotify('task_done');
      showToast(`✦ +${award} pts! "${t.text}" — goal reached!`, 'success');
    } else {
      showToast(`↻ ${t.text}: ${t.repeatCount} / ${goal} reps${award>0?' (+'+award+' pts)':''}`);
    }
  } else {
    // ── Unlimited repeats ────────────────────────────────────────────────────
    // Award full pts on every rep (no auto-complete, purely additive)
    totalPts += t.pts;
    updateHeaderPts();
    if(typeof rewardsRender==='function') rewardsRender();
    showToast(`↻ ${t.text}: ${t.repeatCount} reps (+${t.pts} pts)`);
  }

  renderChecklist(); renderLists();
}

// ── KEYBOARD NAV FOR SUB-INPUTS ──────────────────────────────────────────────
function _onSubKey(e, pid){
  if(e.key==='Escape'){ e.preventDefault(); cancelSub(pid); return; }
  if(e.key==='Enter'){
    e.preventDefault();
    const inp=document.getElementById('sub-input-'+pid);
    if(!inp||!inp.value.trim()) return;
    _commitSubReturningId(pid);
    renderChecklist(); renderLists();
    requestAnimationFrame(()=>{
      showSubAdd(pid);
      const ni=document.getElementById('sub-input-'+pid); if(ni) ni.focus();
    });
    return;
  }
  if(e.key==='Tab'){
    e.preventDefault();
    const inp=document.getElementById('sub-input-'+pid);
    if(e.shiftKey){
      if(inp&&inp.value.trim()){
        const newId=_commitSubReturningId(pid);
        if(newId!==null){ renderChecklist(); renderLists(); dedentTask(newId); }
      } else { cancelSub(pid); }
    } else {
      if(!inp||!inp.value.trim()) return;
      const newId=_commitSubReturningId(pid);
      if(newId!==null){ renderChecklist(); renderLists(); indentTask(newId); }
    }
    return;
  }
}

// ── INDENT / DEDENT ───────────────────────────────────────────────────────────
function indentTask(id){
  const list=_getList(); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  if(t.depth>=MAX_DEPTH){ showToast('Max depth reached (3 levels).','error'); return; }
  const siblings=list.tasks.filter(x=>x.pid===t.pid);
  const idx=siblings.findIndex(x=>x.id===id);
  if(idx<1){ showToast('No task above to indent under.'); return; }
  const newParent=siblings[idx-1];
  t.pid=newParent.id;
  _reDepth(list.tasks, id, newParent.depth+1);
  newParent.collapsed=false;
  renderChecklist(); renderLists();
}
function dedentTask(id){
  const list=_getList(); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  if(t.depth===0){ showToast('Already at top level.'); return; }
  const parent=list.tasks.find(x=>x.id===t.pid);
  t.pid=parent?parent.pid:null;
  _reDepth(list.tasks, id, t.depth-1);
  renderChecklist(); renderLists();
}

// ── TASK CRUD ──────────────────────────────────────────────────────────────────
function addTask(){
  const list=_getList(); if(!list) return;
  const inp=document.getElementById('newTaskInput'), text=inp.value.trim(); if(!text) return;
  const pts=Math.max(1,parseInt(document.getElementById('newTaskPts').value)||10);
  list.tasks.push({id:tidxc++,text,pts,done:false,pid:null,depth:0,collapsed:false,note:'',repeat:false,repeatCount:0,repeatGoal:0});
  inp.value=''; renderChecklist(); renderLists();
  requestAnimationFrame(()=>{ const ni=document.getElementById('newTaskInput'); if(ni) ni.focus(); });
}

function showSubAdd(pid){
  const row=document.getElementById('sub-add-row-'+pid); if(!row) return;
  const wasVisible=row.classList.contains('visible');
  document.querySelectorAll('.sub-add-row.visible').forEach(r=>r.classList.remove('visible'));
  if(!wasVisible){ row.classList.add('visible'); const inp=document.getElementById('sub-input-'+pid); if(inp) inp.focus(); }
}
function cancelSub(pid){
  const row=document.getElementById('sub-add-row-'+pid); if(row) row.classList.remove('visible');
}

function _commitSubReturningId(pid){
  const inp=document.getElementById('sub-input-'+pid); if(!inp) return null;
  const text=inp.value.trim(); if(!text) return null;
  const ptsEl=document.getElementById('sub-pts-'+pid);
  const pts=Math.max(1,parseInt(ptsEl?.value)||5);
  const list=_getList(); if(!list) return null;
  const parent=list.tasks.find(t=>t.id===pid);
  const newDepth=parent?parent.depth+1:0;
  const newId=tidxc++;
  list.tasks.push({id:newId,text,pts,done:false,pid,depth:newDepth,collapsed:false,note:'',repeat:false,repeatCount:0,repeatGoal:0});
  inp.value='';
  return newId;
}
function commitSub(pid){
  const id=_commitSubReturningId(pid);
  if(id===null) return;
  renderChecklist(); renderLists();
  requestAnimationFrame(()=>{
    showSubAdd(pid);
    const ni=document.getElementById('sub-input-'+pid); if(ni) ni.focus();
  });
}

function editTask(id){
  const list=_getList(); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  const span=document.getElementById('task-text-'+id); if(!span) return;
  const oldText=t.text;
  span.outerHTML=`<input class="task-edit-input" id="task-edit-${id}"
    value="${oldText.replace(/"/g,'&quot;')}"
    onblur="saveEdit(${id})"
    onkeydown="if(event.key==='Enter')saveEdit(${id});if(event.key==='Escape'){this.value='${oldText.replace(/'/g,"\\'")}';saveEdit(${id});}">`;
  const inp=document.getElementById('task-edit-'+id); if(inp){ inp.focus(); inp.select(); }
}
function saveEdit(id){
  const inp=document.getElementById('task-edit-'+id); if(!inp) return;
  const val=inp.value.trim();
  const list=_getList(); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  if(val) t.text=val; renderChecklist();
}

function toggleNote(id){
  const area=document.getElementById('task-note-input-'+id); if(!area) return;
  const vis=area.classList.toggle('visible');
  if(vis){ area.focus(); area.setSelectionRange(area.value.length,area.value.length); }
}
function saveNote(id){
  const area=document.getElementById('task-note-input-'+id); if(!area) return;
  const list=_getList(); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  t.note=area.value.trim(); renderChecklist();
}

function copyTask(id){
  const list=_getList(); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  const cloneSubtree=(src, newPid, newDepth)=>{
    const nid=tidxc++;
    list.tasks.push({id:nid,text:src.id===id?src.text+' (copy)':src.text,pts:src.pts,done:false,pid:newPid,depth:newDepth,collapsed:false,note:src.note||'',repeat:src.repeat||false,repeatCount:0,repeatGoal:src.repeatGoal||0});
    _children(list.tasks,src.id).forEach(c=>cloneSubtree(c,nid,newDepth+1));
  };
  cloneSubtree(t,t.pid,t.depth);
  renderChecklist(); renderLists(); showToast('Task copied!');
}

function delTask(id){
  const list=_getList(); if(!list) return;
  const toRemove=new Set([id,..._descendants(list.tasks,id).map(t=>t.id)]);
  list.tasks=list.tasks.filter(t=>!toRemove.has(t.id));
  renderChecklist(); renderLists();
}

function toggleTask(id){
  const list=_getList(); if(!list) return;
  const task=list.tasks.find(t=>t.id===id); if(!task) return;
  task.done=!task.done;
  if(task.done){
    const desc=_descendants(list.tasks,id).filter(t=>!t.done);
    desc.forEach(t=>{ t.done=true; totalPts+=t.pts; });
    totalPts+=task.pts;
    updateHeaderPts();
    if(typeof rewardsRender==='function') rewardsRender();
    archNotify('task_done');
    showToast(`✦ +${task.pts} pts! "${task.text}"`, 'success');
  } else {
    _descendants(list.tasks,id).forEach(t=>{ if(t.done){ t.done=false; totalPts=Math.max(0,totalPts-t.pts); } });
    totalPts=Math.max(0,totalPts-task.pts);
    updateHeaderPts();
    if(typeof rewardsRender==='function') rewardsRender();
  }
  renderChecklist(); renderLists();
}

function clearDone(){
  const list=_getList(); if(!list) return;
  const toRemove=new Set();
  list.tasks.filter(t=>t.done).forEach(t=>{
    toRemove.add(t.id);
    _descendants(list.tasks,t.id).forEach(d=>toRemove.add(d.id));
  });
  list.tasks=list.tasks.filter(t=>!toRemove.has(t.id));
  renderChecklist(); renderLists();
}

function duplicateList(id){
  const orig=lists.find(l=>l.id===id); if(!orig) return;
  const newId=lidx++; const idMap={};
  const newTasks=[];
  const queue=[...orig.tasks.filter(t=>t.pid===null)];
  while(queue.length){
    const t=queue.shift();
    const nid=tidxc++; idMap[t.id]=nid;
    newTasks.push({...t,id:nid,pid:t.pid!==null?idMap[t.pid]:null,done:false,collapsed:false,repeatCount:0});
    orig.tasks.filter(c=>c.pid===t.id).forEach(c=>queue.push(c));
  }
  lists.push({id:newId,name:orig.name+' (copy)',icon:orig.icon,tasks:newTasks});
  renderLists(); selectList(newId); showToast(`"${orig.name}" duplicated!`);
}

function deleteList(id){
  const nm=(lists.find(l=>l.id===id)||{}).name||'list';
  askConfirm(`Delete list "${nm}"? This cannot be undone.`,'Delete List','Delete',(yes)=>{
    if(!yes) return;
    lists=lists.filter(l=>l.id!==id);
    if(activeList===id){ activeList=lists[0]?.id||null; }
    renderLists();
    if(activeList) renderChecklist();
    else document.getElementById('checklistMain').innerHTML='<div style="text-align:center;padding:var(--space-12);color:var(--color-text-faint);font-size:var(--text-sm);"><p>Select or create a list.</p></div>';
  });
}

// ── TASK DRAG-REORDER ───────────────────────────────────────────────────────────
function _onTaskDragStart(e,id){
  _dragSrcTaskId=id; e.stopPropagation(); e.dataTransfer.effectAllowed='move';
  e.currentTarget.classList.add('dragging');
}
function _onTaskDragOver(e,id){
  e.preventDefault(); e.stopPropagation();
  if(_dragSrcTaskId===id) return;
  e.dataTransfer.dropEffect='move';
  document.querySelectorAll('.task-item').forEach(el=>el.classList.remove('drag-over'));
  if(id!==null){ const li=document.getElementById('task-li-'+id); if(li) li.classList.add('drag-over'); }
}
function _onTaskDrop(e,targetId){
  e.preventDefault(); e.stopPropagation();
  document.querySelectorAll('.task-item').forEach(el=>el.classList.remove('drag-over','dragging'));
  const srcId=_dragSrcTaskId; _dragSrcTaskId=null;
  if(srcId===null||srcId===targetId) return;
  const list=_getList(); if(!list) return;
  const src=list.tasks.find(t=>t.id===srcId); if(!src) return;
  const target=targetId!==null?list.tasks.find(t=>t.id===targetId):null;
  if(target&&src.pid!==target.pid) return;
  const sameLevelTasks=list.tasks.filter(t=>t.pid===src.pid);
  const fromIdx=sameLevelTasks.findIndex(t=>t.id===srcId);
  const toIdx=targetId!==null?sameLevelTasks.findIndex(t=>t.id===targetId):sameLevelTasks.length-1;
  if(fromIdx<0||toIdx<0) return;
  const otherTasks=list.tasks.filter(t=>t.pid!==src.pid);
  sameLevelTasks.splice(fromIdx,1); sameLevelTasks.splice(toIdx,0,src);
  list.tasks=[...otherTasks,...sameLevelTasks];
  renderChecklist(); renderLists();
}
function _onTaskDragEnd(){
  document.querySelectorAll('.task-item').forEach(el=>el.classList.remove('drag-over','dragging'));
  _dragSrcTaskId=null;
}

// ── EXPAND / OVERFLOW BUTTONS ─────────────────────────────────────────────────
function _checkOverflow(el){ return el&&el.scrollHeight>el.clientHeight+2; }
function _initExpandBtns(){
  requestAnimationFrame(()=>{
    document.querySelectorAll('.task-text').forEach(el=>{
      const id=el.id.replace('task-text-',''); const btn=document.getElementById('task-expbtn-'+id);
      if(btn) btn.classList.toggle('visible',_checkOverflow(el));
    });
    document.querySelectorAll('.task-note').forEach(el=>{
      if(el.style.display==='none') return;
      const id=el.id.replace('task-note-',''); const btn=document.getElementById('task-notebtn-'+id);
      if(btn) btn.classList.toggle('visible',_checkOverflow(el));
    });
  });
}
function toggleTaskExpand(id){
  const el=document.getElementById('task-text-'+id), btn=document.getElementById('task-expbtn-'+id);
  if(!el) return; el.classList.toggle('expanded'); if(btn) btn.textContent=el.classList.contains('expanded')?'Show less':'Show more';
}
function toggleNoteExpand(id){
  const el=document.getElementById('task-note-'+id), btn=document.getElementById('task-notebtn-'+id);
  if(!el) return; el.classList.toggle('expanded'); if(btn) btn.textContent=el.classList.contains('expanded')?'Show less':'Show more';
}

// ── POINTS + HEADER ────────────────────────────────────────────────────────────
function updateHeaderPts(){
  const hp=document.getElementById('headerPoints'); if(hp) hp.textContent=`✦ ${totalPts} pts`;
  const lvl=document.getElementById('owlLevel'); if(lvl) lvl.textContent=Math.floor(totalPts/100)+1;
  const wiz=document.getElementById('owlWisdom'); if(wiz) wiz.textContent=totalPts;
}
