// ── CHECKLISTS ────────────────────────────────────
let lists=[], lidx=1, tidxc=1, activeList=null, totalPts=0;
let _dragSrcListId=null, _dragSrcTaskId=null;

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

// ── RENAME LIST ───────────────────────────────────
function startRenameList(id){
  const list=lists.find(l=>l.id===id); if(!list) return;
  const titleEl=document.getElementById('checklist-title-text');
  if(!titleEl || titleEl.querySelector('input')) return;

  const inp=document.createElement('input');
  inp.style.cssText='font-family:var(--font-display);font-size:var(--text-lg);font-weight:700;background:var(--color-surface-2);border:1px solid var(--color-primary);border-radius:var(--radius-sm);padding:0 var(--space-2);color:var(--color-text);outline:none;width:100%;max-width:320px;';
  inp.value=list.name;
  titleEl.innerHTML='';
  titleEl.appendChild(inp);
  inp.focus(); inp.select();

  const commit=()=>{
    const val=inp.value.trim();
    if(val) list.name=val;
    renderChecklist(); renderLists();
  };
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); inp.blur(); }
    if(e.key==='Escape'){ inp.value=list.name; inp.blur(); }
    e.stopPropagation();
  });
}

// ── LIST DRAG-REORDER ─────────────────────────────
function _onListDragStart(e,id){
  _dragSrcListId=id; e.dataTransfer.effectAllowed='move';
  e.currentTarget.classList.add('dragging');
}
function _onListDragOver(e,id){
  e.preventDefault();
  if(_dragSrcListId===id) return;
  e.dataTransfer.dropEffect='move';
  document.querySelectorAll('.list-item-btn').forEach(el=>el.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}
function _onListDrop(e,id){
  e.preventDefault();
  document.querySelectorAll('.list-item-btn').forEach(el=>el.classList.remove('drag-over','dragging'));
  if(_dragSrcListId===null||_dragSrcListId===id){ _dragSrcListId=null; return; }
  const from=lists.findIndex(l=>l.id===_dragSrcListId);
  const to=lists.findIndex(l=>l.id===id);
  if(from<0||to<0){ _dragSrcListId=null; return; }
  const [moved]=lists.splice(from,1); lists.splice(to,0,moved);
  _dragSrcListId=null; renderLists();
}
function _onListDragEnd(){
  document.querySelectorAll('.list-item-btn').forEach(el=>el.classList.remove('drag-over','dragging'));
  _dragSrcListId=null;
}

function renderLists(){
  const sb=document.getElementById('listsSidebar');
  if(!lists.length){ sb.innerHTML='<p style="font-size:var(--text-xs);color:var(--color-text-faint);padding:var(--space-2);">No lists yet.</p>'; return; }
  sb.innerHTML=lists.map(l=>{
    const done=l.tasks.filter(t=>!t.pid&&t.done).length, tot=l.tasks.filter(t=>!t.pid).length;
    return `<div class="list-item-btn ${activeList===l.id?'active':''}"
      data-lid="${l.id}"
      draggable="true"
      onclick="if(!event.target.closest('.list-actions'))selectList(${l.id})"
      ondragstart="_onListDragStart(event,${l.id})"
      ondragover="_onListDragOver(event,${l.id})"
      ondrop="_onListDrop(event,${l.id})"
      ondragend="_onListDragEnd()"
      title="Drag to reorder"
      style="cursor:pointer;">
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

function renderChecklist(){
  const main=document.getElementById('checklistMain'), list=lists.find(l=>l.id===activeList);
  if(!list) return;
  const top=list.tasks.filter(t=>!t.pid);
  const dpts=list.tasks.reduce((a,t)=>a+(t.done?t.pts:0),0), tpts=list.tasks.reduce((a,t)=>a+t.pts,0);
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
      ondragover="_onTaskDragOver(event,null)"
      ondrop="_onTaskDrop(event,null)">${renderNodes(list.tasks,null)}</ul>
    <div class="add-task-row mt-3">
      <input type="text" id="newTaskInput" placeholder="Add a task... (Enter to add)" onkeydown="if(event.key==='Enter')addTask()">
      <div class="num-wrap"><input type="number" class="points-input" id="newTaskPts" value="10" min="1" max="100" title="Points"><div class="num-spin"><button class="spin-up" onclick="stepNum('newTaskPts',1)">▲</button><button onclick="stepNum('newTaskPts',-1)">▼</button></div></div>
      <button class="btn btn-primary" onclick="addTask()"><i data-lucide="plus" style="width:13px;height:13px;"></i></button>
    </div>`;
  lucide.createIcons();
  _initExpandBtns();
}

function renderNodes(tasks,pid,depth){
  depth=depth||0;
  return tasks.filter(t=>t.pid===pid).map(t=>{
    const kids=renderNodes(tasks,t.id,depth+1);
    const hasNote=t.note&&t.note.trim();
    return `<li class="task-item ${t.done?'done':''} ${t.pid?'sub':''}" id="task-li-${t.id}"
      draggable="true"
      ondragstart="_onTaskDragStart(event,${t.id})"
      ondragover="_onTaskDragOver(event,${t.id})"
      ondrop="_onTaskDrop(event,${t.id})"
      ondragend="_onTaskDragEnd()">
      <span class="task-drag-handle" title="Drag to reorder">⠿</span>
      <div class="task-check" onclick="toggleTask(${t.id})" role="checkbox" aria-checked="${t.done}">
        ${t.done?'<i data-lucide="check" style="width:11px;height:11px;"></i>':''}
      </div>
      <div class="task-body" style="flex:1;min-width:0;">
        <div style="display:flex;align-items:baseline;gap:var(--space-2);flex-wrap:wrap;">
          <span class="task-text" id="task-text-${t.id}">${t.text}</span>
          <span class="task-points">✦${t.pts}</span>
        </div>
        <button class="task-expand-btn" id="task-expbtn-${t.id}" onclick="toggleTaskExpand(${t.id})">Show more</button>
        ${hasNote?`<div class="task-note" id="task-note-${t.id}">${t.note}</div><button class="task-expand-btn" id="task-notebtn-${t.id}" onclick="toggleNoteExpand(${t.id})">Show more</button>`:`<div class="task-note" id="task-note-${t.id}" style="display:none;"></div>`}
        <textarea class="task-note-input" id="task-note-input-${t.id}" placeholder="Add a note..." onblur="saveNote(${t.id})">${t.note||''}</textarea>
        ${kids?`<ul class="task-tree" style="margin-top:var(--space-2);" ondragover="_onTaskDragOver(event,${t.id})" ondrop="_onTaskDrop(event,${t.id})">${kids}</ul>`:''}
        <div class="sub-add-row" id="sub-add-row-${t.id}">
          <input type="text" id="sub-input-${t.id}" placeholder="Subtask name..." style="flex:1;font-size:var(--text-xs);" onkeydown="if(event.key==='Enter')commitSub(${t.id});if(event.key==='Escape')cancelSub(${t.id})">
          <div class="num-wrap"><input type="number" id="sub-pts-${t.id}" value="5" min="1" max="100" style="width:48px;font-size:var(--text-xs);" title="Points"><div class="num-spin"><button class="spin-up" onclick="stepNum('sub-pts-${t.id}',1)">▲</button><button onclick="stepNum('sub-pts-${t.id}',-1)">▼</button></div></div>
          <button class="btn btn-primary btn-sm" onclick="commitSub(${t.id})">Add</button>
          <button class="btn btn-ghost btn-sm" onclick="cancelSub(${t.id})">✕</button>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-icon btn-ghost btn-sm" title="Edit" onclick="editTask(${t.id})"><i data-lucide="pencil" style="width:11px;height:11px;"></i></button>
        <button class="btn btn-icon btn-ghost btn-sm" title="Note" onclick="toggleNote(${t.id})"><i data-lucide="sticky-note" style="width:11px;height:11px;"></i></button>
        <button class="btn btn-icon btn-ghost btn-sm" title="Copy task" onclick="copyTask(${t.id})"><i data-lucide="copy" style="width:11px;height:11px;"></i></button>
        ${!t.pid?`<button class="btn btn-icon btn-ghost btn-sm" title="Add subtask" onclick="showSubAdd(${t.id})"><i data-lucide="corner-down-right" style="width:11px;height:11px;"></i></button>`:''}
        <button class="btn btn-icon btn-danger btn-sm" onclick="delTask(${t.id})"><i data-lucide="x" style="width:11px;height:11px;"></i></button>
      </div>
    </li>`;
  }).join('');
}

// ── TASK DRAG-REORDER ─────────────────────────────
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
  const list=lists.find(l=>l.id===activeList); if(!list) return;
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
function addTask(){
  const list=lists.find(l=>l.id===activeList); if(!list) return;
  const inp=document.getElementById('newTaskInput'), text=inp.value.trim(); if(!text) return;
  const pts=Math.max(1,parseInt(document.getElementById('newTaskPts').value)||10);
  list.tasks.push({id:tidxc++,text,pts,done:false,pid:null,note:''});
  inp.value='';
  renderChecklist(); renderLists();
  const newInp=document.getElementById('newTaskInput'); if(newInp) newInp.focus();
}
function showSubAdd(pid){
  const row=document.getElementById('sub-add-row-'+pid); if(!row) return;
  const wasVisible=row.classList.contains('visible');
  document.querySelectorAll('.sub-add-row.visible').forEach(r=>r.classList.remove('visible'));
  if(!wasVisible){ row.classList.add('visible'); const inp=document.getElementById('sub-input-'+pid); if(inp) inp.focus(); }
}
function commitSub(pid){
  const inp=document.getElementById('sub-input-'+pid); if(!inp) return;
  const text=inp.value.trim(); if(!text) return;
  const ptsEl=document.getElementById('sub-pts-'+pid);
  const pts=Math.max(1,parseInt(ptsEl?.value)||5);
  const list=lists.find(l=>l.id===activeList);
  list.tasks.push({id:tidxc++,text,pts,done:false,pid,note:''});
  inp.value=''; renderChecklist(); renderLists();
  requestAnimationFrame(()=>{
    const row=document.getElementById('sub-add-row-'+pid);
    if(row){ row.classList.add('visible'); const ni=document.getElementById('sub-input-'+pid); if(ni) ni.focus(); }
  });
}
function cancelSub(pid){ const row=document.getElementById('sub-add-row-'+pid); if(row) row.classList.remove('visible'); }
function editTask(id){
  const list=lists.find(l=>l.id===activeList); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  const span=document.getElementById('task-text-'+id); if(!span) return;
  const oldText=t.text;
  span.outerHTML=`<input class="task-edit-input" id="task-edit-${id}" value="${oldText.replace(/"/g,'&quot;')}" onblur="saveEdit(${id})" onkeydown="if(event.key==='Enter')saveEdit(${id});if(event.key==='Escape'){this.value='${oldText.replace(/'/g,"\\'")}';saveEdit(${id});}">`;
  const inp=document.getElementById('task-edit-'+id); if(inp){ inp.focus(); inp.select(); }
}
function saveEdit(id){
  const inp=document.getElementById('task-edit-'+id); if(!inp) return;
  const val=inp.value.trim();
  const list=lists.find(l=>l.id===activeList); if(!list) return;
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
  const list=lists.find(l=>l.id===activeList); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  t.note=area.value.trim(); renderChecklist();
}
function copyTask(id){
  const list=lists.find(l=>l.id===activeList); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  const newPid=tidxc++;
  list.tasks.push({id:newPid,text:t.text+' (copy)',pts:t.pts,done:false,pid:t.pid,note:t.note||''});
  list.tasks.filter(x=>x.pid===id).forEach(s=>{ list.tasks.push({id:tidxc++,text:s.text,pts:s.pts,done:false,pid:newPid,note:s.note||''}); });
  renderChecklist(); renderLists(); showToast('Task copied!');
}
function duplicateList(id){
  const orig=lists.find(l=>l.id===id); if(!orig) return;
  const newId=lidx++; const newTasks=[]; const idMap={};
  orig.tasks.filter(t=>!t.pid).forEach(t=>{ const nid=tidxc++; idMap[t.id]=nid; newTasks.push({...t,id:nid,done:false}); });
  orig.tasks.filter(t=>t.pid).forEach(t=>{ newTasks.push({...t,id:tidxc++,pid:idMap[t.pid]||null,done:false}); });
  lists.push({id:newId,name:orig.name+' (copy)',icon:orig.icon,tasks:newTasks});
  renderLists(); selectList(newId); showToast(`"${orig.name}" duplicated!`);
}
function toggleTask(id){
  const list=lists.find(l=>l.id===activeList); if(!list) return;
  const task=list.tasks.find(t=>t.id===id); if(!task) return;
  task.done=!task.done;
  if(task.done){
    totalPts+=task.pts; updateHeaderPts();
    archNotify('task_done');
    showToast(`✦ +${task.pts} pts! "${task.text}",'success'`);
    list.tasks.filter(t=>t.pid===id&&!t.done).forEach(s=>{ s.done=true; totalPts+=s.pts; });
  } else {
    totalPts=Math.max(0,totalPts-task.pts); updateHeaderPts();
    list.tasks.filter(t=>t.pid===id).forEach(s=>s.done=false);
  }
  renderChecklist(); renderLists();
}
function delTask(id){ const list=lists.find(l=>l.id===activeList); list.tasks=list.tasks.filter(t=>t.id!==id&&t.pid!==id); renderChecklist(); renderLists(); }
function clearDone(){ const list=lists.find(l=>l.id===activeList); list.tasks=list.tasks.filter(t=>!t.done); renderChecklist(); renderLists(); }
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
function updateHeaderPts(){
  const hp=document.getElementById('headerPoints'); if(hp) hp.textContent=`✦ ${totalPts} pts`;
  const lvl=document.getElementById('owlLevel'); if(lvl) lvl.textContent=Math.floor(totalPts/100)+1;
  const wiz=document.getElementById('owlWisdom'); if(wiz) wiz.textContent=totalPts;
}
