import { PlayerWithAnalysis, FPLElement, FPLTeam } from '../../types/fpl';

export interface SquadHealthReport {
  score: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  injuredCount: number;
  doubtfulCount: number;
  benchStrengthXPts: number;
  clubConcentration: Array<{ teamName: string; count: number }>;
  summaryNotes: string[];
}

export function evaluateSquadHealth(
  squad: PlayerWithAnalysis[],
  bank: number
): SquadHealthReport {
  const injuredCount = squad.filter((p) => p.element.status === 'i' || p.element.status === 'u').length;
  const doubtfulCount = squad.filter(
    (p) => p.element.chance_of_playing_next_round !== null && p.element.chance_of_playing_next_round < 100
  ).length;

  const benchPlayers = squad.filter((p) => !p.isStarter);
  const benchStrengthXPts = Number(
    benchPlayers.reduce((s, p) => s + p.xPts, 0).toFixed(1)
  );

  // Club concentration
  const clubCounts: Record<string, number> = {};
  for (const p of squad) {
    clubCounts[p.team.short_name || p.team.name] = (clubCounts[p.team.short_name || p.team.name] || 0) + 1;
  }

  const clubConcentration = Object.entries(clubCounts)
    .map(([teamName, count]) => ({ teamName, count }))
    .sort((a, b) => b.count - a.count);

  const notes: string[] = [];

  let baseScore = 80;

  // Starters performance contribution
  const starters = squad.filter((p) => p.isStarter);
  const startersXPts = starters.reduce((s, p) => s + p.xPts, 0);

  if (startersXPts >= 55) {
    baseScore += 12;
    notes.push(`High expected points output across starting XI (${startersXPts.toFixed(1)} xPts).`);
  } else if (startersXPts < 40) {
    baseScore -= 10;
    notes.push(`Below average expected points projection (${startersXPts.toFixed(1)} xPts).`);
  }

  // Deductions for injuries and flags
  if (injuredCount > 0) {
    baseScore -= injuredCount * 8;
    notes.push(`${injuredCount} player${injuredCount > 1 ? 's' : ''} ruled out with injuries or suspensions.`);
  }
  if (doubtfulCount > 0) {
    baseScore -= doubtfulCount * 4;
    notes.push(`${doubtfulCount} player${doubtfulCount > 1 ? 's' : ''} carrying fitness doubts.`);
  }

  // Bench check
  if (benchStrengthXPts >= 10) {
    baseScore += 6;
    notes.push(`Strong bench security (${benchStrengthXPts} xPts) able to cover unexpected absences.`);
  } else if (benchStrengthXPts < 4) {
    baseScore -= 5;
    notes.push(`Weak bench: Limited backup if starters are rested or benched.`);
  }

  // Stacking check
  const tripleStacked = clubConcentration.filter((c) => c.count >= 3);
  if (tripleStacked.length > 0) {
    notes.push(
      `Max club limit reached for ${tripleStacked.map((c) => c.teamName).join(', ')} (3 players).`
    );
  }

  const score = Math.max(10, Math.min(99, Math.round(baseScore)));

  let grade: SquadHealthReport['grade'] = 'B';
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else grade = 'D';

  return {
    score,
    grade,
    injuredCount,
    doubtfulCount,
    benchStrengthXPts,
    clubConcentration,
    summaryNotes: notes,
  };
}

export interface MarketMover {
  element: FPLElement;
  team: FPLTeam;
  netTransfers: number;
  direction: 'rising' | 'falling';
  priceStr: string;
  trendReason: string;
}

export function getMarketMovers(
  elements: FPLElement[],
  teams: FPLTeam[]
): {
  likelyRisings: MarketMover[];
  likelyFallings: MarketMover[];
} {
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const scored = elements.map((el) => {
    const net = (el.transfers_in_event || 0) - (el.transfers_out_event || 0);
    const team = teamMap.get(el.team)!;
    return {
      element: el,
      team,
      netTransfers: net,
      priceStr: `£${(el.now_cost / 10).toFixed(1)}m`,
      trendReason: `${net > 0 ? '+' : ''}${net.toLocaleString()} net transfers this GW`,
    };
  });

  const likelyRisings: MarketMover[] = scored
    .filter((p) => p.netTransfers > 15000)
    .sort((a, b) => b.netTransfers - a.netTransfers)
    .slice(0, 8)
    .map((p) => ({ ...p, direction: 'rising' }));

  const likelyFallings: MarketMover[] = scored
    .filter((p) => p.netTransfers < -15000)
    .sort((a, b) => a.netTransfers - b.netTransfers)
    .slice(0, 8)
    .map((p) => ({ ...p, direction: 'falling' }));

  return { likelyRisings, likelyFallings };
}
