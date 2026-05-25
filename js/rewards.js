// ── REWARD CABINET ────────────────────────────────────────────────────────
// Points are the same pool shown in the header badge (owlWisdom / totalPts).
// This module owns reward CRUD, redemption, history, and UI rendering.
// It reads/writes the shared `arch` object from companion.js for XP,
// but maintains its own rewards[] and history[] arrays.

// ── State ──────────────────────────────────────────────────────────────────
const REWARDS_KEY = 'tw_rewards';
const HISTORY_KEY = 'tw_reward_history';

let rewards = [];
let rewardHistory = [];
let totalPts = 0;   // kept in sync with header badge

const REWARD_QUOTES = {
  redeem: [
    'Ah — a well-earned indulgence. Savour it.',
    'The ledger balances. Enjoy your prize.',
    'Points exchanged for pleasure. A fair trade.',
    'Splendid choice. Rest is part of the work.',
    'Redemption noted. The archive approves.'
  ],
  add: [
    'A new reward entered into the registry.',
    'Excellent. Motivation benefits from a clear destination.',
    'Duly noted. Now go earn it.'
  ],
  delete: [
    'Removed from the ledger, as requested.',
    'So it is stricken from the record.'
  ],
  insufficient: [
    'Not yet, apprentice. More points are required.',
    'The vault remains locked. Keep working.',
    'Close — but the ledger demands more.'
  ]
};

const SEEDED_REWARDS = [
  { id: 'seed1', name: 'Coffee break', emoji: '☕', cost: 40, repeatable: true },
  { id: 'seed2', name: 'Sweet snack',  emoji: '🍫', cost: 60, repeatable: true },
  { id: 'seed3', name: '30 min gaming',emoji: '🎮', cost: 120, repeatable: false }
];

// ── Persistence ─────────────────────────────────────────────────────────────
function rewardsSave() {
  try {
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(rewardHistory));
  } catch(e) { /* quota / private browsing — silent fail */ }
}

function rewardsLoad() {
  try {
    const r = localStorage.getItem(REWARDS_KEY);
    const h = localStorage.getItem(HISTORY_KEY);
    if (r) rewards = JSON.parse(r);
    if (h) rewardHistory = JSON.parse(h);
  } catch(e) {}
  if (!rewards.length) {
    rewards = SEEDED_REWARDS.map(r => ({ ...r, redeemedCount: 0, createdAt: Date.now() }));
  }
}

// ── Points bridge ────────────────────────────────────────────────────────────
// Called by companion.js / checklist.js whenever points change.
// Also called internally after redemption.
function rewardsSetPoints(n) {
  totalPts = Math.max(0, n);
  rewardsUpdateHeader();
  rewardsRender();
}

function rewardsEarn(n) {
  totalPts = Math.max(0, totalPts + n);
  rewardsUpdateHeader();
  rewardsRender();
}

function rewardsUpdateHeader() {
  const el = document.getElementById('headerPoints');
  if (el) el.textContent = `✶ ${totalPts} pts`;
  const wisdom = document.getElementById('owlWisdom');
  if (wisdom) wisdom.textContent = totalPts;
}

// ── Reward CRUD ──────────────────────────────────────────────────────────────
function rewardAdd(name, emoji, cost, repeatable) {
  if (!name.trim() || cost < 1) return;
  rewards.push({
    id: 'r' + Date.now(),
    name: name.trim(),
    emoji: emoji || '🎁',
    cost: Math.round(cost),
    repeatable: !!repeatable,
    redeemedCount: 0,
    createdAt: Date.now()
  });
  rewardsSave();
  rewardsRender();
  if (typeof archNotify === 'function') archNotify('reward_add');
}

function rewardDelete(id) {
  rewards = rewards.filter(r => r.id !== id);
  rewardsSave();
  rewardsRender();
  if (typeof archNotify === 'function') archNotify('reward_delete');
}

function rewardRedeem(id) {
  const r = rewards.find(x => x.id === id);
  if (!r) return;
  if (totalPts < r.cost) {
    if (typeof archNotify === 'function') archNotify('reward_insufficient');
    rewardsShakeCard(id);
    return;
  }
  totalPts -= r.cost;
  r.redeemedCount = (r.redeemedCount || 0) + 1;
  rewardHistory.unshift({
    rewardId: id,
    name: r.name,
    emoji: r.emoji,
    cost: r.cost,
    at: Date.now()
  });
  if (!r.repeatable) {
    rewards = rewards.filter(x => x.id !== id);
  }
  rewardsSave();
  rewardsUpdateHeader();
  rewardsRender();
  if (typeof archNotify === 'function') archNotify('reward_redeem');
}

function rewardsShakeCard(id) {
  const el = document.querySelector(`.reward-card[data-id="${id}"]`);
  if (!el) return;
  el.classList.add('reward-card--shake');
  setTimeout(() => el.classList.remove('reward-card--shake'), 500);
}

// ── Closest next reward hint ─────────────────────────────────────────────────
function rewardsNextHint() {
  const affordable = rewards.filter(r => r.cost <= totalPts);
  if (affordable.length) return null;  // can already afford something
  if (!rewards.length) return null;
  const sorted = [...rewards].sort((a, b) => a.cost - b.cost);
  const next = sorted[0];
  const diff = next.cost - totalPts;
  return { name: next.name, emoji: next.emoji, diff };
}

// ── Render ────────────────────────────────────────────────────────────────────
function rewardsRender() {
  const list   = document.getElementById('rewardCardList');
  const hint   = document.getElementById('rewardNextHint');
  const hWrap  = document.getElementById('rewardHistoryList');
  if (!list) return;

  // Hint
  const h = rewardsNextHint();
  if (hint) {
    if (h) {
      hint.innerHTML = `<span>${h.emoji}</span> Nearest: <strong>${h.name}</strong> — <span class="pts-accent">${h.diff} pts to go</span>`;
      hint.style.display = 'flex';
    } else if (rewards.length) {
      hint.innerHTML = `<span>✨</span> You can redeem a reward right now!`;
      hint.style.display = 'flex';
    } else {
      hint.style.display = 'none';
    }
  }

  // Cards
  if (!rewards.length) {
    list.innerHTML = `<div class="reward-empty">
      <i data-lucide="gift" style="width:32px;height:32px;margin:0 auto var(--space-2);opacity:.35;"></i>
      <p>No rewards yet. Add one below!</p>
    </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const sorted = [...rewards].sort((a, b) => a.cost - b.cost);
  list.innerHTML = sorted.map(r => {
    const ready  = totalPts >= r.cost;
    const stateClass = ready ? 'reward-card--ready' : 'reward-card--locked';
    const repeatTag  = r.repeatable
      ? `<span class="reward-tag">repeatable</span>`
      : '';
    return `<div class="reward-card ${stateClass}" data-id="${r.id}">
      <div class="reward-card-emoji">${r.emoji}</div>
      <div class="reward-card-body">
        <div class="reward-card-name">${r.name}</div>
        <div class="reward-card-meta">
          <span class="reward-cost-badge">${r.cost} pts</span>
          ${repeatTag}
        </div>
      </div>
      <div class="reward-card-actions">
        <button class="btn btn-sm ${ready ? 'btn-primary' : 'btn-secondary'} reward-redeem-btn"
          onclick="rewardRedeem('${r.id}')"
          ${ready ? '' : 'disabled'}
          title="${ready ? 'Redeem' : 'Not enough points'}">
          ${ready ? 'Redeem' : `${r.cost - totalPts} more`}
        </button>
        <button class="btn btn-sm btn-ghost reward-delete-btn"
          onclick="rewardDelete('${r.id}')" title="Remove reward"
          aria-label="Remove ${r.name}">
          <i data-lucide="x" style="width:12px;height:12px;"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  // History
  if (hWrap) {
    if (!rewardHistory.length) {
      hWrap.innerHTML = `<p class="reward-history-empty">No redemptions yet.</p>`;
    } else {
      hWrap.innerHTML = rewardHistory.slice(0, 20).map(h => {
        const d = new Date(h.at);
        const label = d.toLocaleDateString(undefined, { month:'short', day:'numeric' })
          + ' · ' + d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
        return `<div class="reward-history-item">
          <span class="reward-history-emoji">${h.emoji}</span>
          <span class="reward-history-name">${h.name}</span>
          <span class="reward-history-cost">−${h.cost} pts</span>
          <span class="reward-history-date">${label}</span>
        </div>`;
      }).join('');
    }
  }

  if (window.lucide) lucide.createIcons();
}

// ── Add-reward form helpers ──────────────────────────────────────────────────
function rewardFormSubmit() {
  const name       = (document.getElementById('rwName')?.value || '').trim();
  const emoji      = (document.getElementById('rwEmoji')?.value || '').trim() || '🎁';
  const cost       = parseInt(document.getElementById('rwCost')?.value || '0', 10);
  const repeatable = document.getElementById('rwRepeat')?.checked ?? false;
  if (!name || cost < 1) {
    const inp = document.getElementById('rwName');
    if (inp) { inp.focus(); inp.classList.add('input--error'); setTimeout(() => inp.classList.remove('input--error'), 800); }
    return;
  }
  rewardAdd(name, emoji, cost, repeatable);
  // reset form
  const fields = ['rwName','rwEmoji','rwCost'];
  fields.forEach(id => { const el = document.getElementById(id); if(el) el.value = id==='rwCost'?'':'' ; });
  const rep = document.getElementById('rwRepeat'); if(rep) rep.checked = false;
  const costEl = document.getElementById('rwCost'); if(costEl) costEl.value = '';
  const nameEl = document.getElementById('rwName'); if(nameEl) nameEl.value = '';
  const emojiEl = document.getElementById('rwEmoji'); if(emojiEl) emojiEl.value = '';
}

function rewardHistoryToggle() {
  const body = document.getElementById('rewardHistoryBody');
  const btn  = document.getElementById('rewardHistoryToggleBtn');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (btn) btn.setAttribute('aria-expanded', String(!open));
  const icon = btn?.querySelector('[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', open ? 'chevron-down' : 'chevron-up');
    if (window.lucide) lucide.createIcons();
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
function rewardsInit() {
  // Wire up extra archNotify kinds
  const _origArchNotify = typeof archNotify !== 'undefined' ? archNotify : null;
  window._rewardsOrigNotify = _origArchNotify;

  // Extend ARCH_QUOTES with reward kinds if companion loaded
  if (typeof ARCH_QUOTES !== 'undefined') {
    ARCH_QUOTES.reward_redeem    = REWARD_QUOTES.redeem;
    ARCH_QUOTES.reward_add       = REWARD_QUOTES.add;
    ARCH_QUOTES.reward_delete    = REWARD_QUOTES.delete;
    ARCH_QUOTES.reward_insufficient = REWARD_QUOTES.insufficient;
  }

  rewardsLoad();
  rewardsRender();
}

document.addEventListener('DOMContentLoaded', rewardsInit);
