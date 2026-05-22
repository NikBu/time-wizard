// ── CHECKLISTS ────────────────────────────────────
let lists=[], lidx=1, tidxc=1, activeList=null, totalPts=0;



function openNewListModal(){ document.getElementById('newListModal').classList.remove('hidden'); document.getElementById('newListName').focus(); }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); }
function createList(){
  const name=document.getElementById('newListName').value.trim(); if(!name) return;
  const icon=document.querySelector('.icon-option.selected')?.dataset.icon||'📋';
  lists.push({id:lidx++,name,icon,tasks:[]});
  document.getElementById('newListName').value='';
  document.querySelector('.icon-option.selected')?.classList.remove('selected');
  closeModal('newListModal');
  renderLists();
  selectList(lists[lists.length-1].id);
}
document.querySelectorAll('.icon-option').forEach(el=>{
  el.addEventListener('click',()=>{
    document.querySelectorAll('.icon-option').forEach(x=>x.classList.remove('selected'));
    el.classList.add('selected');
  });
});

function renderLists(){
  const wrap=document.getElementById('listsSidebar');
  wrap.innerHTML=lists.map(l=>{
    const done=l.tasks.filter(t=>!t.pid&&t.done).length;
    const total=l.tasks.filter(t=>!t.pid).length;
    return `<button class="list-item-btn${l===activeList?' active':''}" onclick="selectList(${l.id})">
      <span>${l.icon} ${escHtml(l.name)}</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span class="list-count">${done}/${total}</span>
        <span class="list-actions">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();duplicateList(${l.id})" title="Duplicate">⧉</button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();askConfirm('Delete \'${escHtml(l.name)}\'?','Delete List','Delete',ok=>{if(ok){lists=lists.filter(x=>x.id!==${l.id});if(activeList?.id===${l.id})activeList=null;renderLists();renderTasks();}})" title="Delete">🗑</button>
        </span>
      </div>
    </button>`;
  }).join('');
}

function selectList(id){
  activeList=lists.find(l=>l.id===id)||null;
  renderLists();
  renderTasks();
}

function duplicateList(id){
  const src=lists.find(l=>l.id===id); if(!src) return;
  const copy={id:lidx++,name:src.name+' (copy)',icon:src.icon,
    tasks:src.tasks.map(t=>({...t,id:tidxc++}))};
  lists.push(copy); renderLists(); showToast('List duplicated');
}

function renderTasks(){
  const wrap=document.getElementById('tasksList');
  if(!activeList){ wrap.innerHTML='<p class="text-muted" style="text-align:center;padding:var(--space-8);">Select a list to see tasks.</p>'; updateStats(); return; }
  const roots=activeList.tasks.filter(t=>!t.pid);
  if(!roots.length){ wrap.innerHTML='<p class="text-muted" style="text-align:center;padding:var(--space-8);">No tasks yet. Add one below!</p>'; updateStats(); return; }
  wrap.innerHTML=roots.map(t=>buildTaskHTML(t)).join('');
  lucide.createIcons();
  updateStats();
}

function buildTaskHTML(t){
  const subs=activeList.tasks.filter(s=>s.pid===t.id);
  const longText=t.text.length>120;
  const longNote=t.note&&t.note.length>120;
  return `
    <li class="task-item${t.done?' done':''}" id="task_${t.id}">
      <div class="task-check" onclick="toggleTask(${t.id})">${t.done?'<i data-lucide="check" width="12" height="12"></i>':''}</div>
      <div class="task-body">
        <span class="task-text${longText?' has-more':''}"
              id="ttx_${t.id}" 
              ondblclick="startTaskEdit(${t.id})">${escHtml(t.text)}</span>${t.pts?`<span class="task-points">⭐${t.pts}</span>`:''}
        ${longText?`<button class="task-expand-btn visible" id="texp_${t.id}" onclick="toggleExpand(${t.id},'text')">Show more</button>`:''}
        ${t.note?`<div class="task-note${longNote?' has-more':''}" id="tnote_${t.id}">${escHtml(t.note)}</div>`:''}
        ${longNote?`<button class="task-expand-btn visible" id="nexp_${t.id}" onclick="toggleExpand(${t.id},'note')">Show more</button>`:''}
        <textarea class="task-note-input" id="tnoteInput_${t.id}" placeholder="Add a note…" onblur="saveNote(${t.id},this.value)">${escHtml(t.note||'')}</textarea>
      </div>
      <div class="task-actions">
        <button class="btn btn-ghost btn-sm" onclick="addSubTask(${t.id})" title="Add sub-task"><i data-lucide="plus" width="12" height="12"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="toggleNote(${t.id})" title="Note"><i data-lucide="file-text" width="12" height="12"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="askConfirm('Delete task?','Delete Task','Delete',ok=>{ if(ok) deleteTask(${t.id}); })" title="Delete"><i data-lucide="trash-2" width="12" height="12"></i></button>
      </div>
    </li>
    ${subs.map(s=>buildSubTaskHTML(s)).join('')}
    <div class="sub-add-row" id="subRow_${t.id}">
      <input type="text" id="subInp_${t.id}" placeholder="Sub-task…" style="flex:1;">
      <button class="btn btn-primary btn-sm" onclick="confirmSubTask(${t.id})">Add</button>
      <button class="btn btn-ghost btn-sm" onclick="cancelSubTask(${t.id})">✕</button>
    </div>
  `;
}

function buildSubTaskHTML(s){
  return `
    <li class="task-item sub${s.done?' done':''}" id="task_${s.id}">
      <div class="task-check" onclick="toggleTask(${s.id})">${s.done?'<i data-lucide="check" width="12" height="12"></i>':''}</div>
      <div class="task-body">
        <span class="task-text" id="ttx_${s.id}" ondblclick="startTaskEdit(${s.id})">${escHtml(s.text)}</span>
        ${s.pts?`<span class="task-points">⭐${s.pts}</span>`:''}
      </div>
      <div class="task-actions">
        <button class="btn btn-ghost btn-sm" onclick="askConfirm('Delete sub-task?','Delete','Delete',ok=>{ if(ok) deleteTask(${s.id}); })" title="Delete"><i data-lucide="trash-2" width="12" height="12"></i></button>
      </div>
    </li>
  `;
}

function toggleTask(id){
  const t=findTask(id); if(!t) return;
  t.done=!t.done;
  if(t.done){
    awardPts(t.pts||5);
    archNotify('task_done');
  }
  renderTasks();
}

function deleteTask(id){
  if(!activeList) return;
  activeList.tasks=activeList.tasks.filter(t=>t.id!==id&&t.pid!==id);
  renderTasks();
}

function addSubTask(pid){
  const row=document.getElementById('subRow_'+pid);
  if(row){ row.classList.add('visible'); document.getElementById('subInp_'+pid)?.focus(); }
}
function confirmSubTask(pid){
  const inp=document.getElementById('subInp_'+pid); if(!inp) return;
  const text=inp.value.trim(); if(!text) return;
  activeList.tasks.push({id:tidxc++,text,pts:0,done:false,pid,note:''});
  inp.value='';
  document.getElementById('subRow_'+pid)?.classList.remove('visible');
  renderTasks();
}
function cancelSubTask(pid){
  document.getElementById('subRow_'+pid)?.classList.remove('visible');
  const inp=document.getElementById('subInp_'+pid); if(inp) inp.value='';
}

function toggleNote(id){
  const inp=document.getElementById('tnoteInput_'+id);
  if(!inp) return;
  const visible=inp.classList.toggle('visible');
  if(visible) inp.focus();
}
function saveNote(id,val){
  const t=findTask(id); if(t) t.note=val;
  renderTasks();
}

function startTaskEdit(id){
  const span=document.getElementById('ttx_'+id); if(!span) return;
  const t=findTask(id); if(!t) return;
  const inp=document.createElement('input');
  inp.className='task-edit-input'; inp.value=t.text;
  span.replaceWith(inp); inp.focus();
  function finish(){ t.text=inp.value.trim()||t.text; renderTasks(); }
  inp.addEventListener('blur',finish);
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') inp.blur(); if(e.key==='Escape'){ inp.value=t.text; inp.blur(); } });
}

function toggleExpand(id,type){
  if(type==='text'){
    const el=document.getElementById('ttx_'+id);
    const btn=document.getElementById('texp_'+id);
    if(el){ el.classList.toggle('expanded'); btn&&(btn.textContent=el.classList.contains('expanded')?'Show less':'Show more'); }
  } else {
    const el=document.getElementById('tnote_'+id);
    const btn=document.getElementById('nexp_'+id);
    if(el){ el.classList.toggle('expanded'); btn&&(btn.textContent=el.classList.contains('expanded')?'Show less':'Show more'); }
  }
}

function findTask(id){ return activeList?.tasks.find(t=>t.id===id)||null; }

function updateStats(){
  if(!activeList){ document.getElementById('checklistTitle').textContent='Select a list'; document.getElementById('checklistStats').innerHTML=''; document.getElementById('checklistProgressFill').style.width='0%'; return; }
  const roots=activeList.tasks.filter(t=>!t.pid);
  const done=roots.filter(t=>t.done).length;
  const pct=roots.length?Math.round(done/roots.length*100):0;
  const pts=activeList.tasks.reduce((a,t)=>a+(t.done&&t.pts?t.pts:0),0);
  document.getElementById('checklistTitle').textContent=`${activeList.icon} ${activeList.name}`;
  document.getElementById('checklistProgressFill').style.width=pct+'%';
  document.getElementById('checklistStats').innerHTML=`
    <div class="stat-pill"><strong>${done}/${roots.length}</strong> tasks done</div>
    <div class="stat-pill"><strong>${pct}%</strong> complete</div>
    <div class="stat-pill"><strong>⭐${pts}</strong> points earned</div>
  `;
}

function awardPts(n){
  totalPts+=n;
  archXP(n);
  document.getElementById('globalPts').textContent=totalPts;
}

function addTask(){
  if(!activeList) return showToast('Select a list first','error');
  const inp=document.getElementById('newTaskInput');
  const ptsEl=document.getElementById('newTaskPts');
  const text=inp.value.trim(); if(!text) return;
  const pts=parseInt(ptsEl.value)||5;
  activeList.tasks.push({id:tidxc++,text,pts,done:false,pid:null,note:''});
  inp.value=''; ptsEl.value=5;
  renderTasks();
  archNotify('task_add');
}

document.getElementById('newTaskInput')?.addEventListener('keydown',e=>{ if(e.key==='Enter') addTask(); });
