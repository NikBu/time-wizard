// ── REWARD CABINET ────────────────────────────────────────────────────────────
// totalPts is declared and owned by checklist.js — do NOT redeclare it here.
// Data is intentionally in-memory only (no localStorage) until storage.js rework.

let rewards       = [];
let rewardHistory = [];

const REWARD_QUOTES = {
  redeem: [
    'Ah — a well-earned indulgence. Savour it.',
    'The ledger balances. Enjoy your prize.',
    'Points exchanged for pleasure. A fair trade.',
    'Splendid choice. Rest is part of the work.',
    'Redemption noted. The archive approves.'
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
  { id: 'seed01', name: 'Coffee break',        emoji: '☕', cost: 30,  repeatable: true  },
  { id: 'seed02', name: 'Sweet snack',          emoji: '🍫', cost: 50,  repeatable: true  },
  { id: 'seed03', name: 'Short walk',           emoji: '🚶', cost: 40,  repeatable: true  },
  { id: 'seed04', name: 'Social media scroll',  emoji: '📱', cost: 60,  repeatable: true  },
  { id: 'seed05', name: 'Watch an episode',     emoji: '📺', cost: 120, repeatable: true  },
  { id: 'seed06', name: '30 min gaming',        emoji: '🎮', cost: 100, repeatable: true  },
  { id: 'seed07', name: 'Order takeout',        emoji: '🍕', cost: 200, repeatable: true  },
  { id: 'seed08', name: 'Nap time (20 min)',    emoji: '😴', cost: 80,  repeatable: true  },
  { id: 'seed09', name: 'New book',             emoji: '📖', cost: 300, repeatable: false },
  { id: 'seed10', name: 'Day off',              emoji: '🌴', cost: 500, repeatable: false }
];

// ── Init (in-memory seed only) ──────────────────────────────────────────────
function rewardsLoad() {
  rewards = SEEDED_REWARDS.map(r => ({ ...r, retired: false, redeemedCount: 0, createdAt: Date.now() }));
  rewardHistory = [];
}

// ── Points helpers (totalPts lives in checklist.js) ───────────────────────────
function rewardsSpendPoints(amount) {
  totalPts = Math.max(0, totalPts - amount);
  if (typeof updateHeaderPts === 'function') updateHeaderPts();
}

// ── Reward CRUD ───────────────────────────────────────────────────────────────
function rewardDelete(id) {
  rewards = rewards.filter(r => r.id !== id);
  rewardsRender();
  if (typeof archNotify === 'function') archNotify('reward_delete');
}

function rewardRetire(id) {
  const r = rewards.find(x => x.id === id);
  if (!r) return;
  r.retired = true;
  rewardsRender();
}

function rewardReactivate(id) {
  const r = rewards.find(x => x.id === id);
  if (!r) return;
  r.retired = false;
  rewardsRender();
}

function rewardRedeem(id) {
  const r = rewards.find(x => x.id === id);
  if (!r || r.retired) return;
  if (totalPts < r.cost) {
    if (typeof archNotify === 'function') archNotify('reward_insufficient');
    rewardsShakeCard(id);
    return;
  }
  rewardsSpendPoints(r.cost);
  r.redeemedCount = (r.redeemedCount || 0) + 1;
  rewardHistory.unshift({ rewardId: id, name: r.name, emoji: r.emoji, cost: r.cost, at: Date.now() });
  if (!r.repeatable) rewardRetire(id);
  rewardsRender();
  if (typeof archNotify === 'function') archNotify('reward_redeem');
}

function rewardsShakeCard(id) {
  const el = document.querySelector(`.reward-card[data-id="${id}"]`);
  if (!el) return;
  el.classList.add('reward-card--shake');
  setTimeout(() => el.classList.remove('reward-card--shake'), 500);
}

// ── Closest next reward hint ──────────────────────────────────────────────────
function rewardsNextHint() {
  const active = rewards.filter(r => !r.retired);
  const affordable = active.filter(r => r.cost <= totalPts);
  if (affordable.length) return null;
  if (!active.length) return null;
  const next = [...active].sort((a, b) => a.cost - b.cost)[0];
  return { name: next.name, emoji: next.emoji, diff: next.cost - totalPts };
}

// ── Render ────────────────────────────────────────────────────────────────────
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
    } else if (rewards.some(r => !r.retired)) {
      hint.innerHTML = `<span>✨</span> You can redeem a reward right now!`;
      hint.style.display = 'flex';
    } else {
      hint.style.display = 'none';
    }
  }

  // Active first, retired appended at bottom
  const active  = rewards.filter(r => !r.retired).sort((a, b) => a.cost - b.cost);
  const retired = rewards.filter(r =>  r.retired).sort((a, b) => a.cost - b.cost);
  const sorted  = [...active, ...retired];

  if (!sorted.length) {
    list.innerHTML = `<div class="reward-empty">
      <i data-lucide="gift" style="width:28px;height:28px;margin:0 auto var(--space-2);opacity:.3;"></i>
      <p>No rewards in the cabinet.</p>
    </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  list.innerHTML = sorted.map(r => {
    const isRetired = !!r.retired;
    const ready     = !isRetired && totalPts >= r.cost;
    const repeatTag = (!isRetired && r.repeatable) ? `<span class="reward-tag">↺</span>` : '';
    const retiredTag = isRetired ? `<span class="reward-tag reward-tag--retired">once</span>` : '';

    if (isRetired) {
      return `<div class="reward-card reward-card--retired" data-id="${r.id}">
        <div class="reward-card-emoji" style="opacity:.45;">${r.emoji}</div>
        <div class="reward-card-body">
          <div class="reward-card-name reward-card-name--retired">${r.name}</div>
          <div class="reward-card-meta">
            <span class="reward-cost-badge reward-cost-badge--retired">${r.cost} pts</span>
            ${retiredTag}
          </div>
        </div>
        <div class="reward-card-actions">
          <button class="btn btn-sm btn-ghost" onclick="rewardReactivate('${r.id}')" title="Reactivate">
            <i data-lucide="rotate-ccw" style="width:12px;height:12px;"></i> Restore
          </button>
          <button class="btn btn-sm btn-ghost reward-delete-btn"
            onclick="rewardDelete('${r.id}')" title="Delete permanently" aria-label="Delete ${r.name}">
            <i data-lucide="x" style="width:12px;height:12px;"></i>
          </button>
        </div>
      </div>`;
    }

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
          onclick="rewardDelete('${r.id}')" title="Delete permanently" aria-label="Delete ${r.name}">
          <i data-lucide="x" style="width:12px;height:12px;"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  // History list
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

// History popup toggle
function cabinetHistoryToggle() {
  const popup = document.getElementById('cabinetHistoryPopup');
  const btn   = document.getElementById('cabinetHistoryBtn');
  if (!popup) return;
  const open = popup.style.display !== 'none';
  popup.style.display = open ? 'none' : 'block';
  if (btn) btn.setAttribute('aria-expanded', String(!open));
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

// ── Boot ──────────────────────────────────────────────────────────────────────
function rewardsInit() {
  if (typeof ARCH_QUOTES !== 'undefined') {
    ARCH_QUOTES.reward_redeem       = REWARD_QUOTES.redeem;
    ARCH_QUOTES.reward_delete       = REWARD_QUOTES.delete;
    ARCH_QUOTES.reward_insufficient = REWARD_QUOTES.insufficient;
  }
  rewardsLoad();
  rewardsRender();
}

document.addEventListener('DOMContentLoaded', rewardsInit);
