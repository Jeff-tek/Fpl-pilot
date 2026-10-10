import { PlayerWithAnalysis, OptimizedSquad } from '../../types/fpl';

export interface FormationConfig {
  name: string; // e.g. "3-4-3"
  def: number;
  mid: number;
  fwd: number;
}

export const VALID_FORMATIONS: FormationConfig[] = [
  { name: '3-4-3', def: 3, mid: 4, fwd: 3 },
  { name: '3-5-2', def: 3, mid: 5, fwd: 2 },
  { name: '4-4-2', def: 4, mid: 4, fwd: 2 },
  { name: '4-3-3', def: 4, mid: 3, fwd: 3 },
  { name: '4-5-1', def: 4, mid: 5, fwd: 1 },
  { name: '5-3-2', def: 5, mid: 3, fwd: 2 },
  { name: '5-4-1', def: 5, mid: 4, fwd: 1 },
  { name: '5-2-3', def: 5, mid: 2, fwd: 3 },
];

/**
 * Validates whether a candidate formation meets standard FPL criteria:
 * Exactly 1 GKP, between 3 and 5 DEF, between 2 and 5 MID, between 1 and 3 FWD, summing to 11.
 */
export function isValidFPLFormation(def: number, mid: number, fwd: number): boolean {
  if (def < 3 || def > 5) return false;
  if (mid < 2 || mid > 5) return false;
  if (fwd < 1 || fwd > 3) return false;
  return def + mid + fwd === 10;
}

/**
 * Optimizes the Starting XI, Bench Order, and Captains from a 15-player squad.
 * If targetFormation is provided, returns the optimal XI for that specific formation.
 */
export function optimizeSquad(
  squad: PlayerWithAnalysis[],
  preferDifferentialCaptain: boolean = false,
  targetFormation?: string
): OptimizedSquad {
  if (!squad || squad.length < 15) {
    throw new Error('A full 15-player squad is required for optimization.');
  }

  const gkps = squad.filter((p) => p.positionName === 'GKP').sort((a, b) => b.xPts - a.xPts);
  const defs = squad.filter((p) => p.positionName === 'DEF').sort((a, b) => b.xPts - a.xPts);
  const mids = squad.filter((p) => p.positionName === 'MID').sort((a, b) => b.xPts - a.xPts);
  const fwds = squad.filter((p) => p.positionName === 'FWD').sort((a, b) => b.xPts - a.xPts);

  // Fallback check in case squad has unexpected composition
  const bestGkp = gkps[0] || squad[0];
  const benchGkp = gkps[1] || null;

  interface FormationEvaluation {
    formation: FormationConfig;
    starters: PlayerWithAnalysis[];
    bench: PlayerWithAnalysis[];
    totalXPts: number;
  }

  const evaluations: FormationEvaluation[] = [];

  for (const f of VALID_FORMATIONS) {
    if (defs.length < f.def || mids.length < f.mid || fwds.length < f.fwd) {
      continue;
    }

    const startingDefs = defs.slice(0, f.def);
    const startingMids = mids.slice(0, f.mid);
    const startingFwds = fwds.slice(0, f.fwd);

    const startingOutfield = [...startingDefs, ...startingMids, ...startingFwds];
    const starters = [bestGkp, ...startingOutfield];

    const benchOutfield = [
      ...defs.slice(f.def),
      ...mids.slice(f.mid),
      ...fwds.slice(f.fwd),
    ].sort((a, b) => b.xPts - a.xPts); // Priority ordered bench

    const bench = benchGkp ? [benchGkp, ...benchOutfield] : benchOutfield;

    const totalXPts = starters.reduce((sum, p) => sum + p.xPts, 0);

    evaluations.push({
      formation: f,
      starters,
      bench,
      totalXPts: Number(totalXPts.toFixed(2)),
    });
  }

  // Sort formations by total expected points descending
  evaluations.sort((a, b) => b.totalXPts - a.totalXPts);

  // If user selected a specific formation, find it; otherwise take top 1
  const selectedEvaluation = targetFormation
    ? evaluations.find((e) => e.formation.name === targetFormation) || evaluations[0]
    : evaluations[0];

  const best = selectedEvaluation || {
    formation: VALID_FORMATIONS[0],
    starters: squad.slice(0, 11),
    bench: squad.slice(11),
    totalXPts: 0,
  };

  // Determine Captain and Vice Captain for the selected formation
  const sortedStarters = [...best.starters].sort((a, b) => b.xPts - a.xPts);

  let captain = sortedStarters[0];
  let viceCaptain = sortedStarters[1] || sortedStarters[0];

  if (preferDifferentialCaptain) {
    // A differential is a player with < 15% ownership
    const differentialStarters = sortedStarters.filter(
      (p) => parseFloat(p.element.selected_by_percent) < 15.0
    );
    if (differentialStarters.length > 0 && differentialStarters[0].xPts >= sortedStarters[0].xPts * 0.8) {
      captain = differentialStarters[0];
      viceCaptain = sortedStarters.find((p) => p.element.id !== captain.element.id) || sortedStarters[0];
    }
  }

  // Mark captain/vice flags
  const finalStarters = best.starters.map((p) => ({
    ...p,
    isStarter: true,
    isCaptain: p.element.id === captain.element.id,
    isViceCaptain: p.element.id === viceCaptain.element.id,
  }));

  const finalCaptain = finalStarters.find((p) => p.isCaptain) || { ...captain, isCaptain: true };
  const finalViceCaptain = finalStarters.find((p) => p.isViceCaptain) || { ...viceCaptain, isViceCaptain: true };

  const finalBench = best.bench.map((p) => ({
    ...p,
    isStarter: false,
    isCaptain: false,
    isViceCaptain: false,
  }));

  const benchXPts = finalBench.reduce((sum, p) => sum + p.xPts, 0);

  // Formation alternatives for user comparison (all evaluated formations)
  const alternatives = evaluations.map((e) => ({
    formation: e.formation.name,
    totalXPts: e.totalXPts,
    startersCount: { def: e.formation.def, mid: e.formation.mid, fwd: e.formation.fwd },
  }));

  // Identify Risks across the squad
  const risks: OptimizedSquad['risks'] = [];
  for (const p of squad) {
    const el = p.element;
    if (el.status === 'i' || el.status === 'u') {
      risks.push({
        playerId: el.id,
        playerName: el.web_name,
        type: 'injury',
        message: el.news || 'Ruled out with injury / suspended',
      });
    } else if (el.chance_of_playing_next_round !== null && el.chance_of_playing_next_round < 100) {
      risks.push({
        playerId: el.id,
        playerName: el.web_name,
        type: 'doubtful',
        message: `${el.chance_of_playing_next_round}% chance: ${el.news || 'Flagged'}`,
      });
    } else if (p.xPtsBreakdown.fixtureCount === 0) {
      risks.push({
        playerId: el.id,
        playerName: el.web_name,
        type: 'blank',
        message: `Blank Gameweek: No fixture scheduled`,
      });
    } else if (p.upcomingFixtures.length > 0 && p.upcomingFixtures[0].difficulty >= 4) {
      const f = p.upcomingFixtures[0];
      risks.push({
        playerId: el.id,
        playerName: el.web_name,
        type: 'tough_fixture',
        message: `Tough matchup (FDR ${f.difficulty}: ${f.isHome ? 'vs' : '@'} ${f.opponent.short_name}) upcoming`,
      });
    }
  }

  return {
    starters: finalStarters,
    bench: finalBench,
    captain: finalCaptain,
    viceCaptain: finalViceCaptain,
    formation: best.formation.name,
    totalXPts: best.totalXPts,
    benchXPts: Number(benchXPts.toFixed(2)),
    formationAlternatives: alternatives,
    risks,
  };
}
