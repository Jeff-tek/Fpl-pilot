import React, { useState, useMemo } from 'react';
import { PlayerWithAnalysis, FPLTeam } from '../types/fpl';
import { Jersey } from './Jersey';
import { getClubStyle, getFDRBadgeStyle } from '../lib/constants/teams';
import {
  X,
  Search,
  ArrowRightLeft,
  RotateCcw,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
  Info,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

interface SquadEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSquad: PlayerWithAnalysis[];
  allPlayers: PlayerWithAnalysis[];
  bank: number; // in tenths of £m
  onSaveSquad: (newSquadElementIds: number[], newBank: number) => void;
  onResetToOfficial: () => void;
  hasCustomTransfers: boolean;
}

export const SquadEditorModal: React.FC<SquadEditorModalProps> = ({
  isOpen,
  onClose,
  currentSquad,
  allPlayers,
  bank,
  onSaveSquad,
  onResetToOfficial,
  hasCustomTransfers,
}) => {
  // Working list of player IDs (15 players)
  const [workingSquadIds, setWorkingSquadIds] = useState<number[]>(() =>
    currentSquad.map((p) => p.element.id)
  );

  // Working bank
  const [workingBank, setWorkingBank] = useState<number>(bank);

  // Player being swapped out (if any)
  const [playerToSwapOut, setPlayerToSwapOut] = useState<PlayerWithAnalysis | null>(null);

  // Search & Filter state for replacement drawer
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'xPts' | 'form' | 'cost' | 'selected'>('xPts');
  const [showExplanation, setShowExplanation] = useState(false);

  // Update working state when props change
  React.useEffect(() => {
    setWorkingSquadIds(currentSquad.map((p) => p.element.id));
    setWorkingBank(bank);
  }, [currentSquad, bank, isOpen]);

  if (!isOpen) return null;

  // Map of all players by ID for fast lookup
  const playerMap = useMemo(() => {
    const map = new Map<number, PlayerWithAnalysis>();
    allPlayers.forEach((p) => map.set(p.element.id, p));
    return map;
  }, [allPlayers]);

  // Current working squad objects
  const workingPlayers = useMemo(() => {
    return workingSquadIds
      .map((id) => playerMap.get(id))
      .filter((p): p is PlayerWithAnalysis => Boolean(p));
  }, [workingSquadIds, playerMap]);

  // Count players per club in working squad
  const clubCounts = useMemo(() => {
    const counts = new Map<number, number>();
    workingPlayers.forEach((p) => {
      counts.set(p.team.id, (counts.get(p.team.id) || 0) + 1);
    });
    return counts;
  }, [workingPlayers]);

  // Distinct clubs for filter dropdown
  const uniqueClubs = useMemo(() => {
    const clubs = new Map<number, FPLTeam>();
    allPlayers.forEach((p) => clubs.set(p.team.id, p.team));
    return Array.from(clubs.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPlayers]);

  // Filtered available replacements when a player is selected to swap
  const availableReplacements = useMemo(() => {
    if (!playerToSwapOut) return [];

    const targetPos = playerToSwapOut.positionName;
    const currentOutClubId = playerToSwapOut.team.id;
    const currentId = playerToSwapOut.element.id;

    return allPlayers
      .filter((candidate) => {
        // Must match exact position (GKP with GKP, DEF with DEF, etc.) to maintain valid squad balance
        if (candidate.positionName !== targetPos) return false;

        // Cannot already be in working squad
        if (workingSquadIds.includes(candidate.element.id) && candidate.element.id !== currentId) {
          return false;
        }

        // Club rule: Cannot exceed 3 players per club
        // If candidate belongs to a club that already has 3 players, check if targetOut is also from that club
        const countInClub = clubCounts.get(candidate.team.id) || 0;
        const netClubCount = candidate.team.id === currentOutClubId ? countInClub - 1 : countInClub;
        if (netClubCount >= 3) return false;

        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName =
            candidate.element.web_name.toLowerCase().includes(q) ||
            candidate.element.first_name.toLowerCase().includes(q) ||
            candidate.element.second_name.toLowerCase().includes(q);
          const matchClub =
            candidate.team.name.toLowerCase().includes(q) ||
            candidate.team.short_name.toLowerCase().includes(q);
          if (!matchName && !matchClub) return false;
        }

        // Club filter
        if (selectedClub !== 'ALL' && candidate.team.short_name !== selectedClub) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'xPts') return b.xPts - a.xPts;
        if (sortBy === 'form') return Number(b.element.form) - Number(a.element.form);
        if (sortBy === 'cost') return b.element.now_cost - a.element.now_cost;
        if (sortBy === 'selected')
          return Number(b.element.selected_by_percent) - Number(a.element.selected_by_percent);
        return 0;
      });
  }, [playerToSwapOut, allPlayers, workingSquadIds, clubCounts, searchQuery, selectedClub, sortBy]);

  // Handle swapping player
  const handleExecuteSwap = (incomingPlayer: PlayerWithAnalysis) => {
    if (!playerToSwapOut) return;

    const oldPlayerCost = playerToSwapOut.element.now_cost;
    const newPlayerCost = incomingPlayer.element.now_cost;
    const costDiff = oldPlayerCost - newPlayerCost; // positive = budget gained, negative = budget spent

    const updatedIds = workingSquadIds.map((id) =>
      id === playerToSwapOut.element.id ? incomingPlayer.element.id : id
    );

    setWorkingSquadIds(updatedIds);
    setWorkingBank((prev) => Math.max(0, prev + costDiff));
    setPlayerToSwapOut(null);
    setSearchQuery('');
  };

  // Check if any changes have been made compared to initial currentSquad
  const hasPendingChanges = useMemo(() => {
    const currentIds = currentSquad.map((p) => p.element.id);
    if (workingSquadIds.length !== currentIds.length) return true;
    const isDifferent = workingSquadIds.some((id, idx) => id !== currentIds[idx]);
    return isDifferent || workingBank !== bank;
  }, [workingSquadIds, currentSquad, workingBank, bank]);

  const handleSave = () => {
    onSaveSquad(workingSquadIds, workingBank);
    onClose();
  };

  // Group working players by position
  const gkps = workingPlayers.filter((p) => p.positionName === 'GKP');
  const defs = workingPlayers.filter((p) => p.positionName === 'DEF');
  const mids = workingPlayers.filter((p) => p.positionName === 'MID');
  const fwds = workingPlayers.filter((p) => p.positionName === 'FWD');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Apply Pending Transfers / Edit Squad</span>
                {hasCustomTransfers && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Transfers Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Swap transferred players into your squad ahead of the Gameweek deadline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800/60 rounded-xl transition-colors text-xs flex items-center gap-1.5"
              title="Why do I need to do this?"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Why isn't this automatic?</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informative Explanation Collapsible */}
        {showExplanation && (
          <div className="p-4 bg-indigo-950/30 border-b border-indigo-800/40 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <Info className="w-4 h-4" />
              <span>Official Fantasy Premier League API Privacy Rule</span>
            </div>
            <p>
              When you make transfers in the official FPL game or mobile app before a Gameweek deadline,{' '}
              <strong>Premier League keeps those transfers strictly confidential and secret</strong>. The
              public FPL API deliberately conceals upcoming transfers to prevent mini-league rivals from
              spying on your lineup.
            </p>
            <p className="text-slate-400">
              FPL only publishes your new squad once the deadline has officially passed. By using this
              instant swapper, your new players immediately appear in your <strong>Best XI, Captaincy,
              Fixture Ticker, and xPts recommendations</strong>!
            </p>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Top Bar: Bank & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>In the Bank:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  £{(workingBank / 10).toFixed(1)}m
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWorkingBank((b) => Math.max(0, b - 5))}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                  title="Decrease bank by £0.5m"
                >
                  -0.5m
                </button>
                <button
                  onClick={() => setWorkingBank((b) => b + 5)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                  title="Increase bank by £0.5m"
                >
                  +0.5m
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasCustomTransfers && (
                <button
                  onClick={onResetToOfficial}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Official FPL Squad</span>
                </button>
              )}
            </div>
          </div>

          {/* Replacement Drawer if a player is selected to swap */}
          {playerToSwapOut ? (
            <div className="p-4 bg-indigo-950/30 border border-indigo-700/50 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-indigo-800/50 pb-3">
                <div className="flex items-center gap-3">
                  <Jersey
                    teamShortName={playerToSwapOut.team.short_name}
                    isGkp={playerToSwapOut.positionName === 'GKP'}
                    size={38}
                  />
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold">
                      Transferring Out:
                    </div>
                    <div className="text-sm font-extrabold text-white">
                      {playerToSwapOut.element.web_name}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        ({playerToSwapOut.team.short_name}) · £
                        {(playerToSwapOut.element.now_cost / 10).toFixed(1)}m · {playerToSwapOut.xPts.toFixed(1)} xPts
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPlayerToSwapOut(null);
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel Swap
                </button>
              </div>

              {/* Filters for replacement */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative sm:col-span-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${playerToSwapOut.positionName}s...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-2 sm:col-span-2">
                  <select
                    value={selectedClub}
                    onChange={(e) => setSelectedClub(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Clubs</option>
                    {uniqueClubs.map((t) => (
                      <option key={t.id} value={t.short_name}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="xPts">Sort by Expected Pts (xPts)</option>
                    <option value="form">Sort by Form</option>
                    <option value="cost">Sort by Cost</option>
                    <option value="selected">Sort by Ownership %</option>
                  </select>
                </div>
              </div>

              {/* Candidates Grid */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80 rounded-xl border border-slate-800/80 bg-slate-950/80">
                {availableReplacements.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No matching {playerToSwapOut.positionName} found matching your search.
                  </div>
                ) : (
                  availableReplacements.slice(0, 30).map((candidate) => {
                    const priceDiff = (playerToSwapOut.element.now_cost - candidate.element.now_cost) / 10;
                    const canAfford = workingBank + (playerToSwapOut.element.now_cost - candidate.element.now_cost) >= 0;

                    return (
                      <div
                        key={candidate.element.id}
                        className={`p-2.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors ${
                          !canAfford ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Jersey
                            teamShortName={candidate.team.short_name}
                            isGkp={candidate.positionName === 'GKP'}
                            size={32}
                          />
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>{candidate.element.web_name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({candidate.team.short_name})
                              </span>
                              {candidate.element.status !== 'a' && (
                                <span className="text-[10px] text-amber-400 font-mono">
                                  [{candidate.element.status}]
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>£{(candidate.element.now_cost / 10).toFixed(1)}m</span>
                              <span>·</span>
                              <span className="text-emerald-400 font-semibold">
                                {candidate.xPts.toFixed(1)} xPts
                              </span>
                              <span>·</span>
                              <span>Form: {candidate.element.form}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-mono font-semibold ${
                              priceDiff >= 0 ? 'text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            {priceDiff >= 0 ? `+£${priceDiff.toFixed(1)}m` : `-£${Math.abs(priceDiff).toFixed(1)}m`}
                          </span>

                          <button
                            onClick={() => handleExecuteSwap(candidate)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
                          >
                            <span>Buy</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {/* Current 15-Player Squad Grid by Position */}
          <div className="space-y-4">
            {/* Goalkeepers */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Goalkeepers (2)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {gkps.map((p) => renderSquadCard(p))}
              </div>
            </div>

            {/* Defenders */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Defenders (5)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {defs.map((p) => renderSquadCard(p))}
              </div>
            </div>

            {/* Midfielders */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Midfielders (5)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {mids.map((p) => renderSquadCard(p))}
              </div>
            </div>

            {/* Forwards */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Forwards (3)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {fwds.map((p) => renderSquadCard(p))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {hasPendingChanges ? (
              <span className="text-indigo-400 font-semibold">
                ● Pending changes ready to apply
              </span>
            ) : (
              <span>Tap "Swap" on any player to replace them.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Apply Squad to FPL Pilot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function renderSquadCard(player: PlayerWithAnalysis) {
    const isFlagged = player.element.status !== 'a';
    const nextFixture = player.upcomingFixtures[0];
    const fdrStyle = nextFixture ? getFDRBadgeStyle(nextFixture.difficulty) : null;
    const isSelectedToSwap = playerToSwapOut?.element.id === player.element.id;

    return (
      <div
        key={player.element.id}
        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
          isSelectedToSwap
            ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30'
            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Jersey
            teamShortName={player.team.short_name}
            isGkp={player.positionName === 'GKP'}
            size={36}
          />
          <div className="min-w-0">
            <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
              <span>{player.element.web_name}</span>
              {isFlagged && (
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title={player.element.news} />
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{player.team.short_name}</span>
              <span>·</span>
              <span>£{(player.element.now_cost / 10).toFixed(1)}m</span>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">{player.xPts.toFixed(1)} xPts</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setPlayerToSwapOut(player);
            setSearchQuery('');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
            isSelectedToSwap
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Swap</span>
        </button>
      </div>
    );
  }
};
