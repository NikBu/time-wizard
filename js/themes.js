// ── THEMES ───────────────────────────────────────────────────
const THEMES = [
  { id:'parchment', name:'Old Parchment', emoji:'📜',
    preview:{bg:'#f5efdf',surface:'#faf6ee',accent:'#8b6914',b1:'#8b6914',b2:'#c8a84b'},
    lv:{'--color-bg':'#f5efdf','--color-surface':'#faf6ee','--color-surface-2':'#fffef8','--color-surface-offset':'#ede5ce','--color-surface-dynamic':'#e4dac0','--color-divider':'#d6cbb0','--color-border':'#ccc0a0','--color-text':'#2d2010','--color-text-muted':'#7a6840','--color-text-faint':'#b09a70','--color-primary':'#8b6914','--color-primary-hover':'#6a4f0e','--color-primary-active':'#4a3708','--color-primary-highlight':'#e8d9b0','--color-accent':'#4a7a3a','--color-accent-hover':'#35591a','--color-accent-highlight':'#cce0c0'},
    dv:{'--color-bg':'#1a1508','--color-surface':'#221c0a','--color-surface-2':'#2a220e','--color-surface-offset':'#1e1a08','--color-surface-dynamic':'#2e2710','--color-divider':'#352e14','--color-border':'#4a4020','--color-text':'#d8cc98','--color-text-muted':'#8a7e50','--color-text-faint':'#504830','--color-primary':'#d4a820','--color-primary-hover':'#e8c040','--color-primary-active':'#f8d860','--color-primary-highlight':'#3a3010','--color-accent':'#70b050','--color-accent-hover':'#90d070','--color-accent-highlight':'#203018'}
  },
  { id:'dark-sanctum', name:'Dark Sanctum', emoji:'🌑',
    preview:{bg:'#0d0d14',surface:'#14141e',accent:'#9878f0',b1:'#7c60d0',b2:'#a080f0'},
    lv:{'--color-bg':'#f0f0f5','--color-surface':'#f8f8fc','--color-surface-2':'#ffffff','--color-surface-offset':'#e8e8f0','--color-surface-dynamic':'#e0e0eb','--color-divider':'#d0d0de','--color-border':'#c0c0d0','--color-text':'#1a1825','--color-text-muted':'#706880','--color-text-faint':'#a098b0','--color-primary':'#6040c0','--color-primary-hover':'#4828a8','--color-primary-active':'#301888','--color-primary-highlight':'#dcd4f4','--color-accent':'#20a090','--color-accent-hover':'#108070','--color-accent-highlight':'#c0e8e4'},
    dv:{'--color-bg':'#0d0d14','--color-surface':'#14141e','--color-surface-2':'#1a1a28','--color-surface-offset':'#111118','--color-surface-dynamic':'#1e1e2e','--color-divider':'#22223a','--color-border':'#2e2e4a','--color-text':'#c8c0e8','--color-text-muted':'#706878','--color-text-faint':'#404058','--color-primary':'#9878f0','--color-primary-hover':'#b090ff','--color-primary-active':'#c8b0ff','--color-primary-highlight':'#2a2040','--color-accent':'#40c8b8','--color-accent-hover':'#60e0d0','--color-accent-highlight':'#1a3830'}
  },
  { id:'forest', name:'Enchanted Forest', emoji:'🌿',
    preview:{bg:'#f0f5ee',surface:'#f8faf5',accent:'#2e7a50',b1:'#2e7a50',b2:'#70b880'},
    lv:{'--color-bg':'#f0f5ee','--color-surface':'#f8faf5','--color-surface-2':'#ffffff','--color-surface-offset':'#e4ede0','--color-surface-dynamic':'#d8e8d4','--color-divider':'#c8ddc2','--color-border':'#b8d0b0','--color-text':'#1a2818','--color-text-muted':'#587050','--color-text-faint':'#90b088','--color-primary':'#2e7a50','--color-primary-hover':'#1e5a38','--color-primary-active':'#124025','--color-primary-highlight':'#c4e8d0','--color-accent':'#6a7820','--color-accent-hover':'#4e5814','--color-accent-highlight':'#dee8b0'},
    dv:{'--color-bg':'#0d1510','--color-surface':'#121c14','--color-surface-2':'#182418','--color-surface-offset':'#101810','--color-surface-dynamic':'#1a2018','--color-divider':'#1e2a1e','--color-border':'#2a3a28','--color-text':'#b8d4b0','--color-text-muted':'#6a8860','--color-text-faint':'#405038','--color-primary':'#50c878','--color-primary-hover':'#70e090','--color-primary-active':'#90f0a8','--color-primary-highlight':'#1a3020','--color-accent':'#b0c840','--color-accent-hover':'#c8e060','--color-accent-highlight':'#283010'}
  },
  { id:'ember', name:'Ember & Ash', emoji:'🔥',
    preview:{bg:'#1a0e08',surface:'#221408',accent:'#f07840',b1:'#e0581a',b2:'#f09040'},
    lv:{'--color-bg':'#faf0e8','--color-surface':'#fff8f0','--color-surface-2':'#ffffff','--color-surface-offset':'#f0e0d0','--color-surface-dynamic':'#e8d4c0','--color-divider':'#dcc8b0','--color-border':'#d0b89a','--color-text':'#2a1808','--color-text-muted':'#7a5030','--color-text-faint':'#b09070','--color-primary':'#c84818','--color-primary-hover':'#a03410','--color-primary-active':'#782308','--color-primary-highlight':'#f4d4c4','--color-accent':'#607028','--color-accent-hover':'#485218','--color-accent-highlight':'#dce4b0'},
    dv:{'--color-bg':'#1a0e08','--color-surface':'#221408','--color-surface-2':'#2e1c0c','--color-surface-offset':'#1e1208','--color-surface-dynamic':'#2a1810','--color-divider':'#301e10','--color-border':'#402818','--color-text':'#e8c8a8','--color-text-muted':'#907050','--color-text-faint':'#584030','--color-primary':'#f07840','--color-primary-hover':'#ff9860','--color-primary-active':'#ffb880','--color-primary-highlight':'#3a2010','--color-accent':'#c8b840','--color-accent-hover':'#e0d060','--color-accent-highlight':'#302808'}
  },
  { id:'arctic', name:'Arctic Scholar', emoji:'❄️',
    preview:{bg:'#f0f4f8',surface:'#f8fafb',accent:'#1a6090',b1:'#1a6090',b2:'#50a0d0'},
    lv:{'--color-bg':'#f0f4f8','--color-surface':'#f8fafb','--color-surface-2':'#ffffff','--color-surface-offset':'#e4ecf2','--color-surface-dynamic':'#d8e4ee','--color-divider':'#c8d8e8','--color-border':'#b8cce0','--color-text':'#101c28','--color-text-muted':'#507090','--color-text-faint':'#80a0b8','--color-primary':'#1a6090','--color-primary-hover':'#104870','--color-primary-active':'#083050','--color-primary-highlight':'#c4dcf0','--color-accent':'#18907a','--color-accent-hover':'#0c6858','--color-accent-highlight':'#b8e8e0'},
    dv:{'--color-bg':'#0a1018','--color-surface':'#101820','--color-surface-2':'#182028','--color-surface-offset':'#0e1620','--color-surface-dynamic':'#161e28','--color-divider':'#1e2a38','--color-border':'#283a4c','--color-text':'#b8d0e8','--color-text-muted':'#5878a0','--color-text-faint':'#385068','--color-primary':'#4098d8','--color-primary-hover':'#60b0f0','--color-primary-active':'#80c8ff','--color-primary-highlight':'#182838','--color-accent':'#30c0a0','--color-accent-hover':'#50d8b8','--color-accent-highlight':'#102828'}
  },
];

let activeThemeId = 'parchment';

function applyThemeVars(){
  const t = THEMES.find(x => x.id === activeThemeId); if(!t) return;
  const m = window._getMode ? window._getMode() : (document.documentElement.getAttribute('data-theme') || 'dark');
  const vars = m === 'dark' ? t.dv : t.lv;
  Object.entries(vars).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
}

function setTheme(id){
  activeThemeId = id;
  applyThemeVars();
  renderThemes();
  showToast('Theme applied!');
  if(typeof archOnThemeChange === 'function') archOnThemeChange();
}

// Keep selectTheme as alias used by storage.js applyImportedState
function selectTheme(id){ setTheme(id); }

function renderThemes(){
  const grid = document.getElementById('themesGrid'); if(!grid) return;
  grid.innerHTML = THEMES.map(t => `
    <div class="theme-card ${activeThemeId===t.id?'selected':''}" onclick="setTheme('${t.id}')">
      <div class="theme-preview" style="background:${t.preview.bg};">
        <div class="theme-preview-title" style="color:${t.preview.accent};">${t.emoji} ${t.name}</div>
        <div class="theme-preview-bar" style="background:${t.preview.b1};"></div>
        <div class="theme-preview-bar2" style="background:${t.preview.b2};"></div>
        <div style="height:18px;background:${t.preview.surface};border-radius:4px;margin-top:4px;"></div>
      </div>
      <div class="theme-footer" style="background:${t.preview.surface};color:${t.preview.accent};">
        ${t.name}
        <div style="width:16px;height:16px;border-radius:50%;border:2px solid ${t.preview.accent};background:${activeThemeId===t.id?t.preview.accent:'transparent'};display:flex;align-items:center;justify-content:center;">
          ${activeThemeId===t.id?'<svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>':''}
        </div>
      </div>
    </div>`).join('');
}
