// ── MUSIC PLAYER ───────────────────────────────────
const builtinAmbient = [
  {id:'none', icon:'⏹️', name:'No ambient', desc:'Silence, for the stern and brave.'},
  {id:'rain', icon:'🌧️', name:'Rain hush', desc:'Soft rain synthesized in the browser.'},
  {id:'night', icon:'🌙', name:'Night room', desc:'Low nocturne texture.'},
  {id:'fireplace', icon:'🔥', name:'Fireplace', desc:'Warm crackle-like noise.'},
];

const musicState = {
  activeAmbient: 'none',
  playing: false,
  volume: 0.35,
  customTracks: [],
  currentAudio: null,
  visualizerTimer: null,
};

function initMusicUI(){
  renderAmbientList();
  renderCustomMusicList();
  const vol = $('#musicVolume'); if(vol) vol.value = String(musicState.volume);
  const wVol = $('#mwVolume'); if(wVol) wVol.value = String(musicState.volume);
  updateMusicWidget();
}
function renderAmbientList(){
  const host = $('#ambientList'); if(!host) return;
  host.innerHTML = [...builtinAmbient.map(a=>renderAmbientRow(a,false)), ...musicState.customTracks.map(a=>renderAmbientRow({id:a.id,icon:'🎵',name:a.name,desc:'Custom track'},true))].join('');
}
function renderAmbientRow(a,isCustom){
  const selected = musicState.activeAmbient===a.id;
  return `<div class="ambient-row ${selected?'selected':''}" onclick="selectAmbient('${a.id}')">
    <div class="ambient-icon">${a.icon}</div>
    <div class="ambient-info"><div class="ambient-name">${escapeHtml(a.name)}</div><div class="ambient-desc">${escapeHtml(a.desc)}</div></div>
    ${isCustom?`<button class="btn btn-ghost btn-icon" onclick="event.stopPropagation(); removeCustomMusic('${a.id}')"><i data-lucide="trash-2"></i></button>`:''}
  </div>`;
}
function renderCustomMusicList(){
  const host = $('#customMusicList'); if(!host) return;
  if(!musicState.customTracks.length){ host.innerHTML = `<div class="text-muted text-sm">No custom music uploaded yet.</div>`; return; }
  host.innerHTML = musicState.customTracks.map(t=>`
    <div class="ambient-row ${musicState.activeAmbient===t.id?'selected':''}" onclick="selectAmbient('${t.id}')">
      <div class="ambient-icon">🎵</div>
      <div class="ambient-info"><div class="ambient-name">${escapeHtml(t.name)}</div><div class="ambient-desc">Custom file</div></div>
      <button class="btn btn-ghost btn-icon" onclick="event.stopPropagation(); removeCustomMusic('${t.id}')"><i data-lucide="trash-2"></i></button>
    </div>`).join('');
  lucide.createIcons();
}
function selectAmbient(id){
  musicState.activeAmbient = id;
  renderAmbientList(); renderCustomMusicList();
  if(musicState.playing) startSelectedAmbient();
  updateMusicWidget();
  scheduleSave();
}
function toggleMusic(){
  musicState.playing = !musicState.playing;
  if(musicState.playing) startSelectedAmbient(); else stopMusicPlayback();
  updateMusicWidget();
  scheduleSave();
}
function startSelectedAmbient(){
  stopMusicPlayback();
  const id = musicState.activeAmbient;
  if(id==='none') return;
  const custom = musicState.customTracks.find(t=>t.id===id);
  if(custom){
    const a = new Audio(custom.url);
    a.loop = true; a.volume = musicState.volume;
    a.play().catch(()=>showToast('Could not play audio file.', 'error'));
    musicState.currentAudio = a;
    startFakeVisualizer();
    updateMusicWidget();
    return;
  }
  startSynthAmbient(id);
  startFakeVisualizer();
  updateMusicWidget();
}
function stopMusicPlayback(){
  if(musicState.currentAudio){ try{ musicState.currentAudio.pause(); musicState.currentAudio.currentTime=0; }catch{} musicState.currentAudio=null; }
  stopAmbient();
  stopFakeVisualizer();
  updateMusicWidget();
}
function setMusicVolume(v){
  const val = Math.max(0, Math.min(1, +v || 0));
  musicState.volume = val;
  if(ambientGain) ambientGain.gain.value = val;
  if(musicState.currentAudio) musicState.currentAudio.volume = val;
  const vol = $('#musicVolume'); if(vol && vol.value != String(val)) vol.value = String(val);
  const wVol = $('#mwVolume'); if(wVol && wVol.value != String(val)) wVol.value = String(val);
  scheduleSave();
}
function startFakeVisualizer(){
  stopFakeVisualizer();
  musicState.visualizerTimer = setInterval(()=>{
    $$('.viz-bar, .mw-bar').forEach((b,i)=>{
      b.classList.add('active');
      b.style.setProperty('--i', i%5);
    });
  }, 500);
}
function stopFakeVisualizer(){
  clearInterval(musicState.visualizerTimer); musicState.visualizerTimer = null;
  $$('.viz-bar, .mw-bar').forEach(b=>b.classList.remove('active'));
}
function updateMusicWidget(){
  const widget = $('#musicWidget'); if(!widget) return;
  widget.classList.toggle('hidden-widget', !musicState.playing || musicState.activeAmbient==='none');
  const name = $('#mwTrackName');
  const current = musicState.customTracks.find(t=>t.id===musicState.activeAmbient)?.name || builtinAmbient.find(a=>a.id===musicState.activeAmbient)?.name || 'No ambient';
  if(name) name.textContent = current;
  const btn = $('#mwToggle');
  if(btn) btn.innerHTML = musicState.playing ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
  lucide.createIcons();
}
async function handleMusicUpload(files){
  if(!files?.length) return;
  for(const file of files){ await _addMusicFile(file); }
  renderAmbientList(); renderCustomMusicList(); updateMusicWidget(); showToast('Music added.', 'success'); scheduleSave();
}
async function _addMusicFile(file){
  const ok = ['audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/aac','audio/webm'].includes(file.type) || /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name);
  if(!ok) return;
  const id = uid('track');
  const name = file.name.replace(/\.[^.]+$/,'');
  const url = URL.createObjectURL(file);
  musicState.customTracks.push({id,name,url});
  saveAudioFile('music', name, file.type, file).then(dbId => {
    if(dbId) musicState.customTracks[musicState.customTracks.length-1].dbId = dbId;
    scheduleSave();
  });
}
function removeCustomMusic(id){
  const track = musicState.customTracks.find(t=>t.id===id);
  if(track && track.dbId) deleteAudioFile(track.dbId);
  const t = musicState.customTracks.find(x=>x.id===id);
  if(t?.url) URL.revokeObjectURL(t.url);
  musicState.customTracks = musicState.customTracks.filter(x=>x.id!==id);
  if(musicState.activeAmbient===id){ musicState.activeAmbient='none'; stopMusicPlayback(); musicState.playing=false; }
  renderAmbientList(); renderCustomMusicList(); updateMusicWidget(); scheduleSave();
}

window.selectAmbient = selectAmbient;
window.toggleMusic = toggleMusic;
window.setMusicVolume = setMusicVolume;
window.removeCustomMusic = removeCustomMusic;
