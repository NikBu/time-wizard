// ── ARCHIBALD COMPANION ────────────────────────────────────────────────────────
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

// ── QA DATABASE ────────────────────────────────────────────────────────────────
const ARCH_QA = {
  guide: [
    {
      q: 'How do I add a subtask?',
      a: 'Indent a task by pressing Tab while typing in the input field below any existing task. Three levels are permitted — though I advise restraint beyond two.'
    },
    {
      q: 'How do I earn points?',
      a: 'Complete tasks. Each carries a point value visible beside it. Those points flow into your Reward Cabinet to be spent on treats you have defined for yourself.'
    },
    {
      q: 'How do repeating timers work?',
      a: 'When creating a timer, change the Repeat Mode dropdown from Once to your preference — fixed intervals, Fibonacci, decreasing periods, even a random range. The clock obeys many masters.'
    },
    {
      q: 'What is the Reward Cabinet?',
      a: 'A shop of your own design. Add rewards with a name, emoji, and point cost. When your balance covers the price, redeem it. Archibald approves of earned indulgences.'
    },
    {
      q: 'How do I reorder tasks?',
      a: 'Drag them. Grip the handle on the left of any task row and place it where it belongs. The list will remember.'
    },
    {
      q: 'How do I collapse a group?',
      a: 'Click the small triangle beside any parent task. A filled triangle means the children are hidden; an open one means they are visible. The dot indicates a leaf — no children to collapse.'
    },
    {
      q: 'How do I add a custom sound?',
      a: 'Go to the Music tab and scroll to the Sound Library. You may upload an MP3, WAV, or OGG file. It will then appear as an alarm option when creating any timer.'
    },
    {
      q: 'How do I use a Pomodoro preset?',
      a: 'Open the Timers tab and look for the Quick Presets card on the right. The 25-minute Pomodoro is the first option. One click and it is added to your active timers.'
    },
    {
      q: 'Can I duplicate a list?',
      a: 'Yes. Open the list menu in the sidebar — the three dots beside any list name — and select Duplicate. The copy will include all tasks and subtasks intact.'
    },
    {
      q: 'How do I add a note to a task?',
      a: 'Expand the task options and look for the Notes field. It accepts freeform text and can be shown or hidden per task without affecting the task name itself.'
    }
  ],
  trivia: [
    {
      q: 'Windows emoji shortcut?',
      a: 'Press Win + . (the period key) on Windows 10 or 11 to summon the system emoji picker at any text cursor — quite useful for naming your rewards with proper flair.'
    },
    {
      q: 'What are colored sounds?',
      a: 'Sounds are named like light: white noise contains all frequencies equally. Brown noise sits lower and rougher — many find it masks distractions without the harshness of white. Pink noise lives between the two, falling off gently with frequency. Each colour suits a different mind.'
    },
    {
      q: 'Why does 25 minutes work?',
      a: 'Francesco Cirillo noticed that committing to an uninterrupted 25-minute block made starting feel far less daunting. The boundary is the trick, not the specific number. The tomato-shaped kitchen timer was merely a prop.'
    },
    {
      q: 'Does music help you focus?',
      a: 'Instrumental music with a stable rhythm tends to sustain attention without hijacking language processing. Lyrics compete directly with reading and writing — the brain cannot serve two verbal streams at once. Stick to ambient, classical, or lofi.'
    },
    {
      q: 'What is task-switching cost?',
      a: 'Every time you abandon one task for another, your brain spends roughly 20 minutes reclaiming its previous depth of focus. Interruptions are expensive on the cognitive ledger. Batching similar tasks into a single block reduces the toll considerably.'
    },
    {
      q: 'What is the Zeigarnik effect?',
      a: 'Bluma Zeigarnik observed that incomplete tasks occupy working memory far more than completed ones. Writing a task down — even without doing it — can partially close that loop and quieten the background hum of unfinished business.'
    },
    {
      q: 'Why does a to-do list help?',
      a: 'The act of externalising a task — moving it from mind to paper — reduces the cognitive load of remembering it. The brain stops rehearsing the item and can redirect that energy elsewhere. Lists are offloaded memory.'
    },
    {
      q: 'What is deep work?',
      a: 'Cal Newport defined deep work as cognitively demanding tasks performed in a state of distraction-free concentration. Even 90 minutes of genuine deep work per day is reported to outproduce a full day of fragmented, shallow effort.'
    },
    {
      q: 'How long is a focus span?',
      a: 'Research suggests sustained attention begins to degrade after roughly 45–90 minutes without a break. Shorter bursts — 25 to 50 minutes — followed by brief rests allow the prefrontal cortex to recover and maintain performance across a full day.'
    },
    {
      q: 'Does caffeine really help?',
      a: 'Caffeine blocks adenosine receptors, which delays the sensation of fatigue rather than eliminating it. The debt accumulates and arrives later. Timed well — about 90 minutes after waking — it is genuinely useful. Timed poorly, it disrupts sleep and compounds fatigue the following day.'
    }
  ],
  cheer: [
    {
      q: 'I\'m feeling stuck.',
      a: 'Stuck is not stopped. Write the next single physical action — not the project, not the plan. One action. Then do only that. Momentum follows motion, not the other way around.'
    },
    {
      q: 'I keep getting distracted.',
      a: 'The mind wanders because it is alive. Gently return it, without drama or self-reproach. Each return is a small act of discipline, and small acts compound into something formidable over time.'
    },
    {
      q: 'Remind me why this matters.',
      a: 'Because unfinished things take up residence in the mind and charge rent — attention, energy, low-level dread. Completion is not merely productive. It is restful. The finished task stops talking.'
    },
    {
      q: 'I need a confidence boost.',
      a: 'You have finished things before. The evidence is in the completed items of your lists, if you care to look. Today is not the first time you have faced a difficult task. It is merely the most recent.'
    },
    {
      q: 'I\'m tired.',
      a: 'Then rest is the work. A tired mind makes poor decisions and poorer progress. Five minutes of stillness is not surrender — it is maintenance. Return sharper.'
    },
    {
      q: 'I feel like I\'m falling behind.',
      a: 'Behind whom? The pace you set yesterday was made by a different version of you, with different information. Revise the plan. Do the next right thing. That is all that is ever required.'
    },
    {
      q: 'Nothing feels rewarding.',
      a: 'That is a signal, not a verdict. It often means the tasks on your list have grown too large to feel completable. Break one into three. Finish the smallest piece. The reward circuit responds to completion, not scale.'
    },
    {
      q: 'I don\'t know where to start.',
      a: 'Start with the task you are most tempted to avoid. It is usually the one casting the longest shadow. Once begun, it shrinks. The rest of the list will feel lighter by comparison.'
    }
  ]
};

let _archQATab = 'guide'; // active tab

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
  if(box){ box.style.opacity=.15; setTimeout(()=>{ box.textContent=text; box.style.opacity=1; },150); }
  if(!floatToo) return;
  const fp=document.getElementById('archFloat');
  if(fp){
    clearTimeout(_archFloatTimer);
    fp.textContent=text; fp.classList.add('visible');
    _archFloatTimer=setTimeout(()=>fp.classList.remove('visible'),4000);
  }
}
function archEvent(key){
  const lines=ARCH_QUOTES[key]; if(!lines) return;
  archSpeak(rand(lines));
}
function archGreet(){ archSpeak(rand(ARCH_QUOTES.greet)); archSetMode('idle'); }

// Alias for callers that use the old name
const archNotify = archEvent;

// ── QA ────────────────────────────────────────────────────────────────────────
function renderQA(tab) {
  _archQATab = tab;

  // Update segmented control
  document.querySelectorAll('.qa-seg-btn').forEach(b => {
    b.classList.toggle('qa-seg-btn--active', b.dataset.tab === tab);
  });

  // Clear active chip from previous tab
  document.querySelectorAll('.qa-chip').forEach(c => c.classList.remove('qa-chip--active'));

  // Render chip grid
  const grid = document.getElementById('qaChipGrid');
  const items = ARCH_QA[tab] || [];
  if (!grid) return;
  grid.innerHTML = items.map((item, i) =>
    `<button class="qa-chip" onclick="archQAAnswer('${tab}',${i})">${item.q}</button>`
  ).join('');

  // Hide answer panel when switching tabs
  const ans = document.getElementById('qaAnswer');
  if (ans) ans.style.display = 'none';
}

function archQAAnswer(tab, i) {
  const item = (ARCH_QA[tab] || [])[i];
  if (!item) return;

  // Update speech bubble above QA list — no popup
  const box = document.getElementById('companionSpeech');
  if (box) { box.style.opacity = 0.15; setTimeout(() => { box.textContent = item.a; box.style.opacity = 1; }, 150); }

  // Update answer panel below QA list
  const ans = document.getElementById('qaAnswer');
  const txt = document.getElementById('qaAnswerText');
  if (ans && txt) {
    txt.textContent = '\u201c' + item.a + '\u201d';
    ans.style.display = 'block';
  }

  // Mark active chip
  document.querySelectorAll('.qa-chip').forEach(c => c.classList.remove('qa-chip--active'));
  const chips = document.querySelectorAll('#qaChipGrid .qa-chip');
  if (chips[i]) chips[i].classList.add('qa-chip--active');

  // Mood logic by category — no popup for deliberate QA lookups
  if (tab === 'cheer') {
    arch.mood = Math.min(100, arch.mood + 5);
    archSetMode('excited');
  } else if (tab === 'trivia') {
    archSetMode('magic');
  } else {
    archSetMode('judging');
  }

  clearTimeout(window._archModeBack);
  window._archModeBack = setTimeout(() => archSetMode('idle'), 3200);

  // If the speech block is clipping the answer, guide the user down to the
  // full answer panel with a smooth scroll + a brief highlight pulse.
  // We wait one frame so the answer panel has been rendered and measured.
  requestAnimationFrame(() => {
    if (!box || !ans) return;
    const isClipped = box.scrollHeight > box.clientHeight + 4; // 4px tolerance
    if (!isClipped) return;

    ans.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Pulse the answer panel border to draw the eye
    ans.style.transition = 'box-shadow 0.2s ease';
    ans.style.boxShadow = '0 0 0 3px oklch(from var(--color-primary) l c h / 0.45)';
    setTimeout(() => { ans.style.boxShadow = ''; }, 900);
  });
}

// Random question from current tab (triggered by portrait click)
function archRandomQA() {
  const items = ARCH_QA[_archQATab] || [];
  if (!items.length) return;
  const i = Math.floor(Math.random() * items.length);
  archQAAnswer(_archQATab, i);
}

// ── PASSIVE BEHAVIOUR ──────────────────────────────────────────────────────────────────────
setInterval(()=>{
  if(!arch.enabled) return;
  arch.energy = Math.max(0, arch.energy - 1);
  arch.mood   = Math.max(0, arch.mood   - 0.5);
  if(arch.energy < 20 && arch.mode !== 'sleepy') archSetMode('sleepy');
  else if(arch.energy > 50 && arch.mode === 'sleepy') archSetMode('idle');
  updateArchStats();
  if(Math.random() < 0.25) archSpeak(rand(ARCH_QUOTES.idle));
}, 15000);

function updateArchStats(){
  const el = id => document.getElementById(id);
  const fill = (bar, val) => { if(bar) bar.style.width = Math.max(0,Math.min(100,val))+'%'; };
  fill(el('archMoodBar'),  arch.mood);
  fill(el('archFocusBar'), arch.focus);
  fill(el('archEnergyBar'),arch.energy);
}

// ── EVENTS ───────────────────────────────────────────────────────────────────────────────
function archOnTaskDone(){
  arch.xp += 10; arch.mood = Math.min(100, arch.mood+10);
  archSetMode('excited');
  archEvent('task_done');
  clearTimeout(window._archModeBack);
  window._archModeBack = setTimeout(()=>archSetMode('idle'),3000);
}
function archOnTaskAdd(){
  arch.focus = Math.min(100, arch.focus+5);
  archEvent('task_add');
}
function archOnTimerDone(){
  arch.xp += 20; arch.energy = Math.max(0, arch.energy-10);
  archSetMode('excited');
  archEvent('timer_done');
  clearTimeout(window._archModeBack);
  window._archModeBack = setTimeout(()=>archSetMode('idle'),3000);
}
function archOnTimerAdd(){
  arch.focus = Math.min(100, arch.focus+3);
  archEvent('timer_add');
}
function archOnPet(){
  arch.mood = Math.min(100, arch.mood+15);
  archSetMode('excited');
  archEvent('pet');
  clearTimeout(window._archModeBack);
  window._archModeBack = setTimeout(()=>archSetMode('idle'),2500);
}
function archOnExport(){ archEvent('export'); }
function archOnImport(){ archEvent('import'); }
