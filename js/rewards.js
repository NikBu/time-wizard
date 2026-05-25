// ── REWARD CABINET ──────────────────────────────────────────────────────────

const REWARDS_KEY = 'tw_rewards';
const HISTORY_KEY = 'tw_reward_history';

let rewards = [];
let rewardHistory = [];
let totalPts = 0;

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

// ── Persistence ────────────────────────────────────────────────────────────
function rewardsSave() {
  try {
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(rewardHistory));
  } catch(e) {}
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

// ── Points bridge ──────────────────────────────────────────────────────────
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

// ── Reward CRUD ────────────────────────────────────────────────────────────
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
    rewardId: id, name: r.name, emoji: r.emoji, cost: r.cost, at: Date.now()
  });
  if (!r.repeatable) rewards = rewards.filter(x => x.id !== id);
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

// ── Closest next reward hint ───────────────────────────────────────────────
function rewardsNextHint() {
  const affordable = rewards.filter(r => r.cost <= totalPts);
  if (affordable.length) return null;
  if (!rewards.length) return null;
  const next = [...rewards].sort((a, b) => a.cost - b.cost)[0];
  return { name: next.name, emoji: next.emoji, diff: next.cost - totalPts };
}

// ── Render ─────────────────────────────────────────────────────────────────
function rewardsRender() {
  const list  = document.getElementById('rewardCardList');
  const hint  = document.getElementById('rewardNextHint');
  const hList = document.getElementById('rewardHistoryList');
  if (!list) return;

  // Hint bar
  if (hint) {
    const h = rewardsNextHint();
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

  // Shelf cards
  if (!rewards.length) {
    list.innerHTML = `<div class="reward-empty">
      <i data-lucide="gift" style="width:28px;height:28px;margin:0 auto var(--space-2);opacity:.3;"></i>
      <p>No rewards yet.<br>Add one below.</p>
    </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const sorted = [...rewards].sort((a, b) => a.cost - b.cost);
  list.innerHTML = sorted.map(r => {
    const ready = totalPts >= r.cost;
    const repeatTag = r.repeatable ? `<span class="reward-tag">↺</span>` : '';
    return `<div class="reward-card ${ready ? 'reward-card--ready' : 'reward-card--locked'}" data-id="${r.id}">
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
          onclick="rewardRedeem('${r.id}')" ${ready ? '' : 'disabled'}
          title="${ready ? 'Redeem' : `Need ${r.cost - totalPts} more pts`}">
          ${ready ? 'Redeem' : `−${r.cost - totalPts}`}
        </button>
        <button class="btn btn-sm btn-ghost reward-delete-btn"
          onclick="rewardDelete('${r.id}')" title="Remove" aria-label="Remove ${r.name}">
          <i data-lucide="x" style="width:12px;height:12px;"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  // History list (inside popup)
  if (hList) {
    if (!rewardHistory.length) {
      hList.innerHTML = `<p class="reward-history-empty">No redemptions yet.</p>`;
    } else {
      hList.innerHTML = rewardHistory.slice(0, 30).map(h => {
        const d = new Date(h.at);
        const label = d.toLocaleDateString(undefined, { month:'short', day:'numeric' })
          + ' · ' + d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
        return `<div class="reward-history-item">
          <span class="reward-history-emoji">${h.emoji}</span>
          <span class="reward-history-name">${h.name}</span>
          <span class="reward-history-cost">−${h.cost}</span>
          <span class="reward-history-date">${label}</span>
        </div>`;
      }).join('');
    }
  }

  if (window.lucide) lucide.createIcons();
}

// ── Form helpers ───────────────────────────────────────────────────────────
function rewardFormSubmit() {
  const name       = (document.getElementById('rwName')?.value  || '').trim();
  const emoji      = (document.getElementById('rwEmoji')?.value || '').trim() || '🎁';
  const cost       = parseInt(document.getElementById('rwCost')?.value || '0', 10);
  const repeatable = document.getElementById('rwRepeat')?.checked ?? false;
  if (!name || cost < 1) {
    const inp = document.getElementById('rwName');
    if (inp) { inp.focus(); inp.classList.add('input--error'); setTimeout(() => inp.classList.remove('input--error'), 800); }
    return;
  }
  rewardAdd(name, emoji, cost, repeatable);
  ['rwName','rwEmoji','rwCost'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const rep = document.getElementById('rwRepeat'); if (rep) rep.checked = false;
}

// History popup toggle
function cabinetHistoryToggle() {
  const popup = document.getElementById('cabinetHistoryPopup');
  const btn   = document.getElementById('cabinetHistoryBtn');
  if (!popup) return;
  const open = popup.style.display !== 'none';
  popup.style.display = open ? 'none' : 'block';
  if (btn) btn.setAttribute('aria-expanded', String(!open));
  // Close on outside click
  if (!open) {
    setTimeout(() => {
      function outsideClick(e) {
        if (!popup.contains(e.target) && e.target !== btn) {
          popup.style.display = 'none';
          btn && btn.setAttribute('aria-expanded', 'false');
          document.removeEventListener('click', outsideClick);
        }
      }
      document.addEventListener('click', outsideClick);
    }, 10);
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────
function rewardsInit() {
  if (typeof ARCH_QUOTES !== 'undefined') {
    ARCH_QUOTES.reward_redeem      = REWARD_QUOTES.redeem;
    ARCH_QUOTES.reward_add         = REWARD_QUOTES.add;
    ARCH_QUOTES.reward_delete      = REWARD_QUOTES.delete;
    ARCH_QUOTES.reward_insufficient= REWARD_QUOTES.insufficient;
  }
  rewardsLoad();
  rewardsRender();
}

document.addEventListener('DOMContentLoaded', rewardsInit);
