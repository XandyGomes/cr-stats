/**
 * ui.js — UI rendering (upgraded with rich deck AI section)
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

  if (page === 'analytics') renderCharts();
}

/* ── OVERVIEW ────────────────────────────── */
function renderOverview(player, battles, deckStats) {
  document.getElementById('trophy-count').textContent    = (player.trophies || 0).toLocaleString('pt-BR');
  document.getElementById('best-trophies').textContent   = (player.bestTrophies || 0).toLocaleString('pt-BR');
  document.getElementById('player-level').textContent    = player.expLevel || '?';
  document.getElementById('player-arena').textContent    = player.arena?.name || '?';
  document.getElementById('player-name-display').textContent = player.name || 'Jogador';
  document.getElementById('player-tag-display').textContent  = player.tag || '';
  document.getElementById('last-update-text').textContent    = 'Atualizado agora';

  const wr = Analytics.computeWinRate(battles);
  document.getElementById('wr-pct-val').textContent  = `${wr.pct}%`;
  document.getElementById('total-wins').textContent   = wr.wins;
  document.getElementById('total-losses').textContent = wr.losses;
  document.getElementById('total-battles').textContent = wr.total;
  renderWinRateChart(wr);

  // Streak badge
  const streak = Analytics.getCurrentStreak(battles);
  renderStreakBadge(streak);

  const insight = Analytics.generateInsight(wr, deckStats, battles);
  document.getElementById('insight-text').innerHTML = insight;

  renderRecentBattlesMini(battles.slice(0, 5));
}

function renderStreakBadge(streak) {
  const el = document.getElementById('streak-badge');
  if (!el || streak.type === 'none' || streak.count < 2) {
    if (el) el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  const isWin = streak.type === 'win';
  el.className = `streak-badge ${isWin ? 'streak-win' : 'streak-loss'}`;
  el.innerHTML = `${isWin ? '🔥' : '💀'} ${streak.count}x ${isWin ? 'vitórias' : 'derrotas'} seguidas`;
}

function renderWinRateChart(wr) {
  const ctx = document.getElementById('winrate-chart').getContext('2d');
  if (_charts.winrate) _charts.winrate.destroy();
  _charts.winrate = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [wr.wins || 0, wr.losses || 0.001],
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
  container.innerHTML = battles.map(b => buildBattleCardHTML(b, true)).join('');
}

function filterBattles(type, btnEl) {
  document.querySelectorAll('#page-battles .filter-chip').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  const filtered = type === 'all' ? _allBattles
    : type === 'win'  ? _allBattles.filter(b => Analytics._isWin(b))
    : _allBattles.filter(b => !Analytics._isWin(b));
  renderBattlesList(filtered);
}

function buildBattleCardHTML(battle, showOpp = false) {
  const isWin = Analytics._isWin(battle);
  const cards    = battle.team?.[0]?.cards || [];
  const oppCards = battle.opponent?.[0]?.cards || [];
  const trophyChange = battle.team?.[0]?.trophyChange || 0;
  const trophyStr = trophyChange >= 0 ? `+${trophyChange}🏆` : `${trophyChange}🏆`;
  const trophyColor = trophyChange >= 0 ? 'color:var(--win)' : 'color:var(--loss)';
  const timeStr = formatBattleTime(battle.battleTime);
  const type = battle.type || 'Ladder';
  const crowns = `${battle.team?.[0]?.crowns || 0}-${battle.opponent?.[0]?.crowns || 0}`;

  const miniCards = cards.slice(0, 8).map(c =>
    `<div class="mini-card" title="${c.name}">${getCardEmoji(c.name)}</div>`
  ).join('');

  const oppMini = showOpp && oppCards.length > 0 ? `
    <div class="opp-row">
      <span class="opp-label">Adversário:</span>
      <div class="battle-cards-row opp-cards">${oppCards.slice(0, 8).map(c =>
        `<div class="mini-card opp" title="${c.name}">${getCardEmoji(c.name)}</div>`
      ).join('')}</div>
    </div>` : '';

  return `
    <div class="battle-card ${isWin ? 'win' : 'loss'}">
      <div class="battle-result-badge">${isWin ? 'V' : 'D'}</div>
      <div class="battle-info">
        <div class="battle-top-row">
          <span class="battle-type">${type}</span>
          <span class="battle-crowns">${crowns} 👑</span>
        </div>
        <div class="battle-cards-row">${miniCards}</div>
        ${oppMini}
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
    const d = new Date(timeStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2}).*/, '$1-$2-$3T$4:$5:$6Z'));
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Há pouco';
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h/24)}d atrás`;
  } catch { return '—'; }
}

/* ── DECKS PAGE — SEÇÃO IA COMPLETA ─────── */
function renderDecksPage(battles, deckStats) {
  renderTopDecksIA(battles, deckStats);
  renderDeckStatsList(deckStats);
}

function renderTopDecksIA(battles, deckStats) {
  const container = document.getElementById('rec-body');

  if (!deckStats || deckStats.length === 0 || battles.length < 2) {
    container.innerHTML = `
      <div class="ai-empty">
        <div class="ai-empty-icon">🤖</div>
        <p>Dispute pelo menos <strong>2 batalhas</strong> para a IA gerar recomendações personalizadas.</p>
      </div>`;
    return;
  }

  const top3 = Analytics.getTopDeckRecommendations(battles, deckStats, 3);

  if (top3.length === 0) {
    container.innerHTML = `<p style="color:var(--text-lo);font-size:14px;padding:8px">Nenhum deck com batalhas suficientes ainda.</p>`;
    return;
  }

  const bestTime = Analytics.getBestPlayTime(battles);
  const recentWR = Analytics.computeRecentWinRate(battles, 10);

  const headerHTML = `
    <div class="ai-summary">
      <div class="ai-stat-pill">
        <span class="ai-pill-icon">📊</span>
        <span>Últimas 10: <strong>${recentWR}%</strong></span>
      </div>
      ${bestTime ? `
      <div class="ai-stat-pill">
        <span class="ai-pill-icon">⏰</span>
        <span>Melhor hora: <strong>${bestTime.hour}h (${bestTime.wr}%)</strong></span>
      </div>` : ''}
    </div>`;

  const decksHTML = top3.map((deck, i) => buildDeckRecommendationCard(deck, i)).join('');

  container.innerHTML = headerHTML + decksHTML;
}

function buildDeckRecommendationCard(deck, rank) {
  const cards = deck.cards || [];
  const avgEl = deck.avgElixir;
  const conf = deck.confidence;
  const stars = '★'.repeat(conf.stars) + '☆'.repeat(3 - conf.stars);
  const elixirLabel = avgEl <= 3.2 ? '⚡ Muito leve' : avgEl <= 3.8 ? '⚖️ Balanceado' : avgEl <= 4.3 ? '🔵 Médio-pesado' : '🐘 Pesado';
  const rankEmoji = ['🥇', '🥈', '🥉'][rank] || `#${rank+1}`;

  const deckCardsHTML = cards.map(c => `
    <div class="ai-card-chip">
      <span class="ai-card-emoji">${getCardEmoji(c.name)}</span>
      <span class="ai-card-name">${c.name}</span>
      <span class="ai-card-elixir">💧${getElixirCost(c.name)}</span>
    </div>`).join('');

  const weaknessHTML = deck.weaknesses && deck.weaknesses.length > 0
    ? `<div class="ai-weaknesses">
        <span class="ai-section-label">⚠️ Fraquezas detectadas:</span>
        ${deck.weaknesses.map(w => `<span class="ai-weakness-tag">${w}</span>`).join('')}
       </div>`
    : '';

  const suggestionHTML = deck.suggestion
    ? `<div class="ai-suggestion">${deck.suggestion}</div>`
    : '';

  const wrColor = deck.winRate >= 60 ? '#3ddc84' : deck.winRate >= 45 ? '#f5c842' : '#ff4e6a';

  // Score bar
  const scoreBar = Math.min(deck.aiScore, 100);

  return `
    <div class="ai-deck-card ${rank === 0 ? 'ai-deck-top' : ''}">
      <div class="ai-deck-header">
        <div class="ai-deck-rank">${rankEmoji}</div>
        <div class="ai-deck-title">
          <span class="ai-archetype-badge">${deck.archetype}</span>
          ${deck.isRecent ? '<span class="ai-recent-badge">Usado recentemente</span>' : ''}
        </div>
        <div class="ai-deck-wr" style="color:${wrColor}">${deck.winRate}%</div>
      </div>

      <div class="ai-score-row">
        <span class="ai-score-label">Score IA</span>
        <div class="ai-score-bar-wrap">
          <div class="ai-score-bar" style="width:${scoreBar}%;background:${wrColor}"></div>
        </div>
        <span class="ai-score-val">${deck.aiScore}</span>
      </div>

      <div class="ai-deck-cards">${deckCardsHTML}</div>

      <div class="ai-deck-stats">
        <div class="ai-mini-stat">
          <span class="ai-ms-label">Batalhas</span>
          <span class="ai-ms-val">⚔️ ${deck.total}</span>
        </div>
        <div class="ai-mini-stat">
          <span class="ai-ms-label">Vitórias</span>
          <span class="ai-ms-val" style="color:#3ddc84">✅ ${deck.wins}</span>
        </div>
        <div class="ai-mini-stat">
          <span class="ai-ms-label">Derrotas</span>
          <span class="ai-ms-val" style="color:#ff4e6a">❌ ${deck.losses}</span>
        </div>
        <div class="ai-mini-stat">
          <span class="ai-ms-label">Troféus</span>
          <span class="ai-ms-val" style="color:${deck.avgTrophy >= 0 ? '#f5c842' : '#ff4e6a'}">${deck.avgTrophy >= 0 ? '+' : ''}${deck.avgTrophy}</span>
        </div>
        <div class="ai-mini-stat">
          <span class="ai-ms-label">Elixir</span>
          <span class="ai-ms-val">💧 ${avgEl}</span>
        </div>
        <div class="ai-mini-stat">
          <span class="ai-ms-label">Confiança</span>
          <span class="ai-ms-val" style="color:${conf.color}">${stars}</span>
        </div>
      </div>

      <div class="ai-elixir-label">${elixirLabel}</div>

      ${weaknessHTML}
      ${suggestionHTML}
    </div>`;
}

function renderDeckStatsList(deckStats) {
  const container = document.getElementById('deck-stats-list');
  if (!deckStats || deckStats.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum dado de deck disponível.</div>';
    return;
  }
  container.innerHTML = deckStats.slice(0, 15).map((d, i) => {
    const wrClass = d.winRate >= 60 ? 'high' : d.winRate >= 45 ? 'mid' : 'low';
    const miniCards = (d.cards || []).slice(0, 8).map(c =>
      `<div class="mini-card" title="${c.name}">${getCardEmoji(c.name)}</div>`
    ).join('');
    const arch = d.archetype || Analytics._classifyArchetype(d.cards);
    return `
      <div class="deck-stat-card">
        <div class="deck-stat-header">
          <div>
            <span class="deck-stat-label">Deck #${i + 1}</span>
            <span class="deck-arch-tag">${arch}</span>
          </div>
          <div style="text-align:right">
            <span class="deck-wr-badge ${wrClass}">${d.winRate}%</span>
            <div style="font-size:10px;color:var(--text-lo);margin-top:2px">${d.total} batalhas</div>
          </div>
        </div>
        <div class="deck-mini-cards">${miniCards}</div>
        <div class="progress-bar">
          <div class="progress-fill ${wrClass}" style="width:${d.winRate}%"></div>
        </div>
        <div style="display:flex;gap:12px;margin-top:6px;font-size:11px;color:var(--text-lo)">
          <span>✅ ${d.wins}V</span>
          <span>❌ ${d.losses}D</span>
          <span>💧 ${d.avgElixir || Analytics.avgElixir(d.cards)} elixir</span>
          <span style="color:${(d.avgTrophy || 0) >= 0 ? '#f5c842' : '#ff4e6a'}">${(d.avgTrophy || 0) >= 0 ? '+' : ''}${d.avgTrophy || 0} 🏆</span>
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
    const pct = Math.round((level / maxLevel) * 100);
    return `
      <div class="card-item ${rarity}">
        <div class="card-emoji">${getCardEmoji(c.name)}</div>
        <div class="card-name">${c.name}</div>
        <div class="card-level">Nv.${level}/${maxLevel}</div>
        <div class="card-level-bar"><div class="card-level-fill" style="width:${pct}%"></div></div>
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

  const battles  = _battleDataForCharts;
  const deckStats= _deckStatsForCharts;

  const chartDefaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#b0aac8', font: { family: 'Exo 2', size: 11 } } } }
  };
  const gridOpts = {
    x: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } }
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
    options: { ...chartDefaults, scales: gridOpts }
  });

  // Deck win rate (top 5) — barras coloridas por WR
  const top5 = deckStats.filter(d => d.total >= 2).slice(0, 5);
  const ctxD = document.getElementById('deck-wr-chart').getContext('2d');
  if (_charts.deckWr) _charts.deckWr.destroy();
  _charts.deckWr = new Chart(ctxD, {
    type: 'bar',
    data: {
      labels: top5.map((d, i) => `Deck ${i+1} (${d.archetype || ''})`),
      datasets: [
        {
          label: 'Win Rate %',
          data: top5.map(d => d.winRate),
          backgroundColor: top5.map(d => d.winRate >= 60 ? 'rgba(61,220,132,0.8)' : d.winRate >= 45 ? 'rgba(245,200,66,0.8)' : 'rgba(255,78,106,0.8)'),
          borderRadius: 6
        },
        {
          label: 'Batalhas',
          data: top5.map(d => d.total),
          backgroundColor: 'rgba(124,92,252,0.4)',
          borderRadius: 6
        }
      ]
    },
    options: { ...chartDefaults, scales: gridOpts }
  });

  // Card usage
  const usage = Analytics.getCardUsageFrequency(battles);
  const ctxC = document.getElementById('card-usage-chart').getContext('2d');
  if (_charts.cardUsage) _charts.cardUsage.destroy();
  _charts.cardUsage = new Chart(ctxC, {
    type: 'bar',
    data: {
      labels: usage.map(u => u.name.length > 14 ? u.name.slice(0,14)+'…' : u.name),
      datasets: [{ label: 'Usos', data: usage.map(u => u.count), backgroundColor: 'rgba(124,92,252,0.7)', borderRadius: 6 }]
    },
    options: { ...chartDefaults, indexAxis: 'y', scales: {
      x: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#6a6488', font: { size: 10 } }, grid: { display: false } }
    }}
  });

  // Horário — win rate por hora
  const timeDist = Analytics.getBattleTimeDistribution(battles);
  const ctxH = document.getElementById('time-chart').getContext('2d');
  if (_charts.time) _charts.time.destroy();
  _charts.time = new Chart(ctxH, {
    type: 'bar',
    data: {
      labels: timeDist.map((_, i) => `${i}h`),
      datasets: [
        { label: 'Batalhas', data: timeDist.map(h => h.total), backgroundColor: 'rgba(61,220,132,0.5)', borderRadius: 4 },
        { label: 'Vitórias', data: timeDist.map(h => h.wins), backgroundColor: 'rgba(61,220,132,0.9)', borderRadius: 4 }
      ]
    },
    options: { ...chartDefaults, scales: {
      x: { ticks: { color: '#6a6488', font: { size: 9 } }, grid: { display: false } },
      y: { ticks: { color: '#6a6488' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }}
  });
}
