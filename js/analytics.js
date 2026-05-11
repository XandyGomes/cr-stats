/**
 * analytics.js — Battle analysis & deck intelligence
 * Pure JS stat engine — no external libs needed.
 */

const Analytics = {

  /**
   * Compute win rate stats from battle log
   */
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

  /**
   * Extract deck from battle card array
   */
  _getDeckKey(cards) {
    if (!cards) return 'unknown';
    return cards.map(c => c.name).sort().join('|');
  },

  /**
   * Group battles by deck and calculate per-deck win rates
   */
  analyzeDeckPerformance(battles) {
    const deckMap = {};
    battles.forEach(battle => {
      try {
        const cards = battle.team?.[0]?.cards;
        if (!cards || cards.length === 0) return;
        const key = this._getDeckKey(cards);
        if (!deckMap[key]) {
          deckMap[key] = { cards, wins: 0, losses: 0, key };
        }
        if (this._isWin(battle)) deckMap[key].wins++;
        else deckMap[key].losses++;
      } catch {}
    });

    return Object.values(deckMap)
      .map(d => ({
        ...d,
        total: d.wins + d.losses,
        winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  },

  /**
   * Find best deck recommendation based on:
   * 1. Win rate (primary)
   * 2. Sample size (at least 3 battles)
   * 3. Recency bonus (used in last 10 battles)
   */
  getBestDeckRecommendation(battles, deckStats) {
    if (!deckStats || deckStats.length === 0) return null;

    // Get last 10 battle deck keys for recency bonus
    const recentKeys = new Set(
      battles.slice(0, 10).map(b => this._getDeckKey(b.team?.[0]?.cards || []))
    );

    const scored = deckStats
      .filter(d => d.total >= 2)
      .map(d => ({
        ...d,
        score: d.winRate + (d.total >= 5 ? 5 : 0) + (recentKeys.has(d.key) ? 8 : 0)
      }))
      .sort((a, b) => b.score - a.score);

    return scored[0] || deckStats[0];
  },

  /**
   * Count card usage frequency across all battles
   */
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

  /**
   * Calculate win rate per hour of day (0–23)
   */
  getBattleTimeDistribution(battles) {
    const hours = new Array(24).fill(0).map(() => ({ wins: 0, total: 0 }));
    battles.forEach(b => {
      try {
        const hour = new Date(b.battleTime || b.time).getHours();
        if (hour >= 0 && hour < 24) {
          hours[hour].total++;
          if (this._isWin(b)) hours[hour].wins++;
        }
      } catch {}
    });
    return hours;
  },

  /**
   * Generate AI-style insight text based on stats
   */
  generateInsight(winRate, deckStats, recentBattles) {
    const tips = [];

    if (winRate.pct < 40) {
      tips.push(`Sua win rate está em ${winRate.pct}%. Tente focar em decks com mais sinergias — veja a aba Decks para recomendações personalizadas.`);
    } else if (winRate.pct >= 60) {
      tips.push(`Ótima forma! ${winRate.pct}% de win rate. Continue com os decks que estão funcionando melhor.`);
    } else {
      tips.push(`Win rate de ${winRate.pct}% — progresso sólido. Analise seus decks para identificar onde melhorar.`);
    }

    // Losing streak detection
    const lastFive = recentBattles.slice(0, 5);
    const lostLast = lastFive.filter(b => !this._isWin(b)).length;
    if (lostLast >= 4) {
      tips.push('⚠️ Sequência de derrotas detectada. Tente trocar o deck antes da próxima batalha.');
    }

    // Best deck tip
    if (deckStats && deckStats.length > 0) {
      const best = deckStats.filter(d => d.total >= 3).sort((a,b) => b.winRate - a.winRate)[0];
      if (best && best.winRate > winRate.pct) {
        const top = best.cards.slice(0,3).map(c => c.name).join(', ');
        tips.push(`💡 Seu melhor deck (com ${top}...) tem ${best.winRate}% de win rate — use-o mais!`);
      }
    }

    return tips[Math.floor(Math.random() * tips.length)] || 'Continue batalhando para gerar insights personalizados!';
  },

  /**
   * Trophy trend — extract trophies from last N battles
   */
  getTrophyTrend(battles, limit = 20) {
    return battles.slice(0, limit).reverse().map((b, i) => ({
      x: i,
      y: b.team?.[0]?.startingTrophies || 0,
      label: `Batalha ${i + 1}`
    }));
  },

  /**
   * Average elixir cost of a deck
   */
  avgElixir(cards) {
    if (!cards || cards.length === 0) return 0;
    const total = cards.reduce((sum, c) => sum + getElixirCost(c.name), 0);
    return (total / cards.length).toFixed(1);
  }
};
