import React, { useEffect, useState, useMemo } from 'react';
import {
  FPLBootstrapStatic,
  FPLFixture,
  FPLEntry,
  FPLHistory,
  FPLPicksResponse,
  PlayerWithAnalysis,
  OptimizedSquad,
  ModelWeights,
  FPLEvent,
} from './types/fpl';
import {
  fetchBootstrapStatic,
  fetchFixtures,
  fetchEntry,
  fetchEntryHistory,
  fetchEntryPicks,
  purgeProxyCache,
} from './lib/fpl/api';
import { calculatePlayerXPts, DEFAULT_MODEL_WEIGHTS, FixtureContext } from './lib/model/xpts';
import { optimizeSquad } from './lib/optimizer/teamOptimizer';
import { findBestTransfers } from './lib/optimizer/transfers';
import { PitchView } from './components/PitchView';
import { TransfersView } from './components/TransfersView';
import { FixturesView } from './components/FixturesView';
import { PlayerExplorerView } from './components/PlayerExplorerView';
import { ChipsView } from './components/ChipsView';
import { LiveTrackerView } from './components/LiveTrackerView';
import { SettingsModal } from './components/SettingsModal';
import { ShareModal } from './components/ShareModal';
import { SquadEditorModal } from './components/SquadEditorModal';
import {
  LayoutGrid,
  ArrowLeftRight,
  Calendar,
  Users,
  Zap,
  Radio,
  Sliders,
  Share2,
  Clock,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  Info,
} from 'lucide-react';

const LOCAL_STORAGE_TEAM_KEY = 'fpl_pilot_team_id';
const LOCAL_STORAGE_WEIGHTS_KEY = 'fpl_pilot_model_weights';
const LOCAL_STORAGE_DIFF_KEY = 'fpl_pilot_prefer_diff';
const LOCAL_STORAGE_CUSTOM_SQUAD_PREFIX = 'fpl_pilot_custom_squad_';

function isDemo2432Squad(picks: any[], targetTeamId: number): boolean {
  if (targetTeamId === 2432) return false;
  if (!Array.isArray(picks) || picks.length !== 15) return false;
  const demoElements = [496, 449, 8, 334, 31, 154, 12, 40, 368, 411, 249, 623, 124, 277, 165];
  const count = picks.filter((p) => demoElements.includes(p.element)).length;
  return count >= 14;
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<
    'pitch' | 'transfers' | 'fixtures' | 'players' | 'chips' | 'live'
  >('pitch');

  // Core Data State
  const [teamIdInput, setTeamIdInput] = useState<string>('');
  const [teamId, setTeamId] = useState<number | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_TEAM_KEY);
    return saved ? Number(saved) : null;
  });

  const [bootstrap, setBootstrap] = useState<FPLBootstrapStatic | null>(null);
  const [fixtures, setFixtures] = useState<FPLFixture[]>([]);
  const [entry, setEntry] = useState<FPLEntry | null>(null);
  const [history, setHistory] = useState<FPLHistory | null>(null);
  const [picksData, setPicksData] = useState<FPLPicksResponse | null>(null);

  // Custom Squad / Pending Transfers State (for pre-deadline transfers)
  const [customSquadIds, setCustomSquadIds] = useState<number[] | null>(null);
  const [customBank, setCustomBank] = useState<number | null>(null);
  const [showSquadEditor, setShowSquadEditor] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Load custom squad when teamId changes
  useEffect(() => {
    if (!teamId) {
      setCustomSquadIds(null);
      setCustomBank(null);
      return;
    }
    const saved = localStorage.getItem(`${LOCAL_STORAGE_CUSTOM_SQUAD_PREFIX}${teamId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.squadIds) && parsed.squadIds.length === 15) {
          setCustomSquadIds(parsed.squadIds);
          setCustomBank(typeof parsed.bank === 'number' ? parsed.bank : null);
        }
      } catch {
        // ignore
      }
    } else {
      setCustomSquadIds(null);
      setCustomBank(null);
    }
  }, [teamId]);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Model & Optimization State
  const [weights, setWeights] = useState<ModelWeights>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_WEIGHTS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_MODEL_WEIGHTS;
    } catch {
      return DEFAULT_MODEL_WEIGHTS;
    }
  });

  const [preferDifferential, setPreferDifferential] = useState<boolean>(() => {
    return localStorage.getItem(LOCAL_STORAGE_DIFF_KEY) === 'true';
  });

  const [selectedFormation, setSelectedFormation] = useState<string>('');

  // Modals
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showShare, setShowShare] = useState<boolean>(false);
  const [showIdHelp, setShowIdHelp] = useState<boolean>(false);

  // Countdown timer for next deadline
  const [deadlineString, setDeadlineString] = useState<string>('');

  // 1. Initial Load: Fetch Global Bootstrap Static & Fixtures
  useEffect(() => {
    async function initGlobalData() {
      try {
        setLoading(true);
        setError(null);
        const [bsData, fixData] = await Promise.all([
          fetchBootstrapStatic(),
          fetchFixtures(),
        ]);
        setBootstrap(bsData);
        setFixtures(fixData);
      } catch (err: any) {
        console.error('Failed to load global FPL data:', err);
        setError(err.message || 'Failed to connect to FPL servers.');
      } finally {
        setLoading(false);
      }
    }
    initGlobalData();
  }, []);

  // 2. Identify Current & Next Gameweek Events
  const { currentEvent, nextEvent } = useMemo(() => {
    if (!bootstrap || !bootstrap.events) {
      return { currentEvent: null, nextEvent: null };
    }
    const current =
      bootstrap.events.find((e) => e.is_current) ||
      bootstrap.events.find((e) => e.is_next) ||
      bootstrap.events[0];
    const next =
      bootstrap.events.find((e) => e.is_next) ||
      (current ? bootstrap.events[current.id] : null) ||
      current;
    return { currentEvent: current, nextEvent: next };
  }, [bootstrap]);

  // 3. Deadline Countdown Timer
  useEffect(() => {
    if (!nextEvent) return;
    const targetEvent = nextEvent;

    function updateCountdown() {
      const deadline = new Date(targetEvent.deadline_time).getTime();
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setDeadlineString(`${targetEvent.name} Deadline Passed`);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      const dateFormatted = new Date(targetEvent.deadline_time).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      setDeadlineString(
        `${targetEvent.name} Deadline: ${dateFormatted} (${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m left)`
      );
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [nextEvent]);

  // 4. Fetch User Team Data whenever teamId changes
  useEffect(() => {
    if (!teamId || !bootstrap || !currentEvent) return;
    const activeCurrentEvent = currentEvent;

    async function loadTeamData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch entry profile and history in parallel (soft fail)
        let entryRes: FPLEntry | null = null;
        let historyRes: FPLHistory | null = null;
        try {
          entryRes = await fetchEntry(teamId!);
        } catch (e) {
          console.warn(`Direct fetchEntry for ${teamId} failed (FPL updating or maintenance):`, e);
        }
        try {
          historyRes = await fetchEntryHistory(teamId!);
        } catch (e) {
          console.warn(`Direct fetchEntryHistory for ${teamId} failed:`, e);
        }

        // 2. Determine best gameweeks to query picks from
        // Priority: actual gameweeks recorded in team history (latest first), then current down to 1
        const candidateGWs: number[] = [];
        if (historyRes && Array.isArray(historyRes.current) && historyRes.current.length > 0) {
          const recorded = historyRes.current
            .map((h) => h.event)
            .filter((evt): evt is number => typeof evt === 'number' && evt > 0);
          for (let i = recorded.length - 1; i >= 0; i--) {
            if (!candidateGWs.includes(recorded[i])) {
              candidateGWs.push(recorded[i]);
            }
          }
        }
        const currentGwId = activeCurrentEvent.id;
        for (let gw = currentGwId; gw >= 1; gw--) {
          if (!candidateGWs.includes(gw)) {
            candidateGWs.push(gw);
          }
        }

        // 3. Purge accidental demo cache if stored for a custom team ID
        const rawCachedPicks = localStorage.getItem(`fpl_cached_picks_${teamId}`);
        if (rawCachedPicks && teamId !== 2432) {
          try {
            const parsed = JSON.parse(rawCachedPicks);
            if (isDemo2432Squad(parsed?.picks, teamId!)) {
              localStorage.removeItem(`fpl_cached_picks_${teamId}`);
            }
          } catch {
            // ignore
          }
        }

        // 4. Fetch squad picks with multi-GW retry from official FPL API
        let picksRes: FPLPicksResponse | null = null;
        for (const gw of candidateGWs) {
          try {
            const candidate = await fetchEntryPicks(teamId!, gw, true);
            if (candidate && Array.isArray(candidate.picks) && candidate.picks.length > 0) {
              if (teamId !== 2432 && isDemo2432Squad(candidate.picks, teamId!)) {
                continue;
              }
              picksRes = candidate;
              break;
            }
          } catch {
            // try next candidate gameweek
          }
        }

        // 5. If network fetch failed, check local storage cached picks for this team (if valid)
        if (!picksRes) {
          const cachedPicksStr = localStorage.getItem(`fpl_cached_picks_${teamId}`);
          if (cachedPicksStr) {
            try {
              const parsed = JSON.parse(cachedPicksStr);
              if (!isDemo2432Squad(parsed?.picks, teamId!)) {
                picksRes = parsed;
              }
            } catch {
              // ignore
            }
          }
        }

        if (!picksRes) {
          throw new Error(
            `Could not load official picks for Team #${teamId}. FPL may be updating, or the team has no submitted squad yet. Please try again later.`
          );
        }

        // Save into local cache for offline resilience
        try {
          localStorage.setItem(`fpl_cached_picks_${teamId}`, JSON.stringify(picksRes));
        } catch {
          // ignore storage quota errors
        }

        // 7. Synthesize entry profile if FPL entry API was updating (503)
        if (!entryRes) {
          const h = (picksRes as FPLPicksResponse).entry_history;
          entryRes = {
            id: teamId!,
            name: `Team #${teamId}`,
            player_first_name: 'Manager',
            player_last_name: '',
            summary_overall_points: h?.total_points || 0,
            summary_overall_rank: h?.overall_rank || 0,
            summary_event_points: h?.points || 0,
            summary_event_rank: h?.rank || 0,
            current_event: h?.event || activeCurrentEvent.id,
            last_deadline_bank: h?.bank ?? 0,
            last_deadline_value: h?.value ?? 1000,
            last_deadline_total_transfers: h?.event_transfers ?? 0,
            leagues: { classic: [], h2h: [] },
          };
        }

        if (!historyRes) {
          historyRes = { current: [], past: [], chips: [] };
        }

        setEntry(entryRes);
        setHistory(historyRes);
        setPicksData(picksRes);
        localStorage.setItem(LOCAL_STORAGE_TEAM_KEY, teamId!.toString());

        const squadGw = picksRes.entry_history?.event || activeCurrentEvent.id;
        const mgrName = entryRes.player_first_name ? ` (${entryRes.player_first_name} ${entryRes.player_last_name})` : '';
        setSyncFeedback({
          message: `Loaded Gameweek ${squadGw} squad for ${entryRes.name}${mgrName}. (Note: transfers for upcoming Gameweek ${activeCurrentEvent.id + 1} remain private until the deadline; tap "Edit Squad" if you made recent transfers!)`,
          type: 'success',
        });
      } catch (err: any) {
        console.error('Failed to load team data:', err);
        setError(
          err.message ||
            'Could not load FPL Team data. Please check your team ID or try Demo Team #2432.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadTeamData();
  }, [teamId, bootstrap, currentEvent]);

  // 5. Build Map of Elements with xPts & Fixtures
  const allAnalyzedPlayers = useMemo<PlayerWithAnalysis[]>(() => {
    if (!bootstrap || !fixtures || !nextEvent) return [];

    const teamsMap = new Map(bootstrap.teams.map((t) => [t.id, t]));
    const targetGW = nextEvent.id;

    // Filter fixtures for target gameweek
    const gwFixtures = fixtures.filter((f) => f.event === targetGW);

    return bootstrap.elements.map((el) => {
      const team = teamsMap.get(el.team)!;
      const posMap: Record<number, 'GKP' | 'DEF' | 'MID' | 'FWD'> = {
        1: 'GKP',
        2: 'DEF',
        3: 'MID',
        4: 'FWD',
      };

      // Find upcoming fixtures for player's club in this GW
      const matches = gwFixtures.filter((f) => f.team_h === team.id || f.team_a === team.id);

      const fixtureContexts: FixtureContext[] = matches.map((f) => {
        const isHome = f.team_h === team.id;
        const oppId = isHome ? f.team_a : f.team_h;
        const opponent = teamsMap.get(oppId)!;
        const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
        return { fixture: f, opponent, isHome, difficulty };
      });

      const { xPts, breakdown } = calculatePlayerXPts(el, team, fixtureContexts, weights);

      // Future 5 fixtures for modal
      const next5Matches = fixtures
        .filter((f) => f.event && f.event >= targetGW && (f.team_h === team.id || f.team_a === team.id))
        .slice(0, 5)
        .map((f) => {
          const isHome = f.team_h === team.id;
          const oppId = isHome ? f.team_a : f.team_h;
          return {
            fixture: f,
            opponent: teamsMap.get(oppId)!,
            isHome,
            difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
          };
        });

      return {
        element: el,
        team,
        positionName: posMap[el.element_type] || 'MID',
        xPts,
        xPtsBreakdown: breakdown,
        upcomingFixtures: next5Matches,
        sellingPrice: el.now_cost,
        isStarter: false,
        isCaptain: false,
        isViceCaptain: false,
        pickPosition: 0,
      };
    });
  }, [bootstrap, fixtures, nextEvent, weights]);

  // 6. Build the User's Current 15-player Squad
  const userSquad = useMemo<PlayerWithAnalysis[]>(() => {
    if (!picksData || allAnalyzedPlayers.length === 0) return [];

    const analyzedMap = new Map(allAnalyzedPlayers.map((p) => [p.element.id, p]));

    // Safe helper to resolve player or create fallback
    const resolvePlayer = (id: number): PlayerWithAnalysis => {
      const existing = analyzedMap.get(id);
      if (existing) return existing;
      const defaultTeam = bootstrap?.teams[0] || ({ id: 1, name: 'Club', short_name: 'CLB' } as any);
      return {
        element: {
          id,
          web_name: `Player #${id}`,
          first_name: 'FPL',
          second_name: 'Player',
          element_type: 2,
          team: defaultTeam.id,
          now_cost: 50,
          selected_by_percent: '1.0',
          form: '3.0',
          total_points: 0,
          status: 'a',
          chance_of_playing_next_round: 100,
          news: '',
        } as any,
        team: defaultTeam,
        positionName: 'DEF',
        xPts: 3.0,
        xPtsBreakdown: {
          baseMinutesScore: 2.0,
          attackingExpectedScore: 0.5,
          defensiveExpectedScore: 0.5,
          bonusEstimate: 0,
          fixtureMultiplier: 1.0,
          playingProbability: 1.0,
          fixtureCount: 1,
          reasons: ['Baseline squad projection'],
        },
        upcomingFixtures: [],
        sellingPrice: 50,
        isStarter: false,
        isCaptain: false,
        isViceCaptain: false,
        pickPosition: 0,
      };
    };

    // If custom squad pending transfers exist, build squad with newly bought players
    if (customSquadIds && customSquadIds.length === 15) {
      return customSquadIds.map((id, index) => {
        const base = resolvePlayer(id);
        const existingPick = picksData.picks.find((p) => p.element === id);
        return {
          ...base,
          isStarter: existingPick ? existingPick.position <= 11 : index < 11,
          isCaptain: existingPick ? existingPick.is_captain : false,
          isViceCaptain: existingPick ? existingPick.is_vice_captain : false,
          pickPosition: existingPick ? existingPick.position : index + 1,
        };
      });
    }

    return picksData.picks.map((pick) => {
      const base = resolvePlayer(pick.element);
      return {
        ...base,
        isStarter: pick.position <= 11,
        isCaptain: pick.is_captain,
        isViceCaptain: pick.is_vice_captain,
        pickPosition: pick.position,
      };
    });
  }, [picksData, allAnalyzedPlayers, customSquadIds, bootstrap]);

  // Effective Bank (respects manual transfers or official picks)
  const effectiveBank = customBank !== null ? customBank : (picksData?.entry_history?.bank || 0);

  // 7. Run Best XI Optimizer on user's 15 players (dynamically respects selectedFormation)
  const optimizedSquad = useMemo<OptimizedSquad | null>(() => {
    if (userSquad.length < 15) return null;
    return optimizeSquad(userSquad, preferDifferential, selectedFormation || undefined);
  }, [userSquad, preferDifferential, selectedFormation]);

  // Set default selected formation if not set
  useEffect(() => {
    if (optimizedSquad && !selectedFormation) {
      setSelectedFormation(optimizedSquad.formation);
    }
  }, [optimizedSquad, selectedFormation]);

  // 8. Find Top Transfer Recommendation
  const topTransfer = useMemo(() => {
    if (userSquad.length < 15 || allAnalyzedPlayers.length === 0) return undefined;
    const transfers = findBestTransfers(userSquad, allAnalyzedPlayers, {
      bank: effectiveBank,
      freeTransfers: 1,
      lookaheadGWs: 5,
      strategyMode: 'long_term',
    });
    return transfers.singleTransfers[0];
  }, [userSquad, allAnalyzedPlayers, effectiveBank]);

  const handleSetTeamId = (id: number) => {
    if (id !== teamId) {
      setEntry(null);
      setPicksData(null);
      setHistory(null);
      setCustomSquadIds(null);
      setCustomBank(null);
      setSyncFeedback(null);
      setLoading(true);
    }
    setError(null);
    setTeamId(id);
    localStorage.setItem(LOCAL_STORAGE_TEAM_KEY, id.toString());
  };

  const handleClearTeam = () => {
    if (teamId) {
      localStorage.removeItem(`${LOCAL_STORAGE_CUSTOM_SQUAD_PREFIX}${teamId}`);
    }
    setTeamId(null);
    setEntry(null);
    setPicksData(null);
    setHistory(null);
    setCustomSquadIds(null);
    setCustomBank(null);
    localStorage.removeItem(LOCAL_STORAGE_TEAM_KEY);
  };

  const handleSaveCustomSquad = (newSquadElementIds: number[], newBank: number) => {
    if (!teamId) return;
    setCustomSquadIds(newSquadElementIds);
    setCustomBank(newBank);
    localStorage.setItem(
      `${LOCAL_STORAGE_CUSTOM_SQUAD_PREFIX}${teamId}`,
      JSON.stringify({ squadIds: newSquadElementIds, bank: newBank })
    );
    setSyncFeedback({
      message: 'Pending transfers applied! Your Best XI and tactical recommendations are now using your updated squad.',
      type: 'success',
    });
    setTimeout(() => setSyncFeedback(null), 8000);
  };

  const handleResetToOfficial = () => {
    if (!teamId) return;
    setCustomSquadIds(null);
    setCustomBank(null);
    localStorage.removeItem(`${LOCAL_STORAGE_CUSTOM_SQUAD_PREFIX}${teamId}`);
    setSyncFeedback({
      message: 'Reset squad to official FPL picks.',
      type: 'info',
    });
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const handleSyncWithFPL = async () => {
    if (!teamId || !currentEvent) return;
    try {
      setIsSyncing(true);
      setError(null);
      await purgeProxyCache();
      const gwToFetch = currentEvent.id;

      // 1. Fetch fresh picks from FPL across candidate gameweeks
      let picksRes: FPLPicksResponse | null = null;
      for (let gw = gwToFetch; gw >= 1; gw--) {
        try {
          picksRes = await fetchEntryPicks(teamId, gw, true);
          if (picksRes && Array.isArray(picksRes.picks) && picksRes.picks.length > 0) break;
        } catch {
          // try previous gameweek
        }
      }
      if (!picksRes) {
        picksRes = picksData;
      }
      if (!picksRes) {
        throw new Error(`Could not refresh official picks for Team #${teamId}. Please try again later.`);
      }

      // 2. Fetch fresh entry profile and history with fallback
      const [entryRes, historyRes] = await Promise.all([
        fetchEntry(teamId, true).catch(() => {
          const h = picksRes.entry_history;
          const fallbackEntry: FPLEntry = {
            id: teamId,
            name: `Team #${teamId}`,
            player_first_name: 'Manager',
            player_last_name: '',
            summary_overall_points: h?.total_points || 0,
            summary_overall_rank: h?.overall_rank || 0,
            summary_event_points: h?.points || 0,
            summary_event_rank: h?.rank || 0,
            current_event: h?.event || gwToFetch,
            last_deadline_bank: h?.bank ?? 0,
            last_deadline_value: h?.value ?? 1000,
            last_deadline_total_transfers: h?.event_transfers ?? 0,
            leagues: { classic: [], h2h: [] },
          };
          return fallbackEntry;
        }),
        fetchEntryHistory(teamId, true).catch(() => ({
          current: [],
          past: [],
          chips: [],
        })),
      ]);

      setEntry(entryRes);
      setHistory(historyRes);
      setPicksData(picksRes);

      if (customSquadIds) {
        setSyncFeedback({
          message:
            'Data refreshed from FPL! (Your custom pending transfers remain active. Tap "Reset to FPL" if you wish to discard them).',
          type: 'info',
        });
      } else {
        setSyncFeedback({
          message:
            'Synced with official FPL API! Note: Premier League keeps transfers hidden until each deadline. If you made transfers yesterday, tap "Apply Transfers" to reflect them now.',
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('Failed to sync with FPL:', err);
      setError(err.message || 'Failed to sync with official FPL servers.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 8000);
    }
  };

  const handleUpdateWeights = (newWeights: ModelWeights) => {
    setWeights(newWeights);
    localStorage.setItem(LOCAL_STORAGE_WEIGHTS_KEY, JSON.stringify(newWeights));
  };

  const handleResetWeights = () => {
    setWeights(DEFAULT_MODEL_WEIGHTS);
    localStorage.setItem(LOCAL_STORAGE_WEIGHTS_KEY, JSON.stringify(DEFAULT_MODEL_WEIGHTS));
  };

  const handleToggleDiff = (val: boolean) => {
    setPreferDifferential(val);
    localStorage.setItem(LOCAL_STORAGE_DIFF_KEY, val.toString());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('pitch')}
              className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                FP
              </div>
              <span>FPL Pilot</span>
            </button>
            {currentEvent && (
              <span className="hidden sm:inline text-xs text-slate-400 font-mono">
                · {currentEvent.name}
              </span>
            )}
          </div>

          {/* Center: Deadline Countdown Strip */}
          {deadlineString && (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{deadlineString}</span>
            </div>
          )}

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 shrink-0">
            {entry && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="font-bold text-white truncate max-w-[120px]">{entry.name}</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  (£{(effectiveBank / 10).toFixed(1)}m in bank)
                </span>
              </div>
            )}

            {entry && (
              <>
                {/* 1-Click Sync with official FPL */}
                <button
                  onClick={handleSyncWithFPL}
                  disabled={isSyncing}
                  className="px-2.5 py-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                  title="Force refresh data from official FPL API"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
                  <span className="hidden sm:inline">Sync FPL</span>
                </button>

                {/* Edit Squad / Apply Pending Transfers */}
                <button
                  onClick={() => setShowSquadEditor(true)}
                  className={`px-2.5 py-1.5 text-xs rounded-xl border flex items-center gap-1.5 font-bold transition-all shadow-xs ${
                    customSquadIds && customSquadIds.length === 15
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                  title="Apply your transferred players or edit squad"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">
                    {customSquadIds && customSquadIds.length === 15 ? 'Transfers (Active)' : 'Edit Squad'}
                  </span>
                </button>
              </>
            )}

            {optimizedSquad && (
              <button
                onClick={() => setShowShare(true)}
                className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-colors"
                title="Share Lineup"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-colors"
              title="Settings & Model Weights"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 pb-24 md:pb-8">
        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div
            className={`mb-4 p-3.5 rounded-2xl border flex items-start justify-between gap-3 text-xs shadow-md animate-in fade-in duration-200 ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                : syncFeedback.type === 'warning'
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                : 'bg-indigo-950/40 border-indigo-800/80 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-white font-mono text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-300">Notice</div>
                <div>{error}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {teamId !== 2432 && (
                <button
                  onClick={() => {
                    setError(null);
                    handleSetTeamId(2432);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-colors shadow-xs"
                >
                  Switch to Demo Team #2432
                </button>
              )}
              <button
                onClick={() => setError(null)}
                className="px-2 py-1 text-rose-400 hover:text-white font-mono text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Global Loading Shimmer */}
        {loading && !bootstrap && (
          <div className="py-24 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg mx-auto animate-bounce">
              FP
            </div>
            <div className="text-base font-bold text-white">Loading Official FPL Data...</div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Fetching players, fixtures, underlying statistics, and season rules.
            </p>
          </div>
        )}

        {/* Team Input Onboarding / Recovery Screen (If no team is connected or squad failed to load) */}
        {(!teamId || !picksData) && bootstrap && !loading && (
          <div className="max-w-md mx-auto py-8 sm:py-16 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> 100% Free · No Logins · Unofficial
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {teamId ? 'Enter or Change FPL Team ID' : 'Enter Your FPL Team ID'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Unlock your explainable best starting XI, captain choice, transfer recommendations, and
                fixture ticker.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  FPL Team / Manager ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="e.g. 1, 2432, or your team ID"
                    value={teamIdInput || (teamId ? String(teamId) : '')}
                    onChange={(e) => setTeamIdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (teamIdInput || teamId)) {
                        handleSetTeamId(Number(teamIdInput || teamId));
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    onClick={() => {
                      const idToUse = Number(teamIdInput || teamId);
                      if (idToUse) handleSetTeamId(idToUse);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 active:scale-95 whitespace-nowrap"
                  >
                    Analyze Team
                  </button>
                  {teamId && (
                    <button
                      onClick={handleClearTeam}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
                      title="Clear saved team ID"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Demo Teams Quick Loader */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-400 mb-2">Or test immediately with demo teams:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setError(null);
                      handleSetTeamId(2432);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/50 text-indigo-200 text-xs font-semibold font-mono transition-colors flex items-center gap-1.5"
                  >
                    <span>⚡ Team #2432 (Top 10k Ready)</span>
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      handleSetTeamId(1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                  >
                    Team #1 (Solio Moose)
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      handleSetTeamId(1000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                  >
                    Team #1000
                  </button>
                </div>
              </div>

              {/* How to find ID Accordion */}
              <div className="pt-2">
                <button
                  onClick={() => setShowIdHelp(!showIdHelp)}
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Where do I find my Team ID?</span>
                </button>

                {showIdHelp && (
                  <div className="mt-2 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1.5">
                    <p>1. Go to <a href="https://fantasy.premierleague.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline">fantasy.premierleague.com</a> in your browser.</p>
                    <p>2. Click the <strong>Points</strong> tab or <strong>Pick Team</strong> tab.</p>
                    <p>3. Look at the web address URL in your browser bar:</p>
                    <div className="p-2 bg-slate-900 rounded font-mono text-[11px] text-indigo-400">
                      https://fantasy.premierleague.com/entry/<strong>123456</strong>/event/...
                    </div>
                    <p>The numbers in that section are your official Team ID!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loaded Dashboard View */}
        {teamId && bootstrap && picksData && (
          <div className="space-y-4">
            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-md max-w-fit">
              <button
                onClick={() => setActiveTab('pitch')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'pitch'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Pitch & Best XI</span>
              </button>

              <button
                onClick={() => setActiveTab('transfers')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'transfers'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Transfers</span>
              </button>

              <button
                onClick={() => setActiveTab('fixtures')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'fixtures'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Fixture Ticker</span>
              </button>

              <button
                onClick={() => setActiveTab('players')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'players'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Player Explorer</span>
              </button>

              <button
                onClick={() => setActiveTab('chips')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'chips'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Chips & Strategy</span>
              </button>

              <button
                onClick={() => setActiveTab('live')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'live'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Live Tracker</span>
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'pitch' && optimizedSquad && (
              <PitchView
                optimizedSquad={optimizedSquad}
                preferDifferential={preferDifferential}
                onToggleDifferential={handleToggleDiff}
                selectedFormation={selectedFormation}
                onSelectFormation={(fmt) => setSelectedFormation(fmt)}
                onOpenSquadEditor={() => setShowSquadEditor(true)}
                onSyncWithFPL={handleSyncWithFPL}
                isSyncing={isSyncing}
                hasCustomTransfers={Boolean(customSquadIds && customSquadIds.length === 15)}
                onResetToOfficial={handleResetToOfficial}
              />
            )}

            {activeTab === 'transfers' && (
              <TransfersView
                squad={userSquad}
                allPlayers={allAnalyzedPlayers}
                bank={effectiveBank}
                freeTransfers={1}
              />
            )}

            {activeTab === 'fixtures' && currentEvent && (
              <FixturesView
                teams={bootstrap.teams}
                fixtures={fixtures}
                events={bootstrap.events}
                currentEventId={nextEvent?.id || currentEvent.id}
              />
            )}

            {activeTab === 'players' && (
              <PlayerExplorerView
                allPlayers={allAnalyzedPlayers}
                teams={bootstrap.teams}
                elements={bootstrap.elements}
              />
            )}

            {activeTab === 'chips' && currentEvent && (
              <ChipsView
                chipRules={bootstrap.chips}
                history={history}
                entry={entry}
                currentGW={nextEvent?.id || currentEvent.id}
                events={bootstrap.events}
                fixtures={fixtures}
                squad={userSquad}
                bank={effectiveBank}
              />
            )}

            {activeTab === 'live' && currentEvent && optimizedSquad && (
              <LiveTrackerView
                squad={userSquad}
                currentEvent={currentEvent}
                captainId={optimizedSquad.captain.element.id}
                viceCaptainId={optimizedSquad.viceCaptain.element.id}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb Zone) */}
      {teamId && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 grid grid-cols-6 items-center h-16 px-1">
          <button
            onClick={() => setActiveTab('pitch')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'pitch' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">Best XI</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'transfers' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">Transfers</span>
          </button>

          <button
            onClick={() => setActiveTab('fixtures')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'fixtures' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">Ticker</span>
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'players' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">Players</span>
          </button>

          <button
            onClick={() => setActiveTab('chips')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'chips' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">Chips</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'live' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">Live</span>
          </button>
        </nav>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          weights={weights}
          onUpdateWeights={handleUpdateWeights}
          onResetWeights={handleResetWeights}
          onClearTeam={handleClearTeam}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Share Modal */}
      {showShare && optimizedSquad && currentEvent && (
        <ShareModal
          optimizedSquad={optimizedSquad}
          currentEvent={nextEvent || currentEvent}
          teamName={entry?.name || 'My Squad'}
          topTransfer={topTransfer}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Squad Editor / Apply Pending Transfers Modal */}
      {showSquadEditor && (
        <SquadEditorModal
          isOpen={showSquadEditor}
          onClose={() => setShowSquadEditor(false)}
          currentSquad={userSquad}
          allPlayers={allAnalyzedPlayers}
          bank={effectiveBank}
          onSaveSquad={handleSaveCustomSquad}
          onResetToOfficial={handleResetToOfficial}
          hasCustomTransfers={Boolean(customSquadIds && customSquadIds.length === 15)}
        />
      )}
    </div>
  );
}
