// ── THEMES ────────────────────────────────────────
// ── THEMES ────────────────────────────────────────
const THEMES = [
  { id:'parchment', name:'Old Parchment', emoji:'📜',
    preview:{bg:'#f5efe2', card:'#fffaf0', accent:'#7a4b22', text:'#2f2416'},
    vars:{ '--color-bg':'#f5efe2','--color-surface':'#fffaf0','--color-surface-2':'#fff7ea','--color-surface-offset':'#eee2c8','--color-surface-dynamic':'#e4d4b1','--color-divider':'#d4c4a3','--color-border':'#d2c1a0','--color-text':'#2f2416','--color-text-muted':'#7d6a50','--color-text-faint':'#b39f86','--color-primary':'#7a4b22','--color-primary-hover':'#5c3718','--color-primary-active':'#3e2411','--color-primary-highlight':'#ead8c2','--color-accent':'#8f6b2d','--color-accent-highlight':'#efe3c6','--color-success':'#58703a','--color-gold':'#c08a2b' } },
  { id:'forest', name:'Enchanted Forest', emoji:'🌲',
    preview:{bg:'#142019', card:'#1d2c23', accent:'#6fa98a', text:'#e8f2eb'},
    vars:{ '--color-bg':'#142019','--color-surface':'#1d2c23','--color-surface-2':'#22352a','--color-surface-offset':'#1a261f','--color-surface-dynamic':'#27392f','--color-divider':'#30463a','--color-border':'#3f5948','--color-text':'#e8f2eb','--color-text-muted':'#aabeb1','--color-text-faint':'#6f8678','--color-primary':'#6fa98a','--color-primary-hover':'#5b9175','--color-primary-active':'#44745b','--color-primary-highlight':'#2a3a31','--color-accent':'#a7d67d','--color-accent-highlight':'#344529','--color-success':'#7fb069','--color-gold':'#d4b15a' } },
  { id:'midnight', name:'Midnight Library', emoji:'🌙',
    preview:{bg:'#0f1220', card:'#171b2d', accent:'#8ea6ff', text:'#edf1ff'},
    vars:{ '--color-bg':'#0f1220','--color-surface':'#171b2d','--color-surface-2':'#1c2138','--color-surface-offset':'#14182a','--color-surface-dynamic':'#212741','--color-divider':'#2c3353','--color-border':'#3a4470','--color-text':'#edf1ff','--color-text-muted':'#adb7da','--color-text-faint':'#697399','--color-primary':'#8ea6ff','--color-primary-hover':'#7892f0','--color-primary-active':'#5f79d1','--color-primary-highlight':'#22294a','--color-accent':'#b0d7ff','--color-accent-highlight':'#213245','--color-success':'#83c89a','--color-gold':'#d7be75' } },
  { id:'rose', name:'Rose Alchemy', emoji:'🌹',
    preview:{bg:'#fff6f8', card:'#fffafb', accent:'#c45b84', text:'#3a2230'},
    vars:{ '--color-bg':'#fff6f8','--color-surface':'#fffafb','--color-surface-2':'#fff2f6','--color-surface-offset':'#f6dbe4','--color-surface-dynamic':'#efd0da','--color-divider':'#e3bac9','--color-border':'#ddb1c1','--color-text':'#3a2230','--color-text-muted':'#8a6173','--color-text-faint':'#be95a6','--color-primary':'#c45b84','--color-primary-hover':'#a5466c','--color-primary-active':'#853653','--color-primary-highlight':'#f2d6e1','--color-accent':'#e28aa8','--color-accent-highlight':'#f4d7e2','--color-success':'#67916e','--color-gold':'#d4a24c' } },
  { id:'sunset', name:'Sunset Study', emoji:'🌇',
    preview:{bg:'#fff4ec', card:'#fffaf6', accent:'#d46a3a', text:'#352117'},
    vars:{ '--color-bg':'#fff4ec','--color-surface':'#fffaf6','--color-surface-2':'#fff0e6','--color-surface-offset':'#f7dccd','--color-surface-dynamic':'#efcfbe','--color-divider':'#e2b59f','--color-border':'#daab93','--color-text':'#352117','--color-text-muted':'#8c6756','--color-text-faint':'#bc9786','--color-primary':'#d46a3a','--color-primary-hover':'#b65729','--color-primary-active':'#92431c','--color-primary-highlight':'#f3d8c9','--color-accent':'#e39d54','--color-accent-highlight':'#f6e1c9','--color-success':'#5f8c66','--color-gold':'#d3a04d' } },
  { id:'ocean', name:'Ocean Scriptorium', emoji:'🌊',
    preview:{bg:'#eff7fb', card:'#f9fdff', accent:'#2c7893', text:'#1d3138'},
    vars:{ '--color-bg':'#eff7fb','--color-surface':'#f9fdff','--color-surface-2':'#eef8fc','--color-surface-offset':'#d5e9f0','--color-surface-dynamic':'#c6dfe7','--color-divider':'#b2cfd8','--color-border':'#aac9d3','--color-text':'#1d3138','--color-text-muted':'#5e7c87','--color-text-faint':'#95b0b8','--color-primary':'#2c7893','--color-primary-hover':'#216279','--color-primary-active':'#174857','--color-primary-highlight':'#d4e9ef','--color-accent':'#4fa7c4','--color-accent-highlight':'#d7edf4','--color-success':'#5c9176','--color-gold':'#d2a351' } }
];
let activeTheme='parchment';
function renderThemes(){
  const grid=document.getElementById('themesGrid');
  if(!grid) return;
  grid.innerHTML=THEMES.map(t=>`
    <div class="theme-card${activeTheme===t.id?' selected':''}" onclick="selectTheme('${t.id}')">
      <div class="theme-preview" style="background:${t.preview.bg};color:${t.preview.text};">
        <div class="theme-preview-title">${t.emoji} ${t.name}</div>
        <div class="theme-preview-bar" style="background:${t.preview.accent};"></div>
        <div class="theme-preview-bar2" style="background:${t.preview.card};border:1px solid rgba(0,0,0,.08)"></div>
      </div>
      <div class="theme-footer">${t.name}<span>${activeTheme===t.id?'✓':''}</span></div>
    </div>
  `).join('');
}
function selectTheme(id){ activeTheme=id; applyThemeVars(); renderThemes(); showToast('Theme applied'); }
function applyThemeVars(){
  const t=THEMES.find(x=>x.id===activeTheme); if(!t) return;
  Object.entries(t.vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
}
