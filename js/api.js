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

// ── EMOJI MAP for cards (fallback when no image) ──────────────────────────────
const CARD_EMOJIS = {
  'Knight':           '⚔️', 'Archers':          '🏹', 'Goblin':           '👺',
  'Giant':            '🗿', 'P.E.K.K.A':        '🤖', 'Musketeer':        '🔫',
  'Mini P.E.K.K.A':  '⚙️', 'Spear Goblins':    '🎯', 'Valkyrie':         '🪓',
  'Skeleton Army':    '💀', 'Barbarians':        '⚒️', 'Witch':            '🧙',
  'Prince':           '🤴', 'Baby Dragon':       '🐉', 'Giant Skeleton':   '☠️',
  'Balloon':          '🎈', 'Wizard':            '🔮', 'Royal Giant':      '👑',
  'Dragon':           '🔥', 'Fireball':          '🔥', 'Arrows':           '↗️',
  'Zap':              '⚡', 'Lightning':         '⚡', 'Freeze':           '❄️',
  'Mirror':           '🪞', 'Rage':              '😡', 'Goblin Barrel':    '🛢️',
  'Rocket':           '🚀', 'Poison':            '☠️', 'Earthquake':       '🌋',
  'Tornado':          '🌀', 'Barbarian Barrel':  '🪣', 'Goblin Giant':     '🏔️',
  'Electro Giant':    '⚡', 'Ram Rider':         '🐏', 'Hog Rider':        '🐗',
  'Miner':            '⛏️', 'Lumberjack':        '🪵', 'Bandit':           '🥷',
  'Royal Ghost':      '👻', 'Mega Knight':       '🦾', 'Inferno Dragon':   '🔥',
  'Electro Dragon':   '⚡', 'Night Witch':       '🦇', 'Ice Wizard':       '🧊',
  'Sparky':           '⚡', 'Graveyard':         '⚰️', 'Heal Spirit':      '💚',
  'Electro Spirit':   '⚡', 'Ice Spirit':        '🧊', 'Fire Spirit':      '🔥',
  'Battle Ram':       '🐏', 'Cannon Cart':       '💣', 'Goblin Cage':      '🏚️',
  'Skeleton Barrel':  '💀', 'Flying Machine':    '✈️', 'Elixir Golem':     '💜',
  'Royal Hogs':       '🐷', 'Wall Breakers':     '💥', 'Goblin Drill':     '🕳️',
  'default':          '🃏'
};

function getCardEmoji(name) {
  return CARD_EMOJIS[name] || CARD_EMOJIS['default'];
}

// Elixir costs map (approximate for deck avg)
const ELIXIR_COSTS = {
  'Knight':2,'Archers':3,'Goblin':2,'Giant':5,'P.E.K.K.A':7,
  'Musketeer':4,'Mini P.E.K.K.A':4,'Spear Goblins':2,'Valkyrie':4,
  'Skeleton Army':3,'Barbarians':5,'Witch':5,'Prince':5,'Baby Dragon':4,
  'Giant Skeleton':6,'Balloon':5,'Wizard':5,'Royal Giant':6,'Fireball':4,
  'Arrows':3,'Zap':2,'Lightning':6,'Freeze':4,'Mirror':1,'Rage':3,
  'Goblin Barrel':3,'Rocket':6,'Poison':4,'Earthquake':3,'Tornado':3,
  'Barbarian Barrel':2,'Goblin Giant':6,'Electro Giant':7,'Ram Rider':5,
  'Hog Rider':4,'Miner':3,'Lumberjack':4,'Bandit':3,'Royal Ghost':3,
  'Mega Knight':7,'Inferno Dragon':4,'Electro Dragon':5,'Night Witch':4,
  'Ice Wizard':3,'Sparky':6,'Graveyard':5,'Heal Spirit':1,'Electro Spirit':1,
  'Ice Spirit':1,'Fire Spirit':2,'Battle Ram':4,'Cannon Cart':5,
  'Flying Machine':4,'Elixir Golem':3,'Royal Hogs':4,'Wall Breakers':2,
  'Goblin Drill':4,'default':3
};

function getElixirCost(name) {
  return ELIXIR_COSTS[name] || ELIXIR_COSTS['default'];
}
