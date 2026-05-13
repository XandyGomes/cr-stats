/**
 * cards.js — Clash Royale card helpers
 * - Traduções PT-BR oficiais do jogo
 * - Helper de imagem real via iconUrls da API
 * - Elixir costs para cálculo de média
 */

/* ── TRADUÇÕES PT-BR ─────────────────────── */
const CARD_NAMES_PTBR = {
  // Tropas comuns
  'Knight':              'Cavaleiro',
  'Archers':             'Arqueiras',
  'Goblins':             'Goblins',
  'Giant':               'Gigante',
  'P.E.K.K.A':           'P.E.K.K.A',
  'Musketeer':           'Mosqueteira',
  'Mini P.E.K.K.A':      'Mini P.E.K.K.A',
  'Spear Goblins':       'Goblins com Lança',
  'Valkyrie':            'Valquíria',
  'Skeleton Army':       'Exército de Esqueletos',
  'Barbarians':          'Bárbaros',
  'Witch':               'Bruxa',
  'Prince':              'Príncipe',
  'Baby Dragon':         'Dragão Bebê',
  'Giant Skeleton':      'Gigante Esqueleto',
  'Balloon':             'Balão',
  'Wizard':              'Mago',
  'Royal Giant':         'Gigante Real',
  'Hog Rider':           'Cavaleiro do Porco',
  'Miner':               'Minerador',
  'Lumberjack':          'Lenhador',
  'Bandit':              'Bandida',
  'Royal Ghost':         'Fantasma Real',
  'Mega Knight':         'Mega Cavaleiro',
  'Inferno Dragon':      'Dragão Infernal',
  'Electro Dragon':      'Dragão Eletro',
  'Night Witch':         'Bruxa das Trevas',
  'Ice Wizard':          'Mago do Gelo',
  'Sparky':              'Sparky',
  'Graveyard':           'Cemitério',
  'Heal Spirit':         'Espírito Curador',
  'Electro Spirit':      'Espírito Eletro',
  'Ice Spirit':          'Espírito do Gelo',
  'Fire Spirit':         'Espírito do Fogo',
  'Battle Ram':          'Ariete de Batalha',
  'Cannon Cart':         'Carroça de Canhão',
  'Goblin Cage':         'Gaiola de Goblin',
  'Skeleton Barrel':     'Barril de Esqueletos',
  'Flying Machine':      'Máquina Voadora',
  'Elixir Golem':        'Golem de Elixir',
  'Royal Hogs':          'Porcos Reais',
  'Wall Breakers':       'Quebradores de Muro',
  'Goblin Drill':        'Perfuradora de Goblins',
  'Goblin Giant':        'Gigante Goblin',
  'Electro Giant':       'Gigante Eletro',
  'Ram Rider':           'Cavaleira do Carneiro',
  'Dark Prince':         'Príncipe das Trevas',
  'Three Musketeers':    'Três Mosqueteiras',
  'Goblin Gang':         'Quadrilha de Goblins',
  'Hunter':              'Caçador',
  'Bowler':              'Bolicheiro',
  'Executioner':         'Algoz',
  'Guards':              'Guardas',
  'Princess':            'Princesa',
  'Goblin Barrel':       'Barril de Goblins',
  'Firecracker':         'Fogueteira',
  'Royal Delivery':      'Entrega Real',
  'Battle Healer':       'Curandeira de Batalha',
  'Skeleton King':       'Rei Esqueleto',
  'Golden Knight':       'Cavaleiro Dourado',
  'Archer Queen':        'Rainha Arqueira',
  'Monk':                'Monge',
  'Little Prince':       'Pequeno Príncipe',
  'Mighty Miner':        'Minerador Poderoso',
  'Goblin Demolisher':   'Goblin Demolidor',
  'Barbarian Barrel':    'Barril de Bárbaros',
  'Skeletons':           'Esqueletos',
  'Minions':             'Lacaios',
  'Minion Horde':        'Horda de Lacaios',
  'Bomber':              'Bombardeiro',
  'Giant Snowball':      'Bola de Neve Gigante',
  'Log':                 'Tora',
  'Bats':                'Morcegos',
  'Rascals':             'Valentões',
  'Cannon':              'Canhão',
  'Tesla':               'Tesla',
  'Mortar':              'Morteiro',
  'Inferno Tower':       'Torre Infernal',
  'X-Bow':               'Besta',
  'Bomb Tower':          'Torre de Bombas',
  'Barbarian Hut':       'Cabana dos Bárbaros',
  'Goblin Hut':          'Cabana dos Goblins',
  'Tombstone':           'Lápide',
  'Furnace':             'Fornalha',
  'Elixir Collector':    'Coletora de Elixir',
  // Feitiços
  'Fireball':            'Bola de Fogo',
  'Arrows':              'Flechas',
  'Zap':                 'Choque',
  'Lightning':           'Raio',
  'Freeze':              'Congelamento',
  'Mirror':              'Espelho',
  'Rage':                'Fúria',
  'Rocket':              'Foguete',
  'Poison':              'Veneno',
  'Earthquake':          'Terremoto',
  'Tornado':             'Tornado',
  'Clone':               'Clone',
  'Goblin Curse':        'Maldição Goblin',
  // Novas cartas
  'Skeleton Dragons':    'Dragões Esqueletos',
  'Mother Witch':        'Bruxa Mãe',
  'Electro Wizard':      'Mago Eletro',
  'Elite Barbarians':    'Bárbaros de Elite',
  'Ice Golem':           'Golem de Gelo',
  'Mega Minion':         'Lacaio Mega',
  'Dart Goblin':         'Goblin Dardo',
  'Goblin Gang':         'Quadrilha de Goblins',
  'Flying Machine':      'Máquina Voadora',
  'Lava Hound':          'Sabujo de Lava',
  'Golem':               'Golem',
  'Pekka':               'P.E.K.K.A',
  'Zappies':             'Choquinhos',
  'Rascals':             'Valentões',
  'Royal Recruits':      'Recrutas Reais',
  'Giant Snowball':      'Bola de Neve Gigante',
  'Bats':                'Morcegos',
  'Log':                 'Tora',
  'Skeleton Dragons':    'Dragões Esqueletos',
  'Cannon':              'Canhão',
};

/**
 * Retorna o nome PT-BR da carta, ou o nome original se não traduzido
 */
function getCardName(englishName) {
  return CARD_NAMES_PTBR[englishName] || englishName;
}

/**
 * Retorna a URL da imagem real da carta (do objeto carta da API)
 * Fallback: null (usar emoji)
 */
function getCardImageUrl(card) {
  if (!card) return null;
  return card.iconUrls?.medium || card.iconUrls?.large || null;
}

/**
 * Gera HTML de imagem real da carta com fallback para emoji
 */
function cardImgHTML(card, cssClass = '') {
  const url = getCardImageUrl(card);
  if (url) {
    return `<img src="${url}" alt="${card.name}" class="card-real-img ${cssClass}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <span class="card-emoji-fallback ${cssClass}" style="display:none">${getCardEmoji(card.name)}</span>`;
  }
  return `<span class="card-emoji-fallback ${cssClass}">${getCardEmoji(card.name)}</span>`;
}

/**
 * Mini-card HTML com imagem real (para battle cards e decks)
 */
function miniCardImgHTML(card, extraClass = '') {
  const url = getCardImageUrl(card);
  const name = getCardName(card.name);
  if (url) {
    return `<div class="mini-card ${extraClass}" title="${name}">
              <img src="${url}" alt="${name}" class="mini-card-img" loading="lazy" onerror="this.parentElement.textContent='${getCardEmoji(card.name)}'">
            </div>`;
  }
  return `<div class="mini-card ${extraClass}" title="${name}">${getCardEmoji(card.name)}</div>`;
}

/* ── ELIXIR COSTS ────────────────────────── */
const ELIXIR_COSTS = {
  'Knight':2,'Archers':3,'Goblins':2,'Giant':5,'P.E.K.K.A':7,
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
  'Goblin Drill':4,'Cannon':3,'Tesla':4,'Mortar':4,'Inferno Tower':5,
  'X-Bow':6,'Bomb Tower':4,'Barbarian Hut':7,'Goblin Hut':5,'Tombstone':3,
  'Furnace':4,'Elixir Collector':6,'Skeletons':1,'Minions':3,'Minion Horde':5,
  'Bomber':2,'Bats':2,'Log':2,'Giant Snowball':2,'Lava Hound':7,
  'Dark Prince':4,'Three Musketeers':9,'Goblin Gang':3,'Hunter':4,
  'Bowler':5,'Executioner':5,'Guards':3,'Princess':3,'Firecracker':3,
  'Royal Delivery':3,'Battle Healer':4,'Skeleton King':4,'Golden Knight':4,
  'Archer Queen':5,'Monk':5,'Little Prince':3,'Mighty Miner':4,
  'Elite Barbarians':6,'Ice Golem':2,'Mega Minion':3,'Dart Goblin':3,
  'Zappies':4,'Rascals':5,'Royal Recruits':7,'Electro Wizard':4,'Golem':8,
  'Mother Witch':4,'Skeleton Dragons':4,'Clone':3,'Goblin Cage':4,
  'Skeleton Barrel':3,'default':3
};

function getElixirCost(name) {
  return ELIXIR_COSTS[name] || ELIXIR_COSTS['default'];
}

/* ── EMOJI FALLBACK (mantido) ────────────── */
const CARD_EMOJIS = {
  'Knight':'⚔️','Archers':'🏹','Goblins':'👺','Giant':'🦣','P.E.K.K.A':'🤖',
  'Musketeer':'🔫','Mini P.E.K.K.A':'⚙️','Spear Goblins':'🗡️','Valkyrie':'🛡️',
  'Skeleton Army':'💀','Barbarians':'🪓','Witch':'🧙','Prince':'👑','Baby Dragon':'🐉',
  'Giant Skeleton':'☠️','Balloon':'🎈','Wizard':'🔮','Royal Giant':'🏰',
  'Hog Rider':'🐗','Miner':'⛏️','Lumberjack':'🪵','Bandit':'🥷','Royal Ghost':'👻',
  'Mega Knight':'🦾','Inferno Dragon':'🔥','Electro Dragon':'⚡','Night Witch':'🦇',
  'Ice Wizard':'❄️','Sparky':'⚡','Graveyard':'🪦','Princess':'👸','Bowler':'🎳',
  'Executioner':'🪃','Guards':'🛡️','Dark Prince':'🌑','Goblin Gang':'👺',
  'Hunter':'🎯','Firecracker':'🧨','Skeleton King':'💀','Golden Knight':'✨',
  'Archer Queen':'🏹','Monk':'🥋','Lava Hound':'🐕','Golem':'🪨','Electro Wizard':'⚡',
  'Heal Spirit':'💚','Electro Spirit':'⚡','Ice Spirit':'🧊','Fire Spirit':'🔥',
  'Battle Ram':'🐏','Cannon Cart':'💣','Goblin Cage':'🏚️','Skeleton Barrel':'💀',
  'Flying Machine':'✈️','Elixir Golem':'💜','Royal Hogs':'🐷','Wall Breakers':'💥',
  'Goblin Drill':'🕳️','Skeletons':'💀','Minions':'😈','Minion Horde':'😈',
  'Bomber':'💣','Bats':'🦇','Log':'🪵','Giant Snowball':'❄️','Cannon':'💣',
  'Tesla':'⚡','Mortar':'💣','Inferno Tower':'🔥','X-Bow':'🏹','Bomb Tower':'💣',
  'Barbarian Hut':'🏚️','Goblin Hut':'🏚️','Tombstone':'🪦','Furnace':'🔥',
  'Elixir Collector':'💧','Three Musketeers':'🔫','Fireball':'🔥','Arrows':'🏹',
  'Zap':'⚡','Lightning':'⚡','Freeze':'❄️','Mirror':'🪞','Rage':'😡',
  'Goblin Barrel':'🍺','Rocket':'🚀','Poison':'☠️','Earthquake':'🌍','Tornado':'🌪️',
  'Barbarian Barrel':'🪓','Goblin Giant':'👺','Electro Giant':'🤖','Ram Rider':'🐏',
  'Mother Witch':'🧙','Skeleton Dragons':'🐉','Clone':'👥','Goblin Cage':'🏚️',
  'Elite Barbarians':'🪓','Ice Golem':'❄️','Mega Minion':'😈','Dart Goblin':'🎯',
  'Zappies':'⚡','Rascals':'😈','Royal Recruits':'⚔️','Battle Healer':'💚',
  'Mighty Miner':'⛏️','Little Prince':'👑','Royal Delivery':'📦',
  'default':'🃏'
};

function getCardEmoji(name) {
  return CARD_EMOJIS[name] || CARD_EMOJIS['default'];
}
