// ── THEMES ─────────────────────────────────────────
const themes = [
  {
    id:'sepia', name:'Sepia Wizardry', desc:'Warm parchment and candlelight.',
    colors:['#f5f0e8','#7c5c2e','#2d6b5f','#2a2219']
  },
  {
    id:'midnight', name:'Midnight Grove', desc:'Dark cedar, moss, and moonlit brass.',
    colors:['#16181d','#caa85e','#4f8f82','#d6d1c7']
  },
  {
    id:'lavender', name:'Lavender Study', desc:'Muted plum and silver paper.',
    colors:['#f4eff8','#6e5b8c','#537a8a','#2f2a38']
  },
  {
    id:'mint', name:'Mint Ledger', desc:'Soft green and herbal ink.',
    colors:['#eef5ef','#587a61','#2f6a68','#24312a']
  },
  {
    id:'ember', name:'Ember Library', desc:'Charcoal, copper, and firelight.',
    colors:['#201917','#b56a3d','#6f3f2f','#e8d8c9']
  }
];
let activeThemeId = 'sepia';

function setTheme(id){ activeThemeId=id; applyThemeVars(); renderThemes(); showToast('Theme applied!'); scheduleSave(); }
function getTheme(){ return themes.find(t=>t.id===activeThemeId) || themes[0]; }
function renderThemes(){
  const host = $('#themesGrid'); if(!host) return;
  host.innerHTML = themes.map(t=>`
    <div class="theme-card ${t.id===activeThemeId?'active':''}" onclick="setTheme('${t.id}')">
      <div class="theme-swatch">${t.colors.map(c=>`<span class="theme-dot" style="background:${c}"></span>`).join('')}</div>
      <div class="theme-name">${escapeHtml(t.name)}</div>
      <div class="theme-desc">${escapeHtml(t.desc)}</div>
    </div>
  `).join('');
}
function applyThemeVars(){
  const root = document.documentElement;
  const t = getTheme();
  const map = {
    sepia: {
      '--color-bg':'#f5f0e8','--color-surface':'#faf7f2','--color-surface-2':'#fff','--color-surface-offset':'#ede8de','--color-surface-dynamic':'#e5dfd4',
      '--color-divider':'#d8d2c6','--color-border':'#cdc8bc','--color-text':'#2a2219','--color-text-muted':'#7a7265','--color-text-faint':'#b5ae9f','--color-text-inverse':'#faf7f2',
      '--color-primary':'#7c5c2e','--color-primary-hover':'#5e4420','--color-primary-active':'#402e14','--color-primary-highlight':'#e6d9c6',
      '--color-accent':'#2d6b5f','--color-accent-hover':'#1e4e45','--color-accent-active':'#143530','--color-accent-highlight':'#c8ddd9',
      '--color-gold':'#b8860b','--color-gold-light':'#f0d07a','--color-error':'#8b3a3a','--color-error-highlight':'#e6cdcd','--color-success':'#2e6b3a','--color-success-highlight':'#c8e0cc'
    },
    midnight: {
      '--color-bg':'#16181d','--color-surface':'#1e2127','--color-surface-2':'#262b33','--color-surface-offset':'#20242a','--color-surface-dynamic':'#2e343d',
      '--color-divider':'#323844','--color-border':'#3c4350','--color-text':'#d6d1c7','--color-text-muted':'#9b978f','--color-text-faint':'#63605a','--color-text-inverse':'#16181d',
      '--color-primary':'#caa85e','--color-primary-hover':'#e0ba68','--color-primary-active':'#efce86','--color-primary-highlight':'#40341d',
      '--color-accent':'#4f8f82','--color-accent-hover':'#68ab9e','--color-accent-active':'#84c7ba','--color-accent-highlight':'#203832',
      '--color-gold':'#e3bc60','--color-gold-light':'#f0d890','--color-error':'#d17b7b','--color-error-highlight':'#402323','--color-success':'#77b28a','--color-success-highlight':'#1f3326'
    },
    lavender: {
      '--color-bg':'#f4eff8','--color-surface':'#faf7fc','--color-surface-2':'#fff','--color-surface-offset':'#ece5f3','--color-surface-dynamic':'#dfd5ea',
      '--color-divider':'#d4ccdf','--color-border':'#c9c1d5','--color-text':'#2f2a38','--color-text-muted':'#746c84','--color-text-faint':'#b0a7be','--color-text-inverse':'#faf7fc',
      '--color-primary':'#6e5b8c','--color-primary-hover':'#584774','--color-primary-active':'#413455','--color-primary-highlight':'#ddd5ea',
      '--color-accent':'#537a8a','--color-accent-hover':'#40616e','--color-accent-active':'#2e4951','--color-accent-highlight':'#d3e0e7',
      '--color-gold':'#b59a59','--color-gold-light':'#e8d9ae','--color-error':'#9b5a74','--color-error-highlight':'#e8d4de','--color-success':'#52785d','--color-success-highlight':'#d4e5d8'
    },
    mint: {
      '--color-bg':'#eef5ef','--color-surface':'#f7fbf7','--color-surface-2':'#fff','--color-surface-offset':'#e4efe5','--color-surface-dynamic':'#d6e4d8',
      '--color-divider':'#cad7cb','--color-border':'#bfccbf','--color-text':'#24312a','--color-text-muted':'#66766c','--color-text-faint':'#9faca3','--color-text-inverse':'#f7fbf7',
      '--color-primary':'#587a61','--color-primary-hover':'#44604c','--color-primary-active':'#304336','--color-primary-highlight':'#d8e6db',
      '--color-accent':'#2f6a68','--color-accent-hover':'#1f504e','--color-accent-active':'#143735','--color-accent-highlight':'#cae1df',
      '--color-gold':'#aa9246','--color-gold-light':'#dfd19a','--color-error':'#8b5252','--color-error-highlight':'#e4d3d3','--color-success':'#3f7a4a','--color-success-highlight':'#d1e5d4'
    },
    ember: {
      '--color-bg':'#201917','--color-surface':'#2a221f','--color-surface-2':'#332924','--color-surface-offset':'#261f1c','--color-surface-dynamic':'#3b302b',
      '--color-divider':'#463833','--color-border':'#51413b','--color-text':'#e8d8c9','--color-text-muted':'#b09e90','--color-text-faint':'#7b6b61','--color-text-inverse':'#201917',
      '--color-primary':'#b56a3d','--color-primary-hover':'#cf7e4a','--color-primary-active':'#e39a68','--color-primary-highlight':'#44291c',
      '--color-accent':'#8a5a49','--color-accent-hover':'#a36c58','--color-accent-active':'#bf8770','--color-accent-highlight':'#36231d',
      '--color-gold':'#d0a257','--color-gold-light':'#e8c687','--color-error':'#d18787','--color-error-highlight':'#442424','--color-success':'#7fa27b','--color-success-highlight':'#263326'
    }
  }[t.id];
  Object.entries(map).forEach(([k,v])=>root.style.setProperty(k,v));
}
window.setTheme = setTheme;
