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
let _ambientTimerId = null;
let _musicUpdateTimer = null;
let _customTracks = []; // [{id,name,url,audio,duration}]
let _activeTrackIdx = null;
let _playingAudio = null;
let _musicAnalyser = null;
let _playlistRepeatMode = 'all'; // 'off' | 'one' | 'all'

function _getPlayingAudio(){ return _playingAudio; }

function _ensureMusicAnalyser(){
  const ctx = actx();
  if(_musicAnalyser) return _musicAnalyser;
  _musicAnalyser = ctx.createAnalyser();
  _musicAnalyser.fftSize = 64;
  musicDest().connect(_musicAnalyser);
  return _musicAnalyser;
}

function toggleMusic(){ musicOn ? pauseMusic() : startMusic(); }

function startMusic(){
  if(!_customTracks.length && !currentAmbient){ showToast('Choose an ambient or upload a track first','error'); return; }
  if(_activeTrackIdx !== null && _customTracks[_activeTrackIdx]){
    _playTrack(_activeTrackIdx);
    musicOn = true;
    setViz(true);
    updateMusicStatus();
    updateMusicWidget();
    monitorCustomTrack();
    if(typeof archOnMusicOn === 'function') archOnMusicOn();
    return;
  }
  actx();
  if(_ambientNode && _ambientNode.stop) try{ _ambientNode.stop(); }catch(e){}
  _ambientNode = createAmbient(currentAmbient || AMBIENTS[0].id);
  musicOn = true;
  setViz(true);
  updateMusicStatus();
  updateMusicWidget();
  stopMonitorCustomTrack();
  if(typeof archOnMusicOn === 'function') archOnMusicOn();
}

function pauseMusic(){
  musicOn=false;
  if(_playingAudio){ try{ _playingAudio.pause(); }catch(e){} }
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
  if(_playingAudio){ try{ _playingAudio.pause(); _playingAudio.currentTime=0; }catch(e){} }
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
  const track = (_activeTrackIdx!==null)?_customTracks[_activeTrackIdx]:null;
  const ambientName = AMBIENTS.find(a=>a.id===currentAmbient)?.name || 'Not playing';
  if(np) np.textContent = track ? track.name : ambientName;
  if(st) st.textContent = musicOn ? 'Playing' : (track||currentAmbient ? 'Paused' : 'Select a track and press Play');
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
    <button class="ambient-row${currentAmbient===a.id && _activeTrackIdx===null?' selected':''}" onclick="selectAmbient('${a.id}')">
      <span class="amb-icon">${a.emoji}</span>
      <div class="amb-info"><div class="amb-name">${a.name}</div><div class="amb-desc">${a.desc}</div></div>
      <span class="badge">Built-in</span>
    </button>`).join('');
}
function selectAmbient(id){
  currentAmbient=id; _activeTrackIdx=null;
  renderAmbientGrid(); renderCustomMusicList(); updateMusicStatus(); updateMusicWidget();
  if(musicOn){ stopMusic(); startMusic(); }
}

function initMusicUI(){
  renderAmbientGrid();
  renderCustomMusicList();
  updateMusicStatus();
  updateMusicWidget();
}

function updateMusicWidget(){
  const w=document.getElementById('musicWidget'); if(!w) return;
  const name=document.getElementById('mwName');
  const btn=document.getElementById('mwPlayBtn');
  const hasTrack = !!(_activeTrackIdx!==null || currentAmbient);
  const track = (_activeTrackIdx!==null)?_customTracks[_activeTrackIdx]:null;
  w.classList.toggle('hidden-widget', !hasTrack);
  if(name) name.textContent = track ? track.name : (AMBIENTS.find(a=>a.id===currentAmbient)?.name || '—');
  if(btn) btn.innerHTML = musicOn ? '<i data-lucide="pause" style="width:14px;height:14px;"></i>' : '<i data-lucide="play" style="width:14px;height:14px;"></i>';
  lucide.createIcons();
}

// Custom track upload
function handleMusicUpload(input){
  const files=input.files || []; if(!files.length) return;
  Array.from(files).forEach(file=>{
    const url=URL.createObjectURL(file);
    const baseName=file.name.replace(/\.[^.]+$/,'');
    const track={ id: Date.now()+Math.random(), name: baseName, url, audio:null, duration:null };
    _customTracks.push(track);
    _probeTrackDuration(track);
  });
  _activeTrackIdx = _customTracks.length-1;
  currentAmbient=null;
  const nameEl=document.getElementById('musicUploadName');
  if(nameEl){ nameEl.style.display='block'; nameEl.textContent=input.files[0].name; }
  renderAmbientGrid(); renderCustomMusicList(); updateMusicStatus(); updateMusicWidget();
  showToast('Custom tracks ready');
  input.value='';
}
function _probeTrackDuration(track){
  const a=new Audio(track.url);
  a.addEventListener('loadedmetadata',()=>{
    track.duration = isFinite(a.duration)?a.duration:null;
    renderCustomMusicList();
  });
}

function renderCustomMusicList(){
  const list=document.getElementById('customMusicList'); if(!list) return;
  if(!_customTracks.length){ list.innerHTML=''; return; }
  list.innerHTML=_customTracks.map((t,idx)=>{
    const active = idx===_activeTrackIdx;
    const dur = t.duration!=null ? fmtClock(t.duration) : '—';
    return `
    <button class="custom-snd-row${active?' selected':''}" onclick="selectCustomTrack(${idx})">
      <span class="snd-icon">🎵</span>
      <span class="snd-name">${t.name}</span>
      <span class="snd-duration">${dur}</span>
      <span class="snd-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="previewCustomMusic(${idx})" title="Preview">▶</button>
        <button class="btn btn-ghost btn-sm" onclick="removeCustomMusic(${idx})" title="Remove">✕</button>
      </span>
    </button>`;
  }).join('');
}

function selectCustomTrack(idx){
  _activeTrackIdx = idx;
  currentAmbient = null;
  renderAmbientGrid(); renderCustomMusicList(); updateMusicStatus(); updateMusicWidget();
  if(musicOn){ stopMusic(); startMusic(); }
}

function previewCustomMusic(idx){
  const t=_customTracks[idx]; if(!t) return;
  const a=new Audio(t.url);
  a.volume=_musicVol;
  a.play().catch(()=>{});
  setTimeout(()=>{ try{ a.pause(); }catch(e){} }, 10000);
}

function removeCustomMusic(idx){
  const t=_customTracks[idx]; if(!t) return;
  if(t.audio){ try{ t.audio.pause(); }catch(e){} }
  if(t.url) URL.revokeObjectURL(t.url);
  _customTracks.splice(idx,1);
  if(_activeTrackIdx!==null){
    if(!_customTracks.length) _activeTrackIdx=null;
    else if(idx<=_activeTrackIdx) _activeTrackIdx=Math.max(0,_activeTrackIdx-1);
  }
  renderCustomMusicList(); renderAmbientGrid(); updateMusicStatus(); updateMusicWidget(); stopMonitorCustomTrack();
  const nameEl=document.getElementById('musicUploadName'); if(nameEl && !_customTracks.length){ nameEl.style.display='none'; nameEl.textContent=''; }
}

function musicDragOver(e){ e.preventDefault(); document.getElementById('musicDropZone')?.classList.add('drag-over'); }
function musicDragLeave(e){ e.preventDefault(); document.getElementById('musicDropZone')?.classList.remove('drag-over'); }
function musicDrop(e){
  e.preventDefault();
  document.getElementById('musicDropZone')?.classList.remove('drag-over');
  const files=e.dataTransfer.files; if(!files||!files.length) return;
  handleMusicUpload({ files, value:'' });
}

// Player for custom tracks
function _playTrack(idx){
  const t=_customTracks[idx]; if(!t) return;
  if(_playingAudio){ try{ _playingAudio.pause(); _playingAudio.currentTime=0; }catch(e){} }
  if(!t.audio){ t.audio=new Audio(t.url); attachHtmlMusicSource(t.audio); }
  _playingAudio=t.audio;
  _playingAudio.volume=_musicVol;
  _playingAudio.loop = (_playlistRepeatMode==='one');
  _playingAudio.onended = _handleTrackEnded;
  _playingAudio.play().catch(()=>{});
}

function playNextTrack(shuffle=false){
  if(!_customTracks.length) return;
  if(shuffle){
    const indices=_customTracks.map((_,i)=>i).filter(i=>i!==_activeTrackIdx);
    const next = indices.length?indices[Math.floor(Math.random()*indices.length)]:_activeTrackIdx;
    _activeTrackIdx = next;
  } else {
    if(_activeTrackIdx===null) _activeTrackIdx=0;
    else _activeTrackIdx = (_activeTrackIdx+1) % _customTracks.length;
  }
  renderCustomMusicList(); updateMusicStatus(); updateMusicWidget();
  if(musicOn) _playTrack(_activeTrackIdx);
}

function playPrevTrack(){
  if(!_customTracks.length) return;
  if(_activeTrackIdx===null) _activeTrackIdx=0;
  else _activeTrackIdx = (_activeTrackIdx-1+_customTracks.length) % _customTracks.length;
  renderCustomMusicList(); updateMusicStatus(); updateMusicWidget();
  if(musicOn) _playTrack(_activeTrackIdx);
}

function togglePlaylistRepeatMode(){
  _playlistRepeatMode = _playlistRepeatMode==='off' ? 'all' : _playlistRepeatMode==='all' ? 'one' : 'off';
  const btn = document.getElementById('musicRepeatBtn');
  if(btn){
    const label = _playlistRepeatMode==='off' ? 'Repeat: Off' : _playlistRepeatMode==='all' ? 'Repeat: All' : 'Repeat: One';
    btn.textContent = label;
  }
}

function shufflePlaylist(){ playNextTrack(true); }

function _handleTrackEnded(){
  if(_playlistRepeatMode==='one'){ if(musicOn && _activeTrackIdx!==null) _playTrack(_activeTrackIdx); return; }
  if(_playlistRepeatMode==='all'){ playNextTrack(false); return; }
  // off: stop after current track
  stopMusic();
}

function monitorCustomTrack(){
  stopMonitorCustomTrack();
  const wrap=document.getElementById('customTrackProgress');
  if(!_playingAudio || !wrap){ if(wrap) wrap.style.display='none'; return; }
  wrap.style.display='block';
  const analyser=_ensureMusicAnalyser();
  const data=new Uint8Array(analyser.frequencyBinCount);
  _musicUpdateTimer=setInterval(()=>{
    const a=_playingAudio; if(!a) return;
    const pct = a.duration ? (a.currentTime / a.duration) * 100 : 0;
    const bar=document.getElementById('ctpBar'); if(bar) bar.style.width=pct+'%';
    const el=document.getElementById('ctpElapsed'); if(el) el.textContent=fmtClock(a.currentTime||0);
    const tt=document.getElementById('ctpTotal'); if(tt) tt.textContent=isFinite(a.duration)?fmtClock(a.duration):'—';
    analyser.getByteFrequencyData(data);
    const bars=document.querySelectorAll('.mw-bar');
    bars.forEach((b,i)=>{ const v=data[i%data.length]||0; b.style.height = (4 + v/255*16) + 'px'; });
  },500);
}

function stopMonitorCustomTrack(){
  clearInterval(_musicUpdateTimer); _musicUpdateTimer=null;
  const wrap=document.getElementById('customTrackProgress'); if(wrap) wrap.style.display='none';
  const bar=document.getElementById('ctpBar'); if(bar) bar.style.width='0%';
  const el=document.getElementById('ctpElapsed'); if(el) el.textContent='0:00';
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
  switch(id){
    case 'brown_noise': addNoise('lowpass',180,.28); break;
    case 'pink_noise': addNoise('lowpass',900,.2); break;
    case 'library_hum': addNoise('bandpass',350,.09); addOsc(110,'sine',.015); addOsc(220,'triangle',.01); break;
    case 'forest_night': addNoise('highpass',2500,.03); addOsc(620,'sine',.005); setTimeout(()=>playSound('whistle'),300); break;
    case 'cafe_murmur': addNoise('bandpass',700,.08); addNoise('lowpass',1800,.03); break;
    case 'fireplace': addNoise('lowpass',1200,.1); addNoise('highpass',2000,.02); break;
    case 'ocean_waves': addNoise('lowpass',600,.16); break;
    case 'lofi_pad': addOsc(220,'triangle',.015); addOsc(329.63,'triangle',.012); addOsc(440,'sine',.008); break;
    case 'wind_chimes': addNoise('highpass',3500,.02); _ambientTimerId=setInterval(()=>{ if(musicOn&&currentAmbient==='wind_chimes') playSound('chime'); },9000); break;
    case 'train_night': addNoise('bandpass',120,.16); addNoise('lowpass',500,.05); break;
    default: addNoise('lowpass',800,.1);
  }
  return { stop(){
    nodes.forEach(n=>{ try{n.stop&&n.stop()}catch(e){} try{n.disconnect&&n.disconnect()}catch(e){} });
    if(_ambientTimerId){ clearInterval(_ambientTimerId); _ambientTimerId=null; }
  } };
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
