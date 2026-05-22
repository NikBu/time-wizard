// ── CHECKLISTS ────────────────────────────────────
let lists=[], lidx=1, tidxc=1, activeList=null, totalPts=0;

function openNewListModal(){ document.getElementById('newListModal').classList.remove('hidden'); document.getElementById('newListName').focus(); }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); }
function createList(){
  const name=document.getElementById('newListName').value.trim();
  if(!name){ showToast('Enter a list name.','error'); return; }
  const icon=document.getElementById('newListIcon').value, id=lidx++;
  lists.push({id,name,icon,tasks:[]});
  closeModal('newListModal');
  document.getElementById('newListName').value='';
  renderLists(); selectList(id); showToast(`"${name}" created!`);
}
function renderLists(){
  const sb=document.getElementById('listsSidebar');
  if(!lists.length){ sb.innerHTML='<p style="font-size:var(--text-xs);color:var(--color-text-faint);padding:var(--space-2);">No lists yet.</p>'; return; }
  sb.innerHTML=lists.map(l=>{
    const done=l.tasks.filter(t=>!t.pid&&t.done).length, tot=l.tasks.filter(t=>!t.pid).length;
    return `<div class="list-item-btn ${activeList===l.id?'active':''}" onclick="selectList(${l.id})" style="cursor:pointer;">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.icon} ${l.name}</span>
      <span class="list-count">${done}/${tot}</span>
      <span class="list-actions" onclick="event.stopPropagation()">
        <button class="btn btn-icon btn-ghost btn-sm" title="Duplicate list" onclick="duplicateList(${l.id})" style="width:22px;height:22px;"><i data-lucide="copy" style="width:10px;height:10px;"></i></button>
        <button class="btn btn-icon btn-danger btn-sm" title="Delete list" onclick="deleteList(${l.id})" style="width:22px;height:22px;"><i data-lucide="trash-2" style="width:10px;height:10px;"></i></button>
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
      <span class="checklist-title">${list.icon} ${list.name}</span>
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
    <ul class="task-tree" id="taskTree">${renderNodes(list.tasks,null)}</ul>
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
    return `<li class="task-item ${t.done?'done':''} ${t.pid?'sub':''}" id="task-li-${t.id}">
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
        ${kids?`<ul class="task-tree" style="margin-top:var(--space-2);">${kids}</ul>`:''}
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
function _checkOverflow(el){ return el && el.scrollHeight > el.clientHeight + 2; }
function _initExpandBtns(){
  requestAnimationFrame(()=>{
    document.querySelectorAll('.task-text').forEach(el=>{
      const id=el.id.replace('task-text-',''); const btn=document.getElementById('task-expbtn-'+id);
      if(btn){ btn.classList.toggle('visible', _checkOverflow(el)); }
    });
    document.querySelectorAll('.task-note').forEach(el=>{
      if(el.style.display==='none') return;
      const id=el.id.replace('task-note-',''); const btn=document.getElementById('task-notebtn-'+id);
      if(btn){ btn.classList.toggle('visible', _checkOverflow(el)); }
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
  renderChecklist(); renderLists();
}
function cancelSub(pid){ const row=document.getElementById('sub-add-row-'+pid); if(row) row.classList.remove('visible'); }
function editTask(id){
  const list=lists.find(l=>l.id===activeList); if(!list) return;
  const t=list.tasks.find(x=>x.id===id); if(!t) return;
  const span=document.getElementById('task-text-'+id); if(!span) return;
  const oldText=t.text;
  span.outerHTML=`<input class="task-edit-input" id="task-edit-${id}" value="${oldText.replace(/"/g,'&quot;')}" onblur="saveEdit(${id})" onkeydown="if(event.key==='Enter')saveEdit(${id});if(event.key==='Escape'){this.value='${oldText.replace(/'/g,"\\'")}';}saveEdit(${id});">`;
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
  const list=lists.find(l=>l.id===activeList), task=list.tasks.find(t=>t.id===id);
  task.done=!task.done;
  if(task.done){
    totalPts+=task.pts; updateHeaderPts();
    archOnTaskDone(task.pts);
    showToast(`✦ +${task.pts} pts! "${task.text}"`,'success');
    list.tasks.filter(t=>t.pid===id&&!t.done).forEach(s=>{ s.done=true; totalPts+=s.pts; });
  } else { totalPts=Math.max(0,totalPts-task.pts); updateHeaderPts(); list.tasks.filter(t=>t.pid===id).forEach(s=>s.done=false); }
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
