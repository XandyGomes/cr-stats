/**
 * analytics.js — Battle analysis & AI deck intelligence engine
 * Motor de análise completo com IA de recomendação de decks.
 */

const Analytics = {

  /* ─── WIN RATE ───────────────────────────────────────────────── */

  computeWinRate(battles) {
    if (!battles || battles.length === 0) return { wins: 0, losses: 0, total: 0, pct: 0 };
    const wins   = battles.filter(b => b.team && b.opponent && this._isWin(b)).length;
    const losses = battles.length - wins;
    return {
      wins, losses,
      total: battles.length,
      pct: battles.length > 0 ? Math.round((wins / battles.length) * 100) : 0
    };
  },

  _isWin(battle) {
    try {
      const teamCrowns = battle.team[0]?.crowns || 0;
      const oppCrowns  = battle.opponent[0]?.crowns || 0;
      return teamCrowns > oppCrowns;
    } catch { return false; }
  },

  /* ─── DECK KEY ────────────────────────────────────────────────── */

  _getDeckKey(cards) {
    if (!cards || cards.length === 0) return 'unknown';
    return cards.map(c => c.name).sort().join('|');
  },

  /* ─── STREAK ─────────────────────────────────────────────────── */

  getCurrentStreak(battles) {
    if (!battles || battles.length === 0) return { type: 'none', count: 0 };
    const first = this._isWin(battles[0]);
    let count = 0;
    for (const b of battles) {
      if (this._isWin(b) === first) count++;
      else break;
    }
    return { type: first ? 'win' : 'loss', count };
  },

  /* ─── WIN RATE RECENTE (últimas N batalhas) ───────────────────── */

  computeRecentWinRate(battles, n = 10) {
    const recent = battles.slice(0, n);
    if (recent.length === 0) return 0;
    const wins = recent.filter(b => this._isWin(b)).length;
    return Math.round((wins / recent.length) * 100);
  },

  /* ─── ANÁLISE DE DESEMPENHO POR DECK ─────────────────────────── */

  analyzeDeckPerformance(battles) {
    const deckMap = {};

    battles.forEach((battle, idx) => {
      try {
        const cards = battle.team?.[0]?.cards;
        if (!cards || cards.length === 0) return;
        const key = this._getDeckKey(cards);
        if (!deckMap[key]) {
          deckMap[key] = {
            cards,
            key,
            wins: 0,
            losses: 0,
            trophyChanges: [],
            oppDecks: [],
            // recência: batalhas mais recentes valem mais
            recencyScore: 0
          };
        }
        const d = deckMap[key];
        const won = this._isWin(battle);
        if (won) d.wins++; else d.losses++;

        const tc = battle.team?.[0]?.trophyChange || 0;
        d.trophyChanges.push(tc);

        // Arquétipo do deck adversário (para análise de counter)
        const oppCards = battle.opponent?.[0]?.cards || [];
        if (oppCards.length > 0) d.oppDecks.push({ cards: oppCards, won });

        // Recência: quanto mais recente, maior o peso
        const recencyWeight = Math.max(0, 1 - idx / battles.length);
        d.recencyScore += recencyWeight * (won ? 1 : -0.5);
      } catch {}
    });

    return Object.values(deckMap)
      .map(d => {
        const total = d.wins + d.losses;
        const winRate = total > 0 ? Math.round((d.wins / total) * 100) : 0;
        const avgTrophy = d.trophyChanges.length > 0
          ? Math.round(d.trophyChanges.reduce((s, v) => s + v, 0) / d.trophyChanges.length)
          : 0;
        const archetype = this._classifyArchetype(d.cards);
        const avgElixir = parseFloat(this.avgElixir(d.cards));
        return {
          ...d,
          total,
          winRate,
          avgTrophy,
          archetype,
          avgElixir,
          // Score composto para ranking IA
          aiScore: this._computeAiScore({ winRate, total, recencyScore: d.recencyScore, avgTrophy })
        };
      })
      .sort((a, b) => b.total - a.total);
  },

  /* ─── SCORE IA PARA RANKING DE DECKS ─────────────────────────── */

  _computeAiScore({ winRate, total, recencyScore, avgTrophy }) {
    // Componentes do score:
    // 1. Win rate (0-100) → peso 50%
    // 2. Confiança amostral: log(total) normalizado → peso 20%
    // 3. Recência: desempenho recente → peso 20%
    // 4. Troféus médios: positivo = ganhou troféus → peso 10%
    const wrScore    = winRate;
    const confScore  = Math.min(Math.log10(Math.max(total, 1)) / Math.log10(30), 1) * 100;
    const recScore   = Math.min(Math.max(recencyScore * 20, -20), 40) + 20; // normaliza em 0-60
    const trophyScore= Math.min(Math.max(avgTrophy + 30, 0), 60);

    return Math.round(wrScore * 0.5 + confScore * 0.2 + recScore * 0.2 + trophyScore * 0.1);
  },

  /* ─── ARQUÉTIPO DE DECK ───────────────────────────────────────── */

  _classifyArchetype(cards) {
    if (!cards || cards.length === 0) return 'Desconhecido';
    const names = cards.map(c => c.name);
    const avgElixir = parseFloat(this.avgElixir(cards));

    // Beatdown markers
    const beatdownCards = ['Giant', 'Golem', 'Giant Skeleton', 'Lava Hound', 'P.E.K.K.A', 'Mega Knight', 'Goblin Giant', 'Electro Giant', 'Royal Giant'];
    // Rush/Cycle markers
    const cycleCards = ['Ice Spirit', 'Skeletons', 'Goblin', 'Cannon', 'Knight', 'Archers', 'Spear Goblins'];
    // Control markers
    const controlCards = ['Tornado', 'Fireball', 'Poison', 'Lightning', 'Freeze', 'Graveyard', 'Inferno Tower', 'Bomb Tower'];
    // Siege markers
    const siegeCards = ['X-Bow', 'Mortar', 'Goblin Drill'];
    // Bridge spam
    const bridgeCards = ['Ram Rider', 'Bandit', 'Battle Ram', 'Royal Ghost', 'Skeleton Barrel'];

    const has = (list) => names.some(n => list.includes(n));
    const countIn = (list) => names.filter(n => list.includes(n)).length;

    if (has(siegeCards)) return 'Siege 🏹';
    if (has(beatdownCards)) return avgElixir >= 4.5 ? 'Beatdown 🐘' : 'Beatdown Médio';
    if (countIn(bridgeCards) >= 2) return 'Bridge Spam 🌉';
    if (has(controlCards) && avgElixir <= 4.0) return 'Controle 🔮';
    if (avgElixir <= 3.2) return 'Cycle ⚡';
    if (avgElixir <= 3.8) return 'Ciclo Médio';
    return 'Midrange ⚖️';
  },

  /* ─── TOP 3 DECKS RECOMENDADOS ────────────────────────────────── */

  getTopDeckRecommendations(battles, deckStats, n = 3) {
    if (!deckStats || deckStats.length === 0) return [];

    const recentKeys = new Set(
      battles.slice(0, 15).map(b => this._getDeckKey(b.team?.[0]?.cards || []))
    );

    return deckStats
      .filter(d => d.total >= 2)
      .map(d => ({
        ...d,
        isRecent: recentKeys.has(d.key),
        confidence: this._getConfidenceLabel(d.total),
        weaknesses: this._detectWeaknesses(d, battles),
        suggestion: this._suggestImprovement(d)
      }))
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, n);
  },

  /* ─── CONFIANÇA BASEADA EM AMOSTRA ────────────────────────────── */

  _getConfidenceLabel(total) {
    if (total >= 20) return { label: 'Alta', color: '#3ddc84', stars: 3 };
    if (total >= 8)  return { label: 'Média', color: '#f5c842', stars: 2 };
    return { label: 'Baixa', color: '#ff4e6a', stars: 1 };
  },

  /* ─── DETECTAR FRAQUEZAS DO DECK ──────────────────────────────── */

  _detectWeaknesses(deck, allBattles) {
    // Encontra batalhas com este deck que foram perdidas
    const deckBattles = allBattles.filter(b => {
      const key = this._getDeckKey(b.team?.[0]?.cards || []);
      return key === deck.key && !this._isWin(b);
    });

    if (deckBattles.length < 2) return [];

    // Conta arquétipos adversários nas derrotas
    const oppArch = {};
    deckBattles.forEach(b => {
      const oppCards = b.opponent?.[0]?.cards || [];
      if (oppCards.length === 0) return;
      const arch = this._classifyArchetype(oppCards);
      oppArch[arch] = (oppArch[arch] || 0) + 1;
    });

    return Object.entries(oppArch)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([arch, count]) => `Perde para ${arch} (${count}x)`);
  },

  /* ─── SUGESTÃO DE MELHORIA ────────────────────────────────────── */

  _suggestImprovement(deck) {
    if (!deck.cards || deck.cards.length === 0) return null;
    const avgEl = deck.avgElixir;

    if (avgEl > 4.5) return '💡 Deck pesado — considere substituir uma carta por Ice Spirit ou Skeletons para ciclar mais rápido.';
    if (avgEl < 2.8) return '💡 Deck muito leve — considere adicionar uma carta de pressão como Hog Rider ou Musketeer.';
    if (deck.winRate < 45 && deck.total >= 5) return '💡 Win rate abaixo de 50% — experimente trocar a carta com mais derrotas por uma de controle.';
    if (deck.winRate >= 60) return '✨ Deck sólido! Continue usando e aprimore o nível das cartas.';
    return '💡 Bom deck — foque em subir o nível das cartas principais para maximizar o potencial.';
  },

  /* ─── MELHOR HORÁRIO PARA JOGAR ──────────────────────────────── */

  getBestPlayTime(battles) {
    if (!battles || battles.length === 0) return null;
    const hours = {};
    battles.forEach(b => {
      try {
        const h = new Date(b.battleTime?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2}).*/, '$1-$2-$3T$4:$5:$6Z')).getHours();
        if (!hours[h]) hours[h] = { wins: 0, total: 0 };
        hours[h].total++;
        if (this._isWin(b)) hours[h].wins++;
      } catch {}
    });
    const best = Object.entries(hours)
      .filter(([, v]) => v.total >= 3)
      .map(([h, v]) => ({ hour: parseInt(h), wr: Math.round(v.wins / v.total * 100), total: v.total }))
      .sort((a, b) => b.wr - a.wr)[0];
    return best || null;
  },

  /* ─── CARD USAGE & FREQUÊNCIA ─────────────────────────────────── */

  getCardUsageFrequency(battles) {
    const freq = {};
    battles.forEach(b => {
      (b.team?.[0]?.cards || []).forEach(c => {
        freq[c.name] = (freq[c.name] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  },

  /* ─── DISTRIBUIÇÃO DE HORÁRIOS ────────────────────────────────── */

  getBattleTimeDistribution(battles) {
    const hours = new Array(24).fill(0).map(() => ({ wins: 0, total: 0 }));
    battles.forEach(b => {
      try {
        const hour = new Date(b.battleTime?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2}).*/, '$1-$2-$3T$4:$5:$6Z')).getHours();
        if (hour >= 0 && hour < 24) {
          hours[hour].total++;
          if (this._isWin(b)) hours[hour].wins++;
        }
      } catch {}
    });
    return hours;
  },

  /* ─── INSIGHT DINÂMICO ────────────────────────────────────────── */

  generateInsight(winRate, deckStats, recentBattles) {
    const streak = this.getCurrentStreak(recentBattles);
    const recentWR = this.computeRecentWinRate(recentBattles, 10);
    const bestTime = this.getBestPlayTime(recentBattles);

    if (streak.type === 'loss' && streak.count >= 3) {
      return `🔴 Sequência de ${streak.count} derrotas — hora de trocar o deck ou fazer uma pausa!`;
    }
    if (streak.type === 'win' && streak.count >= 3) {
      return `🟢 ${streak.count} vitórias seguidas! Você está em forma — mantenha o deck!`;
    }
    if (recentWR < winRate.pct - 15) {
      return `📉 Sua forma recente (${recentWR}%) está abaixo da sua média (${winRate.pct}%). Confira os decks recomendados.`;
    }
    if (recentWR > winRate.pct + 10) {
      return `📈 Excelente forma! Últimas batalhas com ${recentWR}% — acima da sua média de ${winRate.pct}%.`;
    }
    if (bestTime) {
      const period = bestTime.hour < 12 ? 'manhã' : bestTime.hour < 18 ? 'tarde' : 'noite';
      return `⏰ Seu melhor horário é ${bestTime.hour}h (${period}) com ${bestTime.wr}% de win rate — jogue mais nesse período!`;
    }
    if (winRate.pct >= 60) return `🏆 ${winRate.pct}% de win rate! Desempenho de elite. Continue assim.`;
    if (winRate.pct < 40) return `💪 ${winRate.pct}% de win rate — confira as recomendações de deck na aba Decks!`;
    return `⚔️ ${winRate.pct}% de win rate — desempenho sólido. Veja os decks recomendados para melhorar.`;
  },

  /* ─── TROPHY TREND ────────────────────────────────────────────── */

  getTrophyTrend(battles, limit = 20) {
    return battles.slice(0, limit).reverse().map((b, i) => ({
      x: i,
      y: b.team?.[0]?.startingTrophies || 0,
      label: `Batalha ${i + 1}`
    }));
  },

  /* ─── ELIXIR MÉDIO ────────────────────────────────────────────── */

  avgElixir(cards) {
    if (!cards || cards.length === 0) return '0.0';
    const total = cards.reduce((sum, c) => sum + getElixirCost(c.name), 0);
    return (total / cards.length).toFixed(1);
  },

  /* ─── COMPATIBILIDADE (manter antigo) ────────────────────────── */

  getBestDeckRecommendation(battles, deckStats) {
    const top = this.getTopDeckRecommendations(battles, deckStats, 1);
    return top[0] || null;
  }
};
