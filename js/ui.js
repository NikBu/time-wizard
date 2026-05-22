// ── CONFIRM HELPER ─────────────────────────────────
let _confirmCb = null;
function askConfirm(msg, title, okLabel, cb){
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmTitle').textContent = title || 'Confirm';
  document.getElementById('confirmOkBtn').textContent = okLabel || 'Delete';
  document.getElementById('confirmModal').classList.remove('hidden');
  _confirmCb = cb;
}
function confirmResolve(ok){
  document.getElementById('confirmModal').classList.add('hidden');
  if(_confirmCb) _confirmCb(ok);
  _confirmCb = null;
}

// ── TOAST ─────────────────────────────────────────
function showToast(msg, type='info'){
  const c=document.getElementById('toastContainer');
  const t=document.createElement('div'); t.className='toast';
  const icons={success:'✅',error:'❌',info:'ℹ️'};
  t.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(()=>{ t.classList.add('removing'); t.addEventListener('animationend',()=>t.remove()); },3500);
}

function closeModal(id){ document.getElementById(id).classList.add('hidden'); }
function stepNum(id,d){ const el=document.getElementById(id); if(!el) return; const v=parseFloat(el.value)||0; el.value=Math.max(parseFloat(el.min)||0,v+d*(parseFloat(el.step)||1)); el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }

// ── SOUND LIBRARY ─────────────────────────────────
const SOUNDS = [
  {id:'bell',  label:'Low Bell',   emoji:'🔔'},
  {id:'viola', label:'Viola Tune', emoji:'🎻'},
  {id:'harp',  label:'Harp',       emoji:'🎵'},
  {id:'chime', label:'Chime',      emoji:'🎶'},
  {id:'drum',  label:'Deep Drum',  emoji:'🥁'},
  {id:'whistle',label:'Whistle',   emoji:'🎷'},
];

let _sndPlaying = null;

function renderSoundGrid(){
  const grid = document.getElementById('soundPreviewGrid');
  if(!grid) return;
  grid.innerHTML = SOUNDS.map(s=>`
    <button class="snd-btn" id="snd_${s.id}" onclick="previewSound('${s.id}')">
      <span class="snd-icon">${s.emoji}</span>
      <span>${s.label}</span>
    </button>
  `).join('');
}

function previewSound(id){
  if(_sndPlaying===id){
    _sndPlaying=null;
    document.querySelectorAll('.snd-btn').forEach(b=>b.classList.remove('playing'));
    return;
  }
  document.querySelectorAll('.snd-btn').forEach(b=>b.classList.remove('playing'));
  const btn=document.getElementById('snd_'+id);
  if(btn) btn.classList.add('playing');
  _sndPlaying=id;
  playSound(id);
  setTimeout(()=>{
    if(_sndPlaying===id){
      _sndPlaying=null;
      if(btn) btn.classList.remove('playing');
    }
  },3000);
}

// Custom sound upload
const _customSounds = [];
function handleCustomSoundUpload(input){
  const file = input.files[0]; if(!file) return;
  const url = URL.createObjectURL(file);
  const name = file.name.replace(/\.[^.]+$/,'');
  _customSounds.push({name, url});
  document.getElementById('uploadSoundName').textContent = file.name;
  renderCustomSounds();
  showToast(`Sound "${name}" added!`);
  input.value='';
}
function renderCustomSounds(){
  const list=document.getElementById('customSoundsList'); if(!list) return;
  list.innerHTML=_customSounds.map((s,i)=>`
    <div class="custom-snd-row">
      <span class="snd-icon">🎵</span>
      <span class="snd-name">${s.name}</span>
      <span id="cslen_${i}" style="font-size:var(--text-xs);color:var(--color-text-faint);flex-shrink:0;min-width:36px;text-align:right;">${s.duration?fmtDuration(s.duration):'—'}</span>
      <button class="btn btn-ghost btn-sm" onclick="playCustomSound(${i})" title="Preview">▶</button>
      <button class="btn btn-ghost btn-sm" onclick="useCustomSound(${i})" title="Use as alarm">Use</button>
      <button class="btn btn-ghost btn-sm" onclick="removeCustomSound(${i})" title="Remove">✕</button>
    </div>
  `).join('');
  // Populate durations asynchronously for any without them
  _customSounds.forEach((s,i)=>{
    if(s.duration) return;
    const lbl=document.getElementById('cslen_'+i); if(!lbl) return;
    const a=new Audio(s.url);
    a.addEventListener('loadedmetadata',()=>{
      if(isFinite(a.duration)){ s.duration=a.duration; lbl.textContent=fmtDuration(a.duration); }
    });
    a.load();
  });
  // Also update the sound select in timer form
  const sel=document.getElementById('timerSound');
  if(sel){
    const existing=[...sel.options].map(o=>o.value);
    _customSounds.forEach((s,i)=>{
      const v='custom_'+i;
      if(!existing.includes(v)){
        const opt=document.createElement('option'); opt.value=v; opt.textContent='🎵 '+s.name; sel.appendChild(opt);
      }
    });
  }
}
function fmtDuration(sec){
  sec=Math.round(sec);
  const m=Math.floor(sec/60), s=sec%60;
  return m>0?`${m}:${String(s).padStart(2,'0')}`:`0:${String(s).padStart(2,'0')}`;
}
function playCustomSound(i){
  const s=_customSounds[i]; if(!s) return;
  try{
    const audio=new Audio(s.url); audio.volume=_alarmVol; audio.play();
  } catch(e){}
}
function useCustomSound(i){
  const sel=document.getElementById('timerSound'); if(!sel) return;
  sel.value='custom_'+i; showToast('Custom sound selected for new timers.');
}
function removeCustomSound(i){
  _customSounds.splice(i,1); renderCustomSounds();
}
