// ── ARCHIBALD COMPANION ───────────────────────────
const OWL = {
  idle:'https://user-gen-media-assets.s3.amazonaws.com/seedream_images/d728ba27-b057-453a-8ab6-e5ea7a6e0025.png',
  excited:'https://user-gen-media-assets.s3.amazonaws.com/seedream_images/8e1c0322-475c-4e86-b2aa-e065f656ff6d.png',
  sleepy:'https://user-gen-media-assets.s3.amazonaws.com/seedream_images/cff91656-52f5-487d-8ad5-dde4cd311612.png',
  magic:'https://user-gen-media-assets.s3.amazonaws.com/seedream_images/31df42f0-a7b3-496a-b2fd-0f385409cfdb.png',
  judging:'https://user-gen-media-assets.s3.amazonaws.com/seedream_images/8e9f5b80-3532-4a9a-b163-3ed770d0e592.png'
};
const ARCH_QUOTES = {
  greet:[
    'Ah, another page in the grand ledger of your day.',
    'Welcome back, apprentice of order.',
    'The clock is wound, the lists await, and I am at your service.'
  ],
  timer_add:[
    'A timer set is a promise made visible.',
    'Excellent. A measured step toward mastery.',
    'Time, once named, becomes easier to tame.'
  ],
  timer_done:[
    'Splendid! Another interval conquered.',
    'The bell tolls for progress, not for doom.',
    'Well done. Even small victories gild the day.'
  ],
  task_add:[
    'A task written is a thought relieved of duty.',
    'Into the ledger it goes.',
    'Good. A wandering idea now has a perch.'
  ],
  task_done:[
    'Marked complete — a satisfying little spell.',
    'Another burden reduced to a neat line of ink.',
    'The list grows shorter. How elegant.'
  ],
  pet:[
    'Hoot! Encouragement accepted.',
    'Your kindness is noted in the archives.',
    'A fine pat. Morale rises.'
  ],
  idle:[
    'Silence is useful; it lets intention speak louder.',
    'Do not confuse stillness with failure. Even owls pause.',
    'If the day feels tangled, choose the smallest next step.'
  ],
  export:[
    'A wise wizard keeps backups.',
    'Excellent precaution. Even enchanted ledgers deserve copies.'
  ],
  import:[
    'The archive has been restored.',
    'Memories returned to their shelves.'
  ]
};
const ARCH_FAQ = [
  {q:'How do I focus better?', a:'Choose one task, start one timer, and let the rest wait outside the door. Attention dislikes crowds.'},
  {q:'What if I feel overwhelmed?', a:'Shrink the mission. One task into three smaller tasks. Completion restores courage faster than contemplation.'},
  {q:'Should I take a break?', a:'If your mind grows fuzzy and your shoulders rise like castle walls, yes. A short break protects long work.'},
  {q:'How often should I review my lists?', a:'Morning for direction, evening for reflection. Midday only if the winds of chaos are particularly rude.'},
  {q:'Any wisdom for procrastination?', a:'Begin badly, but begin. Momentum is often disguised as imperfection.'}
];

const arch = { enabled:true, xp:0, mood:70, focus:50, energy:80, mode:'idle' };
let _archFloatTimer = null;

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function archSetMode(mode){
  arch.mode=mode;
  const img=document.getElementById('companionImg'); if(img) img.src = OWL[mode] || OWL.idle;
  const lbl=document.getElementById('companionStateLabel'); if(lbl) lbl.textContent = mode[0].toUpperCase()+mode.slice(1);
}
function archSpeak(text, floatToo=true){
  const box=document.getElementById('companionSpeech');
  if(box){ box.style.opacity=.15; setTimeout(()=>{ box.textContent=`“${text}”`; box.style.opacity=1; },120); }
  if(floatToo) archPopup(text);
}
function archNotify(kind){
  if(!arch.enabled) return;
  const txt = rand(ARCH_QUOTES[kind] || ARCH_QUOTES.idle);
  if(kind==='timer_done') { arch.mood=Math.min(100,arch.mood+6); arch.energy=Math.max(0,arch.energy-2); archSetMode('excited'); }
  else if(kind==='task_done'){ arch.mood=Math.min(100,arch.mood+4); arch.focus=Math.min(100,arch.focus+3); archSetMode('magic'); }
  else if(kind==='task_add'||kind==='timer_add'){ arch.focus=Math.min(100,arch.focus+1); archSetMode('idle'); }
  else if(kind==='pet'){ arch.mood=Math.min(100,arch.mood+8); archSetMode('excited'); }
  else if(kind==='export'||kind==='import'){ archSetMode('magic'); }
  archSpeak(txt);
  archUpdateUI();
  clearTimeout(window._archModeBack);
  window._archModeBack=setTimeout(()=>archSetMode(arch.energy<25?'sleepy':'idle'),2600);
}
function archXP(n){ arch.xp+=n; const lvl=Math.floor(arch.xp/100)+1; const xpEl=document.getElementById('archXP'); if(xpEl) xpEl.textContent=`Level ${lvl} • ${arch.xp} XP`; }
function archUpdateUI(){
  const set=(id,val)=>{ const bar=document.getElementById(id+'Bar'); const txt=document.getElementById(id+'Val'); if(bar) bar.style.width=val+'%'; if(txt) txt.textContent=val+'%'; };
  set('mood',arch.mood); set('focus',arch.focus); set('energy',arch.energy);
  const wisdom=document.getElementById('owlWisdom'); if(wisdom) wisdom.textContent = totalPts;
}
function archGreet(){ archSetMode('idle'); archSpeak(rand(ARCH_QUOTES.greet), false); archUpdateUI(); }
function petArch(){ archNotify('pet'); }
function setArchEnabled(v){ arch.enabled=!!v; document.getElementById('archBody').style.opacity=v?1:.45; if(v) archSpeak('Archibald returns to his perch.'); else archPopupHide(); }
function renderFAQ(){
  const list=document.getElementById('faqList'); if(!list) return;
  list.innerHTML=ARCH_FAQ.map((f,i)=>`
    <button class="ambient-row" style="text-align:left;" onclick="archAnswer(${i})">
      <span class="amb-icon">🦉</span>
      <div class="amb-info"><div class="amb-name">${f.q}</div><div class="amb-desc">Ask for owl wisdom</div></div>
    </button>`).join('');
}
function archAnswer(i){
  const f=ARCH_FAQ[i]; if(!f) return;
  const ans=document.getElementById('faqAnswer');
  const txt=document.getElementById('faqAnswerText');
  if(ans&&txt){ txt.textContent='“'+f.a+'”'; ans.style.display='block'; }
  archSetMode('judging');
  archSpeak(f.a);
  clearTimeout(window._archModeBack);
  window._archModeBack=setTimeout(()=>archSetMode('idle'),3200);
}
function archFAQOpen(){
  const idx=Math.floor(Math.random()*ARCH_FAQ.length);
  archAnswer(idx);
}

function archPopup(text){
  if(!arch.enabled) return;
  const p=document.getElementById('archPopup');
  const img=document.getElementById('archPopupImg');
  const bub=document.getElementById('archPopupBubble');
  if(!p||!img||!bub) return;
  img.src = OWL[arch.mode] || OWL.idle;
  bub.textContent = text;
  p.classList.add('visible');
  clearTimeout(_archFloatTimer);
  _archFloatTimer=setTimeout(()=>p.classList.remove('visible'),4200);
}
function archPopupHide(){ document.getElementById('archPopup')?.classList.remove('visible'); }

// Passive behavior loop
setInterval(()=>{
  if(!arch.enabled) return;
  const anyRunning = timers.some(t=>t.running);
  if(anyRunning){
    arch.focus=Math.min(100, arch.focus+1);
    arch.energy=Math.max(0, arch.energy-1);
    if(arch.energy<20) archSetMode('sleepy');
  } else {
    arch.energy=Math.min(100, arch.energy+1);
    if(Math.random()<0.18) archSpeak(rand(ARCH_QUOTES.idle));
  }
  arch.mood=Math.max(25, arch.mood - (Math.random()<0.25 ? 1 : 0));
  archUpdateUI();
}, 15000);

// Pet by clicking portrait
document.addEventListener('click', e => {
  const portrait = e.target.closest('#companionImg');
  if(portrait) petArch();
});

function refreshHeaderPoints(){
  const hp=document.getElementById('headerPoints');
  if(hp) hp.textContent=`✶ ${totalPts} pts`;
  const gp=document.getElementById('globalPts');
  if(gp) gp.textContent=totalPts;
  const lvl=document.getElementById('archLevel');
  if(lvl) lvl.textContent=Math.floor(totalPts/100)+1;
  const wiz=document.getElementById('owlWisdom');
  if(wiz) wiz.textContent=totalPts;
}
