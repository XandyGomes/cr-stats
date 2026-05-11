/**
 * ui.js — UI rendering helpers
 */

let _charts = {};

function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl  = document.getElementById(`nav-${page}`);
  if (pageEl) { pageEl.classList.remove('hidden'); pageEl.classList.add('active'); }
  if (navEl)  navEl.classList.add('active');

  // Lazy render charts only when analytics tab is shown
  if (page === 'analytics') renderCharts();
}

/* ── OVERVIEW ────────────────────────────── */
function renderOverview(player, battles, deckStats) {
  // Trophy + stats
  document.getElementById('trophy-count').textContent    = (player.trophies || 0).toLocaleString('pt-BR');
  document.getElementById('best-trophies').textContent   = (player.bestTrophies || 0).toLocaleString('pt-BR');
  document.getElementById('player-level').textContent    = player.expLevel || '?';
  document.getElementById('player-arena').textContent    = player.arena?.name || '?';
  document.getElementById('player-name-display').textContent = player.name || 'Jogador';
  document.getElementById('player-tag-display').textContent  = player.tag || '';
  document.getElementById('last-update-text').textContent    = 'Atualizado agora';

  // Win rate
  const wr = Analytics.computeWinRate(battles);
  document.getElementById('wr-pct-val').textContent  = `${wr.pct}%`;
  document.getElementById('total-wins').textContent   = wr.wins;
  document.getElementById('total-losses').textContent = wr.losses;
  document.getElementById('total-battles').textContent = wr.total;
  renderWinRateChart(wr);

  // Insight
  const insight = Analytics.generateInsight(wr, deckStats, battles);
  document.getElementById('insight-text').textContent = insight;

  // Recent battles (mini — last 5)
  renderRecentBattlesMini(battles.slice(0, 5));
}

function renderWinRateChart(wr) {
  const ctx = document.getElementById('winrate-chart').getContext('2d');
  if (_charts.winrate) _charts.winrate.destroy();
  _charts.winrate = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [wr.wins, wr.losses],
        backgroundColor: ['rgba(61,220,132,0.85)', 'rgba(255,78,106,0.85)'],
        borderColor: ['#3ddc84', '#ff4e6a'],
        borderWidth: 1.5
      }]
    },
    options: {
      cutout: '75%', responsive: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { animateRotate: true, duration: 800 }
    }
  });
}

function renderRecentBattlesMini(battles) {
  const container = document.getElementById('recent-battles-mini');
  if (!battles || battles.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma batalha encontrada.</div>';
    return;
  }
  container.innerHTML = battles.map(b => buildBattleCardHTML(b)).join('');
}

/* ── BATTLES PAGE ────────────────────────── */
let _allBattles = [];
function renderBattlesPage(battles) {
  _allBattles = battles;
  renderBattlesList(battles);
}

function renderBattlesList(battles) {
  const container = document.getElementById('battles-list');
  if (!battles || battles.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma batalha encontrada.</div>';
    return;
  }
  container.innerHTML = battles.map(b => buildBattleCardHTML(b)).join('');
}

function filterBattles(type, btnEl) {
  document.querySelectorAll('#page-battles .filter-chip').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  const filtered = type === 'all' ? _allBattles
    : type === 'win'  ? _allBattles.filter(b => Analytics._isWin(b))
    : _allBattles.filter(b => !Analytics._isWin(b));
  renderBattlesList(filtered);
}

function buildBattleCardHTML(battle) {
  const isWin = Analytics._isWin(battle);
  const cards = battle.team?.[0]?.cards || [];
  const oppCards = battle.opponent?.[0]?.cards || [];
  const trophyChange = (battle.team?.[0]?.trophyChange || 0);
  const trophyStr = trophyChange >= 0 ? `+${trophyChange}🏆` : `${trophyChange}🏆`;
  const trophyColor = trophyChange >= 0 ? 'color:var(--win)' : 'color:var(--loss)';
  const timeStr = formatBattleTime(battle.battleTime);
  const type = battle.type || 'Ladder';

  const miniCards = cards.slice(0, 8).map(c =>
    `<div class="mini-card" title="${c.name}">${getCardEmoji(c.name)}</div>`
  ).join('');

  return `
    <div class="battle-card ${isWin ? 'win' : 'loss'}">
      <div class="battle-result-badge">${isWin ? 'V' : 'D'}</div>
      <div class="battle-info">
        <span class="battle-type">${type}</span>
        <div class="battle-cards-row">${miniCards}</div>
      </div>
      <div class="battle-meta">
        <span class="battle-time">${timeStr}</span>
        <div class="battle-trophies" style="${trophyColor}">${trophyStr}</div>
      </div>
    </div>`;
}

function formatBattleTime(timeStr) {
  if (!timeStr) return '—';
  try {
    // Format: 20231115T193045.000Z
    const d = new Date(timeStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2}).*/, '$1-$2-$3T$4:$5:$6Z'));
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Há pouco';
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h/24)}d atrás`;
  } catch { return '—'; }
}

/* ── DECKS PAGE ──────────────────────────── */
function renderDecksPage(battles, deckStats) {
  renderDeckRecommendation(battles, deckStats);
  renderDeckStatsList(deckStats);
}

function renderDeckRecommendation(battles, deckStats) {
  const best = Analytics.getBestDeckRecommendation(battles, deckStats);
  const container = document.getElementById('rec-body');
  if (!best) {
    container.innerHTML = '<p style="color:var(--text-lo);font-size:14px">Dispute mais batalhas para obter recomendações personalizadas.</p>';
    return;
  }
  const cards = best.cards || [];
  const avgEl = Analytics.avgElixir(cards);
  const deckCardsHTML = cards.map(c => `
    <div class="rec-card-item">
      <span class="rec-card-img">${getCardEmoji(c.name)}</span>
      <span class="rec-card-name">${c.name}</span>
      <span class="rec-card-elixir">💧${getElixirCost(c.name)}</span>
    </div>`).join('');

  const reasons = [];
  if (best.winRate >= 60) reasons.push(`🏆 ${best.winRate}% de win rate com este deck`);
  else if (best.winRate >= 45) reasons.push(`📈 Win rate de ${best.winRate}% — desempenho consistente`);
  else reasons.push(`🔍 Deck mais usado (${best.total} batalhas) — explore outras combinações`);
  reasons.push(`💧 Custo médio de ${avgEl} elixir — ${avgEl <= 3.5 ? 'rápido e agressivo' : avgEl <= 4.2 ? 'balanceado' : 'pesado e resistente'}`);
  if (best.wins >= 5) reasons.push(`✅ ${best.wins} vitórias comprovadas com este deck`);

  container.innerHTML = `
    <div class="rec-deck">
      <div class="rec-cards-row">${deckCardsHTML}</div>
      <div class="rec-reason">${reasons.join('<br>')}</div>
      <div style="display:flex;gap:16px;margin-top:4px;font-size:12px;color:var(--text-lo)">
        <span>⚔️ ${best.total} batalhas</span>
        <span>✅ ${best.wins} vitórias</span>
        <span>❌ ${best.losses} derrotas</span>
      </div>
    </div>`;
}

function renderDeckStatsList(deckStats) {
  const container = document.getElementById('deck-stats-list');
  if (!deckStats || deckStats.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum dado de deck disponível.</div>';
    return;
  }
  container.innerHTML = deckStats.slice(0, 10).map((d, i) => {
    const wrClass = d.winRate >= 60 ? 'high' : d.winRate >= 45 ? 'mid' : 'low';
    const miniCards = (d.cards || []).slice(0, 8).map(c =>
      `<div class="mini-card" title="${c.name}">${getCardEmoji(c.name)}</div>`
    ).join('');
    return `
      <div class="deck-stat-card">
        <div class="deck-stat-header">
          <span class="deck-stat-label">Deck #${i + 1} · ${d.total} batalhas</span>
          <span class="deck-wr-badge ${wrClass}">${d.winRate}%</span>
        </div>
        <div class="deck-mini-cards">${miniCards}</div>
        <div class="progress-bar">
          <div class="progress-fill ${wrClass}" style="width:${d.winRate}%"></div>
        </div>
      </div>`;
  }).join('');
}

/* ── CARDS PAGE ──────────────────────────── */
let _allCards = [];
function renderCardsPage(playerCards) {
  _allCards = playerCards || [];
  renderCardsGrid(_allCards);
}

function renderCardsGrid(cards) {
  const container = document.getElementById('cards-grid');
  if (!cards || cards.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma carta encontrada.</div>';
    return;
  }
  container.innerHTML = cards.map(c => {
    const rarity = (c.rarity || 'common').toLowerCase();
    const level = c.level || 1;
    const maxLevel = rarity === 'legendary' ? 9 : rarity === 'epic' ? 10 : rarity === 'rare' ? 11 : 12;
    return `
      <div class="card-item ${rarity}" onclick="showCardDetail(${JSON.stringify(c).replace(/"/g,"'")})">
        <div class="card-emoji">${getCardEmoji(c.name)}</div>
        <div class="card-name">${c.name}</div>
        <div class="card-level">Nv.${level}/${maxLevel}</div>
        <div class="card-rarity-dot rarity-${rarity}"></div>
      </div>`;
  }).join('');
}

function filterCards(rarity, btnEl) {
  document.querySelectorAll('#page-cards .filter-chip').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  const filtered = rarity === 'all' ? _allCards
    : _allCards.filter(c => (c.rarity || '').toLowerCase() === rarity);
  renderCardsGrid(filtered);
}

function showCardDetail(cardStr) {
  // Called with stringified card data
}

function closeCardModal() {
  document.getElementById('card-modal').classList.add('hidden');
}

/* ── CHARTS ──────────────────────────────── */
let _chartsRendered = false;
let _battleDataForCharts = [];
let _deckStatsForCharts = [];

function setChartData(battles, deckStats) {
  _battleDataForCharts = battles;
  _deckStatsForCharts = deckStats;
  _chartsRendered = false;
}

function renderCharts() {
  if (_chartsRendered) return;
  _chartsRendered = true;

  const battles = _battleDataForCharts;
  const deckStats = _deckStatsForCharts;

  const chartDefaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#b0aac8', font: { family: 'Exo 2', size: 11 } } } }
  };

  // Trophy trend
  const trophyTrend = Analytics.getTrophyTrend(battles, 20);
  const ctxT = document.getElementById('trophy-chart').getContext('2d');
  if (_charts.trophy) _charts.trophy.destroy();
  _charts.trophy = new Chart(ctxT, {
    type: 'line',
    data: {
      labels: trophyTrend.map((_, i) => `#${i+1}`),
      datasets: [{
        label: 'Troféus', data: trophyTrend.map(t => t.y),
        borderColor: '#f5c842', backgroundColor: 'rgba(245,200,66,0.1)',
        pointBackgroundColor: '#f5c842', tension: 0.4, fill: true
      }]
    },
    options: { ...chartDefaults, scales: {
      x: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }}
  });

  // Deck win rate bar chart (top 5)
  const top5 = deckStats.filter(d => d.total >= 2).slice(0, 5);
  const ctxD = document.getElementById('deck-wr-chart').getContext('2d');
  if (_charts.deckWr) _charts.deckWr.destroy();
  _charts.deckWr = new Chart(ctxD, {
    type: 'bar',
    data: {
      labels: top5.map((d, i) => `Deck ${i+1}`),
      datasets: [
        { label: 'Win Rate %', data: top5.map(d => d.winRate), backgroundColor: top5.map(d => d.winRate >= 60 ? 'rgba(61,220,132,0.7)' : d.winRate >= 45 ? 'rgba(245,200,66,0.7)' : 'rgba(255,78,106,0.7)'), borderRadius: 6 },
        { label: 'Batalhas', data: top5.map(d => d.total), backgroundColor: 'rgba(124,92,252,0.4)', borderRadius: 6 }
      ]
    },
    options: { ...chartDefaults, scales: {
      x: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }}
  });

  // Card usage
  const usage = Analytics.getCardUsageFrequency(battles);
  const ctxC = document.getElementById('card-usage-chart').getContext('2d');
  if (_charts.cardUsage) _charts.cardUsage.destroy();
  _charts.cardUsage = new Chart(ctxC, {
    type: 'bar',
    data: {
      labels: usage.map(u => u.name.length > 12 ? u.name.slice(0,12) + '…' : u.name),
      datasets: [{ label: 'Usos', data: usage.map(u => u.count), backgroundColor: 'rgba(124,92,252,0.7)', borderRadius: 6 }]
    },
    options: { ...chartDefaults, indexAxis: 'y', scales: {
      x: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#6a6488', font: { size: 10 } }, grid: { display: false } }
    }}
  });

  // Time distribution
  const timeDist = Analytics.getBattleTimeDistribution(battles);
  const ctxH = document.getElementById('time-chart').getContext('2d');
  if (_charts.time) _charts.time.destroy();
  _charts.time = new Chart(ctxH, {
    type: 'bar',
    data: {
      labels: timeDist.map((_, i) => `${i}h`),
      datasets: [{ label: 'Batalhas', data: timeDist.map(h => h.total), backgroundColor: 'rgba(61,220,132,0.6)', borderRadius: 4 }]
    },
    options: { ...chartDefaults, scales: {
      x: { ticks: { color: '#6a6488', font: { size: 9 } }, grid: { display: false } },
      y: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }}
  });
}
