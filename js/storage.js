// ── SESSION STORAGE (IndexedDB-backed) ───────────────────────────────────────
const STORAGE_DB = 'timeWizardDB';
const STORAGE_VER = 1;
const SESSION_KEY = 'session';

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(STORAGE_DB, STORAGE_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if(!db.objectStoreNames.contains('audioFiles')) db.createObjectStore('audioFiles', { keyPath:'id', autoIncrement:true });
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
async function idbGet(store, key){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
async function idbSet(store, key, value){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value, key);
    req.onsuccess = ()=>resolve(true);
    req.onerror = ()=>reject(req.error);
  });
}
async function idbAdd(store, value){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(value);
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
async function idbDelete(store, key){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = ()=>resolve(true);
    req.onerror = ()=>reject(req.error);
  });
}
async function idbGetAll(store){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = ()=>resolve(req.result || []);
    req.onerror = ()=>reject(req.error);
  });
}

function snapshotState(){
  return {
    timers, tidx, editingTimerId,
    lists, lidx, tidxc, activeList,
    archMood, archTrust, archPatience, archEnabled, lastArchPet, archSilenceStreak, archUsageStreak,
    activeThemeId,
    selectedAlarm,
    customSounds: (customSounds||[]).map(({id,name,dbId})=>({id,name,dbId})),
    musicState: {
      volume: musicState.volume,
      activeAmbient: musicState.activeAmbient,
      playing: musicState.playing,
      customTracks: (musicState.customTracks||[]).map(({id,name,dbId})=>({id,name,dbId}))
    }
  };
}
async function persistSession(){
  try {
    await idbSet('kv', SESSION_KEY, snapshotState());
  } catch(e){ console.warn('Persist failed', e); }
}
let __saveTimer = null;
function scheduleSave(){
  clearTimeout(__saveTimer);
  __saveTimer = setTimeout(persistSession, 250);
}

async function saveAudioFile(kind, name, type, blob){
  try { return await idbAdd('audioFiles', { kind, name, type, blob }); }
  catch(e){ console.warn('Audio save failed', e); return null; }
}
async function deleteAudioFile(id){
  try { await idbDelete('audioFiles', id); }
  catch(e){ console.warn('Audio delete failed', e); }
}
async function restoreSession(){
  try {
    const saved = await idbGet('kv', SESSION_KEY);
    if(!saved) return false;

    if(Array.isArray(saved.timers)) timers = saved.timers;
    if(typeof saved.tidx === 'number') tidx = saved.tidx;
    editingTimerId = saved.editingTimerId ?? null;

    if(Array.isArray(saved.lists)) lists = saved.lists;
    if(typeof saved.lidx === 'number') lidx = saved.lidx;
    if(typeof saved.tidxc === 'number') tidxc = saved.tidxc;
    activeList = saved.activeList ?? null;

    archMood = saved.archMood ?? archMood;
    archTrust = saved.archTrust ?? archTrust;
    archPatience = saved.archPatience ?? archPatience;
    archEnabled = saved.archEnabled ?? archEnabled;
    lastArchPet = saved.lastArchPet ?? lastArchPet;
    archSilenceStreak = saved.archSilenceStreak ?? archSilenceStreak;
    archUsageStreak = saved.archUsageStreak ?? archUsageStreak;

    activeThemeId = saved.activeThemeId ?? activeThemeId;
    selectedAlarm = saved.selectedAlarm ?? selectedAlarm;

    const files = await idbGetAll('audioFiles');
    const soundFiles = files.filter(f=>f.kind==='alarm');
    const musicFiles = files.filter(f=>f.kind==='music');

    customSounds = soundFiles.map(f=>({ id:f.id, dbId:f.id, name:f.name, blob:f.blob, url: URL.createObjectURL(f.blob) }));
    const sMeta = saved.customSounds || [];
    customSounds.forEach(s => {
      const meta = sMeta.find(m => m.dbId === s.dbId || m.id === s.id);
      if(meta?.id) s.id = meta.id;
    });

    musicState.customTracks = musicFiles.map(f=>({ id:f.id, dbId:f.id, name:f.name, url: URL.createObjectURL(f.blob) }));
    const mMeta = saved.musicState?.customTracks || [];
    musicState.customTracks.forEach(t => {
      const meta = mMeta.find(m => m.dbId === t.dbId || m.id === t.id);
      if(meta?.id) t.id = meta.id;
    });
    if(saved.musicState){
      musicState.volume = saved.musicState.volume ?? musicState.volume;
      musicState.activeAmbient = saved.musicState.activeAmbient ?? musicState.activeAmbient;
      musicState.playing = saved.musicState.playing ?? false;
    }

    renderThemes();
    applyThemeVars();
    renderSoundGrid();
    initMusicUI();
    renderTimers();
    renderLists();
    if(activeList) selectList(activeList); else if(lists[0]) selectList(lists[0].id);
    archRefreshStats();
    return true;
  } catch(e){
    console.warn('Restore failed', e);
    return false;
  }
}

async function requestPersistentStorage(){
  try {
    if(navigator.storage?.persist){
      const granted = await navigator.storage.persist();
      console.log('Persistent storage', granted ? 'granted' : 'not granted');
    }
  } catch(e){ console.warn('persist() failed', e); }
}

window.addEventListener('beforeunload', persistSession);
