// ── ARCHIBALD COMPANION ────────────────────────────
let archEnabled = true;
let archMood = 72;
let archTrust = 50;
let archPatience = 88;
let lastArchPet = 0;
let archSilenceStreak = 0;
let archUsageStreak = 0;

const archLines = {
  greet:[
    "Ah. You returned. Time bends a bit more politely when you're here.",
    "The forest ledger is open. Shall we make a respectable dent in the day?",
    "I have sharpened my stare and dusted off a little optimism for you."
  ],
  pet:[
    "A dignified pet. I shall allow another, eventually.",
    "Mm. Acceptable tribute. My feathers approve.",
    "I pretend to be above this, but I am not."
  ],
  idle:[
    "Quiet focus is still progress.",
    "I am watching the minutes behave.",
    "One careful task at a time. That's how the tower stays standing."
  ],
  praise:[
    "Clean work. Even the clocks seem impressed.",
    "There. Order from chaos. My favorite kind of magic.",
    "You did the difficult thing first. Sensible. Rare. Admirable."
  ],
  annoyed:[
    "If we keep opening menus instead of finishing tasks, I may molt dramatically.",
    "I say this with warmth: stop poking everything and complete one thing.",
    "The vibes are wandering. Herd them gently back to the list."
  ]
};
function pick(arr){ return arr[(Math.random()*arr.length)|0]; }
function setArchLine(text){ const el=$('#archLine'); if(el) el.textContent=text; }
function archRefreshStats(){
  const moodEl=$('#archMood'); const trustEl=$('#archTrust'); const patienceEl=$('#archPatience');
  if(moodEl) moodEl.style.width=`${archMood}%`;
  if(trustEl) trustEl.style.width=`${archTrust}%`;
  if(patienceEl) patienceEl.style.width=`${archPatience}%`;
  const moodVal=$('#archMoodVal'), trustVal=$('#archTrustVal'), patienceVal=$('#archPatienceVal');
  if(moodVal) moodVal.textContent=archMood;
  if(trustVal) trustVal.textContent=archTrust;
  if(patienceVal) patienceVal.textContent=archPatience;
}
function archSetMode(mode){
  setArchLine(pick(archLines[mode] || archLines.idle));
}
function archGreet(){ archSetMode('greet'); archRefreshStats(); }
function petArch(){
  const now = Date.now();
  if(now - lastArchPet < 4000){ showToast('Archibald requests a slightly more measured admiration.', 'error'); return; }
  lastArchPet = now;
  archMood = Math.min(100, archMood + 4);
  archTrust = Math.min(100, archTrust + 2);
  archSetMode('pet'); archRefreshStats(); showToast('Archibald has been gently petted.', 'success'); scheduleSave();
}
function archOnTaskComplete(){
  archMood = Math.min(100, archMood + 3);
  archTrust = Math.min(100, archTrust + 4);
  archPatience = Math.min(100, archPatience + 1);
  archSetMode('praise'); archRefreshStats(); maybeShowArchPopup(pick(archLines.praise)); scheduleSave();
}
function archOnFidget(){
  archPatience = Math.max(0, archPatience - 2);
  if(archPatience < 35){ archSetMode('annoyed'); maybeShowArchPopup(pick(archLines.annoyed)); }
  archRefreshStats(); scheduleSave();
}
function toggleArchEnabled(){
  archEnabled = !archEnabled;
  const cb = $('#archEnable'); if(cb) cb.checked = archEnabled;
  showToast(archEnabled ? 'Archibald is awake.' : 'Archibald is taking a dignified pause.');
  scheduleSave();
}
function setArchEnabled(v){
  scheduleSave();
  archEnabled = !!v;
  archRefreshStats();
}

const ARCH_FAQ = [
  ['Who are you, exactly?', 'Archibald. Owl. Steward of minutes. Mild critic of sloppy planning.'],
  ['Why do you care about my timers?', 'Because unattended minutes become goblins. I keep them in a ledger.'],
  ['Can I pet you?', 'Within reason. I am not a stress ball with feathers.'],
  ['What do you eat?', 'Mostly ambiance and the occasional symbolic acorn.'],
  ['Will you judge me?', 'Softly. With style. But also with hope.'],
];
function renderFAQ(){
  const host = $('#faqList'); if(!host) return;
  host.innerHTML = ARCH_FAQ.map(([q,a],i)=>`
    <div>
      <div class="faq-item" onclick="toggleFaq(${i})">${escapeHtml(q)}</div>
      <div class="faq-answer" id="faq_a_${i}">${escapeHtml(a)}</div>
    </div>`).join('');
}
function toggleFaq(i){
  const el = document.getElementById(`faq_a_${i}`); if(!el) return;
  el.classList.toggle('open');
}

function maybeShowArchPopup(text){
  if(!archEnabled) return;
  const popup = $('#archPopup'), bubble = $('#archPopupBubble');
  if(!popup || !bubble) return;
  bubble.textContent = text;
  popup.classList.add('visible');
  clearTimeout(maybeShowArchPopup._t);
  maybeShowArchPopup._t = setTimeout(()=>popup.classList.remove('visible'), 3600);
}

window.petArch = petArch;
window.toggleArchEnabled = toggleArchEnabled;
window.toggleFaq = toggleFaq;
