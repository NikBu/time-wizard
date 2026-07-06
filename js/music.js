// ── MUSIC ENGINE ─────────────────────────────────
const AMBIENTS = [
  { id:'brown_noise',  emoji:'🌊', name:'Deep Waterfall',  desc:'Brown noise — deep low-frequency rumble, like standing near a waterfall at dusk.' },
  { id:'pink_noise',   emoji:'🌧️', name:'Rain Veil',       desc:'Pink noise — soft rainfall hiss, smoother and gentler than white noise.' },
  { id:'forest_night', emoji:'🦩', name:'Forest Night',    desc:'Crickets, wind, distant owls — nocturnal woodland atmosphere.' },
  { id:'ocean_waves',  emoji:'🌙', name:'Moonlit Shore',   desc:'Slow looping waves with a quiet, meditative rhythm.' },
  { id:'lofi_pad',     emoji:'🎹', name:'Lofi Pad',        desc:'Gentle synth pad with tape-like wobble — unobtrusive focus bed.' },
];

// ── TRACK LIBRARY & PLAYLISTS ──────────────────────
// _trackLib: global pool  { id, name, url, duration }
//   NOTE: no .audio field — a fresh Audio is created on every play
//   to avoid HTMLAudioElement \"ended\" state lockup.
// _playlists: [ { id, name, locked, trackIds:[] } ]
let _trackLib = [];
let _playlists = [];
let _activePLId = null;
let _activeTrackId = null;
let _isAmbientActive = false;

let musicOn = false;
let _ambientNode = null;
let _ambientTimerId = null;
let _musicUpdateTimer = null;
let _playingAudio = null;   // always a freshly-created Audio per play
let _musicAnalyser = null;
let _playlistRepeatMode = 'all'; // 'off' | 'one' | 'all'
let _shuffleMode = false;

function _getPlayingAudio(){ return _playingAudio; }

// ── INIT ───────────────────────────────────────────
function _initPlaylists(){
  if(!_playlists.find(p=>p.id==='__ambients__')){
    _playlists.unshift({ id:'__ambients__', name:'Ambients', locked:true, trackIds: AMBIENTS.map(a=>a.id) });
  }
  if(!_playlists.find(p=>p.id==='__custom__')){
    const idx = _playlists.findIndex(p=>p.id==='__ambients__');
    _playlists.splice(idx+1, 0, { id:'__custom__', name:'Custom Music', locked:false, trackIds:[] });
  }
  if(!_activePLId) _activePLId = _playlists[0].id;
}

function initMusicUI(){
  _initPlaylists();
  renderPlaylists();
  renderTrackList();
  updatePlayerUI();
  updateMusicWidget();
  _updateRepeatBtn();
  _updateShuffleBtn();
}

// ── PLAYLIST MANAGEMENT ────────────────────────────
function createPlaylist(){
  const name = prompt('Playlist name:');
  if(!name || !name.trim()) return;
  const id = 'pl_' + Date.now();
  _playlists.push({ id, name: name.trim(), locked: false, trackIds: [] });
  _activePLId = id;
  renderPlaylists();
  renderTrackList();
}

function renamePlaylist(id){
  const pl = _playlists.find(p=>p.id===id);
  if(!pl || pl.locked) return;
  const name = prompt('New name:', pl.name);
  if(!name || !name.trim()) return;
  pl.name = name.trim();
  renderPlaylists();
}

function deletePlaylist(id){
  const pl = _playlists.find(p=>p.id===id);
  if(!pl || pl.locked) return;
  if(!confirm('Delete playlist \"' + pl.name + '\"?')) return;
  _playlists = _playlists.filter(p=>p.id!==id);
  if(_activePLId===id) _activePLId = _playlists[0]?.id || null;
  renderPlaylists();
  renderTrackList();
}

function selectPlaylist(id){
  _activePLId = id;
  renderPlaylists();
  renderTrackList();
}

function addTrackToPlaylist(trackId, plId){
  const pl = _playlists.find(p=>p.id===(plId||_activePLId));
  if(!pl || pl.locked) return;
  if(!pl.trackIds.includes(trackId)) pl.trackIds.push(trackId);
  renderTrackList();
}

function removeTrackFromPlaylist(trackId, plId){
  const pl = _playlists.find(p=>p.id===(plId||_activePLId));
  if(!pl || pl.locked) return;
  pl.trackIds = pl.trackIds.filter(id=>id!==trackId);
  if(_activeTrackId===trackId){ stopMusic(); _activeTrackId=null; }
  renderTrackList();
  updatePlayerUI();
}

// ── TRACK LIBRARY MODAL ────────────────────────────
function openAddToPlaylistModal(trackId){
  const existing = document.getElementById('atpModal');
  if(existing) existing.remove();
  const track = _trackLib.find(t=>t.id===trackId);
  if(!track) return;
  const plOptions = _playlists.filter(p=>!p.locked);
  const rows = plOptions.length ? plOptions.map(pl=>{
    const already = pl.trackIds.includes(trackId);
    return `<button class=\"btn ${already?'btn-secondary':'btn-ghost'} btn-sm\"
      style=\"width:100%;justify-content:space-between;margin-bottom:var(--space-2);\"
      onclick=\"addTrackToPlaylist('${trackId}','${pl.id}');renderPlaylists();document.getElementById('atpModal').remove();\">
      <span>${pl.name}</span>
      ${already?'<i data-lucide=\"check\" style=\"width:12px;height:12px;\"></i>':'<i data-lucide=\"plus\" style=\"width:12px;height:12px;\"></i>'}
    </button>`;
  }).join('') : '<p style=\"font-size:var(--text-sm);color:var(--color-text-muted);\">No custom playlists yet. Create one first.</p>';
  const html = `<div class=\"modal-backdrop\" id=\"atpModal\" onclick=\"if(event.target===this)this.remove()\">
  <div class=\"modal\" style=\"max-width:340px;\">
    <div class=\"modal-title\">Add to playlist</div>
    <div style=\"font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);\">Track: <strong>${track.name}</strong></div>
    ${rows}
    <button class=\"btn btn-ghost btn-sm\" style=\"width:100%;margin-top:var(--space-2);\" onclick=\"document.getElementById('atpModal').remove()\">Cancel</button>
  </div>
</div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  lucide.createIcons();
}

// ── RENDER PLAYLISTS SIDEBAR ───────────────────────
function renderPlaylists(){
  const sidebar = document.getElementById('playlistSidebar'); if(!sidebar) return;
  sidebar.innerHTML = _playlists.map(pl=>{
    const active = pl.id===_activePLId;
    return `<div class=\"pl-row${active?' pl-row--active':''}\" onclick=\"selectPlaylist('${pl.id}')\">
      ${pl.locked ? '<i data-lucide=\"lock\" class=\"pl-lock-icon\" style=\"width:11px;height:11px;\"></i>' : ''}
      <span class=\"pl-name\">${pl.name}</span>
      <span class=\"pl-count\">${pl.trackIds.length}</span>
      ${!pl.locked ? `<button class=\"btn btn-ghost btn-icon\" style=\"padding:1px 3px;\" onclick=\"event.stopPropagation();renamePlaylist('${pl.id}')\" title=\"Rename\"><i data-lucide=\"pencil\" style=\"width:11px;height:11px;\"></i></button>` : ''}
      ${!pl.locked ? `<button class=\"btn btn-ghost btn-icon\" style=\"padding:1px 3px;color:var(--color-danger);\" onclick=\"event.stopPropagation();deletePlaylist('${pl.id}')\" title=\"Delete\"><i data-lucide=\"trash-2\" style=\"width:11px;height:11px;\"></i></button>` : ''}
    </div>`;
  }).join('');
  lucide.createIcons();
}

// ── RENDER TRACK LIST ──────────────────────────────
function renderTrackList(){
  const list = document.getElementById('playlistTrackList'); if(!list) return;
  const pl = _playlists.find(p=>p.id===_activePLId);
  const addSection = document.getElementById('addTracksSection');

  if(addSection){
    const isLocked = pl ? pl.locked : true;
    addSection.style.display = isLocked ? 'none' : '';
  }

  if(!pl){ list.innerHTML=''; return; }
  const isAmbientPL = pl.id==='__ambients__';
  if(!pl.trackIds.length){
    list.innerHTML=`<div style=\"font-size:var(--text-xs);color:var(--color-text-faint);text-align:center;padding:var(--space-4);\">
      ${isAmbientPL ? 'Built-in ambient tracks' : 'No tracks yet. Use \"Add tracks\" above.'}
    </div>`;
    return;
  }
  list.innerHTML = pl.trackIds.map(tid=>{
    let name, dur, icon;
    if(isAmbientPL){
      const a = AMBIENTS.find(x=>x.id===tid);
      name = a ? a.name : tid; dur = '∞'; icon = a ? a.emoji : '🎵';
    } else {
      const t = _trackLib.find(x=>x.id===tid);
      name = t ? t.name : tid;
      dur = t && t.duration!=null ? fmtClock(t.duration) : '—';
      icon = '🎵';
    }
    const active = tid===_activeTrackId;
    return `<div class=\"custom-snd-row${active?' selected':''}\" onclick=\"selectTrack('${tid}')\" role=\"button\" tabindex=\"0\"
         onkeydown=\"if(event.key==='Enter'||event.key===' ')selectTrack('${tid}')\">
      <span class=\"snd-icon\">${icon}</span>
      <span class=\"snd-name\" title=\"${name}\">${name}</span>
      <span class=\"snd-duration\">${dur}</span>
      ${!isAmbientPL ? `<span class=\"snd-actions\" onclick=\"event.stopPropagation()\">
        <button class=\"btn btn-ghost btn-sm\" onclick=\"openAddToPlaylistModal('${tid}')\" title=\"Add to playlist\">
          <i data-lucide=\"list-plus\" style=\"width:12px;height:12px;\"></i>
        </button>
        <button class=\"btn btn-ghost btn-sm\" onclick=\"removeTrackFromPlaylist('${tid}')\" title=\"Remove from playlist\">
          <i data-lucide=\"x\" style=\"width:12px;height:12px;\"></i>
        </button>
      </span>` : ''}
    </div>`;
  }).join('');
  lucide.createIcons();
}

// ── TOGGLE ADD TRACKS PANEL ────────────────────────
function toggleAddTracks(){
  const body = document.getElementById('addTracksBody');
  const chevron = document.getElementById('addTracksChevron');
  if(!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if(chevron) chevron.style.transform = open ? '' : 'rotate(180deg)';
}

// ── TRACK SELECTION ────────────────────────────────
function selectTrack(id){
  _activeTrackId = id;
  _isAmbientActive = AMBIENTS.some(a=>a.id===id);
  renderTrackList();
  updatePlayerUI();
  updateMusicWidget();
  if(musicOn){ stopMusic(); startMusic(); }
}

// ── PLAYBACK ───────────────────────────────────────
function toggleMusic(){ musicOn ? pauseMusic() : startMusic(); }

function startMusic(){
  if(!_activeTrackId){
    const pl = _playlists.find(p=>p.id===_activePLId);
    if(pl && pl.trackIds.length){ selectTrack(pl.trackIds[0]); return; }
    showToast('Select a track first','error'); return;
  }
  _playTrackById(_activeTrackId);
  musicOn = true;
  setViz(true);
  updatePlayerUI();
  updateMusicWidget();
  if(_isAmbientActive) stopMonitorCustomTrack(); else monitorCustomTrack();
  if(typeof archOnMusicOn === 'function') archOnMusicOn();
}

function pauseMusic(){
  musicOn = false;
  if(_playingAudio){ try{ _playingAudio.pause(); }catch(e){} }
  if(_ambientNode?.stop) try{ _ambientNode.stop(); }catch(e){}
  _ambientNode = null;
  setViz(false);
  updatePlayerUI();
  updateMusicWidget();
  stopMonitorCustomTrack();
  if(typeof archOnMusicOff === 'function') archOnMusicOff();
}

function stopMusic(){
  musicOn = false;
  if(_playingAudio){
    try{
      _playingAudio.onended = null;
      _playingAudio.pause();
      _playingAudio.src = '';
    }catch(e){}
    _playingAudio = null;
  }
  if(_ambientNode?.stop) try{ _ambientNode.stop(); }catch(e){}
  _ambientNode = null;
  setViz(false);
  updatePlayerUI();
  updateMusicWidget();
  stopMonitorCustomTrack();
  if(typeof archOnMusicOff === 'function') archOnMusicOff();
}

function _playTrackById(id){
  const isAmbient = AMBIENTS.some(a=>a.id===id);
  _isAmbientActive = isAmbient;

  if(_playingAudio){
    try{ _playingAudio.onended=null; _playingAudio.pause(); _playingAudio.src=''; }catch(e){}
    _playingAudio = null;
  }
  if(_ambientNode?.stop){ try{ _ambientNode.stop(); }catch(e){} _ambientNode=null; }

  if(isAmbient){
    actx();
    _ambientNode = createAmbient(id);
    document.getElementById('playerSeekRow')?.classList.add('seek-row--disabled');
  } else {
    const t = _trackLib.find(x=>x.id===id); if(!t) return;
    const audio = new Audio(t.url);
    attachHtmlMusicSource(audio);
    _playingAudio = audio;
    _playingAudio.volume = _musicVol;
    _playingAudio.loop = (_playlistRepeatMode==='one');
    _playingAudio.onended = _handleTrackEnded;
    _playingAudio.play().catch(()=>{});
    document.getElementById('playerSeekRow')?.classList.remove('seek-row--disabled');
  }
}

function playNextTrack(){
  const pl = _playlists.find(p=>p.id===_activePLId); if(!pl || !pl.trackIds.length) return;
  const idx = pl.trackIds.indexOf(_activeTrackId);
  let next;
  if(_shuffleMode){
    const others = pl.trackIds.filter(id=>id!==_activeTrackId);
    next = others.length ? others[Math.floor(Math.random()*others.length)] : _activeTrackId;
  } else {
    next = pl.trackIds[(idx+1) % pl.trackIds.length];
  }
  _activeTrackId = next;
  _isAmbientActive = AMBIENTS.some(a=>a.id===next);
  renderTrackList(); updatePlayerUI(); updateMusicWidget();
  if(musicOn) _playTrackById(next);
}

function playPrevTrack(){
  const pl = _playlists.find(p=>p.id===_activePLId); if(!pl || !pl.trackIds.length) return;
  const idx = pl.trackIds.indexOf(_activeTrackId);
  const prev = pl.trackIds[(idx-1+pl.trackIds.length) % pl.trackIds.length];
  _activeTrackId = prev;
  _isAmbientActive = AMBIENTS.some(a=>a.id===prev);
  renderTrackList(); updatePlayerUI(); updateMusicWidget();
  if(musicOn) _playTrackById(prev);
}

function _handleTrackEnded(){
  if(_playingAudio) _playingAudio.onended = null;
  if(_playlistRepeatMode==='one'){ if(musicOn && _activeTrackId) _playTrackById(_activeTrackId); return; }
  if(_playlistRepeatMode==='all'){ playNextTrack(); return; }
  stopMusic();
}

// ── SEEK ───────────────────────────────────────────
function seekCustomTrack(event){
  if(_isAmbientActive) return;
  const a = _playingAudio; if(!a || !isFinite(a.duration)) return;
  const bar = event.currentTarget;
  const rect = bar.getBoundingClientRect();
  const pct = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  a.currentTime = pct * a.duration;
}

// ── REPEAT / SHUFFLE ───────────────────────────────
function togglePlaylistRepeatMode(){
  _playlistRepeatMode = _playlistRepeatMode==='off' ? 'all' : _playlistRepeatMode==='all' ? 'one' : 'off';
  _updateRepeatBtn();
  if(_playingAudio) _playingAudio.loop = (_playlistRepeatMode==='one');
}
function _updateRepeatBtn(){
  const btn = document.getElementById('musicRepeatBtn'); if(!btn) return;
  const cfgs = { off:{icon:'repeat',label:'Off',style:'opacity:.4;'}, all:{icon:'repeat',label:'All',style:''}, one:{icon:'repeat-1',label:'One',style:''} };
  const c = cfgs[_playlistRepeatMode];
  btn.innerHTML = `<i data-lucide=\"${c.icon}\" style=\"width:13px;height:13px;${c.style}\"></i>`;
  btn.title = 'Repeat: '+c.label;
  lucide.createIcons();
}
function toggleShuffle(){
  _shuffleMode = !_shuffleMode;
  _updateShuffleBtn();
}
function _updateShuffleBtn(){
  const btn = document.getElementById('musicShuffleBtn'); if(!btn) return;
  btn.style.opacity = _shuffleMode ? '1' : '0.4';
}

// ── UPLOAD ─────────────────────────────────────────
function handleMusicUpload(input){
  const files = input.files || []; if(!files.length) return;
  let pl = _playlists.find(p=>p.id===_activePLId);
  if(!pl || pl.locked){
    pl = _playlists.find(p=>p.id==='__custom__');
    if(pl){ _activePLId = pl.id; renderPlaylists(); }
  }
  const targetPL = (pl && !pl.locked) ? pl : null;

  Array.from(files).forEach(file=>{
    const url = URL.createObjectURL(file);
    const id = 'tr_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const track = { id, name: file.name.replace(/\.[^.]+$/,''), url, duration:null };
    _trackLib.push(track);
    _probeTrackDuration(track);
    const customPL = _playlists.find(p=>p.id==='__custom__');
    if(customPL && !customPL.trackIds.includes(id)) customPL.trackIds.push(id);
    if(targetPL && targetPL.id !== '__custom__' && !targetPL.trackIds.includes(id)){
      targetPL.trackIds.push(id);
    }
  });

  if(!_activeTrackId && targetPL && targetPL.trackIds.length){
    _activeTrackId = targetPL.trackIds[targetPL.trackIds.length-1];
    _isAmbientActive = false;
  }
  renderPlaylists();
  renderTrackList();
  updatePlayerUI();
  updateMusicWidget();
  showToast('Track' + (files.length>1?'s':'') + ' added');
  input.value='';
}

function _probeTrackDuration(track){
  const a = new Audio(track.url);
  a.addEventListener('loadedmetadata',()=>{ track.duration = isFinite(a.duration)?a.duration:null; renderTrackList(); });
}

function musicDragOver(e){ e.preventDefault(); document.getElementById('musicDropZone')?.classList.add('drag-over'); }
function musicDragLeave(e){ e.preventDefault(); document.getElementById('musicDropZone')?.classList.remove('drag-over'); }
function musicDrop(e){
  e.preventDefault();
  document.getElementById('musicDropZone')?.classList.remove('drag-over');
  const files = e.dataTransfer.files; if(!files||!files.length) return;
  handleMusicUpload({ files, value:'' });
}

// ── PLAYER UI ──────────────────────────────────────
function updatePlayerUI(){
  const np = document.getElementById('musicNowPlaying');
  const st = document.getElementById('musicStatus');
  const btn = document.getElementById('musicPlayBtn');

  let trackName = 'Not playing';
  if(_activeTrackId){
    if(_isAmbientActive){
      trackName = AMBIENTS.find(a=>a.id===_activeTrackId)?.name || _activeTrackId;
    } else {
      trackName = _trackLib.find(t=>t.id===_activeTrackId)?.name || _activeTrackId;
    }
  }
  if(np) np.textContent = trackName;
  if(st) st.textContent = musicOn ? 'Playing' : (_activeTrackId ? 'Paused' : 'Select a track and press Play');
  if(btn) btn.innerHTML = musicOn
    ? '<i data-lucide=\"pause\" style=\"width:14px;height:14px;\"></i>'
    : '<i data-lucide=\"play\" style=\"width:14px;height:14px;\"></i>';

  const seekRow = document.getElementById('playerSeekRow');
  if(seekRow) seekRow.classList.toggle('seek-row--disabled', _isAmbientActive);

  lucide.createIcons();
}

function updateMusicStatus(){ updatePlayerUI(); }

function setViz(on){
  document.querySelectorAll('.viz-bar').forEach(b=>b.classList.toggle('active',on));
  document.querySelectorAll('.mw-bar').forEach(b=>b.classList.toggle('active',on));
}

function updateMusicWidget(){
  const w = document.getElementById('musicWidget'); if(!w) return;
  const name = document.getElementById('mwName');
  const btn = document.getElementById('mwPlayBtn');
  const hasTrack = !!_activeTrackId;
  w.classList.toggle('hidden-widget', !hasTrack);
  let trackName = '—';
  if(_activeTrackId){
    trackName = _isAmbientActive
      ? (AMBIENTS.find(a=>a.id===_activeTrackId)?.name || '—')
      : (_trackLib.find(t=>t.id===_activeTrackId)?.name || '—');
  }
  if(name) name.textContent = trackName;
  if(btn) btn.innerHTML = musicOn
    ? '<i data-lucide=\"pause\" style=\"width:14px;height:14px;\"></i>'
    : '<i data-lucide=\"play\" style=\"width:14px;height:14px;\"></i>';
  lucide.createIcons();
}

// ── MONITOR (seek bar update) ──────────────────────
function monitorCustomTrack(){
  stopMonitorCustomTrack();
  const wrap = document.getElementById('customTrackProgress');
  if(!_playingAudio || !wrap){ if(wrap) wrap.style.display='none'; return; }
  wrap.style.display='block';
  _ensureMusicAnalyser();
  const analyser = _musicAnalyser;
  const data = new Uint8Array(analyser.frequencyBinCount);
  _musicUpdateTimer = setInterval(()=>{
    const a = _playingAudio; if(!a) return;
    const pct = a.duration ? (a.currentTime/a.duration)*100 : 0;
    const bar = document.getElementById('ctpBar'); if(bar) bar.style.width=pct+'%';
    const el = document.getElementById('ctpElapsed'); if(el) el.textContent=fmtClock(a.currentTime||0);
    const tt = document.getElementById('ctpTotal'); if(tt) tt.textContent=isFinite(a.duration)?fmtClock(a.duration):'—';
    analyser.getByteFrequencyData(data);
    document.querySelectorAll('.mw-bar').forEach((b,i)=>{ const v=data[i%data.length]||0; b.style.height=(4+v/255*16)+'px'; });
  },500);
}
function stopMonitorCustomTrack(){
  clearInterval(_musicUpdateTimer); _musicUpdateTimer=null;
  const wrap = document.getElementById('customTrackProgress'); if(wrap) wrap.style.display='none';
  const bar = document.getElementById('ctpBar'); if(bar) bar.style.width='0%';
  const el = document.getElementById('ctpElapsed'); if(el) el.textContent='0:00';
}

function _ensureMusicAnalyser(){
  const ctx = actx();
  if(_musicAnalyser) return _musicAnalyser;
  _musicAnalyser = ctx.createAnalyser();
  _musicAnalyser.fftSize = 64;
  musicDest().connect(_musicAnalyser);
  return _musicAnalyser;
}

function fmtClock(sec){ sec=Math.floor(sec||0); const m=Math.floor(sec/60),s=sec%60; return `${m}:${String(s).padStart(2,'0')}`; }

// ── AMBIENT GENERATORS ─────────────────────────────
function createAmbient(id){
  const ctx=actx(), out=musicDest();
  const nodes=[];
  function nbuf(seconds=2){
    const buf=ctx.createBuffer(1,seconds*ctx.sampleRate,ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; return s;
  }
  function addNoise(type='lowpass',freq=500,gain=.2){
    const src=nbuf(2),flt=ctx.createBiquadFilter(),g=ctx.createGain();
    flt.type=type; flt.frequency.value=freq; g.gain.value=gain;
    src.connect(flt); flt.connect(g); g.connect(out); src.start(); nodes.push(src,g,flt); return {src,g,flt};
  }
  function addOsc(freq=220,type='sine',gain=.02){
    const o=ctx.createOscillator(),g=ctx.createGain(); o.type=type; o.frequency.value=freq; g.gain.value=gain;
    o.connect(g); g.connect(out); o.start(); nodes.push(o,g); return {o,g};
  }
  switch(id){
    case 'brown_noise': addNoise('lowpass',180,.28); break;
    case 'pink_noise':  addNoise('lowpass',900,.2); break;
    case 'forest_night': addNoise('highpass',2500,.03); addOsc(620,'sine',.005); setTimeout(()=>playSound('whistle'),300); break;
    case 'ocean_waves': addNoise('lowpass',600,.16); break;
    case 'lofi_pad':    addOsc(220,'triangle',.015); addOsc(329.63,'triangle',.012); addOsc(440,'sine',.008); break;
    default: addNoise('lowpass',800,.1);
  }
  return { stop(){
    nodes.forEach(n=>{ try{n.stop&&n.stop()}catch(e){} try{n.disconnect&&n.disconnect()}catch(e){} });
    if(_ambientTimerId){ clearInterval(_ambientTimerId); _ambientTimerId=null; }
  } };
}

// Fade music during alarm sounds
const _origPlaySound = playSound;
playSound = function(type){
  const mg=_musicGain; const ctx=actx();
  if(mg){ mg.gain.cancelScheduledValues(ctx.currentTime); mg.gain.setTargetAtTime(_musicVol*0.25,ctx.currentTime,0.03); }
  _origPlaySound(type);
  if(mg){ mg.gain.setTargetAtTime(_musicVol,ctx.currentTime+1.2,0.25); }
};

document.addEventListener('click',e=>{
  const btn = e.target.closest('#musicPlayBtn,#mwPlayBtn');
  if(btn && actx().state==='suspended') actx().resume();
});