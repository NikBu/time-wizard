// ── TIMERS ────────────────────────────────────────
let timers=[], tidx=1, tick=null;

document.getElementById('openAddTimer').addEventListener('click',()=>{
  document.getElementById('addTimerForm').style.cssText='display:flex;flex-direction:column;gap:var(--space-3);';
  document.getElementById('openAddTimer').style.display='none';
  document.getElementById('timerPresets').style.display='none';
});
function hideAddForm(){
  document.getElementById('addTimerForm').style.display='none';
  document.getElementById('openAddTimer').style.display='inline-flex';
  document.getElementById('timerPresets').style.display='block';
}

function autoWrapNumbers(container){
  container.querySelectorAll('input[type=number]').forEach(inp=>{
    if(inp.closest('.num-wrap')) return;
    const wrap=document.createElement('div'); wrap.className='num-wrap';
    inp.parentNode.insertBefore(wrap,inp); wrap.appendChild(inp);
    const spin=document.createElement('div'); spin.className='num-spin';
    spin.innerHTML=`<button class="spin-up" onclick="stepNum('${inp.id}',1)">▲</button><button onclick="stepNum('${inp.id}',-1)">▼</button>`;
    wrap.appendChild(spin);
    if(inp.style.width) inp.style.borderRadius='';
  });
}
function handleRepeatChange(v){
  const area=document.getElementById('repeatCustomArea'), flds=document.getElementById('repeatCustomFields');
  flds.innerHTML='';
  area.classList.toggle('visible',v!=='once');
  if(v==='custom') flds.innerHTML='<span class="section-label">Sequence (minutes, comma-sep)</span><input type="text" id="cSeq" placeholder="e.g. 5, 30, 10" style="width:100%;margin-top:4px;">';
  else if(v==='fixed') flds.innerHTML='<span class="section-label">Repeat count (0 = infinite)</span><input type="number" id="cCount" value="0" min="0" style="width:100px;margin-top:4px;">';
  else if(v==='increase') flds.innerHTML='<span class="section-label">Step increase (min)</span><input type="number" id="cStep" value="5" min="1" style="width:80px;margin-top:4px;"> <span class="section-label" style="margin-top:8px;">Max repeats (0=inf)</span><input type="number" id="cMax" value="5" min="0" style="width:80px;margin-top:4px;">';
  else if(v==='decrease') flds.innerHTML='<span class="section-label">Step decrease (min)</span><input type="number" id="cDown" value="5" min="1" style="width:80px;margin-top:4px;"> <span class="section-label" style="margin-top:8px;">Min duration (min)</span><input type="number" id="cMin" value="1" min="1" style="width:80px;margin-top:4px;">';
  else if(v==='fibonacci') flds.innerHTML='<p style="font-size:var(--text-xs);color:var(--color-text-muted);">Intervals: 1, 1, 2, 3, 5, 8, 13 min (Fibonacci), cycling.</p>';
  else if(v==='random') flds.innerHTML='<div class="form-row"><div class="form-group"><label>Min (min)</label><input type="number" id="cRMin" value="5" min="1"></div><div class="form-group"><label>Max (min)</label><input type="number" id="cRMax" value="30" min="1"></div></div>';
  autoWrapNumbers(flds);
}

function getRepeatCfg(){
  const v=document.getElementById('timerRepeat').value, c={mode:v};
  if(v==='custom'){ const r=document.getElementById('cSeq')?.value||'5,30,10'; c.seq=(r.split(',').map(x=>parseFloat(x.trim())*60).filter(x=>x>0)); c.si=0; }
  else if(v==='fixed'){ c.count=parseInt(document.getElementById('cCount')?.value)||0; }
  else if(v==='increase'){ c.step=(parseFloat(document.getElementById('cStep')?.value)||5)*60; c.max=parseInt(document.getElementById('cMax')?.value)||5; c.base=0; }
  else if(v==='decrease'){ c.step=(parseFloat(document.getElementById('cDown')?.value)||5)*60; c.minDur=(parseFloat(document.getElementById('cMin')?.value)||1)*60; }
  else if(v==='fibonacci'){ c.fib=[60,60,120,180,300,480,780]; c.fi=0; }
  else if(v==='random'){ c.rMin=(parseFloat(document.getElementById('cRMin')?.value)||5)*60; c.rMax=(parseFloat(document.getElementById('cRMax')?.value)||30)*60; }
  return c;
}

function createTimer(){
  const h=parseInt(document.getElementById('timerHours').value)||0;
  const m=parseInt(document.getElementById('timerMins').value)||0;
  const s=parseInt(document.getElementById('timerSecs').value)||0;
  const tot=h*3600+m*60+s;
  if(tot<=0){ showToast('Set a duration first.','error'); return; }
  const name=document.getElementById('timerName').value.trim()||'Timer';
  const sound=document.getElementById('timerSound').value;
  const rep=getRepeatCfg();
  if(rep.mode==='increase') rep.base=tot;
  pushTimer({name,tot,sound,rep});
  hideAddForm();
}
function addPreset(min,sec,name,sound,mode){
  pushTimer({name,tot:min*60+sec,sound,rep:{mode,count:0,base:0,step:300}});
}
function pushTimer(o){
  const id=tidx++;
  timers.push({id,name:o.name,tot:o.tot,orig:o.tot,rem:o.tot,sound:o.sound,rep:JSON.parse(JSON.stringify(o.rep)),running:false,done:false,reps:0,capToMax:true});
  if(o.rep.mode==='increase') timers[timers.length-1].rep.base=o.tot;
  archNotify('timer_add');
  renderTimers(); showToast(`Timer "${o.name}" added!`);
}
function tickFn(){
  let needFullRender=false;
  timers.forEach(t=>{
    if(!t.running||t.done) return;
    t.rem--;
    if(t.rem<=0){
      t.rem=0; // clamp — never let display go negative
      if(!t.firing){
        t.firing=true;
        timerDone(t);
        needFullRender=true;
      }
    }
  });
  if(needFullRender){ renderTimers(); return; }
  timers.forEach(t=>{
    if(!t.running||t.done) return;
    const disp=document.querySelector('#titem_'+t.id+' .timer-display');
    if(disp) disp.textContent=fmt(t.rem);
    const pct=t.tot>0?Math.max(0,Math.min(100,100-(t.rem/t.tot)*100)):100;
    const bar=document.querySelector('#titem_'+t.id+' .timer-progress-fill');
    if(bar) bar.style.width=pct+'%';
    const slbl=document.getElementById('sliderLabel_'+t.id);
    if(slbl) slbl.textContent=fmt(t.rem);
    const slider=document.querySelector('#titem_'+t.id+' .time-slider');
    if(slider && document.activeElement!==slider) slider.value=t.rem;
  });
}
function timerDone(t){
  playSound(t.sound); duckMusicForAlarm(3000); archNotify('timer_done'); t.reps++;
  showToast(`⏰ "${t.name}" done! (×${t.reps})`,'success');
  const r=t.rep;
  if(r.mode==='once'){ t.running=false; t.done=true; }
  else if(r.mode==='fixed'){ if(r.count>0&&t.reps>=r.count){ t.running=false;t.done=true; } else { t.rem=Math.max(1,Math.round(t.tot)); } }
  else if(r.mode==='increase'){ if(r.max>0&&t.reps>=r.max){ t.running=false;t.done=true; } else { t.tot=Math.max(1,Math.round(r.base+r.step*t.reps)); t.rem=t.tot; } }
  else if(r.mode==='decrease'){ const nx=Math.round(t.tot-r.step); if(nx<r.minDur){ t.running=false;t.done=true; } else { t.tot=nx; t.rem=nx; } }
  else if(r.mode==='custom'){ r.si=(r.si+1)%r.seq.length; t.tot=Math.max(1,Math.round(r.seq[r.si])); t.rem=t.tot; }
  else if(r.mode==='fibonacci'){ r.fi=(r.fi+1)%r.fib.length; t.tot=Math.max(1,Math.round(r.fib[r.fi])); t.rem=t.tot; }
  else if(r.mode==='random'){ t.tot=Math.max(1,Math.floor(r.rMin+Math.random()*(r.rMax-r.rMin))); t.rem=t.tot; }
  else { t.rem=Math.max(1,Math.round(t.tot)); }
  t.firing=false; // clear guard so next cycle can fire
}
function toggleTimer(id){ const t=timers.find(x=>x.id===id); if(!t||t.done) return; t.running=!t.running; if(t.running){ archNotify('timer_add'); if(!tick) tick=setInterval(tickFn,1000); } else if(!timers.some(x=>x.running)){ clearInterval(tick); tick=null; } renderTimers(); }
function resetTimer(id){ const t=timers.find(x=>x.id===id); if(!t) return; t.running=false;t.done=false;t.rem=t.orig;t.tot=t.orig;t.reps=0;t.firing=false; if(!timers.some(x=>x.running)){ clearInterval(tick); tick=null; } renderTimers(); }
function deleteTimer(id){ timers=timers.filter(x=>x.id!==id); if(!timers.some(x=>x.running)){ clearInterval(tick); tick=null; } renderTimers(); }
function toggleEditPanel(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.editOpen=!t.editOpen; renderTimers();
}
function liveAdjustTimer(id, val){
  const t=timers.find(x=>x.id===id); if(!t||t.done) return;
  t.rem=parseInt(val);
  const lbl=document.getElementById('sliderLabel_'+id); if(lbl) lbl.textContent=fmt(t.rem);
  const disp=document.querySelector('#titem_'+id+' .timer-display'); if(disp) disp.textContent=fmt(t.rem);
  const pct=t.tot>0?Math.max(0,Math.min(100,100-(t.rem/t.tot)*100)):100;
  const bar=document.querySelector('#titem_'+id+' .timer-progress-fill'); if(bar) bar.style.width=pct+'%';
}
function nudgeTimer(id, delta){
  const t=timers.find(x=>x.id===id); if(!t||t.done) return;
  const newRem = t.rem + delta;
  if(t.capToMax){ t.rem = Math.max(0, Math.min(t.tot, newRem)); }
  else { t.rem = Math.max(0, newRem); if(t.rem > t.tot){ t.tot = t.rem; } }
  renderTimers();
}
function resetToBase(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.tot = t.orig; t.rem = Math.min(t.rem, t.orig); renderTimers();
}
function saveTimerEdit(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  const durInput=document.getElementById('eDur_'+id);
  const sndInput=document.getElementById('eSnd_'+id);
  const capInput=document.getElementById('eCap_'+id);
  if(durInput){ const newDur=Math.max(1,parseInt(durInput.value)||1)*60; t.orig=newDur; t.tot=newDur; if(!t.running) t.rem=newDur; }
  if(sndInput) t.sound=sndInput.value;
  if(capInput) t.capToMax=capInput.checked;
  t.editOpen=false;
  renderTimers(); showToast('Timer updated!');
}

function repeatSettingsPanel(t){
  const r=t.rep, reps=t.reps;
  const statusLine=reps>0?`<div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-2);">${cycleInfo(t)}</div>`:'';
  if(r.mode==='once') return statusLine||'';
  let fields='';
  if(r.mode==='fixed'){
    fields=`<div class="form-row" style="gap:var(--space-2);"><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Repeat count (0=∞)</label><div class="num-wrap" style="width:100%;"><input type="number" id="rp_count_${t.id}" value="${r.count||0}" min="0" style="width:100%;" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_count_${t.id}',1)">▲</button><button onclick="stepNum('rp_count_${t.id}',-1)">▼</button></div></div></div></div>`;
  } else if(r.mode==='increase'){
    fields=`<div class="form-row" style="gap:var(--space-2);"><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Step increase (min)</label><div class="num-wrap" style="width:100%;"><input type="number" id="rp_step_${t.id}" value="${r.step/60}" min="1" step="0.5" style="width:100%;" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_step_${t.id}',1)">▲</button><button onclick="stepNum('rp_step_${t.id}',-1)">▼</button></div></div></div><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Max repeats (0=∞)</label><div class="num-wrap" style="width:100%;"><input type="number" id="rp_max_${t.id}" value="${r.max||0}" min="0" style="width:100%;" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_max_${t.id}',1)">▲</button><button onclick="stepNum('rp_max_${t.id}',-1)">▼</button></div></div></div></div>`;
  } else if(r.mode==='decrease'){
    fields=`<div class="form-row" style="gap:var(--space-2);"><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Step decrease (min)</label><div class="num-wrap" style="width:100%;"><input type="number" id="rp_down_${t.id}" value="${r.step/60}" min="1" step="0.5" style="width:100%;" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_down_${t.id}',1)">▲</button><button onclick="stepNum('rp_down_${t.id}',-1)">▼</button></div></div></div><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Min duration (min)</label><div class="num-wrap" style="width:100%;"><input type="number" id="rp_min_${t.id}" value="${r.minDur/60}" min="0.5" step="0.5" style="width:100%;" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_min_${t.id}',1)">▲</button><button onclick="stepNum('rp_min_${t.id}',-1)">▼</button></div></div></div></div>`;
  } else if(r.mode==='custom'){
    const seqStr=(r.seq||[]).map(s=>(s/60).toFixed(0)).join(', ');
    const curIdx=(r.si||0);
    fields=`<div class="form-group"><label style="font-size:var(--text-xs);">Sequence (minutes, comma-separated)</label><input type="text" id="rp_seq_${t.id}" value="${seqStr}" style="width:100%;font-size:var(--text-xs);" onchange="liveRepSave(${t.id})"></div><div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1);">Current position: step ${curIdx+1} of ${(r.seq||[]).length} · next: ${fmt((r.seq||[])[curIdx]||0)}</div>`;
  } else if(r.mode==='fibonacci'){
    const fi=(r.fi||0); const fseq=r.fib||[60,60,120,180,300,480,780];
    fields=`<div style="font-size:var(--text-xs);color:var(--color-text-muted);">Sequence: ${fseq.map(s=>fmt(s)).join(' → ')}</div><div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:4px;">Current step: ${fi+1} · next: ${fmt(fseq[(fi+1)%fseq.length])}</div>`;
  } else if(r.mode==='random'){
    fields=`<div class="form-row" style="gap:var(--space-2);"><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Min (min)</label><div class="num-wrap" style="width:100%;"><input type="number" id="rp_rmin_${t.id}" value="${r.rMin/60}" min="1" step="1" style="width:100%;" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_rmin_${t.id}',1)">▲</button><button onclick="stepNum('rp_rmin_${t.id}',-1)">▼</button></div></div></div><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Max (min)</label><div class="num-wrap" style="width:100%;"><input type="number" id="rp_rmax_${t.id}" value="${r.rMax/60}" min="1" step="1" style="width:100%;" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_rmax_${t.id}',1)">▲</button><button onclick="stepNum('rp_rmax_${t.id}',-1)">▼</button></div></div></div></div>`;
  }
  return `<details style="font-size:var(--text-xs);"><summary style="cursor:pointer;font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-faint);margin-bottom:var(--space-2);user-select:none;">${repLabels[r.mode]} settings ${reps>0?`· ring #${reps+1}`:''}</summary>${statusLine}<div style="display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-2);">${fields}</div></details>`;
}
function liveRepSave(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  const r=t.rep;
  if(r.mode==='fixed'){ const v=document.getElementById('rp_count_'+id); if(v) r.count=parseInt(v.value)||0; }
  else if(r.mode==='increase'){ const s=document.getElementById('rp_step_'+id), m=document.getElementById('rp_max_'+id); if(s) r.step=Math.max(30,(parseFloat(s.value)||1)*60); if(m) r.max=parseInt(m.value)||0; }
  else if(r.mode==='decrease'){ const s=document.getElementById('rp_down_'+id), m=document.getElementById('rp_min_'+id); if(s) r.step=Math.max(30,(parseFloat(s.value)||1)*60); if(m) r.minDur=Math.max(30,(parseFloat(m.value)||0.5)*60); }
  else if(r.mode==='custom'){ const v=document.getElementById('rp_seq_'+id); if(v){ const seq=v.value.split(',').map(x=>parseFloat(x.trim())*60).filter(x=>x>0); if(seq.length) r.seq=seq; } }
  else if(r.mode==='random'){ const mn=document.getElementById('rp_rmin_'+id), mx=document.getElementById('rp_rmax_'+id); if(mn) r.rMin=Math.max(60,(parseFloat(mn.value)||1)*60); if(mx) r.rMax=Math.max(r.rMin+60,(parseFloat(mx.value)||r.rMin/60+1)*60); }
}
function cycleInfo(t){
  const r=t.rep, reps=t.reps;
  if(r.mode==='once') return `Ring once — completed ${reps} time${reps!==1?'s':''}`;
  if(r.mode==='fixed') return `Cycle ${reps+1}${r.count>0?' of '+r.count:''} · next: ${fmt(t.tot)}`;
  if(r.mode==='increase') return `Cycle ${reps+1}${r.max>0?' of '+r.max:''} · next interval: ${fmt(r.base+r.step*(reps+1))}`;
  if(r.mode==='decrease'){ const nx=t.tot-r.step; return `Cycle ${reps+1} · next: ${nx>0?fmt(nx):'last cycle'}`; }
  if(r.mode==='custom'){ const seq=r.seq||[]; const ni=(r.si+1)%seq.length; return `Custom step ${(r.si||0)+1} of ${seq.length} · next step (${ni+1}): ${fmt(seq[ni])}`; }
  if(r.mode==='fibonacci'){ const fi=(r.fi+1)%r.fib.length; return `Fibonacci cycle ${reps+1} · next: ${fmt(r.fib[fi])} (step ${fi+1})`; }
  if(r.mode==='random') return `Random · range ${fmt(r.rMin)}–${fmt(r.rMax)} · ring #${reps+1}`;
  return `Ring #${reps+1}`;
}
function fmt(s){ const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`; }
const repLabels={once:'Once',fixed:'Repeating',increase:'↑ Increasing',decrease:'↓ Decreasing',custom:'Custom Seq',fibonacci:'Fibonacci',random:'Random'};
const sndEmoji={bell:'🔔',viola:'🎻',harp:'🎵',chime:'🎶',drum:'🥁',whistle:'🎷',none:'🔇'};
function renderTimers(){
  const el=document.getElementById('timersList');
  if(!timers.length){ el.innerHTML='<div style="text-align:center;padding:var(--space-12);color:var(--color-text-faint);font-size:var(--text-sm);"><i data-lucide="timer" style="width:36px;height:36px;margin:0 auto var(--space-3);opacity:.3;"></i><p>No timers yet.</p></div>'; lucide.createIcons(); return; }
  el.innerHTML=timers.map(t=>{
    const pct=t.tot>0?Math.max(0,Math.min(100,100-(t.rem/t.tot)*100)):100;
    const cls=t.done?'done':t.running?'running':'';
    const editOpen=t.editOpen?'open':'';
    const builtinOpts=Object.entries(sndEmoji).map(([v,e])=>`<option value="${v}" ${t.sound===v?'selected':''}>${e} ${v}</option>`).join('');
    const customOpts=(_customSounds||[]).map((cs,i)=>`<option value="custom_${i}" ${t.sound===`custom_${i}`?'selected':''}>🎧 ${cs.name}</option>`).join('');
    return `<div class="timer-item ${cls}" id="titem_${t.id}">
      <div class="timer-header">
        <input class="timer-name-input" value="${t.name.replace(/"/g,'&quot;')}" onchange="timers.find(x=>x.id==${t.id}).name=this.value">
        <div class="timer-controls">
          <button class="btn btn-icon btn-ghost" onclick="toggleEditPanel(${t.id})" title="Edit"><i data-lucide="${t.editOpen?'chevron-up':'settings-2'}" style="width:13px;height:13px;"></i></button>
          <button class="btn btn-icon btn-ghost" onclick="resetTimer(${t.id})" title="Reset"><i data-lucide="rotate-ccw" style="width:13px;height:13px;"></i></button>
          <button class="btn btn-icon btn-danger" onclick="deleteTimer(${t.id})" title="Delete"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
        </div>
      </div>
      <div class="timer-display ${cls}">${t.done?'✓ Complete':fmt(t.rem)}</div>
      <div class="timer-progress"><div class="timer-progress-fill" style="width:${pct}%"></div>${t.tot>t.orig?`<div class="timer-orig-marker" style="right:${Math.round((1-t.orig/t.tot)*100)}%"></div>`:''}</div>
      <div class="timer-meta">
        <span class="badge">${sndEmoji[t.sound]||'🎧'} ${(_customSounds||[]).find((c,i)=>`custom_${i}`===t.sound)?.name||t.sound}</span>
        <span class="badge accent">${repLabels[t.rep.mode]||t.rep.mode}</span>
        ${t.reps>0?`<span class="badge gold">×${t.reps}</span>`:''}
      </div>
      <div class="timer-action-row">
        <button class="btn ${t.running?'btn-secondary':'btn-primary'}" onclick="toggleTimer(${t.id})">
          <i data-lucide="${t.running?'pause':'play'}" style="width:13px;height:13px;"></i>
          ${t.running?'Pause':t.done?'Done':'Start'}
        </button>
      </div>
      <div class="timer-edit-panel ${editOpen}" id="tedit_${t.id}">
        <div style="margin-bottom:var(--space-3);">${repeatSettingsPanel(t)}</div>
        <span class="section-label">Adjust remaining time</span>
        <div class="time-slider-wrap">
          <input type="range" class="time-slider" min="0" max="${Math.max(t.tot,t.rem)}" value="${t.rem}" oninput="liveAdjustTimer(${t.id},this.value)" onchange="liveAdjustTimer(${t.id},this.value)" ${t.done?'disabled':''}>
          <div class="time-slider-labels"><span>0:00</span><span id="sliderLabel_${t.id}">${fmt(t.rem)}</span><span>${fmt(t.tot)}</span></div>
        </div>
        <div class="adj-btns">
          <button class="adj-btn" onclick="nudgeTimer(${t.id},-300)">−5 min</button>
          <button class="adj-btn" onclick="nudgeTimer(${t.id},-60)">−1 min</button>
          <button class="adj-btn" onclick="nudgeTimer(${t.id},60)">+1 min</button>
          <button class="adj-btn" onclick="nudgeTimer(${t.id},300)">+5 min</button>
          <button class="adj-btn" onclick="nudgeTimer(${t.id},600)">+10 min</button>
          ${t.tot>t.orig?`<button class="adj-btn" onclick="resetToBase(${t.id})" style="border-color:var(--color-primary);color:var(--color-primary);">&#x21BA; Reset to ${fmt(t.orig)}</button>`:''}
        </div>
        <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);cursor:pointer;">
          <input type="checkbox" id="eCap_${t.id}" ${t.capToMax?'checked':''} style="width:14px;height:14px;accent-color:var(--color-primary);"> Cap adjustments to original duration
        </label>
        <span class="section-label">Edit settings</span>
        <div class="edit-form-grid">
          <div class="form-group"><label>Duration (min)</label><div class="num-wrap" style="width:100%;"><input type="number" id="eDur_${t.id}" value="${Math.round(t.orig/60)}" min="1" style="width:100%;"><div class="num-spin"><button class="spin-up" onclick="stepNum('eDur_${t.id}',1)">▲</button><button onclick="stepNum('eDur_${t.id}',-1)">▼</button></div></div></div>
          <div class="form-group"><label>Sound</label><select id="eSnd_${t.id}">${builtinOpts}${customOpts}</select></div>
        </div>
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
          <button class="btn btn-primary btn-sm" onclick="saveTimerEdit(${t.id})"><i data-lucide="save" style="width:12px;height:12px;"></i> Save</button>
          <button class="btn btn-secondary btn-sm" onclick="toggleEditPanel(${t.id})">Cancel</button>
        </div>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}
