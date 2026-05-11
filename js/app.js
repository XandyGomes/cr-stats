/**
 * app.js — Application orchestrator
 * Wires auth → API → analytics → UI
 */

let _session = null;
let _player  = null;
let _battles = [];
let _cards   = [];
let _deckStats = [];

/**
 * Entry point — called after successful login
 */
async function initApp(session) {
  _session = session;

  // Switch screens
  document.getElementById('splash-screen').classList.remove('active');
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('active');

  // Init API client
  CRApi.init(session.apiKey, session.playerTag);

  // Show loading states
  showLoadingStates();

  // Fetch all data
  await loadAllData();
}

function showLoadingStates() {
  document.getElementById('trophy-count').textContent   = '—';
  document.getElementById('best-trophies').textContent  = '—';
  document.getElementById('player-level').textContent   = '—';
  document.getElementById('player-arena').textContent   = '—';
  document.getElementById('player-name-display').textContent = _session.username;
  document.getElementById('player-tag-display').textContent  = _session.playerTag;
  document.getElementById('wr-pct-val').textContent     = '—%';
  document.getElementById('total-wins').textContent     = '—';
  document.getElementById('total-losses').textContent   = '—';
  document.getElementById('total-battles').textContent  = '—';
  document.getElementById('insight-text').textContent   = 'Carregando dados...';
}

async function loadAllData() {
  try {
    // Fetch in parallel
    const [player, battles, allCards] = await Promise.all([
      CRApi.getPlayer(),
      CRApi.getBattleLog().catch(() => []),
      CRApi.getAllCards().catch(() => [])
    ]);

    _player  = player;
    _battles = Array.isArray(battles) ? battles : [];

    // Player's cards come from player.cards
    _cards = player.cards || [];

    // Run analytics
    _deckStats = Analytics.analyzeDeckPerformance(_battles);

    // Pass chart data
    setChartData(_battles, _deckStats);

    // Render all pages
    renderOverview(_player, _battles, _deckStats);
    renderBattlesPage(_battles);
    renderDecksPage(_battles, _deckStats);
    renderCardsPage(_cards);

    showToast(`✅ ${_battles.length} batalhas carregadas`);

  } catch (err) {
    console.error('Data load error:', err);
    showToast(`❌ ${err.message}`, 5000);

    // Show error in insight banner
    document.getElementById('insight-text').textContent =
      `Erro ao conectar à API: ${err.message}. Verifique sua chave e tag.`;

    // If API key is invalid, render empty states gracefully
    renderBattlesPage([]);
    renderDecksPage([], []);
    renderCardsPage([]);
  }
}

async function refreshData() {
  const btn = document.getElementById('refresh-btn');
  btn.style.animation = 'spin 0.8s linear infinite';
  btn.disabled = true;
  AppCache.clear();
  _chartsRendered = false;
  showToast('🔄 Atualizando dados...');
  await loadAllData();
  btn.style.animation = '';
  btn.disabled = false;
}

/* ── PWA Service Worker Registration ─────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ── Auto-login if session exists ────────── */
window.addEventListener('DOMContentLoaded', () => {
  const session = Auth.getSession();
  if (session) {
    initApp(session);
  }
});
