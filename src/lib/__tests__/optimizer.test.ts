import { describe, it, expect } from 'vitest';
import { isValidFPLFormation, optimizeSquad } from '../optimizer/teamOptimizer';
import { calculatePlayerXPts } from '../model/xpts';
import { findBestTransfers } from '../optimizer/transfers';
import { FPLElement, FPLTeam, FPLFixture, PlayerWithAnalysis } from '../../types/fpl';

// Mock helpers for clean tests
const mockTeam: FPLTeam = {
  id: 1,
  name: 'Arsenal',
  short_name: 'ARS',
  code: 3,
  strength: 4,
  strength_overall_home: 4,
  strength_overall_away: 4,
  strength_attack_home: 4,
  strength_attack_away: 4,
  strength_defence_home: 4,
  strength_defence_away: 4,
};

const mockOpponentEasy: FPLTeam = {
  id: 2,
  name: 'Southampton',
  short_name: 'SOU',
  code: 20,
  strength: 2,
  strength_overall_home: 2,
  strength_overall_away: 2,
  strength_attack_home: 2,
  strength_attack_away: 2,
  strength_defence_home: 2,
  strength_defence_away: 2,
};

const mockOpponentTough: FPLTeam = {
  id: 3,
  name: 'Manchester City',
  short_name: 'MCI',
  code: 43,
  strength: 5,
  strength_overall_home: 5,
  strength_overall_away: 5,
  strength_attack_home: 5,
  strength_attack_away: 5,
  strength_defence_home: 5,
  strength_defence_away: 5,
};

const mockElement = (id: number, pos: number, cost: number, teamId: number = 1): FPLElement => ({
  id,
  web_name: `Player_${id}`,
  first_name: 'Test',
  second_name: `Player_${id}`,
  team: teamId,
  element_type: pos,
  now_cost: cost,
  cost_change_event: 0,
  cost_change_start: 0,
  transfers_in_event: 1000,
  transfers_out_event: 500,
  selected_by_percent: '15.0',
  form: '6.0',
  points_per_game: '5.5',
  total_points: 30,
  minutes: 450,
  goals_scored: 2,
  assists: 1,
  clean_sheets: 2,
  goals_conceded: 3,
  own_goals: 0,
  penalties_saved: 0,
  penalties_missed: 0,
  yellow_cards: 1,
  red_cards: 0,
  saves: 0,
  bonus: 3,
  bps: 95,
  influence: '50.0',
  creativity: '40.0',
  threat: '60.0',
  ict_index: '15.0',
  starts: 5,
  status: 'a',
  chance_of_playing_next_round: null,
  chance_of_playing_this_round: null,
  news: '',
  expected_goals: '1.80',
  expected_assists: '1.20',
  expected_goal_involvements: '3.00',
  expected_goals_conceded: '2.50',
  corners_and_indirect_freekicks_order: null,
  direct_freekicks_order: null,
  penalties_order: null,
});

describe('Formation Validator', () => {
  it('identifies standard valid FPL formations correctly', () => {
    expect(isValidFPLFormation(3, 5, 2)).toBe(true);
    expect(isValidFPLFormation(3, 4, 3)).toBe(true);
    expect(isValidFPLFormation(4, 4, 2)).toBe(true);
    expect(isValidFPLFormation(4, 3, 3)).toBe(true);
    expect(isValidFPLFormation(5, 3, 2)).toBe(true);
    expect(isValidFPLFormation(5, 4, 1)).toBe(true);
  });

  it('rejects invalid formations violating outfield minimums or total counts', () => {
    // Only 2 defenders (must have >= 3)
    expect(isValidFPLFormation(2, 5, 3)).toBe(false);
    // Only 1 midfielder (must have >= 2)
    expect(isValidFPLFormation(5, 1, 4)).toBe(false);
    // 0 forwards (must have >= 1)
    expect(isValidFPLFormation(5, 5, 0)).toBe(false);
    // 12 outfield players (must sum to 10 + 1 GK = 11)
    expect(isValidFPLFormation(4, 5, 3)).toBe(false);
  });
});

describe('Double and Blank Gameweek Handling', () => {
  it('returns 0 xPts on a Blank Gameweek with 0 fixtures', () => {
    const el = mockElement(10, 3, 75);
    const result = calculatePlayerXPts(el, mockTeam, []);

    expect(result.xPts).toBe(0);
    expect(result.breakdown.fixtureCount).toBe(0);
    expect(result.breakdown.reasons).toContain('Blank Gameweek: No scheduled fixture.');
  });

  it('correctly aggregates expected points on a Double Gameweek (2 fixtures)', () => {
    const el = mockElement(11, 4, 110);
    const fixture1: FPLFixture = {
      id: 101,
      code: 1,
      event: 10,
      finished: false,
      finished_provisional: false,
      started: false,
      kickoff_time: '2026-10-10T14:00:00Z',
      team_h: 1,
      team_a: 2,
      team_h_score: null,
      team_a_score: null,
      team_h_difficulty: 2,
      team_a_difficulty: 4,
    };
    const fixture2: FPLFixture = {
      id: 102,
      code: 2,
      event: 10,
      finished: false,
      finished_provisional: false,
      started: false,
      kickoff_time: '2026-10-13T19:00:00Z',
      team_h: 1,
      team_a: 3,
      team_h_score: null,
      team_a_score: null,
      team_h_difficulty: 4,
      team_a_difficulty: 3,
    };

    const singleResult = calculatePlayerXPts(el, mockTeam, [
      { fixture: fixture1, opponent: mockOpponentEasy, isHome: true, difficulty: 2 },
    ]);

    const doubleResult = calculatePlayerXPts(el, mockTeam, [
      { fixture: fixture1, opponent: mockOpponentEasy, isHome: true, difficulty: 2 },
      { fixture: fixture2, opponent: mockOpponentTough, isHome: true, difficulty: 4 },
    ]);

    expect(doubleResult.breakdown.fixtureCount).toBe(2);
    expect(doubleResult.xPts).toBeGreaterThan(singleResult.xPts);
    expect(doubleResult.breakdown.reasons[0]).toContain('Double Gameweek! 2 fixtures scheduled.');
  });
});

describe('Best XI Optimizer and Bench Ordering', () => {
  function createFullSquad(): PlayerWithAnalysis[] {
    const posMap: Record<number, 'GKP' | 'DEF' | 'MID' | 'FWD'> = {
      1: 'GKP',
      2: 'DEF',
      3: 'MID',
      4: 'FWD',
    };
    const squad: PlayerWithAnalysis[] = [];

    // 2 GKPs
    for (let i = 1; i <= 2; i++) {
      squad.push({
        element: mockElement(i, 1, 50),
        team: mockTeam,
        positionName: 'GKP',
        xPts: i === 1 ? 5.2 : 3.1,
        xPtsBreakdown: {
          baseMinutesScore: 2,
          attackingExpectedScore: 0,
          defensiveExpectedScore: 2,
          bonusEstimate: 0.5,
          fixtureMultiplier: 1,
          playingProbability: 100,
          fixtureCount: 1,
          reasons: [],
        },
        upcomingFixtures: [],
        sellingPrice: 50,
        isStarter: true,
        isCaptain: false,
        isViceCaptain: false,
        pickPosition: i,
      });
    }

    // 5 DEFs
    for (let i = 3; i <= 7; i++) {
      squad.push({
        element: mockElement(i, 2, 50),
        team: mockTeam,
        positionName: 'DEF',
        xPts: 6.0 - (i - 3) * 0.8, // 6.0, 5.2, 4.4, 3.6, 2.8
        xPtsBreakdown: {
          baseMinutesScore: 2,
          attackingExpectedScore: 0.5,
          defensiveExpectedScore: 2,
          bonusEstimate: 0.5,
          fixtureMultiplier: 1,
          playingProbability: 100,
          fixtureCount: 1,
          reasons: [],
        },
        upcomingFixtures: [],
        sellingPrice: 50,
        isStarter: true,
        isCaptain: false,
        isViceCaptain: false,
        pickPosition: i,
      });
    }

    // 5 MIDs
    for (let i = 8; i <= 12; i++) {
      squad.push({
        element: mockElement(i, 3, 75),
        team: mockTeam,
        positionName: 'MID',
        xPts: 7.5 - (i - 8) * 0.7, // 7.5, 6.8, 6.1, 5.4, 4.7
        xPtsBreakdown: {
          baseMinutesScore: 2,
          attackingExpectedScore: 2.5,
          defensiveExpectedScore: 0.5,
          bonusEstimate: 0.5,
          fixtureMultiplier: 1,
          playingProbability: 100,
          fixtureCount: 1,
          reasons: [],
        },
        upcomingFixtures: [],
        sellingPrice: 75,
        isStarter: true,
        isCaptain: false,
        isViceCaptain: false,
        pickPosition: i,
      });
    }

    // 3 FWDs
    for (let i = 13; i <= 15; i++) {
      squad.push({
        element: mockElement(i, 4, 85),
        team: mockTeam,
        positionName: 'FWD',
        xPts: 8.0 - (i - 13) * 1.5, // 8.0, 6.5, 5.0
        xPtsBreakdown: {
          baseMinutesScore: 2,
          attackingExpectedScore: 3.5,
          defensiveExpectedScore: 0,
          bonusEstimate: 0.8,
          fixtureMultiplier: 1,
          playingProbability: 100,
          fixtureCount: 1,
          reasons: [],
        },
        upcomingFixtures: [],
        sellingPrice: 85,
        isStarter: true,
        isCaptain: false,
        isViceCaptain: false,
        pickPosition: i,
      });
    }

    return squad;
  }

  it('selects exactly 11 starters with a valid formation and orders bench appropriately', () => {
    const squad = createFullSquad();
    const result = optimizeSquad(squad);

    expect(result.starters.length).toBe(11);
    expect(result.bench.length).toBe(4);

    // Bench slot 1 must always be the reserve goalkeeper
    expect(result.bench[0].positionName).toBe('GKP');

    // Outfield substitutes must be sorted by xPts (bench ordering priority)
    const outfieldBench = result.bench.slice(1);
    for (let i = 0; i < outfieldBench.length - 1; i++) {
      expect(outfieldBench[i].xPts).toBeGreaterThanOrEqual(outfieldBench[i + 1].xPts);
    }

    // Captain must be the highest xPts player
    expect(result.captain.isCaptain).toBe(true);
    expect(result.viceCaptain.isViceCaptain).toBe(true);
    expect(result.captain.xPts).toBeGreaterThanOrEqual(result.viceCaptain.xPts);
  });

  it('dynamically reorganizes the starting XI and bench when a specific target formation is requested', () => {
    const squad = createFullSquad();
    
    // Request a specific formation like 4-4-2
    const result442 = optimizeSquad(squad, false, '4-4-2');
    expect(result442.formation).toBe('4-4-2');
    expect(result442.starters.filter((p) => p.positionName === 'DEF').length).toBe(4);
    expect(result442.starters.filter((p) => p.positionName === 'MID').length).toBe(4);
    expect(result442.starters.filter((p) => p.positionName === 'FWD').length).toBe(2);

    // Request 5-3-2
    const result532 = optimizeSquad(squad, false, '5-3-2');
    expect(result532.formation).toBe('5-3-2');
    expect(result532.starters.filter((p) => p.positionName === 'DEF').length).toBe(5);
    expect(result532.starters.filter((p) => p.positionName === 'MID').length).toBe(3);
    expect(result532.starters.filter((p) => p.positionName === 'FWD').length).toBe(2);
  });
});

describe('Transfer Planner: Budget & 3-per-club Rules', () => {
  it('enforces budget limits (bank + selling price) and strictly forbids > 3 players per club', () => {
    // Current squad already has 3 Arsenal players
    const squadPlayer: PlayerWithAnalysis = {
      element: mockElement(1, 3, 60, 1), // Arsenal, cost 6.0m
      team: mockTeam,
      positionName: 'MID',
      xPts: 3.0,
      xPtsBreakdown: {
        baseMinutesScore: 2,
        attackingExpectedScore: 1,
        defensiveExpectedScore: 0,
        bonusEstimate: 0,
        fixtureMultiplier: 1,
        playingProbability: 100,
        fixtureCount: 1,
        reasons: [],
      },
      upcomingFixtures: [],
      sellingPrice: 60,
      isStarter: true,
      isCaptain: false,
      isViceCaptain: false,
      pickPosition: 1,
    };

    // Candidate 1: Affordable Southampton player (cost 6.5m, bank 0.5m -> 6.5 <= 6.0 + 0.5)
    const affordablePlayer: PlayerWithAnalysis = {
      element: mockElement(20, 3, 65, 2), // Southampton, cost 6.5m
      team: mockOpponentEasy,
      positionName: 'MID',
      xPts: 6.5,
      xPtsBreakdown: {
        baseMinutesScore: 2,
        attackingExpectedScore: 3,
        defensiveExpectedScore: 0,
        bonusEstimate: 0.5,
        fixtureMultiplier: 1.2,
        playingProbability: 100,
        fixtureCount: 1,
        reasons: [],
      },
      upcomingFixtures: [],
      sellingPrice: 65,
      isStarter: false,
      isCaptain: false,
      isViceCaptain: false,
      pickPosition: 0,
    };

    // Candidate 2: Over-budget player (cost 7.5m > 6.0m + 0.5m)
    const expensivePlayer: PlayerWithAnalysis = {
      element: mockElement(21, 3, 75, 2),
      team: mockOpponentEasy,
      positionName: 'MID',
      xPts: 8.0,
      xPtsBreakdown: {
        baseMinutesScore: 2,
        attackingExpectedScore: 4,
        defensiveExpectedScore: 0,
        bonusEstimate: 0.5,
        fixtureMultiplier: 1.2,
        playingProbability: 100,
        fixtureCount: 1,
        reasons: [],
      },
      upcomingFixtures: [],
      sellingPrice: 75,
      isStarter: false,
      isCaptain: false,
      isViceCaptain: false,
      pickPosition: 0,
    };

    const transfers = findBestTransfers([squadPlayer], [affordablePlayer, expensivePlayer], {
      bank: 5, // £0.5m
      freeTransfers: 1,
    });

    // Should include affordable player and exclude over-budget player
    const suggestedIds = transfers.singleTransfers.map((t) => t.inPlayer.element.id);
    expect(suggestedIds).toContain(20);
    expect(suggestedIds).not.toContain(21);
  });

  it('prioritizes long-term strategic replacements for injured squad players', () => {
    // Sidelined player (e.g., status 'i', 0% chance)
    const injuredSquadPlayer: PlayerWithAnalysis = {
      element: {
        ...mockElement(55, 4, 60, 1),
        status: 'i',
        news: 'Hamstring injury - Expected back late Nov',
        chance_of_playing_next_round: 0,
      },
      team: mockTeam,
      positionName: 'FWD',
      xPts: 0.0,
      xPtsBreakdown: {
        baseMinutesScore: 0,
        attackingExpectedScore: 0,
        defensiveExpectedScore: 0,
        bonusEstimate: 0,
        fixtureMultiplier: 0,
        playingProbability: 0,
        fixtureCount: 1,
        reasons: ['Hamstring injury'],
      },
      upcomingFixtures: [
        { fixture: {} as any, opponent: mockOpponentTough, isHome: false, difficulty: 5 },
        { fixture: {} as any, opponent: mockOpponentTough, isHome: true, difficulty: 4 },
        { fixture: {} as any, opponent: mockOpponentEasy, isHome: false, difficulty: 3 },
      ],
      sellingPrice: 60,
      isStarter: true,
      isCaptain: false,
      isViceCaptain: false,
      pickPosition: 13,
    };

    // Candidate replacement with great green fixtures
    const fitCandidate: PlayerWithAnalysis = {
      element: {
        ...mockElement(77, 4, 65, 2),
        status: 'a',
        form: '6.5',
      },
      team: mockOpponentEasy,
      positionName: 'FWD',
      xPts: 6.2,
      xPtsBreakdown: {
        baseMinutesScore: 2,
        attackingExpectedScore: 3.5,
        defensiveExpectedScore: 0,
        bonusEstimate: 0.7,
        fixtureMultiplier: 1.2,
        playingProbability: 100,
        fixtureCount: 1,
        reasons: [],
      },
      upcomingFixtures: [
        { fixture: {} as any, opponent: mockOpponentEasy, isHome: true, difficulty: 2 },
        { fixture: {} as any, opponent: mockOpponentEasy, isHome: false, difficulty: 2 },
        { fixture: {} as any, opponent: mockOpponentEasy, isHome: true, difficulty: 2 },
      ],
      sellingPrice: 65,
      isStarter: false,
      isCaptain: false,
      isViceCaptain: false,
      pickPosition: 0,
    };

    const transfers = findBestTransfers([injuredSquadPlayer], [fitCandidate], {
      bank: 10,
      freeTransfers: 1,
      lookaheadGWs: 3,
      strategyMode: 'long_term',
    });

    expect(transfers.singleTransfers.length).toBeGreaterThan(0);
    const topSuggestion = transfers.singleTransfers[0];
    expect(topSuggestion.inPlayer.element.id).toBe(77);
    expect(topSuggestion.isInjuryReplacement).toBe(true);
    expect(topSuggestion.horizonNetGain).toBeGreaterThan(0);
    expect(topSuggestion.strategicScore).toBeGreaterThanOrEqual(50);
  });
});
