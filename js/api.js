/**
 * api.js — Clash Royale API client
 * Uses a CORS proxy for browser-side requests.
 * Official API: https://api.clashroyale.com/v1
 *
 * ⚠️ The official API requires requests from whitelisted IPs.
 * We use a reliable public proxy OR the official proxy endpoint.
 */

// CORS proxy — try official proxy first, then fallback
const CR_BASE = 'https://api.clashroyale.com/v1';
// Proxy for browser: we route through allorigins or corsproxy
const CORS_PROXY = 'https://corsproxy.io/?';

const AppCache = {
  CACHE_KEY: 'crstats_cache',
  BATTLES_KEY: 'crstats_battles',
  CARDS_KEY: 'crstats_cards',
  TTL: 5 * 60 * 1000, // 5 minutes

  set(key, data) {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
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
    this.apiKey = apiKey;
    this.playerTag = playerTag.replace('#', '%23');
  },

  async _fetch(path) {
    const url = `${CORS_PROXY}${encodeURIComponent(`${CR_BASE}${path}`)}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error('API Key inválida ou IP não autorizado. Configure sua chave em developer.clashroyale.com');
      if (res.status === 404) throw new Error('Jogador não encontrado. Verifique seu Player Tag.');
      if (res.status === 429) throw new Error('Muitas requisições. Aguarde um momento.');
      throw new Error(err.message || `Erro na API (${res.status})`);
    }
    return res.json();
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
    const battles = data.items || data;
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

  /** Force refresh — clear cache then fetch */
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
