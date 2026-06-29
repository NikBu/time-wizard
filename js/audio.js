// ── AUDIO ENGINE ──────────────────────────────────
let _actx = null;
function actx(){ if(!_actx){ _actx = new (window.AudioContext||window.webkitAudioContext)(); _initGains(); } return _actx; }

let _alarmGain = null, _musicGain = null;
let _alarmVol = 0.8, _musicVol = 0.6;
function _initGains(){
  _alarmGain = _actx.createGain(); _alarmGain.gain.value = _alarmVol; _alarmGain.connect(_actx.destination);
  _musicGain = _actx.createGain(); _musicGain.gain.value = _musicVol; _musicGain.connect(_actx.destination);
}
function alarmDest(){ actx(); return _alarmGain||_actx.destination; }
function musicDest(){ actx(); return _musicGain||_actx.destination; }
function setAlarmVol(v){
  _alarmVol=v/100;
  document.getElementById('alarmVolLabel').textContent=v+'%';
  if(_alarmGain) _alarmGain.gain.setTargetAtTime(_alarmVol, actx().currentTime, 0.05);
}
function setMusicVol(v){
  _musicVol=v/100;
  const lbl=document.getElementById('musicVolLabel'); if(lbl) lbl.textContent=v+'%';
  const mwSlider=document.getElementById('mwVolSlider'); if(mwSlider && mwSlider.value!==String(v)) mwSlider.value=v;
  const mainSlider=document.getElementById('musicVolSlider'); if(mainSlider && mainSlider.value!==String(v)) mainSlider.value=v;
  if(_musicGain) _musicGain.gain.setTargetAtTime(_musicVol, actx().currentTime, 0.05);
  if(window._applyMusicVolToPlayingAudio) window._applyMusicVolToPlayingAudio();
}

// Helper used by music.js to keep any HTMLAudioElement in sync with _musicVol
let _htmlMusicSource = null;
function attachHtmlMusicSource(audio){
  actx();
  if(_htmlMusicSource) try{ _htmlMusicSource.disconnect(); }catch(e){}
  try{
    _htmlMusicSource = _actx.createMediaElementSource(audio);
    _htmlMusicSource.connect(musicDest());
  }catch(e){ _htmlMusicSource = null; }
  audio.volume = _musicVol;
}

function _applyMusicVolToPlayingAudio(){
  if(typeof window._getPlayingAudio === 'function'){
    const a = window._getPlayingAudio();
    if(a) a.volume = _musicVol;
  }
}

function oscEnv(f,t,sg,eg,st,dur){
  const o = actx().createOscillator(), g = actx().createGain();
  o.type=t; o.frequency.value=f;
  g.gain.setValueAtTime(sg,st); g.gain.exponentialRampToValueAtTime(eg,st+dur);
  o.connect(g); g.connect(alarmDest()); o.start(st); o.stop(st+dur+0.05);
}
function playSound(type){
  if(type==='none') return;
  if(type && type.startsWith('custom_')){
    const i = parseInt(type.split('_')[1]);
    const cs = (typeof _customSounds !== 'undefined') && _customSounds[i];
    if(cs){
      try{ actx(); if(_actx.state==='suspended') _actx.resume(); }catch(e){}
      const a = new Audio(cs.url);
      a.volume = _alarmVol;
      a.play().catch(()=>{});
    }
    return;
  }
  try{
    const n = actx().currentTime;
    if(type==='bell'){ [110,82.4,65.4].forEach((f,i)=>oscEnv(f,'sine',.35,.001,n+i*.06,2.5)); }
    else if(type==='trombone'){
      [[293.66,0],[329.63,.4],[369.99,.8],[293.66,1.2]].forEach(([f,d])=>{
        const o=actx().createOscillator(),g=actx().createGain(),flt=actx().createBiquadFilter();
        o.type='sawtooth';o.frequency.value=f;flt.type='lowpass';flt.frequency.value=700;
        g.gain.setValueAtTime(0,n+d);g.gain.linearRampToValueAtTime(.1,n+d+.05);
        g.gain.exponentialRampToValueAtTime(.001,n+d+.38);
        o.connect(flt);flt.connect(g);g.connect(alarmDest());o.start(n+d);o.stop(n+d+.4);
      });
    } else if(type==='harp'){ [523.25,659.25,783.99,1046.5,783.99,659.25].forEach((f,i)=>oscEnv(f,'triangle',.18,.001,n+i*.18,.6)); }
    else if(type==='chime'){ [1046.5,1318.5,1568,2093].forEach((f,i)=>oscEnv(f,'sine',.14,.001,n+i*.12,.5)); }
    else if(type==='drum'){
      const sr = actx().sampleRate;
      const dur = 2.2;
      const len = Math.ceil(sr * dur);

      // ── Layer 1: click transient (very short noise burst) ──
      const clickLen = Math.ceil(sr * 0.012);
      const clickBuf = actx().createBuffer(1, clickLen, sr);
      const cd = clickBuf.getChannelData(0);
      for(let i=0;i<clickLen;i++) cd[i]=(Math.random()*2-1)*Math.pow(1-i/clickLen,2);
      const clickSrc = actx().createBufferSource();
      const clickFlt = actx().createBiquadFilter(); clickFlt.type='bandpass'; clickFlt.frequency.value=3500; clickFlt.Q.value=0.8;
      const clickG = actx().createGain(); clickG.gain.setValueAtTime(0.55,n); clickG.gain.exponentialRampToValueAtTime(0.001,n+0.015);
      clickSrc.buffer=clickBuf; clickSrc.connect(clickFlt); clickFlt.connect(clickG); clickG.connect(alarmDest()); clickSrc.start(n);

      // ── Layer 2: pitched sine sweep 90 Hz → 38 Hz (punch body) ──
      const sweepOsc = actx().createOscillator(); sweepOsc.type='sine';
      sweepOsc.frequency.setValueAtTime(90, n);
      sweepOsc.frequency.exponentialRampToValueAtTime(38, n+0.12);
      sweepOsc.frequency.exponentialRampToValueAtTime(30, n+0.5);
      const sweepG = actx().createGain();
      sweepG.gain.setValueAtTime(0.9, n);
      sweepG.gain.linearRampToValueAtTime(0.75, n+0.04);
      sweepG.gain.exponentialRampToValueAtTime(0.001, n+dur);
      sweepOsc.connect(sweepG); sweepG.connect(alarmDest()); sweepOsc.start(n); sweepOsc.stop(n+dur+0.05);

      // ── Layer 3: sub-bass sine at 48 Hz (deep weight) ──
      const subOsc = actx().createOscillator(); subOsc.type='sine'; subOsc.frequency.value=48;
      const subG = actx().createGain();
      subG.gain.setValueAtTime(0.0, n);
      subG.gain.linearRampToValueAtTime(0.65, n+0.008);
      subG.gain.exponentialRampToValueAtTime(0.001, n+1.4);
      subOsc.connect(subG); subG.connect(alarmDest()); subOsc.start(n); subOsc.stop(n+1.45);

      // ── Layer 4: noise tail shaped through low-pass (resonant thump) ──
      const noiseBuf = actx().createBuffer(1, len, sr);
      const nd = noiseBuf.getChannelData(0);
      for(let i=0;i<len;i++) nd[i]=(Math.random()*2-1)*Math.pow(Math.max(0,1-i/len),3.5);
      const noiseSrc = actx().createBufferSource();
      const noiseFlt = actx().createBiquadFilter(); noiseFlt.type='lowpass'; noiseFlt.frequency.value=120; noiseFlt.Q.value=4.5;
      const noiseG = actx().createGain(); noiseG.gain.value=0.45;
      noiseSrc.buffer=noiseBuf; noiseSrc.connect(noiseFlt); noiseFlt.connect(noiseG); noiseG.connect(alarmDest()); noiseSrc.start(n);

    } else if(type==='bounce'){
      const o=actx().createOscillator(),g=actx().createGain();
      o.type='sine';o.frequency.setValueAtTime(880,n);o.frequency.linearRampToValueAtTime(1100,n+.3);
      o.frequency.linearRampToValueAtTime(880,n+.6);
      g.gain.setValueAtTime(.13,n);g.gain.exponentialRampToValueAtTime(.001,n+.7);
      o.connect(g);g.connect(alarmDest());o.start(n);o.stop(n+.75);
    }
  } catch(e){}
}
