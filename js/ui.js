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
  {id:'bell',     label:'Low Bell',       emoji:'🔔'},
  {id:'trombone', label:'Trombone Tune',  emoji:'🎺'},
  {id:'harp',     label:'Harp',           emoji:'🎵'},
  {id:'chime',    label:'Chime',          emoji:'🎶'},
  {id:'drum',     label:'Deep Drum',      emoji:'🥁'},
  {id:'bounce',   label:'Bounce',         emoji:'🎷'},
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
  // Deep Drum is ~2.2s; others are shorter — use 3s as safe ceiling
  setTimeout(()=>{
    if(_sndPlaying===id){
      _sndPlaying=null;
      if(btn) btn.classList.remove('playing');
    }
  },3000);
}

// ── CUSTOM SOUND UPLOAD ────────────────────────────
const _customSounds = [];
let _previewAudio = null; // active preview Audio element

function _addCustomFiles(files){
  if(!files || !files.length) return;
  let added = 0;
  Array.from(files).forEach(file => {
    if(!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|flac|m4a)$/i.test(file.name)) return;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, '');
    _customSounds.push({name, url});
    added++;
  });
  if(added) renderCustomSounds();
  if(added===1) showToast(`Sound added!`);
  else if(added>1) showToast(`${added} sounds added!`);
}

function handleCustomSoundUpload(input){
  _addCustomFiles(input.files);
  input.value = '';
}

// Drag-and-drop on the upload zone
function soundDragOver(e){
  e.preventDefault();
  const zone = document.getElementById('customSoundDropZone');
  if(zone) zone.classList.add('drag-over');
}
function soundDragLeave(e){
  const zone = document.getElementById('customSoundDropZone');
  if(zone) zone.classList.remove('drag-over');
}
function soundDrop(e){
  e.preventDefault();
  const zone = document.getElementById('customSoundDropZone');
  if(zone) zone.classList.remove('drag-over');
  _addCustomFiles(e.dataTransfer.files);
}

function renderCustomSounds(){
  const list=document.getElementById('customSoundsList'); if(!list) return;
  list.innerHTML=_customSounds.map((s,i)=>`
    <div class="custom-snd-row">
      <span class="snd-icon">🎵</span>
      <span class="snd-name">${s.name}</span>
      <span id="cslen_${i}" style="font-size:var(--text-xs);color:var(--color-text-faint);flex-shrink:0;min-width:36px;text-align:right;">${s.duration?fmtDuration(s.duration):'—'}</span>
      <button class="btn btn-ghost btn-sm" id="csprev_${i}" onclick="toggleCustomPreview(${i})" title="Preview">▶</button>
      <button class="btn btn-ghost btn-sm" onclick="useCustomSound(${i})" title="Use as alarm">Use</button>
      <button class="btn btn-ghost btn-sm" onclick="removeCustomSound(${i})" title="Remove">✕</button>
    </div>
  `).join('');
  // Populate durations asynchronously
  _customSounds.forEach((s,i)=>{
    if(s.duration) return;
    const lbl=document.getElementById('cslen_'+i); if(!lbl) return;
    const a=new Audio(s.url);
    a.addEventListener('loadedmetadata',()=>{
      if(isFinite(a.duration)){ s.duration=a.duration; lbl.textContent=fmtDuration(a.duration); }
    });
    a.load();
  });
  // Sync timer sound select
  const sel=document.getElementById('timerSound');
  if(sel){
    // Remove stale custom options first
    [...sel.options].filter(o=>o.value.startsWith('custom_')).forEach(o=>o.remove());
    _customSounds.forEach((s,i)=>{
      const opt=document.createElement('option'); opt.value='custom_'+i; opt.textContent='🎧 '+s.name; sel.appendChild(opt);
    });
  }
}

function fmtDuration(sec){
  sec=Math.round(sec);
  const m=Math.floor(sec/60), s=sec%60;
  return m>0?`${m}:${String(s).padStart(2,'0')}`:`0:${String(s).padStart(2,'0')}`;
}

function toggleCustomPreview(i){
  const btn = document.getElementById('csprev_'+i);
  // Stop any currently playing preview
  if(_previewAudio){
    _previewAudio.pause();
    _previewAudio.currentTime=0;
    // Reset all preview buttons
    document.querySelectorAll('[id^="csprev_"]').forEach(b=>{ b.textContent='▶'; b.classList.remove('playing'); });
    const wasThis = _previewAudio._csIdx === i;
    _previewAudio = null;
    if(wasThis) return; // toggled off — done
  }
  // Start new preview
  const s=_customSounds[i]; if(!s) return;
  try{
    const audio = new Audio(s.url);
    audio.volume = _alarmVol;
    audio._csIdx = i;
    audio.play().catch(()=>{});
    audio.addEventListener('ended', ()=>{
      if(btn){ btn.textContent='▶'; btn.classList.remove('playing'); }
      if(_previewAudio===audio) _previewAudio=null;
    });
    _previewAudio = audio;
    if(btn){ btn.textContent='■'; btn.classList.add('playing'); }
  } catch(e){}
}

function useCustomSound(i){
  const sel=document.getElementById('timerSound'); if(!sel) return;
  sel.value='custom_'+i; showToast('Custom sound selected for new timers.');
}
function removeCustomSound(i){
  // Stop preview if it's the one being removed
  if(_previewAudio && _previewAudio._csIdx===i){
    _previewAudio.pause(); _previewAudio=null;
  }
  _customSounds.splice(i,1); renderCustomSounds();
}
