import {
  FPLElement,
  FPLTeam,
  FPLFixture,
  XPtsBreakdown,
  ModelWeights,
} from '../../types/fpl';

export const DEFAULT_MODEL_WEIGHTS: ModelWeights = {
  formWeight: 0.35,
  underlyingStatsWeight: 0.45,
  fixtureWeight: 0.20,
  homeAdvantageFactor: 1.12,
  minutesThreshold: 60,
};

export interface FixtureContext {
  fixture: FPLFixture;
  opponent: FPLTeam;
  isHome: boolean;
  difficulty: number; // 1 to 5
}

/**
 * Calculates expected points (xPts) for an FPL player in an upcoming gameweek.
 * Transparent, explainable, and handles Blank / Double Gameweeks cleanly.
 */
export function calculatePlayerXPts(
  player: FPLElement,
  team: FPLTeam,
  fixtures: FixtureContext[],
  weights: ModelWeights = DEFAULT_MODEL_WEIGHTS
): { xPts: number; breakdown: XPtsBreakdown } {
  const reasons: string[] = [];

  // 1. Check Blank Gameweek (0 fixtures)
  if (!fixtures || fixtures.length === 0) {
    return {
      xPts: 0,
      breakdown: {
        baseMinutesScore: 0,
        attackingExpectedScore: 0,
        defensiveExpectedScore: 0,
        bonusEstimate: 0,
        fixtureMultiplier: 0,
        playingProbability: 0,
        fixtureCount: 0,
        reasons: ['Blank Gameweek: No scheduled fixture.'],
      },
    };
  }

  // 2. Playing Probability & Availability
  let playingProbability = 1.0;
  if (player.status === 'i' || player.status === 'u') {
    playingProbability = 0.0;
    reasons.push(player.news ? `Ruled out: ${player.news}` : 'Injured / Suspended');
  } else if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined) {
    playingProbability = player.chance_of_playing_next_round / 100;
    if (playingProbability < 1.0) {
      reasons.push(`Fitness doubt: ${player.chance_of_playing_next_round}% chance (${player.news || 'Flagged'})`);
    }
  } else if (player.status === 'd') {
    playingProbability = 0.5;
    reasons.push(`Doubtful status: ${player.news || 'Flagged by club'}`);
  }

  // Rotation penalty for fringe players with low minutes
  const totalMinutes = player.minutes || 0;
  const starts = player.starts || 0;
  let rotationFactor = 1.0;
  if (totalMinutes > 0 && starts === 0) {
    rotationFactor = 0.35;
    reasons.push('Bench impact role (no starts this season)');
  } else if (totalMinutes < 150 && starts <= 1) {
    rotationFactor = 0.6;
    reasons.push('Rotation risk: Limited starting minutes');
  }

  const effectiveAvailability = playingProbability * rotationFactor;

  // 3. Baseline Expected Performance (Form + Underlying Stats + Historic PPG)
  const form = parseFloat(player.form) || 0;
  const ppg = parseFloat(player.points_per_game) || 0;
  const xG = parseFloat(player.expected_goals) || 0;
  const xA = parseFloat(player.expected_assists) || 0;
  const xGC = parseFloat(player.expected_goals_conceded) || 0;

  // Underlying attacking score per match:
  // FWD: 4 pts per goal, 3 pts per assist
  // MID: 5 pts per goal, 3 pts per assist
  // DEF: 6 pts per goal, 3 pts per assist
  // GKP: 6 pts per goal, 3 pts per assist
  const matchesSampled = Math.max(1, Math.round(totalMinutes / 90) || starts || 4);
  const xGPerMatch = xG / matchesSampled;
  const xAPerMatch = xA / matchesSampled;

  let goalPoints = 4;
  let cleanSheetPoints = 0;
  if (player.element_type === 1) {
    // GKP
    goalPoints = 6;
    cleanSheetPoints = 4;
  } else if (player.element_type === 2) {
    // DEF
    goalPoints = 6;
    cleanSheetPoints = 4;
  } else if (player.element_type === 3) {
    // MID
    goalPoints = 5;
    cleanSheetPoints = 1;
  } else {
    // FWD
    goalPoints = 4;
    cleanSheetPoints = 0;
  }

  const baseAttacking = (xGPerMatch * goalPoints + xAPerMatch * 3);

  // Set-piece responsibilities bonus
  let setPieceBonus = 0;
  if (player.penalties_order === 1) {
    setPieceBonus += 0.45;
    reasons.push('First-choice penalty taker');
  } else if (player.penalties_order === 2) {
    setPieceBonus += 0.15;
  }
  if (player.direct_freekicks_order === 1 || player.corners_and_indirect_freekicks_order === 1) {
    setPieceBonus += 0.25;
    reasons.push('Primary corner & set-piece taker');
  }

  // Base defensive score per match
  // Clean sheet base probability estimated from team defence and player position
  const teamDefStrength = team.strength_defence_home || team.strength || 3;
  let baseCleanSheetProb = 0.28; // Premier League avg ~28-30%
  if (teamDefStrength >= 4) baseCleanSheetProb = 0.40;
  if (teamDefStrength <= 2) baseCleanSheetProb = 0.18;

  // Penalty for conceded goals (DEF & GKP lose 1 pt per 2 goals conceded)
  const concededDeduction = (player.element_type === 1 || player.element_type === 2)
    ? Math.max(0, (xGC / matchesSampled) * 0.5)
    : 0;

  const baseDefensive = (baseCleanSheetProb * cleanSheetPoints) - concededDeduction;

  // Expected appearance points (60+ mins yields 2 pts)
  const baseAppearance = (starts > 0 || totalMinutes >= 200) ? 2.0 : 1.2;

  // Bonus points system baseline estimate based on ICT & past bonus
  const pastBonus = player.bonus || 0;
  const baseBonus = Math.min(1.2, (pastBonus / matchesSampled) * 0.7);

  // Form signal
  const formComponent = form > 0 ? form : ppg > 0 ? ppg : 2.5;

  // Combine baseline single-match expected points before fixture adjustments
  // We balance: form (35%), underlying stats (45%), base appearance + bonus (20%)
  const underlyingPoints = baseAppearance + baseAttacking + setPieceBonus + baseDefensive + baseBonus;
  const baselineSingleMatch =
    weights.formWeight * formComponent +
    weights.underlyingStatsWeight * underlyingPoints +
    (1 - weights.formWeight - weights.underlyingStatsWeight) * (ppg || 3.0);

  // 4. Calculate for Each Fixture in the Gameweek (Summed for Double Gameweeks)
  let totalXPts = 0;
  let aggBaseMinutes = 0;
  let aggAttacking = 0;
  let aggDefensive = 0;
  let aggBonus = 0;
  let avgFixtureMult = 0;

  for (const f of fixtures) {
    const isHome = f.isHome;
    const diff = f.difficulty || 3;
    const opp = f.opponent;

    // Difficulty multiplier based on official FDR (1-5) and opponent strength
    // 1 (easiest) -> 1.28x
    // 2 -> 1.15x
    // 3 -> 1.00x
    // 4 -> 0.84x
    // 5 (toughest) -> 0.68x
    let diffMult = 1.0;
    if (diff === 1) diffMult = 1.28;
    else if (diff === 2) diffMult = 1.15;
    else if (diff === 3) diffMult = 1.00;
    else if (diff === 4) diffMult = 0.84;
    else if (diff === 5) diffMult = 0.68;

    // Home / Away factor
    const venueFactor = isHome ? weights.homeAdvantageFactor : 1 / weights.homeAdvantageFactor;

    // Attack vs Defence opponent rating fine-tuning
    const oppDefStrength = isHome ? (opp.strength_defence_away || 3) : (opp.strength_defence_home || 3);
    const oppAttStrength = isHome ? (opp.strength_attack_away || 3) : (opp.strength_attack_home || 3);

    const attackMultiplier = Math.max(0.65, Math.min(1.35, (4.5 - oppDefStrength) / 2.5));
    const cleanSheetMultiplier = Math.max(0.5, Math.min(1.4, (4.5 - oppAttStrength) / 2.5));

    const singleFixtureMult = diffMult * venueFactor;
    avgFixtureMult += singleFixtureMult;

    // Attacking & defensive split for this fixture
    const fixtureAttacking = (baseAttacking + setPieceBonus) * attackMultiplier * singleFixtureMult;
    const fixtureDefensive = Math.max(0, (baseCleanSheetProb * cleanSheetMultiplier * cleanSheetPoints - concededDeduction));
    const fixtureAppearance = baseAppearance * (isHome ? 1.05 : 0.95);
    const fixtureBonus = baseBonus * singleFixtureMult;

    // Fixture single match xPts
    const fixtureXPts = (fixtureAppearance + fixtureAttacking + fixtureDefensive + fixtureBonus) * (diffMult * 0.4 + 0.6);

    aggBaseMinutes += fixtureAppearance;
    aggAttacking += fixtureAttacking;
    aggDefensive += fixtureDefensive;
    aggBonus += fixtureBonus;
    totalXPts += fixtureXPts;

    // Add concise reasoning text
    const venueText = isHome ? 'vs' : '@';
    const fixtureLabel = `${venueText} ${opp.short_name || opp.name} (FDR ${diff})`;
    if (diff <= 2) {
      reasons.push(`Favorable fixture: ${fixtureLabel}`);
    } else if (diff >= 4) {
      reasons.push(`Tough fixture: ${fixtureLabel}`);
    }
  }

  avgFixtureMult = fixtures.length > 0 ? avgFixtureMult / fixtures.length : 1.0;

  // Double Gameweek celebration in reason
  if (fixtures.length >= 2) {
    reasons.unshift(`Double Gameweek! 2 fixtures scheduled.`);
  }

  // Apply effective availability
  const finalXPts = Math.max(0, totalXPts * effectiveAvailability);

  // Form reason
  if (form >= 6.5) {
    reasons.push(`Hot form: ${form} pts/game over recent fixtures`);
  } else if (form > 0 && form < 2.5 && totalMinutes > 200) {
    reasons.push(`Cold form: ${form} pts/game`);
  }

  return {
    xPts: Number(finalXPts.toFixed(2)),
    breakdown: {
      baseMinutesScore: Number((aggBaseMinutes * effectiveAvailability).toFixed(2)),
      attackingExpectedScore: Number((aggAttacking * effectiveAvailability).toFixed(2)),
      defensiveExpectedScore: Number((aggDefensive * effectiveAvailability).toFixed(2)),
      bonusEstimate: Number((aggBonus * effectiveAvailability).toFixed(2)),
      fixtureMultiplier: Number(avgFixtureMult.toFixed(2)),
      playingProbability: Number((effectiveAvailability * 100).toFixed(0)),
      fixtureCount: fixtures.length,
      reasons: reasons.slice(0, 5), // top 5 key bullet reasons
    },
  };
}
