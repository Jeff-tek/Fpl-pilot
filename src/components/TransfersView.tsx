import React, { useState } from 'react';
import {
  PlayerWithAnalysis,
  TransferSuggestion,
  DoubleTransferSuggestion,
} from '../types/fpl';
import { findBestTransfers } from '../lib/optimizer/transfers';
import { getFDRBadgeStyle } from '../lib/constants/teams';
import { Jersey } from './Jersey';
import { PlayerModal } from './PlayerModal';
import {
  ArrowRight,
  ArrowLeftRight,
  Coins,
  Plus,
  Trash2,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Calendar,
  ShieldAlert,
} from 'lucide-react';

interface TransfersViewProps {
  squad: PlayerWithAnalysis[];
  allPlayers: PlayerWithAnalysis[];
  bank: number; // in tenths
  freeTransfers: number;
  onUpdateBank?: (newBank: number) => void;
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  squad,
  allPlayers,
  bank,
  freeTransfers: initialFreeTransfers,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'recommended' | 'sandbox'>('recommended');
  const [freeTransfers, setFreeTransfers] = useState<number>(initialFreeTransfers || 1);
  const [hitCostPoints] = useState<number>(4);

  // Strategic Planning Horizon selector
  const [lookaheadGWs, setLookaheadGWs] = useState<number>(5);
  const [strategyMode, setStrategyMode] = useState<'long_term' | 'medium_term' | 'immediate'>('long_term');

  // Transfer Sandbox State
  const [sandboxOuts, setSandboxOuts] = useState<PlayerWithAnalysis[]>([]);
  const [sandboxIns, setSandboxIns] = useState<PlayerWithAnalysis[]>([]);
  const [sandboxCandidateFilter, setSandboxCandidateFilter] = useState<string>('');

  // Calculate best strategic suggestions
  const { singleTransfers, doubleTransfers } = findBestTransfers(squad, allPlayers, {
    bank,
    freeTransfers,
    hitCostPoints,
    lookaheadGWs,
    strategyMode,
  });

  // Sandbox Budget calculation
  const totalSoldValue = sandboxOuts.reduce((sum, p) => sum + p.sellingPrice, 0);
  const totalBoughtCost = sandboxIns.reduce((sum, p) => sum + p.element.now_cost, 0);
  const remainingBudget = bank + totalSoldValue - totalBoughtCost;

  // Sandbox Club limit check
  const clubCounts: Record<number, number> = {};
  for (const p of squad) {
    if (!sandboxOuts.some((out) => out.element.id === p.element.id)) {
      clubCounts[p.element.team] = (clubCounts[p.element.team] || 0) + 1;
    }
  }
  for (const inP of sandboxIns) {
    clubCounts[inP.element.team] = (clubCounts[inP.element.team] || 0) + 1;
  }
  const clubLimitExceeded = Object.values(clubCounts).some((count) => count > 3);

  // Sandbox net points benefit
  const outXPts = sandboxOuts.reduce((s, p) => s + p.xPts, 0);
  const inXPts = sandboxIns.reduce((s, p) => s + p.xPts, 0);
  const rawGain = inXPts - outXPts;
  const transfersCount = Math.max(sandboxOuts.length, sandboxIns.length);
  const extraTransfers = Math.max(0, transfersCount - freeTransfers);
  const sandboxHit = extraTransfers * hitCostPoints;
  const sandboxNet = Number((rawGain - sandboxHit).toFixed(2));

  // Render player mini upcoming fixture run (next 4-5 fixtures)
  const renderFixtureRun = (player: PlayerWithAnalysis) => {
    const fixtures = player.upcomingFixtures.slice(0, lookaheadGWs);
    return (
      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
        {fixtures.map((f, i) => {
          const badge = getFDRBadgeStyle(f.difficulty);
          return (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] shrink-0 leading-tight ${badge.bg} ${badge.text}`}
              title={`${f.isHome ? 'Home' : 'Away'} vs ${f.opponent.name} (FDR ${f.difficulty})`}
            >
              {f.opponent.short_name} ({f.isHome ? 'H' : 'A'}) {f.difficulty}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Strategic Transfer Engine Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Long-Term Strategic Transfer Engine</span>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5 text-amber-300">
                <Coins className="w-4 h-4" />
                <span className="font-mono font-bold text-sm">
                  Bank: £{(bank / 10).toFixed(1)}m
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono">
                Free Transfers:{' '}
                <select
                  value={freeTransfers}
                  onChange={(e) => setFreeTransfers(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-0.5 text-xs focus:outline-none"
                >
                  <option value={1}>1 Free Transfer</option>
                  <option value={2}>2 Free Transfers</option>
                  <option value={3}>3 Free Transfers</option>
                  <option value={4}>4 Free Transfers</option>
                  <option value={5}>5 Free Transfers</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('recommended')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'recommended'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Strategic Moves
            </button>
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'sandbox'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom Sandbox
            </button>
          </div>
        </div>

        {/* Strategic Horizon & Strategy Selector */}
        {activeTab === 'recommended' && (
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Planning Horizon:</span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => {
                    setLookaheadGWs(5);
                    setStrategyMode('long_term');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    lookaheadGWs === 5
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🌟 Long-Term (5 GWs)
                </button>
                <button
                  onClick={() => {
                    setLookaheadGWs(3);
                    setStrategyMode('medium_term');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    lookaheadGWs === 3
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Medium-Term (3 GWs)
                </button>
                <button
                  onClick={() => {
                    setLookaheadGWs(1);
                    setStrategyMode('immediate');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    lookaheadGWs === 1
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⏱️ Next GW Only
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Evaluates fixture runs, injury returns, and multi-GW xPts
            </div>
          </div>
        )}
      </div>

      {activeTab === 'recommended' ? (
        <div className="space-y-6">
          {/* Top 1-Transfer Strategic Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Top 1-Transfer Strategic Moves</span>
                <span className="text-xs text-slate-400 font-normal">
                  (Ranked by {lookaheadGWs}-GW fixture run & long-term value)
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {singleTransfers.length > 0 ? (
                singleTransfers.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all shadow-md flex flex-col justify-between space-y-3"
                  >
                    {/* Header: Score & Strategic Tags */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 font-mono font-bold text-[10px]">
                          Strategic Rating: {item.strategicScore}/100
                        </span>
                        {item.isInjuryReplacement && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800/80 font-mono font-bold text-[10px] flex items-center gap-1">
                            🚨 Injury Exit
                          </span>
                        )}
                        {item.horizonAvgFdrOut - item.horizonAvgFdrIn >= 0.8 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-mono font-bold text-[10px]">
                            🗓️ Green Fixture Swing
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">5-GW Gain</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                          +{item.horizonNetGain} xPts
                        </span>
                      </div>
                    </div>

                    {/* Main Head-to-Head Player Card */}
                    <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      {/* Out Player */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Jersey
                            teamShortName={item.outPlayer.team.short_name}
                            isGkp={item.outPlayer.positionName === 'GKP'}
                            size={32}
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] text-rose-400 font-mono uppercase font-bold block">
                              TRANSFER OUT
                            </span>
                            <button
                              onClick={() => setSelectedPlayer(item.outPlayer)}
                              className="font-bold text-white text-xs truncate block hover:underline"
                            >
                              {item.outPlayer.element.web_name}
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono">
                              £{(item.outPlayer.sellingPrice / 10).toFixed(1)}m · {item.outPlayerHorizonXPts} xPts ({lookaheadGWs} GWs)
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 mb-0.5">Upcoming Fixtures (Avg FDR {item.horizonAvgFdrOut}):</div>
                          {renderFixtureRun(item.outPlayer)}
                        </div>
                      </div>

                      {/* In Player */}
                      <div className="space-y-1.5 border-l border-slate-800/80 pl-3">
                        <div className="flex items-center gap-2">
                          <Jersey
                            teamShortName={item.inPlayer.team.short_name}
                            isGkp={item.inPlayer.positionName === 'GKP'}
                            size={32}
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold block">
                              TRANSFER IN
                            </span>
                            <button
                              onClick={() => setSelectedPlayer(item.inPlayer)}
                              className="font-bold text-white text-xs truncate block hover:underline"
                            >
                              {item.inPlayer.element.web_name}
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono">
                              £{(item.inPlayer.element.now_cost / 10).toFixed(1)}m · {item.inPlayerHorizonXPts} xPts ({lookaheadGWs} GWs)
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 mb-0.5">Upcoming Fixtures (Avg FDR {item.horizonAvgFdrIn}):</div>
                          {renderFixtureRun(item.inPlayer)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Reasoning & Cost */}
                    <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
                      <div className="text-[11px] text-slate-300 leading-snug max-w-[75%]">
                        {item.reason}
                      </div>
                      <div className="font-mono text-right text-[11px]">
                        Cost: {item.costDiff >= 0 ? `+£${(item.costDiff / 10).toFixed(1)}m` : `-£${(Math.abs(item.costDiff) / 10).toFixed(1)}m`}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 col-span-2">
                  No immediate single transfers found that provide a significant points gain within your current budget.
                </div>
              )}
            </div>
          </div>

          {/* Top 2-Transfer Strategic Moves */}
          {doubleTransfers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Top 2-Transfer Strategic Restructures</span>
                  <span className="text-xs text-slate-400 font-normal">
                    (Double Move · Hit factored: -{Math.max(0, 2 - freeTransfers) * hitCostPoints} pts)
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {doubleTransfers.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      {/* Outs */}
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 font-mono text-[11px] font-bold">OUT:</span>
                        <span className="font-bold text-white">
                          {item.outPlayers[0].element.web_name} & {item.outPlayers[1].element.web_name}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          ({item.outPlayersHorizonXPts} pts over {lookaheadGWs} GWs)
                        </span>
                      </div>

                      <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />

                      {/* Ins */}
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono text-[11px] font-bold">IN:</span>
                        <span className="font-bold text-white">
                          {item.inPlayers[0].element.web_name} & {item.inPlayers[1].element.web_name}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          ({item.inPlayersHorizonXPts} pts over {lookaheadGWs} GWs)
                        </span>
                      </div>

                      <div className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                        +{item.horizonNetGain} Long-Term Net xPts
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                      <span>{item.reason}</span>
                      <span className="font-mono">
                        Cost delta: {item.costDiff >= 0 ? `+£${(item.costDiff / 10).toFixed(1)}m` : `-£${(Math.abs(item.costDiff) / 10).toFixed(1)}m`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Custom Sandbox Mode */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400">Budget Remaining:</span>{' '}
                  <span
                    className={`font-mono font-bold ${
                      remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    £{(remainingBudget / 10).toFixed(1)}m
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Points Hit:</span>{' '}
                  <span className="font-mono font-bold text-amber-300">-{sandboxHit} pts</span>
                </div>
                <div>
                  <span className="text-slate-400">Net Expected Gain:</span>{' '}
                  <span
                    className={`font-mono font-bold ${
                      sandboxNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {sandboxNet >= 0 ? `+${sandboxNet}` : sandboxNet} xPts
                  </span>
                </div>
              </div>

              {clubLimitExceeded && (
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Max 3 players per club exceeded!</span>
                </div>
              )}
            </div>

            {/* Current Sandbox Selections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sell Column */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Players To Transfer Out ({sandboxOuts.length})</span>
                </div>
                {sandboxOuts.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center">
                    Select a player below from your squad to sell
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {sandboxOuts.map((p) => (
                      <div
                        key={p.element.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Jersey teamShortName={p.team.short_name} isGkp={p.positionName === 'GKP'} size={24} />
                          <div>
                            <span className="font-bold text-white">{p.element.web_name}</span>
                            <span className="text-slate-400 ml-1 font-mono">
                              (£{(p.sellingPrice / 10).toFixed(1)}m)
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSandboxOuts(sandboxOuts.filter((x) => x.element.id !== p.element.id))}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buy Column */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Players To Transfer In ({sandboxIns.length})</span>
                </div>
                {sandboxIns.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center">
                    Search and pick candidate players to buy
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {sandboxIns.map((p) => (
                      <div
                        key={p.element.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Jersey teamShortName={p.team.short_name} isGkp={p.positionName === 'GKP'} size={24} />
                          <div>
                            <span className="font-bold text-white">{p.element.web_name}</span>
                            <span className="text-slate-400 ml-1 font-mono">
                              (£{(p.element.now_cost / 10).toFixed(1)}m · {p.xPts.toFixed(1)} xPts)
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSandboxIns(sandboxIns.filter((x) => x.element.id !== p.element.id))}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Candidate Quick Add Explorer */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-xs font-bold text-white mb-2">Add Candidate Players:</div>
              <input
                type="text"
                placeholder="Search Premier League player (e.g. Palmer, Saka, Isak, Wood)..."
                value={sandboxCandidateFilter}
                onChange={(e) => setSandboxCandidateFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 mb-2"
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {allPlayers
                  .filter((p) =>
                    sandboxCandidateFilter
                      ? p.element.web_name.toLowerCase().includes(sandboxCandidateFilter.toLowerCase()) ||
                        p.team.name.toLowerCase().includes(sandboxCandidateFilter.toLowerCase())
                      : p.xPts >= 5.0
                  )
                  .slice(0, 12)
                  .map((p) => (
                    <div
                      key={p.element.id}
                      className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <Jersey teamShortName={p.team.short_name} isGkp={p.positionName === 'GKP'} size={22} />
                        <div>
                          <div className="font-bold text-white">{p.element.web_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.positionName} · £{(p.element.now_cost / 10).toFixed(1)}m
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (!sandboxIns.some((x) => x.element.id === p.element.id)) {
                            setSandboxIns([...sandboxIns, p]);
                          }
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-white transition-colors"
                        title="Add to sandbox"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Player Details Modal */}
      <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
};
