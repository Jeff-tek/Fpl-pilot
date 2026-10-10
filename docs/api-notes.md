# FPL API Verified Reference & Data Dictionary

Generated and verified against the live official Fantasy Premier League API (`https://fantasy.premierleague.com/api/`).

## 1. Endpoints & Methods

| Endpoint | Method | Caching | Description |
| :--- | :--- | :--- | :--- |
| `/bootstrap-static/` | GET | ~10 mins | Complete game data: all players (elements), 20 clubs (teams), 38 gameweeks (events), element types, chips, rules/game settings. |
| `/fixtures/` & `/fixtures/?event={gw}` | GET | ~10 mins | Full season schedule or specific GW fixtures, kickoff times, home/away difficulty (FDR 1-5), match stats (goals, assists, bps). |
| `/entry/{id}/` | GET | ~5 mins | Manager profile, team name, overall rank, total points, current event, regional leagues, classic/h2h leagues. |
| `/entry/{id}/history/` | GET | ~5 mins | Past seasons history, current season gameweek-by-gameweek rank/points/bank/transfers, and chip usage history. |
| `/entry/{id}/event/{gw}/picks/` | GET | ~5 mins | Manager's 15 picks for specified gameweek: starting XI (pos 1-11), bench (pos 12-15), captain/vice, multipliers, chips active, entry_history (bank, team value, transfers made). |
| `/entry/{id}/transfers/` | GET | ~10 mins | All historical transfers for the manager (`element_in`, `element_in_cost`, `element_out`, `element_out_cost`, `event`, `time`). |
| `/element-summary/{player_id}/` | GET | ~10 mins | Deep dive on an individual player: upcoming fixtures with FDR, and round-by-round match stats. |
| `/event/{gw}/live/` | GET | ~60 secs | Live points during gameweek, live minutes, bps, goals, assists, saves, bonus provisional breakdown. |
| `/leagues-classic/{id}/standings/` | GET | ~5 mins | Mini-league table, rivals points, ranks, entry names. |

---

## 2. Real Schema & Observed Field Names

### A. `/bootstrap-static/`
- **`events`** (array of 38 objects):
  - `id`: integer (1-38)
  - `name`: string (e.g. "Gameweek 5")
  - `deadline_time`: ISO string (e.g. "2026-09-18T17:30:00Z")
  - `is_current`: boolean
  - `is_next`: boolean
  - `finished`: boolean
  - `data_checked`: boolean
  - `chip_plays`: array of chip counts played across the whole game
  - `most_selected`, `most_transferred_in`, `top_element`, `transfers_made`, etc.
- **`teams`** (array of 20 clubs):
  - `id`: integer (1-20)
  - `name`: string (e.g. "Arsenal", "Manchester City")
  - `short_name`: string (e.g. "ARS", "MCI")
  - `strength`: integer (1-5)
  - `strength_overall_home`, `strength_overall_away`: integer (1-5)
  - `strength_attack_home`, `strength_attack_away`: integer (1-5)
  - `strength_defence_home`, `strength_defence_away`: integer (1-5)
- **`element_types`** (positions):
  - `id: 1` -> Goalkeepers (`GKP`, `singular_name: "Goalkeeper"`, `squad_select: 2`, `squad_min_play: 1`, `squad_max_play: 1`)
  - `id: 2` -> Defenders (`DEF`, `squad_select: 5`, `squad_min_play: 3`, `squad_max_play: 5`)
  - `id: 3` -> Midfielders (`MID`, `squad_select: 5`, `squad_min_play: 2`, `squad_max_play: 5`)
  - `id: 4` -> Forwards (`FWD`, `squad_select: 3`, `squad_min_play: 1`, `squad_max_play: 3`)
- **`game_settings`** (Dynamic Season Rules):
  - `squad_squadplay`: 11
  - `squad_squadsize`: 15
  - `squad_team_limit`: 3 (maximum players from one Premier League club)
  - `squad_total_spend`: 1000 (£100.0m)
  - `ui_currency_multiplier`: 10 (prices are expressed in tenths of a million: 61 = £6.1m)
  - `transfers_sell_on_fee`: 2 (50% profit retained on sale)
  - `max_extra_free_transfers`: 4 (allow up to 5 banked free transfers)
  - `stats_form_days`: 30
- **`chips`** (Available Chips):
  - List includes: `wildcard` (phase 1: GW2-19, phase 2: GW20-38), `freehit` (phase 1: GW2-19, phase 2: GW20-38), `bboost` (bench boost), `3xc` (triple captain).
- **`elements`** (Players array, ~667 entries):
  - `id`: number
  - `web_name`: string (e.g. "Salah", "Haaland", "Saka")
  - `first_name`, `second_name`: strings
  - `team`: number (corresponds to `teams.id`)
  - `element_type`: number (1=GKP, 2=DEF, 3=MID, 4=FWD)
  - `now_cost`: number (e.g. 150 = £15.0m)
  - `cost_change_event`: number (change this GW)
  - `cost_change_start`: number (change since season start)
  - `transfers_in_event`, `transfers_out_event`: numbers (active GW transfers)
  - `selected_by_percent`: string (e.g. "42.8")
  - `form`: string (e.g. "7.5", average points per game over last 30 days)
  - `points_per_game`: string (e.g. "6.0")
  - `total_points`: number
  - `minutes`: number
  - `goals_scored`, `assists`, `clean_sheets`, `goals_conceded`, `saves`, `bonus`, `bps`: numbers
  - `status`: string ('a' = available, 'd' = doubtful, 'i' = injured, 's' = suspended, 'u' = unavailable)
  - `chance_of_playing_next_round`: number | null (0, 25, 50, 75, 100 or null if fit)
  - `news`: string (e.g. "Hamstring injury - 75% chance of playing")
  - `expected_goals`: string (e.g. "4.12")
  - `expected_assists`: string (e.g. "2.40")
  - `expected_goal_involvements`: string (e.g. "6.52")
  - `expected_goals_conceded`: string (e.g. "5.10")
  - `ict_index`: string (e.g. "54.2")
  - `starts`: number
  - `defensive_contribution`: number
  - `corners_and_indirect_freekicks_order`: number | null
  - `direct_freekicks_order`: number | null
  - `penalties_order`: number | null

---

### B. `/fixtures/?event={gw}`
- `id`: number
- `event`: number (Gameweek ID)
- `kickoff_time`: ISO string
- `started`: boolean
- `finished`: boolean
- `finished_provisional`: boolean
- `team_h`: number (Home team ID)
- `team_a`: number (Away team ID)
- `team_h_score`: number | null
- `team_a_score`: number | null
- `team_h_difficulty`: number (1-5 official FDR for home team)
- `team_a_difficulty`: number (1-5 official FDR for away team)
- `stats`: array of match events (goals, assists, saves, bonus, bps, cards)

---

### C. `/entry/{id}/`
- `id`: number
- `name`: string (e.g. "Kloppites United")
- `player_first_name`, `player_last_name`: string
- `summary_overall_points`: number
- `summary_overall_rank`: number
- `current_event`: number
- `summary_event_points`: number
- `summary_event_rank`: number
- `last_deadline_bank`: number (e.g. 15 = £1.5m in bank)
- `last_deadline_value`: number (e.g. 1015 = £101.5m squad value)
- `last_deadline_total_transfers`: number
- `leagues`: `{ classic: [...], h2h: [...] }`

---

### D. `/entry/{id}/history/`
- `current`: array of gameweek records:
  - `event`: number
  - `points`: number
  - `total_points`: number
  - `rank`, `overall_rank`: number
  - `percentile_rank`: number
  - `bank`: number
  - `value`: number
  - `event_transfers`: number
  - `event_transfers_cost`: number (points hit taken e.g. 4, 8)
  - `points_on_bench`: number
- `chips`: array of played chips:
  - `[{ name: "bboost" | "wildcard" | "freehit" | "3xc", time: string, event: number }]`
- `past`: array of past seasons

---

### E. `/entry/{id}/event/{gw}/picks/`
- `active_chip`: string | null (e.g. "bboost", "3xc", "wildcard", "freehit")
- `automatic_subs`: array of substitutions
- `entry_history`:
  - `bank`: number (e.g. 5 = £0.5m)
  - `value`: number (e.g. 1020 = £102.0m)
  - `event_transfers`: number
  - `event_transfers_cost`: number
  - `points`: number
  - `total_points`: number
  - `rank`: number
  - `points_on_bench`: number
- `picks`: array of 15 players:
  - `position`: number (1-15).
    - `1-11`: Starting XI
    - `12`: Substitute Goalkeeper
    - `13-15`: Substitute Outfield Players (ordered by sub priority)
  - `element`: number (Player ID in `bootstrap-static.elements`)
  - `multiplier`: number (1 for starter, 2 for captain, 3 for triple captain, 0 for bench)
  - `is_captain`: boolean
  - `is_vice_captain`: boolean
  - `element_type`: number (1=GKP, 2=DEF, 3=MID, 4=FWD)

---

### F. `/event/{gw}/live/`
- `elements`: array of objects:
  - `id`: player id
  - `stats`: `{ minutes, goals_scored, assists, clean_sheets, goals_conceded, own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards, saves, bonus, bps, total_points, played }`
  - `explain`: breakdowns per fixture
