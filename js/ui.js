// ── SHARED UI HELPERS ──────────────────────────────
const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>[...root.querySelectorAll(sel)];
function escapeHtml(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmt(sec){ sec=Math.max(0,sec|0); const h=(sec/3600)|0, m=((sec%3600)/60)|0, s=sec%60; return h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`; }
function uid(prefix='id'){ return `${prefix}_${Math.random().toString(36).slice(2,9)}`; }
function showToast(msg, kind=''){
  const host = document.getElementById('toastHost');
  const t = document.createElement('div');
  t.className = `toast ${kind}`.trim(); t.textContent = msg;
  host.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(8px)'; }, 2200);
  setTimeout(()=>t.remove(), 2500);
}
