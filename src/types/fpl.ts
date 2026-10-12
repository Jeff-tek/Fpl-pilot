// TypeScript definitions accurately mapped to the live Fantasy Premier League API

export interface FPLEvent {
  id: number;
  name: string;
  deadline_time: string;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
  data_checked: boolean;
  average_entry_score?: number;
  highest_score?: number;
  chip_plays?: Array<{ chip_name: string; num_played: number }>;
}

export interface FPLTeam {
  id: number;
  name: string;
  short_name: string;
  code: number;
  strength?: number | null;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface FPLElementType {
  id: number; // 1 = GKP, 2 = DEF, 3 = MID, 4 = FWD
  plural_name: string;
  plural_name_short: string;
  singular_name: string;
  singular_name_short: 'GKP' | 'DEF' | 'MID' | 'FWD';
  squad_select: number;
  squad_min_play: number;
  squad_max_play: number;
}

export interface FPLGameSettings {
  squad_squadplay: number; // 11
  squad_squadsize: number; // 15
  squad_team_limit: number; // 3
  squad_total_spend: number; // 1000 (£100.0m)
  ui_currency_multiplier: number; // 10
  transfers_sell_on_fee: number; // 2
  max_extra_free_transfers: number; // 4
  stats_form_days: number;
}

export interface FPLChipRule {
  id: number;
  name: string;
  number: number;
  start_event: number;
  stop_event: number;
  chip_type: string;
}

export interface FPLElement {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number; // 1: GKP, 2: DEF, 3: MID, 4: FWD
  now_cost: number; // e.g. 150 = 15.0m
  cost_change_event: number;
  cost_change_start: number;
  transfers_in_event: number;
  transfers_out_event: number;
  selected_by_percent: string;
  form: string;
  points_per_game: string;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  starts: number;
  status: string; // 'a' | 'd' | 'i' | 's' | 'u'
  chance_of_playing_next_round: number | null;
  chance_of_playing_this_round: number | null;
  news: string;
  news_added?: string | null;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  defensive_contribution?: number;
  corners_and_indirect_freekicks_order: number | null;
  direct_freekicks_order: number | null;
  penalties_order: number | null;
  ep_next?: string;
  ep_this?: string;
}

export interface FPLBootstrapStatic {
  events: FPLEvent[];
  teams: FPLTeam[];
  element_types: FPLElementType[];
  elements: FPLElement[];
  game_settings: FPLGameSettings;
  chips: FPLChipRule[];
  total_players: number;
}

export interface FPLFixture {
  id: number;
  code: number;
  event: number | null;
  finished: boolean;
  finished_provisional: boolean;
  started: boolean;
  kickoff_time: string;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number; // FDR 1-5
  team_a_difficulty: number; // FDR 1-5
  minutes?: number;
  stats?: Array<{
    identifier: string;
    h: Array<{ value: number; element: number }>;
    a: Array<{ value: number; element: number }>;
  }>;
}

export interface FPLEntry {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  summary_overall_points: number;
  summary_overall_rank: number;
  current_event: number;
  summary_event_points: number;
  summary_event_rank: number;
  last_deadline_bank: number;
  last_deadline_value: number;
  last_deadline_total_transfers: number;
  leagues: {
    classic: Array<{
      id: number;
      name: string;
      entry_rank: number;
      entry_percentile_rank: number;
      short_name?: string;
    }>;
    h2h: Array<any>;
  };
}

export interface FPLHistoryPast {
  season_name: string;
  total_points: number;
  rank: number;
}

export interface FPLHistoryCurrent {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  overall_rank: number;
  percentile_rank?: number;
  bank: number;
  value: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
}

export interface FPLHistoryChip {
  name: 'wildcard' | 'freehit' | 'bboost' | '3xc';
  time: string;
  event: number;
}

export interface FPLHistory {
  current: FPLHistoryCurrent[];
  past: FPLHistoryPast[];
  chips: FPLHistoryChip[];
}

export interface FPLPick {
  element: number;
  position: number; // 1-11 starting, 12 bench GK, 13-15 outfield bench
  multiplier: number; // 0 bench, 1 starter, 2 captain, 3 triple captain
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
}

export interface FPLPicksResponse {
  active_chip: string | null;
  automatic_subs: any[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: FPLPick[];
}

export interface FPLTransfer {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
}

export interface FPLLiveElement {
  id: number;
  stats: {
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    own_goals: number;
    penalties_saved: number;
    penalties_missed: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    bonus: number;
    bps: number;
    total_points: number;
    played: boolean;
    in_dreamteam?: boolean;
  };
  explain?: any[];
}

// Prediction & Optimizer Types
export interface XPtsBreakdown {
  baseMinutesScore: number;
  attackingExpectedScore: number;
  defensiveExpectedScore: number;
  bonusEstimate: number;
  fixtureMultiplier: number;
  playingProbability: number;
  fixtureCount: number; // 0 for blank, 1 for normal, 2 for double
  reasons: string[];
}

export interface PlayerWithAnalysis {
  element: FPLElement;
  team: FPLTeam;
  positionName: 'GKP' | 'DEF' | 'MID' | 'FWD';
  xPts: number;
  xPtsBreakdown: XPtsBreakdown;
  upcomingFixtures: Array<{
    fixture: FPLFixture;
    opponent: FPLTeam;
    isHome: boolean;
    difficulty: number;
  }>;
  sellingPrice: number; // in tenths e.g. 62
  purchasePrice?: number;
  isStarter: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  pickPosition: number;
}

export interface OptimizedSquad {
  starters: PlayerWithAnalysis[];
  bench: PlayerWithAnalysis[];
  captain: PlayerWithAnalysis;
  viceCaptain: PlayerWithAnalysis;
  formation: string; // e.g. '3-4-3'
  totalXPts: number;
  benchXPts: number;
  formationAlternatives: Array<{
    formation: string;
    totalXPts: number;
    startersCount: { def: number; mid: number; fwd: number };
  }>;
  risks: Array<{
    playerId: number;
    playerName: string;
    type: 'injury' | 'doubtful' | 'rotation' | 'blank' | 'tough_fixture';
    message: string;
  }>;
}

export interface TransferSuggestion {
  outPlayer: PlayerWithAnalysis;
  inPlayer: PlayerWithAnalysis;
  costDiff: number; // in tenths
  immediateNetGain: number; // xPts next GW
  horizonNetGain: number; // xPts over lookahead horizon (e.g. 5 GWs)
  outPlayerHorizonXPts: number;
  inPlayerHorizonXPts: number;
  horizonAvgFdrOut: number;
  horizonAvgFdrIn: number;
  hitCost: number; // 0 or 4
  netPointsBenefit: number;
  strategicScore: number;
  isInjuryReplacement?: boolean;
  reason: string;
}

export interface DoubleTransferSuggestion {
  outPlayers: [PlayerWithAnalysis, PlayerWithAnalysis];
  inPlayers: [PlayerWithAnalysis, PlayerWithAnalysis];
  costDiff: number;
  immediateNetGain: number;
  horizonNetGain: number;
  outPlayersHorizonXPts: number;
  inPlayersHorizonXPts: number;
  hitCost: number; // 0 or 4 or 8
  netPointsBenefit: number;
  strategicScore: number;
  reason: string;
}

export interface ModelWeights {
  formWeight: number; // default: 0.35
  underlyingStatsWeight: number; // default: 0.45
  fixtureWeight: number; // default: 0.20
  homeAdvantageFactor: number; // default: 1.10
  minutesThreshold: number; // default: 60
}
