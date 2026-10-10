import {
  PlayerWithAnalysis,
  TransferSuggestion,
  DoubleTransferSuggestion,
  FPLTeam,
} from '../../types/fpl';

export interface TransferPlannerOptions {
  bank: number; // in tenths of £m (e.g. 15 = £1.5m)
  freeTransfers: number; // e.g. 1
  hitCostPoints?: number; // default 4 pts
  lookaheadGWs?: number; // default 5 (long-term focus)
  strategyMode?: 'long_term' | 'medium_term' | 'immediate';
}

/**
 * Calculates projected expected points across a multi-gameweek horizon (e.g. 3 to 5 fixtures)
 * taking into account fixture difficulty run, venue, and injury return timetables.
 */
export function calculatePlayerHorizonMetrics(
  player: PlayerWithAnalysis,
  horizonCount: number = 5
): { totalHorizonXPts: number; avgFdr: number } {
  const fixtures = player.upcomingFixtures.slice(0, horizonCount);
  if (!fixtures || fixtures.length === 0) {
    return { totalHorizonXPts: 0, avgFdr: 3.0 };
  }

  const el = player.element;
  const isInjured = el.status === 'i' || el.status === 'u';
  const chance = el.chance_of_playing_next_round !== null ? el.chance_of_playing_next_round / 100 : 1.0;

  let totalXPts = 0;
  let totalFdr = 0;

  // Baseline per match return from player's form & stats
  const form = parseFloat(el.form) || 0;
  const ppg = parseFloat(el.points_per_game) || 0;
  const baseRate = Math.max(1.8, form > 0 ? form * 0.6 + ppg * 0.4 : ppg || 2.5);

  fixtures.forEach((f, index) => {
    const diff = f.difficulty || 3;
    totalFdr += diff;

    // Difficulty multiplier
    let diffMult = 1.0;
    if (diff === 1) diffMult = 1.30;
    else if (diff === 2) diffMult = 1.16;
    else if (diff === 3) diffMult = 1.00;
    else if (diff === 4) diffMult = 0.83;
    else if (diff === 5) diffMult = 0.66;

    const venueMult = f.isHome ? 1.12 : 0.89;

    // Availability estimate over future fixtures
    let matchAvail = 1.0;
    if (isInjured) {
      // If injured, likely out for early fixtures of the run
      matchAvail = index === 0 ? 0 : index === 1 ? 0.2 : 0.5;
    } else if (chance < 1.0) {
      matchAvail = index === 0 ? chance : Math.min(1.0, chance + 0.3);
    }

    const matchXPts = baseRate * diffMult * venueMult * matchAvail;
    totalXPts += matchXPts;
  });

  const avgFdr = Number((totalFdr / fixtures.length).toFixed(1));
  const totalHorizonXPts = Number(totalXPts.toFixed(1));

  return { totalHorizonXPts, avgFdr };
}

/**
 * Finds strategic, long-term focused transfers.
 * Strictly respects:
 * - Budget: bank + selling price
 * - Team limit: <= 3 players per club
 * - Exact position matching (GKP for GKP, DEF for DEF, etc.)
 */
export function findBestTransfers(
  squad: PlayerWithAnalysis[],
  allPlayers: PlayerWithAnalysis[],
  options: TransferPlannerOptions
): {
  singleTransfers: TransferSuggestion[];
  doubleTransfers: DoubleTransferSuggestion[];
} {
  const {
    bank,
    freeTransfers,
    hitCostPoints = 4,
    lookaheadGWs = 5,
    strategyMode = 'long_term',
  } = options;

  const currentSquadIds = new Set(squad.map((p) => p.element.id));

  // Count current club occurrences
  const clubCounts: Record<number, number> = {};
  for (const p of squad) {
    clubCounts[p.element.team] = (clubCounts[p.element.team] || 0) + 1;
  }

  // Pre-calculate horizon metrics for squad members
  const squadHorizonMap = new Map<number, { totalHorizonXPts: number; avgFdr: number }>();
  for (const p of squad) {
    squadHorizonMap.set(p.element.id, calculatePlayerHorizonMetrics(p, lookaheadGWs));
  }

  // Pre-calculate horizon metrics for candidate pool (fit players only)
  const candidatePool = allPlayers.filter(
    (p) =>
      !currentSquadIds.has(p.element.id) &&
      p.element.status !== 'i' &&
      p.element.status !== 'u' &&
      (p.element.chance_of_playing_next_round === null || p.element.chance_of_playing_next_round >= 75)
  );

  const candidateHorizonMap = new Map<number, { totalHorizonXPts: number; avgFdr: number }>();
  for (const p of candidatePool) {
    candidateHorizonMap.set(p.element.id, calculatePlayerHorizonMetrics(p, lookaheadGWs));
  }

  // 1. Single Transfer Evaluation
  const singleSuggestions: TransferSuggestion[] = [];

  for (const outP of squad) {
    const availableBudget = bank + outP.sellingPrice;
    const outMetrics = squadHorizonMap.get(outP.element.id) || { totalHorizonXPts: 0, avgFdr: 3.0 };
    const isOutInjuredOrFlagged = outP.element.status !== 'a' || Boolean(outP.element.news);

    const samePositionCandidates = candidatePool.filter(
      (inP) => inP.positionName === outP.positionName && inP.element.now_cost <= availableBudget
    );

    for (const inP of samePositionCandidates) {
      // Check 3 per club rule
      const resultingClubCount =
        (clubCounts[inP.element.team] || 0) + (outP.element.team === inP.element.team ? 0 : 1);
      if (resultingClubCount > 3) continue;

      const inMetrics = candidateHorizonMap.get(inP.element.id) || { totalHorizonXPts: 0, avgFdr: 3.0 };

      const immediateGain = Number((inP.xPts - outP.xPts).toFixed(2));
      const horizonNetGain = Number(
        (inMetrics.totalHorizonXPts - outMetrics.totalHorizonXPts).toFixed(1)
      );

      // We focus on strategic long-term gain!
      if (horizonNetGain <= 1.0 && immediateGain <= 0.2) continue;

      const hitCost = freeTransfers >= 1 ? 0 : hitCostPoints;
      const netBenefit = Number((immediateGain - hitCost).toFixed(2));

      // Strategic Composite Score:
      // Rewards 5-GW point gain, fixture swing improvement, and resolving injuries
      const fixtureSwing = outMetrics.avgFdr - inMetrics.avgFdr;
      const injuryBonus = isOutInjuredOrFlagged ? 15 : 0;
      const fdrSwingBonus = Math.max(0, fixtureSwing * 8);

      const strategicScore = Math.round(
        Math.min(99, Math.max(20, horizonNetGain * 3.5 + immediateGain * 1.5 - hitCost * 2 + injuryBonus + fdrSwingBonus))
      );

      // Plain language strategic reasoning
      let reason = '';
      if (isOutInjuredOrFlagged) {
        reason = `Strategic replacement for sidelined ${outP.element.web_name}. Buys nailed starter with +${horizonNetGain} projected xPts across ${lookaheadGWs} GWs.`;
      } else if (fixtureSwing >= 0.8) {
        reason = `Major fixture swing (+${horizonNetGain} xPts). Trades tough schedule (FDR ${outMetrics.avgFdr}) for prime green fixtures (FDR ${inMetrics.avgFdr}).`;
      } else {
        reason = `Long-term upgrade: +${horizonNetGain} xPts over next ${lookaheadGWs} gameweeks (${inMetrics.totalHorizonXPts} vs ${outMetrics.totalHorizonXPts} pts).`;
      }

      singleSuggestions.push({
        outPlayer: outP,
        inPlayer: inP,
        costDiff: inP.element.now_cost - outP.sellingPrice,
        immediateNetGain: immediateGain,
        horizonNetGain,
        outPlayerHorizonXPts: outMetrics.totalHorizonXPts,
        inPlayerHorizonXPts: inMetrics.totalHorizonXPts,
        horizonAvgFdrOut: outMetrics.avgFdr,
        horizonAvgFdrIn: inMetrics.avgFdr,
        hitCost,
        netPointsBenefit: netBenefit,
        strategicScore,
        isInjuryReplacement: isOutInjuredOrFlagged,
        reason,
      });
    }
  }

  // Sort single transfers based on strategic long-term score
  if (strategyMode === 'long_term') {
    singleSuggestions.sort((a, b) => b.strategicScore - a.strategicScore || b.horizonNetGain - a.horizonNetGain);
  } else if (strategyMode === 'medium_term') {
    singleSuggestions.sort((a, b) => b.horizonNetGain - a.horizonNetGain);
  } else {
    singleSuggestions.sort((a, b) => b.netPointsBenefit - a.netPointsBenefit);
  }

  const topSingles = singleSuggestions.slice(0, 12);

  // 2. Double Transfer Evaluation (focused on long-term pairs)
  const doubleSuggestions: DoubleTransferSuggestion[] = [];

  // Out candidates: prioritize injured players, tough fixtures, and lowest long-term xPts
  const sortedOuts = [...squad].sort((a, b) => {
    const aInjured = a.element.status !== 'a' ? -100 : 0;
    const bInjured = b.element.status !== 'a' ? -100 : 0;
    const aMet = squadHorizonMap.get(a.element.id)?.totalHorizonXPts || 0;
    const bMet = squadHorizonMap.get(b.element.id)?.totalHorizonXPts || 0;
    return (aInjured + aMet) - (bInjured + bMet);
  });

  const outCandidates = sortedOuts.slice(0, 6);

  for (let i = 0; i < outCandidates.length; i++) {
    for (let j = i + 1; j < outCandidates.length; j++) {
      const out1 = outCandidates[i];
      const out2 = outCandidates[j];

      const out1Met = squadHorizonMap.get(out1.element.id) || { totalHorizonXPts: 0, avgFdr: 3.0 };
      const out2Met = squadHorizonMap.get(out2.element.id) || { totalHorizonXPts: 0, avgFdr: 3.0 };
      const combinedOutHorizon = out1Met.totalHorizonXPts + out2Met.totalHorizonXPts;

      const totalAvailable = bank + out1.sellingPrice + out2.sellingPrice;

      // Filter top candidates for both positions by horizon return
      const inCandidates1 = candidatePool
        .filter((p) => p.positionName === out1.positionName)
        .sort((a, b) => (candidateHorizonMap.get(b.element.id)?.totalHorizonXPts || 0) - (candidateHorizonMap.get(a.element.id)?.totalHorizonXPts || 0))
        .slice(0, 7);

      const inCandidates2 = candidatePool
        .filter((p) => p.positionName === out2.positionName)
        .sort((a, b) => (candidateHorizonMap.get(b.element.id)?.totalHorizonXPts || 0) - (candidateHorizonMap.get(a.element.id)?.totalHorizonXPts || 0))
        .slice(0, 7);

      for (const in1 of inCandidates1) {
        for (const in2 of inCandidates2) {
          if (in1.element.id === in2.element.id) continue;
          if (in1.element.now_cost + in2.element.now_cost > totalAvailable) continue;

          // Check 3 per club rule
          const testClubCounts = { ...clubCounts };
          testClubCounts[out1.element.team] = (testClubCounts[out1.element.team] || 1) - 1;
          testClubCounts[out2.element.team] = (testClubCounts[out2.element.team] || 1) - 1;
          testClubCounts[in1.element.team] = (testClubCounts[in1.element.team] || 0) + 1;
          testClubCounts[in2.element.team] = (testClubCounts[in2.element.team] || 0) + 1;

          if (testClubCounts[in1.element.team] > 3 || testClubCounts[in2.element.team] > 3) {
            continue;
          }

          const in1Met = candidateHorizonMap.get(in1.element.id) || { totalHorizonXPts: 0, avgFdr: 3.0 };
          const in2Met = candidateHorizonMap.get(in2.element.id) || { totalHorizonXPts: 0, avgFdr: 3.0 };
          const combinedInHorizon = in1Met.totalHorizonXPts + in2Met.totalHorizonXPts;

          const immediateGain = Number(
            (in1.xPts + in2.xPts - (out1.xPts + out2.xPts)).toFixed(2)
          );
          const horizonNetGain = Number((combinedInHorizon - combinedOutHorizon).toFixed(1));

          if (horizonNetGain <= 2.5 && immediateGain <= 0.8) continue;

          // Hit cost calculation
          const hitCost = Math.max(0, 2 - freeTransfers) * hitCostPoints;
          const netBenefit = Number((immediateGain - hitCost).toFixed(2));

          const strategicScore = Math.round(
            Math.min(99, Math.max(25, horizonNetGain * 3.2 + immediateGain * 1.5 - hitCost * 2))
          );

          doubleSuggestions.push({
            outPlayers: [out1, out2],
            inPlayers: [in1, in2],
            costDiff: in1.element.now_cost + in2.element.now_cost - (out1.sellingPrice + out2.sellingPrice),
            immediateNetGain: immediateGain,
            horizonNetGain,
            outPlayersHorizonXPts: Number(combinedOutHorizon.toFixed(1)),
            inPlayersHorizonXPts: Number(combinedInHorizon.toFixed(1)),
            hitCost,
            netPointsBenefit: netBenefit,
            strategicScore,
            reason: `Double strategic restructure: +${horizonNetGain} xPts across ${lookaheadGWs} GWs. Replaces ${out1.element.web_name} & ${out2.element.web_name} with ${in1.element.web_name} & ${in2.element.web_name}.`,
          });
        }
      }
    }
  }

  doubleSuggestions.sort((a, b) => b.strategicScore - a.strategicScore || b.horizonNetGain - a.horizonNetGain);
  const topDoubles = doubleSuggestions.slice(0, 6);

  return {
    singleTransfers: topSingles,
    doubleTransfers: topDoubles,
  };
}
