// ── MUSIC ENGINE ─────────────────────────────────
const AMBIENTS = [
  { id:'brown_noise',  emoji:'🌊', name:'Deep Waterfall',   desc:'Brown noise — deep low-frequency rumble, like standing near a waterfall at dusk.' },
  { id:'pink_noise',   emoji:'🌧️', name:'Rain Veil',        desc:'Pink noise — soft rainfall hiss, smoother and gentler than white noise.' },
  { id:'library_hum',  emoji:'📚', name:'Library Hum',      desc:'Warm filtered noise + subtle tonal bed, like an old library ventilation and distant lamps.' },
  { id:'forest_night', emoji:'🦩', name:'Forest Night',     desc:'Crickets, wind, distant owls — nocturnal woodland atmosphere.' },
  { id:'cafe_murmur',  emoji:'☕', name:'Café Murmur',      desc:'Muffled room tone, distant clinks, low conversation-like ambience.' },
  { id:'fireplace',    emoji:'🔥', name:'Fireplace',        desc:'Soft crackle, ember pops, warm low-end glow.' },
  { id:'ocean_waves',  emoji:'🌙', name:'Moonlit Shore',    desc:'Slow looping waves with a quiet, meditative rhythm.' },
  { id:'lofi_pad',     emoji:'🎹', name:'Lofi Pad',         desc:'Gentle synth pad with tape-like wobble — unobtrusive focus bed.' },
  { id:'wind_chimes',  emoji:'🎐', name:'Wind Chimes',      desc:'Airy motion, delicate bells, sparse and magical.' },
  { id:'train_night',  emoji:'🚂', name:'Night Train',      desc:'Low rail hum, occasional distant clacks, hypnotic travel mood.' },
];

let musicOn = false;
let currentAmbient = null;
let _ambientNode = null;
let _musicUpdateTimer = null;
let _customMusic = null; // {name,url,audio}

function toggleMusic(){
  if(musicOn) pauseMusic();
  else startMusic();
}
function startMusic(){
  if(!currentAmbient && !_customMusic){ showToast('Choose an ambient or upload a track first','error'); return; }
  if(_customMusic){
    if(!_customMusic.audio){
      const a=new Audio(_customMusic.url); a.loop=true; a.crossOrigin='anonymous'; _customMusic.audio=a;
      a.addEventListener('ended',()=>updateMusicWidget());
    }
    _customMusic.audio.volume=_musicVol;
    _customMusic.audio.play().catch(()=>{});
    musicOn=true;
    setViz(true);
    updateMusicStatus();
    updateMusicWidget();
    monitorCustomTrack();
    if(typeof archOnMusicOn === 'function') archOnMusicOn();
    return;
  }
  actx();
  if(_ambientNode && _ambientNode.stop) try{ _ambientNode.stop(); }catch(e){}
  _ambientNode = createAmbient(currentAmbient);
  musicOn=true;
  setViz(true);
  updateMusicStatus();
  updateMusicWidget();
  if(typeof archOnMusicOn === 'function') archOnMusicOn();
}
function pauseMusic(){
  musicOn=false;
  if(_customMusic?.audio){ _customMusic.audio.pause(); }
  if(_ambientNode?.stop) try{ _ambientNode.stop(); }catch(e){}
  _ambientNode=null;
  setViz(false);
  updateMusicStatus();
  updateMusicWidget();
  stopMonitorCustomTrack();
  if(typeof archOnMusicOff === 'function') archOnMusicOff();
}
function stopMusic(){
  musicOn=false;
  if(_customMusic?.audio){ _customMusic.audio.pause(); _customMusic.audio.currentTime=0; }
  if(_ambientNode?.stop) try{ _ambientNode.stop(); }catch(e){}
  _ambientNode=null;
  setViz(false);
  updateMusicStatus();
  updateMusicWidget();
  stopMonitorCustomTrack();
  if(typeof archOnMusicOff === 'function') archOnMusicOff();
}
function updateMusicStatus(){
  const np=document.getElementById('musicNowPlaying');
  const st=document.getElementById('musicStatus');
  const btn=document.getElementById('musicPlayBtn');
  if(np) np.textContent = _customMusic ? _customMusic.name : (AMBIENTS.find(a=>a.id===currentAmbient)?.name || 'Not playing');
  if(st) st.textContent = musicOn ? 'Playing in loop' : (_customMusic||currentAmbient ? 'Paused' : 'Select a track and press Play');
  if(btn) btn.innerHTML = musicOn ? '<i data-lucide="pause" style="width:13px;height:13px;"></i> Pause' : '<i data-lucide="play" style="width:13px;height:13px;"></i> Play';
  lucide.createIcons();
}
function setViz(on){
  document.querySelectorAll('.viz-bar').forEach(b=>b.classList.toggle('active',on));
  document.querySelectorAll('.mw-bar').forEach(b=>b.classList.toggle('active',on));
}

function renderAmbientGrid(){
  const grid=document.getElementById('ambientGrid'); if(!grid) return;
  grid.innerHTML=AMBIENTS.map(a=>`
    <button class="ambient-row${currentAmbient===a.id&&!_customMusic?' selected':''}" onclick="selectAmbient('${a.id}')">
      <span class="amb-icon">${a.emoji}</span>
      <div class="amb-info"><div class="amb-name">${a.name}</div><div class="amb-desc">${a.desc}</div></div>
      <span class="badge">Built-in</span>
    </button>`).join('');
}
function selectAmbient(id){
  currentAmbient=id; _customMusic=null;
  renderAmbientGrid(); renderCustomMusicList(); updateMusicStatus(); updateMusicWidget();
  if(musicOn){ stopMusic(); startMusic(); }
}

function initMusicUI(){ renderAmbientGrid(); updateMusicStatus(); updateMusicWidget(); }

function updateMusicWidget(){
  const w=document.getElementById('musicWidget'); if(!w) return;
  const name=document.getElementById('mwName');
  const btn=document.getElementById('mwPlayBtn');
  const hasTrack = !!(_customMusic || currentAmbient);
  w.classList.toggle('hidden-widget', !hasTrack);
  if(name) name.textContent = _customMusic ? _customMusic.name : (AMBIENTS.find(a=>a.id===currentAmbient)?.name || '—');
  if(btn) btn.innerHTML = musicOn ? '<i data-lucide="pause" style="width:14px;height:14px;"></i>' : '<i data-lucide="play" style="width:14px;height:14px;"></i>';
  lucide.createIcons();
}

// Custom track upload
function handleMusicUpload(input){
  const file=input.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  _customMusic={ name:file.name.replace(/\.[^.]+$/,''), url, audio:null };
  currentAmbient=null;
  const nameEl=document.getElementById('musicUploadName');
  if(nameEl){ nameEl.style.display='block'; nameEl.textContent=file.name; }
  renderAmbientGrid(); renderCustomMusicList(); updateMusicStatus(); updateMusicWidget();
  showToast(`Custom track "${_customMusic.name}" ready`);
  input.value='';
}
function renderCustomMusicList(){
  const list=document.getElementById('customMusicList'); if(!list) return;
  if(!_customMusic){ list.innerHTML=''; return; }
  list.innerHTML=`
    <div class="custom-snd-row">
      <span class="snd-icon">🎵</span>
      <span class="snd-name">${_customMusic.name}</span>
      <button class="btn btn-ghost btn-sm" onclick="previewCustomMusic()" title="Preview">▶</button>
      <button class="btn btn-ghost btn-sm" onclick="selectCustomMusic()" title="Use">Use</button>
      <button class="btn btn-ghost btn-sm" onclick="removeCustomMusic()" title="Remove">✕</button>
    </div>`;
}
function previewCustomMusic(){
  if(!_customMusic) return;
  const a=new Audio(_customMusic.url); a.volume=_musicVol; a.play().catch(()=>{});
  setTimeout(()=>{ try{ a.pause(); }catch(e){} }, 10000);
}
function selectCustomMusic(){ updateMusicStatus(); updateMusicWidget(); if(musicOn){ stopMusic(); startMusic(); } }
function removeCustomMusic(){
  if(_customMusic?.audio){ try{ _customMusic.audio.pause(); }catch(e){} }
  if(_customMusic?.url) URL.revokeObjectURL(_customMusic.url);
  _customMusic=null;
  renderCustomMusicList(); updateMusicStatus(); updateMusicWidget(); stopMonitorCustomTrack();
  const nameEl=document.getElementById('musicUploadName'); if(nameEl){ nameEl.style.display='none'; nameEl.textContent=''; }
}
function musicDragOver(e){ e.preventDefault(); document.getElementById('musicDropZone')?.classList.add('drag-over'); }
function musicDragLeave(e){ e.preventDefault(); document.getElementById('musicDropZone')?.classList.remove('drag-over'); }
function musicDrop(e){
  e.preventDefault();
  document.getElementById('musicDropZone')?.classList.remove('drag-over');
  const file=e.dataTransfer.files && e.dataTransfer.files[0];
  if(!file) return;
  handleMusicUpload({ files:[file], value:'' });
}

function monitorCustomTrack(){
  stopMonitorCustomTrack();
  const wrap=document.getElementById('customTrackProgress');
  if(!_customMusic?.audio || !wrap){ if(wrap) wrap.style.display='none'; return; }
  wrap.style.display='block';
  _musicUpdateTimer=setInterval(()=>{
    const a=_customMusic?.audio; if(!a) return;
    const pct = a.duration ? (a.currentTime / a.duration) * 100 : 0;
    const bar=document.getElementById('ctpBar'); if(bar) bar.style.width=pct+'%';
    const el=document.getElementById('ctpElapsed'); if(el) el.textContent=fmtClock(a.currentTime||0);
    const tt=document.getElementById('ctpTotal'); if(tt) tt.textContent=isFinite(a.duration)?fmtClock(a.duration):'—';
  },500);
}
function stopMonitorCustomTrack(){
  clearInterval(_musicUpdateTimer); _musicUpdateTimer=null;
  const wrap=document.getElementById('customTrackProgress'); if(wrap) wrap.style.display='none';
}
function fmtClock(sec){ sec=Math.floor(sec||0); const m=Math.floor(sec/60), s=sec%60; return `${m}:${String(s).padStart(2,'0')}`; }

// ── AMBIENT GENERATORS ─────────────────
function createAmbient(id){
  const ctx=actx(), out=musicDest();
  const nodes=[];
  function nbuf(seconds=2){
    const buf=ctx.createBuffer(1, seconds*ctx.sampleRate, ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; return s;
  }
  function addNoise(type='lowpass', freq=500, gain=.2){
    const src=nbuf(2), flt=ctx.createBiquadFilter(), g=ctx.createGain();
    flt.type=type; flt.frequency.value=freq; g.gain.value=gain;
    src.connect(flt); flt.connect(g); g.connect(out); src.start(); nodes.push(src,g,flt); return {src,g,flt};
  }
  function addOsc(freq=220, type='sine', gain=.02){
    const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.value=freq; g.gain.value=gain;
    o.connect(g); g.connect(out); o.start(); nodes.push(o,g); return {o,g};
  }
  let extras=[];
  switch(id){
    case 'brown_noise': extras.push(addNoise('lowpass',180,.28)); break;
    case 'pink_noise': extras.push(addNoise('lowpass',900,.2)); break;
    case 'library_hum': extras.push(addNoise('bandpass',350,.09)); extras.push(addOsc(110,'sine',.015)); extras.push(addOsc(220,'triangle',.01)); break;
    case 'forest_night': extras.push(addNoise('highpass',2500,.03)); extras.push(addOsc(620,'sine',.005)); setTimeout(()=>playSound('whistle'),300); break;
    case 'cafe_murmur': extras.push(addNoise('bandpass',700,.08)); extras.push(addNoise('lowpass',1800,.03)); break;
    case 'fireplace': extras.push(addNoise('lowpass',1200,.1)); extras.push(addNoise('highpass',2000,.02)); break;
    case 'ocean_waves': extras.push(addNoise('lowpass',600,.16)); extras.push(addOsc(0.07,'sine',0)); break;
    case 'lofi_pad': extras.push(addOsc(220,'triangle',.015)); extras.push(addOsc(329.63,'triangle',.012)); extras.push(addOsc(440,'sine',.008)); break;
    case 'wind_chimes': extras.push(addNoise('highpass',3500,.02)); setInterval(()=>{ if(musicOn&&currentAmbient==='wind_chimes') playSound('chime'); },9000); break;
    case 'train_night': extras.push(addNoise('bandpass',120,.16)); extras.push(addNoise('lowpass',500,.05)); break;
    default: extras.push(addNoise('lowpass',800,.1));
  }
  return { stop(){ nodes.forEach(n=>{ try{n.stop&&n.stop()}catch(e){} try{n.disconnect&&n.disconnect()}catch(e){} }); } };
}

// Fade music during alarm sounds (best effort)
const _origPlaySound = playSound;
playSound = function(type){
  const mg=_musicGain; const ctx=actx();
  if(mg){ mg.gain.cancelScheduledValues(ctx.currentTime); mg.gain.setTargetAtTime(_musicVol*0.25, ctx.currentTime, 0.03); }
  _origPlaySound(type);
  if(mg){ mg.gain.setTargetAtTime(_musicVol, ctx.currentTime + 1.2, 0.25); }
};

document.addEventListener('click', e => {
  const btn = e.target.closest('#musicPlayBtn,#mwPlayBtn');
  if(btn && actx().state==='suspended') actx().resume();
});

// ── INIT MUSIC UI ─────────────────
function initMusicUI(){
  renderAmbientGrid();
  renderCustomMusicList();
  updateMusicStatus();
  updateMusicWidget();
}
