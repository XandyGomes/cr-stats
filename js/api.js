/**
 * api.js — Clash Royale API client
 *
 * Usa nossa Vercel Function (/api/cr-proxy) como proxy backend.
 * Sem CORS. Sem proxies públicos. A chave vai direto do browser pro nosso servidor,
 * que repassa para a API oficial do Clash Royale.
 */

const CR_BASE = 'https://api.clashroyale.com/v1';

// URL base do nosso proxy (relativo — funciona em qualquer domínio Vercel)
const PROXY_BASE = '/api/cr-proxy';

const AppCache = {
  CACHE_KEY: 'crstats_cache',
  BATTLES_KEY: 'crstats_battles',
  CARDS_KEY: 'crstats_cards',
  TTL: 5 * 60 * 1000, // 5 minutos

  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch(e) { /* storage cheio */ }
  },
  get(key) {
    try {
      const raw = JSON.parse(localStorage.getItem(key));
      if (!raw || Date.now() - raw.ts > this.TTL) return null;
      return raw.data;
    } catch { return null; }
  },
  clear() {
    [this.CACHE_KEY, this.BATTLES_KEY, this.CARDS_KEY].forEach(k => localStorage.removeItem(k));
  }
};

const CRApi = {
  apiKey: null,
  playerTag: null,

  init(apiKey, playerTag) {
    this.apiKey = apiKey.trim();
    // Normaliza: remove # e re-encoda para %23
    const tag = playerTag.trim().toUpperCase().replace(/^#/, '');
    this.playerTag = '%23' + tag;
  },

  /**
   * Faz a requisição via nosso proxy Vercel.
   * O token é enviado como query param (HTTPS — seguro em trânsito).
   */
  async _fetch(path) {
    const proxyUrl = `${PROXY_BASE}?path=${encodeURIComponent(path)}&token=${encodeURIComponent(this.apiKey)}`;

    let res;
    try {
      res = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
    } catch (networkErr) {
      throw new Error('Sem conexão com a internet. Verifique sua rede.');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error(
          'API Key inválida ou expirada (403). ' +
          'Verifique em developer.clashroyale.com se a chave ainda está ativa e se o IP está como 0.0.0.0/0.'
        );
      }
      if (res.status === 404) {
        throw new Error(`Jogador não encontrado (404). Verifique seu Player Tag — use exatamente como aparece no jogo (ex: #2P9UUJY92).`);
      }
      if (res.status === 429) {
        throw new Error('Muitas requisições (429). Aguarde alguns segundos e tente novamente.');
      }
      if (res.status === 400) {
        throw new Error('Parâmetro inválido. Verifique sua Player Tag.');
      }
      throw new Error(data.message || data.error || `Erro na API (${res.status}).`);
    }

    return data;
  },

  /** GET /players/{playerTag} */
  async getPlayer() {
    const cached = AppCache.get(AppCache.CACHE_KEY);
    if (cached?.player) return cached.player;
    const data = await this._fetch(`/players/${this.playerTag}`);
    const cache = AppCache.get(AppCache.CACHE_KEY) || {};
    AppCache.set(AppCache.CACHE_KEY, { ...cache, player: data });
    return data;
  },

  /** GET /players/{playerTag}/battlelog */
  async getBattleLog() {
    const cached = AppCache.get(AppCache.BATTLES_KEY);
    if (cached) return cached;
    const data = await this._fetch(`/players/${this.playerTag}/battlelog`);
    const battles = Array.isArray(data) ? data : (data.items || []);
    AppCache.set(AppCache.BATTLES_KEY, battles);
    return battles;
  },

  /** GET /players/{playerTag}/upcomingchests */
  async getUpcomingChests() {
    const data = await this._fetch(`/players/${this.playerTag}/upcomingchests`);
    return data.items || data;
  },

  /** GET /cards */
  async getAllCards() {
    const cached = AppCache.get(AppCache.CARDS_KEY);
    if (cached) return cached;
    const data = await this._fetch('/cards');
    const cards = data.items || data;
    AppCache.set(AppCache.CARDS_KEY, cards);
    return cards;
  },

  /** Force refresh — limpa cache e rebusca tudo */
  async refresh() {
    AppCache.clear();
    return Promise.all([
      this.getPlayer().catch(() => null),
      this.getBattleLog().catch(() => []),
      this.getAllCards().catch(() => [])
    ]);
  }
};

// Card helpers (getCardEmoji, getCardName, getElixirCost, getCardImageUrl) estão em js/cards.js
