// ── TIMERS ────────────────────────────────────────
let timers=[], tidx=1, tick=null;

document.getElementById('openAddTimer').addEventListener('click',()=>{
  document.getElementById('addTimerForm').style.cssText='display:flex;flex-direction:column;gap:var(--space-3);';
  document.getElementById('openAddTimer').style.display='none';
});
document.getElementById('cancelAddTimer').addEventListener('click',()=>{
  document.getElementById('addTimerForm').style.display='none';
  document.getElementById('openAddTimer').style.display='';
});

const REPEAT_TYPES=['none','daily','weekdays','weekly','custom'];
const REPEAT_LABELS={'none':'One-time','daily':'Daily','weekdays':'Weekdays','weekly':'Weekly','custom':'Custom'};

const PRESETS=[
  {label:'Pomodoro',dur:25*60,sound:'bell',emoji:'🍅',repeat:'none'},
  {label:'Short Break',dur:5*60,sound:'chime',emoji:'☕',repeat:'none'},
  {label:'Long Break',dur:15*60,sound:'harp',emoji:'🌿',repeat:'none'},
  {label:'Focus 45',dur:45*60,sound:'viola',emoji:'🎯',repeat:'none'},
  {label:'Drink Water',dur:30*60,sound:'chime',emoji:'💧',repeat:'daily'},
  {label:'Stand Up',dur:60*60,sound:'whistle',emoji:'🧘',repeat:'daily'},
];

document.addEventListener('DOMContentLoaded',()=>{
  const presetRow=document.getElementById('presetRow');
  if(presetRow){
    presetRow.innerHTML=PRESETS.map((p,i)=>`
      <button class="btn btn-ghost btn-sm" onclick="applyPreset(${i})">${p.emoji} ${p.label}</button>
    `).join('');
  }
});

function applyPreset(i){
  const p=PRESETS[i];
  const mins=Math.floor(p.dur/60), secs=p.dur%60;
  document.getElementById('timerName').value=p.label;
  document.getElementById('timerMins').value=mins;
  document.getElementById('timerSecs').value=secs;
  const snd=document.getElementById('timerSound');
  if(snd) snd.value=p.sound;
  const rep=document.getElementById('timerRepeat');
  if(rep){ rep.value=p.repeat; rep.dispatchEvent(new Event('change')); }
  document.getElementById('addTimerForm').style.cssText='display:flex;flex-direction:column;gap:var(--space-3);';
  document.getElementById('openAddTimer').style.display='none';
}

const repSel=document.getElementById('timerRepeat');
const repCustomArea=document.getElementById('repeatCustomArea');
if(repSel&&repCustomArea){
  repSel.addEventListener('change',()=>{
    repCustomArea.classList.toggle('visible',repSel.value==='custom');
  });
}

document.getElementById('addTimerForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('timerName').value.trim()||'Timer';
  const mins=parseInt(document.getElementById('timerMins').value)||0;
  const secs=parseInt(document.getElementById('timerSecs').value)||0;
  const dur=mins*60+secs; if(!dur) return showToast('Set a duration first','error');
  const sound=document.getElementById('timerSound').value;
  const repeatType=document.getElementById('timerRepeat').value;
  let repeatDays=[];
  if(repeatType==='custom'){
    document.querySelectorAll('.day-check:checked').forEach(cb=>repeatDays.push(cb.value));
    if(!repeatDays.length) return showToast('Pick at least one day','error');
  }
  timers.push({id:tidx++,name,dur,left:dur,sound,running:false,done:false,repeatType,repeatDays,orig:dur});
  renderTimers();
  document.getElementById('addTimerForm').style.display='none';
  document.getElementById('openAddTimer').style.display='';
  document.getElementById('timerName').value='';
  document.getElementById('timerMins').value=25;
  document.getElementById('timerSecs').value=0;
  showToast(`"${name}" added!`);
  archNotify('timer_add');
});

function renderTimers(){
  const wrap=document.getElementById('timersList');
  if(!timers.length){
    wrap.innerHTML='<p class="text-muted" style="text-align:center;padding:var(--space-8);">No timers yet. Add one above!</p>';
    return;
  }
  wrap.innerHTML=timers.map(t=>`
    <div class="timer-item${t.running?' running':''}${t.done?' done':''}" id="titem_${t.id}" data-tid="${t.id}">
      <div class="timer-header">
        <input class="timer-name-input" value="${escHtml(t.name)}" onchange="renameTimer(${t.id},this.value)">
        <div class="timer-controls">
          ${t.repeatType!=='none'?`<span class="badge">${REPEAT_LABELS[t.repeatType]||t.repeatType}</span>`:''}
          <span class="badge">${badgeForSound(t.sound)}</span>
          <button class="btn btn-ghost btn-sm" onclick="toggleEditPanel(${t.id})" title="Edit"><i data-lucide="settings" width="14" height="14"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="deleteTimer(${t.id})" title="Delete"><i data-lucide="trash-2" width="14" height="14"></i></button>
        </div>
      </div>
      <div class="timer-display${t.running?' running':''}${t.done?' done':''}">${fmtTime(t.left)}</div>
      <div class="timer-progress">
        <div class="timer-progress-fill" style="width:${(1-t.left/t.orig)*100}%"></div>
        ${t.orig!==t.dur?`<div class="timer-orig-marker" style="left:${((t.orig-t.dur)/t.orig*100).toFixed(1)}%"></div>`:''}
      </div>
      <div class="timer-meta">
        <span class="badge">${fmtDur(t.dur)}</span>
        ${t.done?'<span class="badge badge-success">Done ✓</span>':''}
      </div>
      <div class="timer-action-row">
        ${t.done
          ?`<button class="btn btn-secondary" onclick="resetTimer(${t.id})">↺ Reset</button>`
          :`<button class="btn ${t.running?'btn-secondary':'btn-primary'}" onclick="toggleTimer(${t.id})">${t.running?'⏸ Pause':'▶ Start'}</button>
            <button class="btn btn-ghost" onclick="resetTimer(${t.id})">↺</button>`
        }
      </div>
      <div class="timer-edit-panel" id="editPanel_${t.id}">
        ${renderEditPanel(t)}
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function renderEditPanel(t){
  const mins=Math.floor(t.dur/60), secs=t.dur%60;
  return `
    <div class="edit-form-grid">
      <div class="form-group">
        <label>Minutes</label>
        <div class="num-wrap">
          <input type="number" id="ep_mins_${t.id}" value="${mins}" min="0" max="999" onchange="applyEditDur(${t.id})">
          <div class="num-spin"><button class="spin-up" onclick="stepNum('ep_mins_${t.id}',1)">▲</button><button onclick="stepNum('ep_mins_${t.id}',-1)">▼</button></div>
        </div>
      </div>
      <div class="form-group">
        <label>Seconds</label>
        <div class="num-wrap">
          <input type="number" id="ep_secs_${t.id}" value="${secs}" min="0" max="59" onchange="applyEditDur(${t.id})">
          <div class="num-spin"><button class="spin-up" onclick="stepNum('ep_secs_${t.id}',1)">▲</button><button onclick="stepNum('ep_secs_${t.id}',-1)">▼</button></div>
        </div>
      </div>
    </div>
    <div class="time-slider-wrap">
      <input type="range" class="time-slider" id="ep_slider_${t.id}" min="0" max="${Math.max(t.dur,t.left,60)}" value="${t.left}" oninput="sliderSync(${t.id},this.value)">
      <div class="time-slider-labels"><span>0</span><span>${fmtDur(Math.max(t.dur,t.left,60))}</span></div>
    </div>
    <div class="adj-btns">
      <button class="adj-btn" onclick="adjLeft(${t.id},-60)">-1m</button>
      <button class="adj-btn" onclick="adjLeft(${t.id},-30)">-30s</button>
      <button class="adj-btn" onclick="adjLeft(${t.id},30)">+30s</button>
      <button class="adj-btn" onclick="adjLeft(${t.id},60)">+1m</button>
      <button class="adj-btn" onclick="adjLeft(${t.id},300)">+5m</button>
    </div>
    <div class="form-group" style="margin-top:var(--space-2);">
      <label>Alarm Sound</label>
      <select id="ep_sound_${t.id}" onchange="t_sound(${t.id},this.value)">
        <option value="none">None</option>
        ${SOUNDS.map(s=>`<option value="${s.id}"${t.sound===s.id?' selected':''}>${s.emoji} ${s.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Repeat</label>
      <select id="ep_rep_${t.id}" onchange="t_repeat(${t.id},this.value)">
        ${REPEAT_TYPES.map(r=>`<option value="${r}"${t.repeatType===r?' selected':''}>${REPEAT_LABELS[r]}</option>`).join('')}
      </select>
    </div>
  `;
}

function toggleEditPanel(id){
  const panel=document.getElementById('editPanel_'+id);
  if(!panel) return;
  panel.classList.toggle('open');
  lucide.createIcons();
}
function applyEditDur(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  const m=parseInt(document.getElementById('ep_mins_'+id)?.value)||0;
  const s=parseInt(document.getElementById('ep_secs_'+id)?.value)||0;
  t.dur=m*60+s; if(!t.running) t.left=t.dur; t.done=false;
  refreshTimerItem(id);
}
function sliderSync(id,val){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.left=parseInt(val); t.done=false;
  const d=document.querySelector(`#titem_${id} .timer-display`);
  if(d) d.textContent=fmtTime(t.left);
  const fill=document.querySelector(`#titem_${id} .timer-progress-fill`);
  if(fill) fill.style.width=`${(1-t.left/t.orig)*100}%`;
}
function adjLeft(id,delta){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.left=Math.max(0,t.left+delta); t.done=t.left<=0;
  refreshTimerItem(id);
}
function t_sound(id,val){ const t=timers.find(x=>x.id===id); if(t) t.sound=val; }
function t_repeat(id,val){ const t=timers.find(x=>x.id===id); if(t) t.repeatType=val; refreshTimerItem(id); }

function toggleTimer(id){
  const t=timers.find(x=>x.id===id); if(!t||t.done) return;
  if(actx()&&actx().state==='suspended') actx().resume();
  t.running=!t.running;
  if(t.running && !tick) tick=setInterval(tickAll,1000);
  else if(!timers.some(x=>x.running) && tick){ clearInterval(tick); tick=null; }
  refreshTimerItem(id);
}
function resetTimer(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.left=t.dur; t.running=false; t.done=false;
  if(!timers.some(x=>x.running)&&tick){ clearInterval(tick); tick=null; }
  refreshTimerItem(id);
}
function deleteTimer(id){
  askConfirm('Delete this timer?','Delete Timer','Delete',ok=>{
    if(!ok) return;
    timers=timers.filter(x=>x.id!==id);
    if(!timers.some(x=>x.running)&&tick){ clearInterval(tick); tick=null; }
    renderTimers();
  });
}
function renameTimer(id,val){ const t=timers.find(x=>x.id===id); if(t) t.name=val.trim()||t.name; }

function tickAll(){
  let changed=false;
  timers.forEach(t=>{
    if(!t.running||t.done) return;
    t.left--;
    if(t.left<=0){
      t.left=0; t.done=true; t.running=false;
      playSound(t.sound);
      archNotify('timer_done');
      awardPts(15);
      if(t.repeatType!=='none') scheduleRepeat(t);
    }
    changed=true;
  });
  if(changed){
    if(!timers.some(x=>x.running)&&tick){ clearInterval(tick); tick=null; }
    timers.forEach(t=>{ if(!t.done||t.left!==0) return; }); // noop cleanup
    // Lightweight DOM update
    timers.forEach(t=>{
      const d=document.querySelector(`#titem_${t.id} .timer-display`);
      if(d) d.textContent=fmtTime(t.left);
      const fill=document.querySelector(`#titem_${t.id} .timer-progress-fill`);
      if(fill) fill.style.width=`${Math.min(100,(1-t.left/Math.max(t.orig,1))*100)}%`;
    });
    // Re-render items that changed state
    timers.forEach(t=>{
      if(t.done){
        const el=document.getElementById('titem_'+t.id);
        if(el&&!el.classList.contains('done')){
          el.outerHTML=buildTimerHTML(t);
          lucide.createIcons();
        }
      }
    });
  }
}

function scheduleRepeat(t){
  setTimeout(()=>{
    t.left=t.dur; t.done=false; t.running=false;
    refreshTimerItem(t.id);
    showToast(`"${t.name}" reset for next ${REPEAT_LABELS[t.repeatType]} repeat`);
  }, 1500);
}

function refreshTimerItem(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  const el=document.getElementById('titem_'+id);
  if(!el) return;
  const wasOpen=document.getElementById('editPanel_'+id)?.classList.contains('open');
  el.outerHTML=buildTimerHTML(t);
  if(wasOpen){
    const newPanel=document.getElementById('editPanel_'+id);
    if(newPanel) newPanel.classList.add('open');
  }
  lucide.createIcons();
}

function buildTimerHTML(t){
  return `
    <div class="timer-item${t.running?' running':''}${t.done?' done':''}" id="titem_${t.id}" data-tid="${t.id}">
      <div class="timer-header">
        <input class="timer-name-input" value="${escHtml(t.name)}" onchange="renameTimer(${t.id},this.value)">
        <div class="timer-controls">
          ${t.repeatType!=='none'?`<span class="badge">${REPEAT_LABELS[t.repeatType]||t.repeatType}</span>`:''}
          <span class="badge">${badgeForSound(t.sound)}</span>
          <button class="btn btn-ghost btn-sm" onclick="toggleEditPanel(${t.id})" title="Edit"><i data-lucide="settings" width="14" height="14"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="deleteTimer(${t.id})" title="Delete"><i data-lucide="trash-2" width="14" height="14"></i></button>
        </div>
      </div>
      <div class="timer-display${t.running?' running':''}${t.done?' done':''}">${fmtTime(t.left)}</div>
      <div class="timer-progress">
        <div class="timer-progress-fill" style="width:${(1-t.left/t.orig)*100}%"></div>
      </div>
      <div class="timer-meta">
        <span class="badge">${fmtDur(t.dur)}</span>
        ${t.done?'<span class="badge badge-success">Done ✓</span>':''}
      </div>
      <div class="timer-action-row">
        ${t.done
          ?`<button class="btn btn-secondary" onclick="resetTimer(${t.id})">↺ Reset</button>`
          :`<button class="btn ${t.running?'btn-secondary':'btn-primary'}" onclick="toggleTimer(${t.id})">${t.running?'⏸ Pause':'▶ Start'}</button>
            <button class="btn btn-ghost" onclick="resetTimer(${t.id})">↺</button>`
        }
      </div>
      <div class="timer-edit-panel" id="editPanel_${t.id}">
        ${renderEditPanel(t)}
      </div>
    </div>`;
}

function fmtTime(s){ const m=Math.floor(s/60),ss=s%60; return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`; }
function fmtDur(s){
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;
  if(h) return `${h}h ${m}m`;
  if(m&&ss) return `${m}m ${ss}s`;
  if(m) return `${m}m`;
  return `${ss}s`;
}
function badgeForSound(s){
  const map={bell:'🔔',viola:'🎻',harp:'🎵',chime:'🎶',drum:'🥁',whistle:'🎷',none:'🔇'};
  return map[s]||'🔔';
}
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
