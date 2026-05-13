/**
 * api.js — Clash Royale API client
 * Uses CORS proxies with automatic fallback for browser-side requests.
 * Official API: https://api.clashroyale.com/v1
 *
 * ⚠️ IMPORTANT: A chave da API deve ser criada com o IP do proxy, não do seu PC!
 * Solução: crie a chave em developer.clashroyale.com e deixe o IP em branco
 * ou use "0.0.0.0/0" para permitir qualquer IP (modo desenvolvimento).
 */

const CR_BASE = 'https://api.clashroyale.com/v1';

// CORS Proxy list — tentados em ordem até um funcionar
const PROXY_LIST = [
  // allorigins — passa headers de autorização via encoded URL
  (url, key) => ({
    url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    headers: { 'Accept': 'application/json' },
    note: 'allorigins'
  }),
  // corsproxy.io
  (url, key) => ({
    url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
    headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
    note: 'corsproxy.io'
  }),
  // thingproxy
  (url, key) => ({
    url: `https://thingproxy.freeboard.io/fetch/${url}`,
    headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
    note: 'thingproxy'
  }),
];

// allorigins não suporta headers customizados — precisamos embutir a key na URL via proxy diferente
// Estratégia: usar cors-anywhere público como 4º fallback
const buildProxiedUrl = (path, apiKey) => {
  const fullUrl = `${CR_BASE}${path}`;
  return PROXY_LIST.map(fn => fn(fullUrl, apiKey));
};

const AppCache = {
  CACHE_KEY: 'crstats_cache',
  BATTLES_KEY: 'crstats_battles',
  CARDS_KEY: 'crstats_cards',
  TTL: 5 * 60 * 1000, // 5 minutos

  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch(e) { /* storage full */ }
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
    // Normaliza a tag: remove # inicial e re-encoda
    const tag = playerTag.trim().toUpperCase().replace(/^#/, '');
    this.playerTag = '%23' + tag; // %23 = #
  },

  /**
   * Tenta múltiplos proxies até um responder corretamente.
   * allorigins injeta o Authorization via query param workaround.
   */
  async _fetch(path) {
    const fullUrl = `${CR_BASE}${path}`;
    const proxies = buildProxiedUrl(path, this.apiKey);

    // Estratégia especial para allorigins: ele não suporta Auth headers.
    // Usamos ele apenas para endpoints públicos (cards).
    // Para endpoints privados (player, battlelog), pulamos direto para os outros.
    const isPublic = path === '/cards';
    const startIdx = isPublic ? 0 : 1;

    let lastError = null;

    for (let i = startIdx; i < proxies.length; i++) {
      const proxy = proxies[i];
      try {
        console.log(`[CRApi] Tentando proxy: ${proxy.note} → ${path}`);
        const res = await fetch(proxy.url, {
          method: 'GET',
          headers: proxy.headers,
          signal: AbortSignal.timeout(10000) // 10s timeout
        });

        if (res.status === 403) {
          const body = await res.text();
          console.warn(`[CRApi] 403 via ${proxy.note}:`, body);
          // 403 pode ser IP não autorizado OU key inválida
          throw new Error('403_forbidden');
        }
        if (res.status === 404) throw new Error('404_not_found');
        if (res.status === 429) throw new Error('429_rate_limit');
        if (!res.ok) throw new Error(`http_${res.status}`);

        const data = await res.json();

        // allorigins às vezes retorna { contents: "..." } — verificar
        if (data && data.contents && typeof data.contents === 'string') {
          try { return JSON.parse(data.contents); } catch { /* not json wrapper */ }
        }

        return data;

      } catch (err) {
        lastError = err;
        const msg = err.message || '';

        // Erros definitivos — não tentar outros proxies
        if (msg === '403_forbidden' || msg === '404_not_found' || msg === '429_rate_limit') {
          break;
        }

        console.warn(`[CRApi] Proxy ${proxy.note} falhou:`, msg);
        // Tentar próximo proxy
        continue;
      }
    }

    // Traduzir erro final
    const msg = lastError?.message || '';
    if (msg === '403_forbidden') {
      throw new Error(
        'Acesso negado (403). Verifique:\n' +
        '1. Sua API Key está correta?\n' +
        '2. Acesse developer.clashroyale.com → sua chave → edite o IP permitido → deixe 0.0.0.0/0 ou delete e crie nova sem restrição de IP.'
      );
    }
    if (msg === '404_not_found') throw new Error('Jogador não encontrado. Verifique seu Player Tag (ex: #2PP2Y8LY).');
    if (msg === '429_rate_limit') throw new Error('Muitas requisições. Aguarde alguns segundos.');
    throw new Error('Não foi possível conectar à API. Verifique sua internet e tente novamente.');
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
