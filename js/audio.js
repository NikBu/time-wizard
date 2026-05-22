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
  const mwSlider=document.getElementById('mwVolSlider'); if(mwSlider) mwSlider.value=v;
  const mainSlider=document.getElementById('musicVolSlider'); if(mainSlider) mainSlider.value=v;
  if(_musicGain) _musicGain.gain.setTargetAtTime(_musicVol, actx().currentTime, 0.05);
}

function oscEnv(f,t,sg,eg,st,dur){
  const o = actx().createOscillator(), g = actx().createGain();
  o.type=t; o.frequency.value=f;
  g.gain.setValueAtTime(sg,st); g.gain.exponentialRampToValueAtTime(eg,st+dur);
  o.connect(g); g.connect(alarmDest()); o.start(st); o.stop(st+dur+0.05);
}
function playSound(type){
  if(type==='none') return;
  // Handle custom uploaded alarm sounds (stored as "custom_0", "custom_1", etc.)
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
    else if(type==='viola'){
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
      const buf=actx().createBuffer(1,actx().sampleRate*.3,actx().sampleRate);
      const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,6);
      const s=actx().createBufferSource(),g=actx().createGain(),f=actx().createBiquadFilter();
      f.type='lowpass';f.frequency.value=180;s.buffer=buf;g.gain.value=.8;
      s.connect(f);f.connect(g);g.connect(alarmDest());s.start(n);
      oscEnv(60,'sine',.5,.001,n,.5);
    } else if(type==='whistle'){
      const o=actx().createOscillator(),g=actx().createGain();
      o.type='sine';o.frequency.setValueAtTime(880,n);o.frequency.linearRampToValueAtTime(1100,n+.3);
      o.frequency.linearRampToValueAtTime(880,n+.6);
      g.gain.setValueAtTime(.13,n);g.gain.exponentialRampToValueAtTime(.001,n+.7);
      o.connect(g);g.connect(alarmDest());o.start(n);o.stop(n+.75);
    }
  } catch(e){}
}
