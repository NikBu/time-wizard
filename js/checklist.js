// ── CHECKLIST STATE ────────────────────────────────
let lists = [];
let lidx = 1;
let tidxc = 1;
let activeList = null;

function createList(name='Untitled', icon='📋'){
  const id = lidx++;
  lists.push({ id, name: (name||'Untitled').trim(), icon, tasks: [] });
  renderLists(); selectList(id); showToast(`"${name}" created!`); scheduleSave();
}
function promptCreateList(){
  const name = prompt('New list name?');
  if(name===null) return;
  const trimmed = name.trim();
  if(!trimmed) return showToast('List name cannot be empty.', 'error');
  createList(trimmed, '📋');
}
function renameList(id){
  const list = lists.find(l=>l.id===id); if(!list) return;
  const name = prompt('Rename list:', list.name);
  if(name===null) return;
  const trimmed = name.trim();
  if(!trimmed) return showToast('List name cannot be empty.', 'error');
  list.name = trimmed; renderLists(); if(activeList===id) renderChecklist(); scheduleSave();
}
function deleteList(id){
  const list = lists.find(l=>l.id===id); if(!list) return;
  if(!confirm(`Delete list "${list.name}"?`)) return;
  lists = lists.filter(l=>l.id!==id);
  if(activeList===id) activeList = lists[0]?.id ?? null;
  renderLists(); renderChecklist(); if(activeList) selectList(activeList); scheduleSave();
}
function duplicateList(id){
  const list = lists.find(l=>l.id===id); if(!list) return;
  const nid = lidx++;
  const idMap = new Map();
  const tasks = list.tasks.map(t=>{
    const newId = tidxc++; idMap.set(t.id, newId);
    return {...t, id:newId};
  }).map(t=>({ ...t, pid: t.pid ? idMap.get(t.pid) : null }));
  lists.push({ id:nid, name:`${list.name} Copy`, icon:list.icon, tasks });
  renderLists(); showToast('List duplicated.', 'success'); scheduleSave();
}
function selectList(id){ activeList = id; renderLists(); renderChecklist(); scheduleSave(); }

function renderLists(){
  const host = $('#listsSidebar');
  host.innerHTML = lists.map(l=>{
    const done = l.tasks.filter(t=>t.done && !t.pid).length;
    const total = l.tasks.filter(t=>!t.pid).length;
    return `<button class="list-item-btn ${activeList===l.id?'active':''}" onclick="selectList(${l.id})">
      <span>${l.icon}</span><span>${escapeHtml(l.name)}</span>
      <span class="list-count">${done}/${total}</span>
      <span class="list-actions">
        <span class="icon-btn" onclick="event.stopPropagation(); renameList(${l.id})"><i data-lucide="pencil"></i></span>
        <span class="icon-btn" onclick="event.stopPropagation(); duplicateList(${l.id})"><i data-lucide="copy"></i></span>
        <span class="icon-btn" onclick="event.stopPropagation(); deleteList(${l.id})"><i data-lucide="trash-2"></i></span>
      </span>
    </button>`;
  }).join('');
  lucide.createIcons();
}

function renderChecklist(){
  const list = lists.find(l=>l.id===activeList);
  const host = $('#checklistPane');
  if(!list){ host.innerHTML = `<div class="card text-muted">No list selected.</div>`; return; }
  const top = list.tasks.filter(t=>!t.pid);
  const done = top.filter(t=>t.done).length;
  const total = Math.max(1, top.length);
  const pct = Math.round(done / total * 100);
  host.innerHTML = `
    <div class="checklist-header">
      <div>
        <div class="checklist-title">${escapeHtml(list.name)}</div>
        <div class="text-muted text-sm">${done}/${top.length} completed</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="promptAddTask()"><i data-lucide="plus"></i>Add task</button>
        <button class="btn btn-ghost btn-sm" onclick="clearDone()">Clear done</button>
      </div>
    </div>
    <div class="checklist-progress"><div class="checklist-progress-bar" style="width:${pct}%"></div></div>
    <div>${top.map(t=>renderTask(list,t)).join('')}</div>
  `;
  lucide.createIcons();
}

function renderTask(list, t){
  const children = list.tasks.filter(x=>x.pid===t.id);
  const collapsed = t.text.length > 120;
  const body = `
    <div class="task-item ${t.done?'done':''}">
      <input class="task-check" type="checkbox" ${t.done?'checked':''} onchange="toggleTask(${t.id})">
      <div style="flex:1;min-width:0;">
        <div>
          <span class="task-text ${collapsed?'collapsed':''}" id="task_text_${t.id}" onclick="editTask(${t.id})">${escapeHtml(t.text)}</span>
          ${collapsed ? `<button class="expand-btn" onclick="toggleExpandTask(${t.id})">more</button>` : ''}
        </div>
        <div class="task-meta">
          <span class="task-pts">${t.pts||0} pts</span>
          <button class="btn btn-ghost btn-sm" onclick="promptAddSubtask(${t.id})">Sub-task</button>
          <button class="btn btn-ghost btn-sm" onclick="editNote(${t.id})">Note</button>
        </div>
        ${t.note ? `<div class="task-note">${escapeHtml(t.note)}</div>` : ''}
        ${children.length ? `<div class="sub-indent">${children.map(st=>renderSubTask(list,st)).join('')}</div>` : ''}
      </div>
      <div class="task-actions">
        <button class="btn btn-ghost btn-icon" onclick="editTask(${t.id})"><i data-lucide="pencil"></i></button>
        <button class="btn btn-ghost btn-icon" onclick="delTask(${t.id})"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
  return body;
}
function renderSubTask(list,t){
  return `<div class="task-item ${t.done?'done':''}">
      <input class="task-check" type="checkbox" ${t.done?'checked':''} onchange="toggleTask(${t.id})">
      <div style="flex:1;min-width:0;">
        <div class="task-text" onclick="editTask(${t.id})">${escapeHtml(t.text)}</div>
        ${t.note ? `<div class="task-note">${escapeHtml(t.note)}</div>` : ''}
      </div>
      <div class="task-actions">
        <button class="btn btn-ghost btn-icon" onclick="editTask(${t.id})"><i data-lucide="pencil"></i></button>
        <button class="btn btn-ghost btn-icon" onclick="delTask(${t.id})"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
}

function promptAddTask(){
  const text = prompt('Task text?');
  if(text===null) return;
  const trimmed = text.trim();
  if(!trimmed) return showToast('Task text cannot be empty.', 'error');
  addTask(trimmed, null);
}
function promptAddSubtask(pid){
  const text = prompt('Sub-task text?');
  if(text===null) return;
  const trimmed = text.trim();
  if(!trimmed) return showToast('Task text cannot be empty.', 'error');
  addTask(trimmed, pid);
}
function addTask(text, pid=null){
  const list = lists.find(l=>l.id===activeList); if(!list) return;
  list.tasks.push({ id:tidxc++, text:(text||'').trim(), pts: pid?5:10, done:false, pid, note:'' });
  renderChecklist(); renderLists(); scheduleSave();
}
function toggleTask(id){
  const list = lists.find(l=>l.id===activeList); if(!list) return;
  const t = list.tasks.find(x=>x.id===id); if(!t) return;
  t.done = !t.done;
  if(!t.pid){ list.tasks.filter(x=>x.pid===t.id).forEach(st=>st.done=t.done); }
  renderChecklist(); renderLists(); scheduleSave();
}
function delTask(id){ const list=lists.find(l=>l.id===activeList); list.tasks=list.tasks.filter(t=>t.id!==id&&t.pid!==id); renderChecklist(); renderLists(); scheduleSave(); }
function editTask(id){
  const list = lists.find(l=>l.id===activeList); if(!list) return;
  const t = list.tasks.find(x=>x.id===id); if(!t) return;
  const text = prompt('Edit task:', t.text);
  if(text===null) return;
  const trimmed = text.trim();
  if(!trimmed) return showToast('Task text cannot be empty.', 'error');
  t.text = trimmed; renderChecklist(); scheduleSave();
}
function editNote(id){
  const list = lists.find(l=>l.id===activeList); if(!list) return;
  const t = list.tasks.find(x=>x.id===id); if(!t) return;
  const note = prompt('Task note:', t.note||'');
  if(note===null) return;
  t.note = note; renderChecklist(); scheduleSave();
}
function clearDone(){ const list=lists.find(l=>l.id===activeList); list.tasks=list.tasks.filter(t=>!t.done); renderChecklist(); renderLists(); scheduleSave(); }
function toggleExpandTask(id){
  const el = document.getElementById(`task_text_${id}`); if(!el) return;
  const btn = el.parentElement.querySelector('.expand-btn');
  el.classList.toggle('collapsed');
  if(btn) btn.textContent = el.classList.contains('collapsed') ? 'more' : 'less';
}

window.promptCreateList = promptCreateList;
window.renameList = renameList;
window.deleteList = deleteList;
window.duplicateList = duplicateList;
window.selectList = selectList;
window.promptAddTask = promptAddTask;
window.promptAddSubtask = promptAddSubtask;
window.toggleTask = toggleTask;
window.delTask = delTask;
window.editTask = editTask;
window.editNote = editNote;
window.clearDone = clearDone;
window.toggleExpandTask = toggleExpandTask;
