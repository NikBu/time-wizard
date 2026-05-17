// ── ALARM SOUNDS UI ────────────────────────────────
function renderSoundGrid(){
  const host = $('#alarmSoundGrid'); if(!host) return;
  const builtins = [
    {id:'temple', name:'Temple Bell', desc:'Warm ritual chime'},
    {id:'bell', name:'Soft Bell', desc:'Gentle round bell'},
    {id:'chime', name:'Wind Chime', desc:'Airy layered notes'},
    {id:'gong', name:'Deep Gong', desc:'Low resonant strike'},
    {id:'arcade', name:'Arcade Ping', desc:'Bright compact blip'},
  ];
  host.innerHTML = [
    ...builtins.map(s=>renderSoundCard(s.id,s.name,s.desc,false)),
    ...customSounds.map(s=>renderSoundCard(s.id,s.name,'Custom upload',true)),
  ].join('');
  lucide.createIcons();
}
function renderSoundCard(id,name,desc,isCustom){
  const active = selectedAlarm===id;
  return `
    <div class="card" style="padding:14px; border:${active?'2px solid var(--color-primary)':'1px solid var(--color-border)'};">
      <div class="flex-between" style="gap:8px; align-items:flex-start;">
        <div>
          <div style="font-weight:600; font-size:var(--text-sm);">${escapeHtml(name)}</div>
          <div class="text-muted text-sm">${escapeHtml(desc)}</div>
        </div>
        ${isCustom ? `<button class="btn btn-ghost btn-icon" onclick="removeCustomSound('${id}')"><i data-lucide="trash-2"></i></button>` : ''}
      </div>
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="btn ${active?'btn-primary':'btn-secondary'} btn-sm" onclick="selectAlarmSound('${id}')">${active?'Selected':'Select'}</button>
        <button class="btn btn-ghost btn-sm" onclick="previewAlarmSound('${id}')"><i data-lucide="play"></i>Preview</button>
      </div>
    </div>`;
}
function selectAlarmSound(id){ selectedAlarm=id; renderSoundGrid(); showToast('Alarm sound selected.', 'success'); scheduleSave(); }
function previewAlarmSound(id){ playSoundPreview(id); }
async function handleCustomSoundUpload(file){
  if(!file) return;
  const ok = ['audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/aac','audio/webm'].includes(file.type) || /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name);
  if(!ok) return showToast('Please upload an audio file.', 'error');
  const id = uid('sound');
  const name = file.name.replace(/\.[^.]+$/,'');
  const url = URL.createObjectURL(file);
  customSounds.push({id, name, blob:file, url});
  saveAudioFile('alarm', name, file.type, file).then(dbId => {
    if(dbId) customSounds[customSounds.length-1].dbId = dbId;
  });
  renderSoundGrid(); showToast('Custom sound added.', 'success'); scheduleSave();
}
function removeCustomSound(id){
  const sound = customSounds.find(s=>s.id===id);
  if(sound && sound.dbId) deleteAudioFile(sound.dbId);
  const s = customSounds.find(x=>x.id===id);
  if(s?.url) URL.revokeObjectURL(s.url);
  customSounds = customSounds.filter(x=>x.id!==id);
  if(selectedAlarm===id) selectedAlarm='temple';
  renderSoundGrid(); scheduleSave();
}
window.selectAlarmSound = selectAlarmSound;
window.previewAlarmSound = previewAlarmSound;
window.removeCustomSound = removeCustomSound;
