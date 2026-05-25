// ── TIMERS ────────────────────────────────────────────────────────────────
let timers=[], tidx=1;
let _lastTouchedId=null;

// ── Background-safe ticker via Web Worker ─────────────────────────────────
const _tickWorkerBlob = new Blob([`
  let iv = null;
  self.onmessage = function(e) {
    if (e.data === 'start' && !iv) {
      iv = setInterval(() => self.postMessage('tick'), 200);
    } else if (e.data === 'stop') {
      clearInterval(iv); iv = null;
    }
  };
`], { type: 'application/javascript' });
const _tickWorkerURL = URL.createObjectURL(_tickWorkerBlob);
let _tickWorker = null;

function startTickWorker() {
  if (_tickWorker) return;
  _tickWorker = new Worker(_tickWorkerURL);
  _tickWorker.onmessage = () => tickAll();
  _tickWorker.postMessage('start');
}
function stopTickWorker() {
  if (!_tickWorker) return;
  _tickWorker.postMessage('stop');
  _tickWorker.terminate();
  _tickWorker = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const now = Date.now();
    timers.forEach(t => { if (t.running) t.lastTick = now; });
  }
});

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
  timers.push({id,name:o.name,tot:o.tot,orig:o.tot,rem:o.tot,sound:o.sound,rep:JSON.parse(JSON.stringify(o.rep)),running:false,done:false,reps:0,capToMax:true,lastTick:null});
  if(o.rep.mode==='increase') timers[timers.length-1].rep.base=o.tot;
  _lastTouchedId=id;
  archNotify('timer_add');
  renderTimers(); updateHeaderTimer(); showToast(`Timer "${o.name}" added!`);
}

// ── Slider fill helper ─────────────────────────────────────────────────────
function updateSliderFill(slider, rem, tot) {
  const max = Math.max(tot, parseFloat(slider.max) || tot);
  const pct = max > 0 ? Math.max(0, Math.min(100, (rem / max) * 100)) : 0;
  slider.style.setProperty('--slider-pct', pct.toFixed(2) + '%');
}

// ── Core tick ──────────────────────────────────────────────────────────────
function tickAll(){
  const now = Date.now();
  let needFullRender = false;

  timers.forEach(t => {
    if (!t.running || t.done) return;
    if (t.lastTick === null) { t.lastTick = now; return; }
    const elapsed = (now - t.lastTick) / 1000;
    t.lastTick = now;
    t.rem = Math.max(0, t.rem - elapsed);
    if (t.rem <= 0) { t.rem = 0; timerDone(t); needFullRender = true; }
  });

  if (needFullRender) { renderTimers(); updateHeaderTimer(); return; }

  timers.forEach(t => {
    if (!t.running || t.done) return;
    const remInt = Math.ceil(t.rem);
    const disp = document.querySelector('#titem_'+t.id+' .timer-display');
    if (disp) disp.textContent = fmt(remInt);
    const slbl = document.getElementById('sliderLabel_'+t.id);
    if (slbl) slbl.textContent = fmt(remInt);
    const slider = document.querySelector('#titem_'+t.id+' .time-slider');
    if (slider && document.activeElement !== slider) {
      slider.value = t.rem;
      updateSliderFill(slider, t.rem, t.tot);
    }
    // always patch dropdown rows, open or not — fixes stale times on re-open
    const rowTime = document.getElementById('htdTime_'+t.id);
    if (rowTime) rowTime.textContent = fmt(remInt);
  });
  updateHeaderTimer();
}

function timerDone(t){
  playSound(t.sound); archNotify('timer_done'); t.reps++;
  showToast(`⏰ "${t.name}" done! (×${t.reps})`,'success');
  const r=t.rep;
  if(r.mode==='once'){
    t.running=false; t.rem=t.orig; t.tot=t.orig;
  } else if(r.mode==='fixed'){
    if(r.count>0&&t.reps>=r.count){ t.running=false; t.rem=t.orig; t.tot=t.orig; }
    else { t.rem=t.tot; t.lastTick=Date.now(); }
  } else if(r.mode==='increase'){
    if(r.max>0&&t.reps>=r.max){ t.running=false; t.rem=t.orig; t.tot=t.orig; }
    else { t.tot=r.base+r.step*t.reps; t.rem=t.tot; t.lastTick=Date.now(); }
  } else if(r.mode==='decrease'){
    const nx=t.tot-r.step;
    if(nx<r.minDur){ t.running=false; t.rem=t.orig; t.tot=t.orig; }
    else { t.tot=nx; t.rem=nx; t.lastTick=Date.now(); }
  } else if(r.mode==='custom'){
    r.si=(r.si+1)%r.seq.length; t.tot=r.seq[r.si]; t.rem=t.tot; t.lastTick=Date.now();
  } else if(r.mode==='fibonacci'){
    r.fi=(r.fi+1)%r.fib.length; t.tot=r.fib[r.fi]; t.rem=t.tot; t.lastTick=Date.now();
  } else if(r.mode==='random'){
    t.tot=Math.floor(r.rMin+Math.random()*(r.rMax-r.rMin)); t.rem=t.tot; t.lastTick=Date.now();
  } else {
    t.rem=t.tot; t.lastTick=Date.now();
  }
  if(!timers.some(x=>x.running)) stopTickWorker();
}

function toggleTimer(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.running=!t.running;
  _lastTouchedId=id;
  if(t.running){ t.lastTick=Date.now(); archNotify('timer_add'); startTickWorker(); }
  else if(!timers.some(x=>x.running)){ stopTickWorker(); }
  renderTimers(); updateHeaderTimer();
}
function resetTimer(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.running=false; t.rem=t.orig; t.tot=t.orig; t.reps=0; t.lastTick=null;
  _lastTouchedId=id;
  if(!timers.some(x=>x.running)) stopTickWorker();
  renderTimers(); updateHeaderTimer();
}
function deleteTimer(id){
  timers=timers.filter(x=>x.id!==id);
  if(_lastTouchedId===id) _lastTouchedId = timers.length ? timers[timers.length-1].id : null;
  if(!timers.some(x=>x.running)) stopTickWorker();
  renderTimers(); updateHeaderTimer();
}
function toggleEditPanel(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.editOpen=!t.editOpen; renderTimers();
}
function liveAdjustTimer(id, val){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.rem=parseFloat(val);
  _lastTouchedId=id;
  const lbl=document.getElementById('sliderLabel_'+id); if(lbl) lbl.textContent=fmt(Math.ceil(t.rem));
  const disp=document.querySelector('#titem_'+id+' .timer-display'); if(disp) disp.textContent=fmt(Math.ceil(t.rem));
  const slider=document.querySelector('#titem_'+id+' .time-slider'); if(slider) updateSliderFill(slider, t.rem, t.tot);
  updateHeaderTimer();
}
function nudgeTimer(id, delta){
  const t=timers.find(x=>x.id===id); if(!t) return;
  _lastTouchedId=id;
  const newRem = t.rem + delta;
  if(t.capToMax){ t.rem = Math.max(0, Math.min(t.tot, newRem)); }
  else { t.rem = Math.max(0, newRem); if(t.rem > t.tot){ t.tot = t.rem; } }
  renderTimers(); updateHeaderTimer();
}
function resetToBase(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.tot = t.orig; t.rem = Math.min(t.rem, t.orig); renderTimers();
}
function setCapToMax(id, checked){
  const t=timers.find(x=>x.id===id); if(!t) return;
  t.capToMax=checked;
  if(checked && t.rem > t.tot){ t.rem = t.tot; renderTimers(); }
}

function saveTimerEdit(id){
  const t=timers.find(x=>x.id===id); if(!t) return;
  const hrInput =document.getElementById('eDurHr_'+id);
  const minInput=document.getElementById('eDurMin_'+id);
  const secInput=document.getElementById('eDurSec_'+id);
  const sndInput=document.getElementById('eSnd_'+id);
  if(hrInput||minInput||secInput){
    const hrs =Math.max(0,parseInt(hrInput?.value)||0);
    const mins=Math.max(0,parseInt(minInput?.value)||0);
    const secs=Math.max(0,Math.min(59,parseInt(secInput?.value)||0));
    const newDur=Math.max(1, hrs*3600+mins*60+secs);
    t.orig=newDur; t.tot=newDur; if(!t.running) t.rem=newDur;
  }
  if(sndInput) t.sound=sndInput.value;
  t.editOpen=false;
  renderTimers(); updateHeaderTimer(); showToast('Timer updated!');
}

function repeatSettingsPanel(t){
  const r=t.rep, reps=t.reps;
  const statusLine=reps>0?`<div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-2);">${cycleInfo(t)}</div>`:'';
  if(r.mode==='once') return statusLine||'';
  let fields='';
  if(r.mode==='fixed'){
    fields=`<div class="form-row" style="gap:var(--space-2);"><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Repeat count (0=∞)</label><div class="num-wrap"><input type="number" id="rp_count_${t.id}" value="${r.count||0}" min="0" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_count_${t.id}',1)">▲</button><button onclick="stepNum('rp_count_${t.id}',-1)">▼</button></div></div></div></div>`;
  } else if(r.mode==='increase'){
    fields=`<div class="form-row" style="gap:var(--space-2);"><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Step increase (min)</label><div class="num-wrap"><input type="number" id="rp_step_${t.id}" value="${r.step/60}" min="1" step="0.5" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_step_${t.id}',1)">▲</button><button onclick="stepNum('rp_step_${t.id}',-1)">▼</button></div></div></div><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Max repeats (0=∞)</label><div class="num-wrap"><input type="number" id="rp_max_${t.id}" value="${r.max||0}" min="0" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_max_${t.id}',1)">▲</button><button onclick="stepNum('rp_max_${t.id}',-1)">▼</button></div></div></div></div>`;
  } else if(r.mode==='decrease'){
    fields=`<div class="form-row" style="gap:var(--space-2);"><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Step decrease (min)</label><div class="num-wrap"><input type="number" id="rp_down_${t.id}" value="${r.step/60}" min="1" step="0.5" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_down_${t.id}',1)">▲</button><button onclick="stepNum('rp_down_${t.id}',-1)">▼</button></div></div></div><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Min duration (min)</label><div class="num-wrap"><input type="number" id="rp_min_${t.id}" value="${r.minDur/60}" min="0.5" step="0.5" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_min_${t.id}',1)">▲</button><button onclick="stepNum('rp_min_${t.id}',-1)">▼</button></div></div></div></div>`;
  } else if(r.mode==='custom'){
    const seqStr=(r.seq||[]).map(s=>(s/60).toFixed(0)).join(', ');
    const curIdx=(r.si||0);
    fields=`<div class="form-group"><label style="font-size:var(--text-xs);">Sequence (minutes, comma-separated)</label><input type="text" id="rp_seq_${t.id}" value="${seqStr}" style="width:100%;font-size:var(--text-xs);" onchange="liveRepSave(${t.id})"></div><div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1);">Current position: step ${curIdx+1} of ${(r.seq||[]).length} · next: ${fmt((r.seq||[])[curIdx]||0)}</div>`;
  } else if(r.mode==='fibonacci'){
    const fi=(r.fi||0); const fseq=r.fib||[60,60,120,180,300,480,780];
    fields=`<div style="font-size:var(--text-xs);color:var(--color-text-muted);">Sequence: ${fseq.map(s=>fmt(s)).join(' → ')}</div><div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:4px;">Current step: ${fi+1} · next: ${fmt(fseq[(fi+1)%fseq.length])}</div>`;
  } else if(r.mode==='random'){
    fields=`<div class="form-row" style="gap:var(--space-2);"><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Min (min)</label><div class="num-wrap"><input type="number" id="rp_rmin_${t.id}" value="${r.rMin/60}" min="1" step="1" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_rmin_${t.id}',1)">▲</button><button onclick="stepNum('rp_rmin_${t.id}',-1)">▼</button></div></div></div><div class="form-group" style="flex:1;"><label style="font-size:var(--text-xs);">Max (min)</label><div class="num-wrap"><input type="number" id="rp_rmax_${t.id}" value="${r.rMax/60}" min="1" step="1" onchange="liveRepSave(${t.id})"><div class="num-spin"><button class="spin-up" onclick="stepNum('rp_rmax_${t.id}',1)">▲</button><button onclick="stepNum('rp_rmax_${t.id}',-1)">▼</button></div></div></div></div>`;
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
function fmt(s){ s=Math.max(0,Math.round(s)); const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`; }
const repLabels={once:'Once',fixed:'Repeating',increase:'↑ Increasing',decrease:'↓ Decreasing',custom:'Custom Seq',fibonacci:'Fibonacci',random:'Random'};
const sndEmoji={bell:'🔔',trombone:'🎺',harp:'🎵',chime:'🎶',drum:'🥁',bounce:'🎷',none:'🔇'};

function renderTimers(){
  const el=document.getElementById('timersList');
  if(!timers.length){ el.innerHTML='<div style="text-align:center;padding:var(--space-12);color:var(--color-text-faint);font-size:var(--text-sm);"><i data-lucide="timer" style="width:36px;height:36px;margin:0 auto var(--space-3);opacity:.3;"></i><p>No timers yet.</p></div>'; lucide.createIcons(); return; }
  el.innerHTML=timers.map(t=>{
    const remInt=Math.ceil(t.rem);
    const sliderMax=Math.max(t.tot,t.rem);
    const sliderPct=sliderMax>0?Math.max(0,Math.min(100,(t.rem/sliderMax)*100)):0;
    const cls=t.running?'running':'';
    const editOpen=t.editOpen?'open':'';
    const builtinOpts=[
      ['bell','🔔','Low Ominous Bell'],
      ['trombone','🎺','Trombone Tune'],
      ['harp','🎵','Harp Tune'],
      ['chime','🎶','Crystal Chime'],
      ['drum','🥁','Deep Drum'],
      ['bounce','🎷','Bounce'],
      ['none','🔇','Silent'],
    ].map(([v,e,l])=>`<option value="${v}" ${t.sound===v?'selected':''}>${e} ${l}</option>`).join('');
    const customOpts=(_customSounds||[]).map((cs,i)=>`<option value="custom_${i}" ${t.sound===`custom_${i}`?'selected':''}>🎧 ${cs.name}</option>`).join('');
    const editHrs =Math.floor(t.orig/3600);
    const editMins=Math.floor((t.orig%3600)/60);
    const editSecs=t.orig%60;
    const origMarkerPct=sliderMax>0?(t.orig/sliderMax*100).toFixed(2):0;
    const origMarker=t.tot>t.orig
      ? `<div class="slider-orig-marker" style="left:${origMarkerPct}%"></div>`
      : '';
    return `<div class="timer-item ${cls}" id="titem_${t.id}">
      <div class="timer-header">
        <input class="timer-name-input" value="${t.name.replace(/"/g,'&quot;')}" onchange="timers.find(x=>x.id==${t.id}).name=this.value;updateHeaderTimer();">
        <div class="timer-controls">
          <button class="btn btn-icon btn-ghost" onclick="toggleEditPanel(${t.id})" title="Settings"><i data-lucide="${t.editOpen?'chevron-up':'settings-2'}" style="width:13px;height:13px;"></i></button>
          <button class="btn btn-icon btn-ghost" onclick="resetTimer(${t.id})" title="Reset"><i data-lucide="rotate-ccw" style="width:13px;height:13px;"></i></button>
          <button class="btn btn-icon btn-danger" onclick="deleteTimer(${t.id})" title="Delete"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
        </div>
      </div>
      <div class="timer-display ${cls}">${fmt(remInt)}</div>
      <div class="time-slider-wrap">
        <input type="range" class="time-slider" min="0" max="${sliderMax}" value="${t.rem}"
          style="--slider-pct:${sliderPct.toFixed(2)}%"
          oninput="liveAdjustTimer(${t.id},this.value)"
          onchange="liveAdjustTimer(${t.id},this.value)">
        ${origMarker}
        <div class="time-slider-labels"><span>0:00</span><span id="sliderLabel_${t.id}">${fmt(remInt)}</span><span>${fmt(t.tot)}</span></div>
      </div>
      <div class="adj-btns">
        <button class="adj-btn" onclick="nudgeTimer(${t.id},-300)">−5 min</button>
        <button class="adj-btn" onclick="nudgeTimer(${t.id},-60)">−1 min</button>
        <button class="adj-btn" onclick="nudgeTimer(${t.id},60)">+1 min</button>
        <button class="adj-btn" onclick="nudgeTimer(${t.id},300)">+5 min</button>
        <button class="adj-btn" onclick="nudgeTimer(${t.id},600)">+10 min</button>
        ${t.tot>t.orig?`<button class="adj-btn" onclick="resetToBase(${t.id})" style="border-color:var(--color-primary);color:var(--color-primary);">&#x21BA; Reset to ${fmt(t.orig)}</button>`:''}
      </div>
      <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-2);cursor:pointer;">
        <input type="checkbox" id="eCap_${t.id}" ${t.capToMax?'checked':''} onchange="setCapToMax(${t.id},this.checked)" style="width:14px;height:14px;accent-color:var(--color-primary);"> Cap adjustments to original duration
      </label>
      <div class="timer-meta" style="margin-top:var(--space-3);">
        <span class="badge">${sndEmoji[t.sound]||'🎧'} ${(_customSounds||[]).find((c,i)=>`custom_${i}`===t.sound)?.name||t.sound}</span>
        <span class="badge accent">${repLabels[t.rep.mode]||t.rep.mode}</span>
        ${t.reps>0?`<span class="badge gold">×${t.reps}</span>`:''}
      </div>
      <div class="timer-action-row">
        <button class="btn ${t.running?'btn-secondary':'btn-primary'}" onclick="toggleTimer(${t.id})">
          <i data-lucide="${t.running?'pause':'play'}" style="width:13px;height:13px;"></i>
          ${t.running?'Pause':'Start'}
        </button>
      </div>
      <div class="timer-edit-panel ${editOpen}" id="tedit_${t.id}">
        <span class="section-label">Repeat</span>
        <div style="margin-bottom:var(--space-3);">${repeatSettingsPanel(t)}</div>
        <span class="section-label">Duration &amp; Sound</span>
        <div class="edit-form-grid" style="margin-top:var(--space-2);">
          <div class="form-group">
            <label>Duration</label>
            <div class="dur-hms">
              <div class="dur-field">
                <label>hr</label>
                <div class="num-wrap"><input type="number" id="eDurHr_${t.id}" value="${editHrs}" min="0"><div class="num-spin"><button class="spin-up" onclick="stepNum('eDurHr_${t.id}',1)">▲</button><button onclick="stepNum('eDurHr_${t.id}',-1)">▼</button></div></div>
              </div>
              <div class="dur-field">
                <label>min</label>
                <div class="num-wrap"><input type="number" id="eDurMin_${t.id}" value="${editMins}" min="0"><div class="num-spin"><button class="spin-up" onclick="stepNum('eDurMin_${t.id}',1)">▲</button><button onclick="stepNum('eDurMin_${t.id}',-1)">▼</button></div></div>
              </div>
              <div class="dur-field">
                <label>sec</label>
                <div class="num-wrap"><input type="number" id="eDurSec_${t.id}" value="${editSecs}" min="0" max="59"><div class="num-spin"><button class="spin-up" onclick="stepNum('eDurSec_${t.id}',1)">▲</button><button onclick="stepNum('eDurSec_${t.id}',-1)">▼</button></div></div>
              </div>
            </div>
          </div>
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

// ── HEADER TIMER BADGE ────────────────────────────────────────────────────
let _pinnedTimerId = null;

function getCurrentTimer(){
  if(_pinnedTimerId){
    const pinned=timers.find(x=>x.id===_pinnedTimerId);
    if(pinned) return pinned;
    _pinnedTimerId=null;
  }
  const running=timers.filter(x=>x.running);
  if(running.length) return running.reduce((a,b)=>a.rem<b.rem?a:b);
  if(_lastTouchedId) return timers.find(x=>x.id===_lastTouchedId)||null;
  return timers.length?timers[0]:null;
}

// Build a 3x3 dot grid: up to 9 slots, green=running, dim=idle, empty=no timer
function buildDotGrid(){
  const total = Math.min(timers.length, 9);
  const sorted = [
    ...timers.filter(t=>t.running),
    ...timers.filter(t=>!t.running)
  ].slice(0, 9);
  const dots = Array.from({length:9}, (_,i) => {
    if(i >= total) return '<span class="htb-dot htb-dot-empty"></span>';
    return sorted[i].running
      ? '<span class="htb-dot htb-dot-active"></span>'
      : '<span class="htb-dot htb-dot-idle"></span>';
  });
  return dots.join('');
}

function updateHeaderTimer(){
  const badge=document.getElementById('headerTimerBadge');
  if(!badge) return;
  const t=getCurrentTimer();
  if(!t){ badge.classList.add('htb-hidden'); return; }
  badge.classList.remove('htb-hidden');
  const label=document.getElementById('htbLabel');
  const nameEl=document.getElementById('htbName');
  const dotsEl=document.getElementById('htbDots');
  if(label) label.textContent=fmt(Math.ceil(t.rem));
  if(nameEl) nameEl.textContent=t.name;
  if(dotsEl) dotsEl.innerHTML=buildDotGrid();
  badge.classList.toggle('htb-running',t.running);
}

function toggleHeaderTimerList(){
  const drop=document.getElementById('headerTimerDrop');
  if(!drop) return;
  const isOpen=drop.classList.toggle('htd-open');
  if(isOpen) renderHeaderTimerList();
}

function renderHeaderTimerList(){
  const list=document.getElementById('headerTimerList');
  if(!list) return;
  if(!timers.length){ list.innerHTML='<div class="htd-empty">No timers yet.</div>'; return; }
  const cur=getCurrentTimer();
  list.innerHTML=timers.map(t=>{
    const isPinned=(_pinnedTimerId===t.id)||(cur&&cur.id===t.id&&!_pinnedTimerId&&!timers.some(x=>x.running));
    return `<div class="htd-row${isPinned?' htd-pinned':''}" onclick="pinHeaderTimer(${t.id})">
      <div class="htd-row-info">
        <span class="htd-row-name">${t.name.replace(/</g,'&lt;')}</span>
        <span class="htd-row-time ${t.running?'htd-running':''}" id="htdTime_${t.id}">${fmt(Math.ceil(t.rem))}</span>
        ${t.reps>0?`<span class="badge gold" style="font-size:10px;">×${t.reps}</span>`:''}
      </div>
      <button class="btn btn-icon btn-ghost htd-playbtn" title="${t.running?'Pause':'Start'}" onclick="event.stopPropagation();toggleTimer(${t.id});renderHeaderTimerList();" style="width:26px;height:26px;">
        <i data-lucide="${t.running?'pause':'play'}" style="width:12px;height:12px;"></i>
      </button>
    </div>`;
  }).join('');
  lucide.createIcons();
}

function pinHeaderTimer(id){
  _pinnedTimerId = (_pinnedTimerId===id) ? null : id;
  _lastTouchedId=id;
  updateHeaderTimer();
  renderHeaderTimerList();
}

document.addEventListener('click', e=>{
  const drop=document.getElementById('headerTimerDrop');
  if(drop && drop.classList.contains('htd-open') && !drop.contains(e.target)){
    drop.classList.remove('htd-open');
  }
});
