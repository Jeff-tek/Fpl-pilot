import { FPLTeam, FPLFixture, FPLEvent } from '../../types/fpl';

export interface ClubFixtureCell {
  eventId: number;
  fixtures: Array<{
    opponent: FPLTeam;
    isHome: boolean;
    difficulty: number;
  }>;
  isBlank: boolean;
  isDouble: boolean;
  avgDifficulty: number;
}

export interface ClubTickerRow {
  team: FPLTeam;
  cells: ClubFixtureCell[];
  averageDifficulty: number;
  attackDifficulty: number;
  defenceDifficulty: number;
}

export function buildFixtureTicker(
  teams: FPLTeam[],
  allFixtures: FPLFixture[],
  events: FPLEvent[],
  currentEventId: number,
  lookaheadCount: number = 6
): ClubTickerRow[] {
  const teamMap = new Map<number, FPLTeam>(teams.map((t) => [t.id, t]));

  // Upcoming gameweeks
  const targetEventIds: number[] = [];
  for (let id = currentEventId; id < currentEventId + lookaheadCount; id++) {
    if (id <= 38) {
      targetEventIds.push(id);
    }
  }

  // Pre-filter fixtures for these events
  const targetEventSet = new Set(targetEventIds);
  const relevantFixtures = allFixtures.filter((f) => f.event && targetEventSet.has(f.event));

  const rows: ClubTickerRow[] = teams.map((team) => {
    let totalFdr = 0;
    let totalMatches = 0;
    let totalAttackDiff = 0;
    let totalDefenceDiff = 0;

    const cells: ClubFixtureCell[] = targetEventIds.map((eventId) => {
      const teamFixtures = relevantFixtures.filter(
        (f) => f.event === eventId && (f.team_h === team.id || f.team_a === team.id)
      );

      if (teamFixtures.length === 0) {
        return {
          eventId,
          fixtures: [],
          isBlank: true,
          isDouble: false,
          avgDifficulty: 5, // Penalize blank in difficulty rating
        };
      }

      const parsed = teamFixtures.map((f) => {
        const isHome = f.team_h === team.id;
        const oppId = isHome ? f.team_a : f.team_h;
        const opponent = teamMap.get(oppId) || {
          id: oppId,
          name: 'Unknown',
          short_name: 'UNK',
          code: 0,
          strength: 3,
          strength_overall_home: 3,
          strength_overall_away: 3,
          strength_attack_home: 3,
          strength_attack_away: 3,
          strength_defence_home: 3,
          strength_defence_away: 3,
        };
        const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;

        // Opponent attack and defence strength for attack/defence difficulty
        const oppDef = isHome ? (opponent.strength_defence_away || 3) : (opponent.strength_defence_home || 3);
        const oppAtt = isHome ? (opponent.strength_attack_away || 3) : (opponent.strength_attack_home || 3);

        totalAttackDiff += oppDef;
        totalDefenceDiff += oppAtt;

        totalFdr += difficulty;
        totalMatches++;

        return {
          opponent,
          isHome,
          difficulty,
        };
      });

      const avgDifficulty = parsed.reduce((sum, p) => sum + p.difficulty, 0) / parsed.length;

      return {
        eventId,
        fixtures: parsed,
        isBlank: false,
        isDouble: parsed.length >= 2,
        avgDifficulty,
      };
    });

    const averageDifficulty = totalMatches > 0 ? Number((totalFdr / totalMatches).toFixed(2)) : 3.0;
    const attackDifficulty = totalMatches > 0 ? Number((totalAttackDiff / totalMatches).toFixed(2)) : 3.0;
    const defenceDifficulty = totalMatches > 0 ? Number((totalDefenceDiff / totalMatches).toFixed(2)) : 3.0;

    return {
      team,
      cells,
      averageDifficulty,
      attackDifficulty,
      defenceDifficulty,
    };
  });

  return rows;
}
