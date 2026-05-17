// ── SOUND ENGINE ───────────────────────────────────
let audioCtx = null;
let ambientGain = null;
let currentAmbientNodes = [];
let audioUnlocked = false;

function ensureAudio(){
  if(!audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = musicState.volume;
    ambientGain.connect(audioCtx.destination);
  }
  if(audioCtx.state === 'suspended') audioCtx.resume();
  audioUnlocked = true;
}
['pointerdown','keydown'].forEach(evt => window.addEventListener(evt, ensureAudio, {once:true}));

function beep(freq=880,dur=.18,type='sine',vol=.08){
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + dur);
}

function playAlarmTone(key){
  ensureAudio();
  if(customSounds.find(s=>s.id===key)){
    const s = customSounds.find(s=>s.id===key);
    const a = new Audio(s.url); a.volume=.9; a.play().catch(()=>{}); return;
  }
  const patterns = {
    temple:()=>{ beep(660,.12,'triangle',.05); setTimeout(()=>beep(990,.2,'sine',.05),120); setTimeout(()=>beep(1320,.25,'sine',.04),300); },
    bell:()=>{ beep(1046,.35,'sine',.06); setTimeout(()=>beep(784,.5,'triangle',.04),40); },
    chime:()=>{ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,.2,'sine',.04),i*90)); },
    gong:()=>{ beep(180,1.2,'triangle',.08); setTimeout(()=>beep(270,1.0,'sine',.04),60); },
    arcade:()=>{ [880,1174,1568].forEach((f,i)=>setTimeout(()=>beep(f,.09,'square',.03),i*70)); },
  };
  (patterns[key]||patterns.temple)();
}

function stopAmbient(){
  currentAmbientNodes.forEach(n=>{ try{ n.stop?.(); }catch{} try{ n.disconnect?.(); }catch{} });
  currentAmbientNodes=[];
}

function makeNoise(type='white'){
  const len = audioCtx.sampleRate * 2;
  const buf = audioCtx.createBuffer(1,len,audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  let lastOut=0;
  for(let i=0;i<len;i++){
    const white = Math.random()*2-1;
    if(type==='pink'){ lastOut = (lastOut + (0.02 * white)) / 1.02; data[i] = lastOut * 3.5; }
    else data[i] = white;
  }
  const src = audioCtx.createBufferSource(); src.buffer = buf; src.loop = true; return src;
}

function startSynthAmbient(kind){
  ensureAudio(); stopAmbient();
  const nodes=[];
  if(kind==='rain' || kind==='night'){
    const noise = makeNoise(kind==='rain' ? 'white' : 'pink');
    const filter = audioCtx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value = kind==='rain' ? 900 : 500;
    const gain = audioCtx.createGain(); gain.gain.value = kind==='rain' ? 0.06 : 0.03;
    noise.connect(filter); filter.connect(gain); gain.connect(ambientGain); noise.start(); nodes.push(noise,filter,gain);
  }
  if(kind==='fireplace'){
    const noise = makeNoise('white');
    const filter = audioCtx.createBiquadFilter(); filter.type='bandpass'; filter.frequency.value = 300;
    const gain = audioCtx.createGain(); gain.gain.value = 0.04;
    noise.connect(filter); filter.connect(gain); gain.connect(ambientGain); noise.start(); nodes.push(noise,filter,gain);
  }
  currentAmbientNodes = nodes;
}
