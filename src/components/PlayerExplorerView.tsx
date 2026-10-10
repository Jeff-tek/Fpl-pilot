import React, { useState } from 'react';
import { PlayerWithAnalysis, FPLElement, FPLTeam } from '../types/fpl';
import { getMarketMovers } from '../lib/analytics/healthAndMarket';
import { getClubStyle, getFDRBadgeStyle } from '../lib/constants/teams';
import { PlayerModal } from './PlayerModal';
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRightLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface PlayerExplorerViewProps {
  allPlayers: PlayerWithAnalysis[];
  teams: FPLTeam[];
  elements: FPLElement[];
}

export const PlayerExplorerView: React.FC<PlayerExplorerViewProps> = ({
  allPlayers,
  teams,
  elements,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'differentials' | 'price_watch' | 'compare'>('all');

  // Filter state
  const [search, setSearch] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<number | 'ALL'>('ALL');
  const [maxPrice, setMaxPrice] = useState<number>(150);
  const [sortBy, setSortBy] = useState<'xPts' | 'form' | 'points' | 'price' | 'selected'>('xPts');

  // Compare mode state
  const [comparePlayer1, setComparePlayer1] = useState<PlayerWithAnalysis | null>(null);
  const [comparePlayer2, setComparePlayer2] = useState<PlayerWithAnalysis | null>(null);

  // Market movers
  const { likelyRisings, likelyFallings } = getMarketMovers(elements, teams);

  // Differentials: < 10% owned, sorted by xPts
  const differentials = allPlayers
    .filter((p) => parseFloat(p.element.selected_by_percent) < 10.0 && p.element.status !== 'i')
    .sort((a, b) => b.xPts - a.xPts)
    .slice(0, 20);

  // Best value per million (total points / cost in millions)
  const valuePicks = allPlayers
    .filter((p) => p.element.minutes >= 300)
    .map((p) => ({
      player: p,
      valueRatio: p.element.total_points / (p.element.now_cost / 10),
    }))
    .sort((a, b) => b.valueRatio - a.valueRatio)
    .slice(0, 20);

  // General Filter
  const filteredPlayers = allPlayers
    .filter((p) => {
      if (positionFilter !== 'ALL' && p.positionName !== positionFilter) return false;
      if (teamFilter !== 'ALL' && p.element.team !== teamFilter) return false;
      if (p.element.now_cost > maxPrice) return false;
      if (search) {
        const query = search.toLowerCase();
        const matchName =
          p.element.web_name.toLowerCase().includes(query) ||
          p.element.first_name.toLowerCase().includes(query) ||
          p.element.second_name.toLowerCase().includes(query);
        const matchTeam = p.team.name.toLowerCase().includes(query) || p.team.short_name.toLowerCase().includes(query);
        if (!matchName && !matchTeam) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'xPts') return b.xPts - a.xPts;
      if (sortBy === 'form') return (parseFloat(b.element.form) || 0) - (parseFloat(a.element.form) || 0);
      if (sortBy === 'points') return b.element.total_points - a.element.total_points;
      if (sortBy === 'price') return b.element.now_cost - a.element.now_cost;
      return (parseFloat(b.element.selected_by_percent) || 0) - (parseFloat(a.element.selected_by_percent) || 0);
    });

  return (
    <div className="space-y-4">
      {/* Tab Header Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Players ({filteredPlayers.length})
          </button>
          <button
            onClick={() => setActiveTab('differentials')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'differentials' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Differentials & Value
          </button>
          <button
            onClick={() => setActiveTab('price_watch')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'price_watch' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Price Change Watch
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'compare' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Compare 2 Players
          </button>
        </div>
      </div>

      {activeTab === 'all' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search player or club..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Position Filter */}
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                {['ALL', 'GKP', 'DEF', 'MID', 'FWD'].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`flex-1 py-1 rounded text-center transition-colors font-mono font-bold ${
                      positionFilter === pos ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none"
              >
                <option value="xPts">Sort by Expected Points (xPts)</option>
                <option value="form">Sort by Recent Form</option>
                <option value="points">Sort by Total Points</option>
                <option value="price">Sort by Price (Highest)</option>
                <option value="selected">Sort by Ownership %</option>
              </select>
            </div>
          </div>

          {/* Players Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="p-3">Player</th>
                    <th className="p-3">Club</th>
                    <th className="p-3">Pos</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Form</th>
                    <th className="p-3 text-right">Total Pts</th>
                    <th className="p-3 text-right">Own %</th>
                    <th className="p-3">Next Fixture</th>
                    <th className="p-3 text-right">xPts</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPlayers.slice(0, 50).map((p) => {
                    const nextFix = p.upcomingFixtures[0];
                    const fdrStyle = nextFix ? getFDRBadgeStyle(nextFix.difficulty) : null;

                    return (
                      <tr
                        key={p.element.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td
                          className="p-3 font-bold text-white cursor-pointer hover:underline"
                          onClick={() => setSelectedPlayer(p)}
                        >
                          {p.element.web_name}
                          {p.element.news && (
                            <span className="text-[10px] text-amber-400 ml-1.5">!</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 font-mono">{p.team.short_name}</td>
                        <td className="p-3 text-slate-400 font-mono">{p.positionName}</td>
                        <td className="p-3 text-right font-mono text-slate-300">
                          £{(p.element.now_cost / 10).toFixed(1)}m
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">{p.element.form}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{p.element.total_points}</td>
                        <td className="p-3 text-right font-mono text-slate-400">
                          {p.element.selected_by_percent}%
                        </td>
                        <td className="p-3">
                          {nextFix && fdrStyle ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${fdrStyle.bg} ${fdrStyle.text}`}
                            >
                              {nextFix.isHome ? 'vs' : '@'} {nextFix.opponent.short_name} ({nextFix.difficulty})
                            </span>
                          ) : (
                            <span className="text-slate-400">Blank</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400 tabular-nums">
                          {p.xPts.toFixed(1)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              if (!comparePlayer1) setComparePlayer1(p);
                              else if (!comparePlayer2) {
                                setComparePlayer2(p);
                                setActiveTab('compare');
                              } else {
                                setComparePlayer1(p);
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                          >
                            Compare
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'differentials' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Low-Owned High-xPts Gems */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Low Ownership Gems (&lt; 10% Owned)
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                High projected xPts players ignored by the template to gain rank quickly.
              </p>
              <div className="space-y-2">
                {differentials.slice(0, 10).map((p) => (
                  <div
                    key={p.element.id}
                    onClick={() => setSelectedPlayer(p)}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-white">{p.element.web_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {p.team.short_name} · {p.positionName} · £{(p.element.now_cost / 10).toFixed(1)}m · {p.element.selected_by_percent}% owned
                      </div>
                    </div>
                    <div className="font-mono font-bold text-emerald-400 tabular-nums text-sm">
                      {p.xPts.toFixed(1)} xPts
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Value per Million */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Best Value Picks (Points Per £m)
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Highest points delivered per million pounds spent this season.
              </p>
              <div className="space-y-2">
                {valuePicks.slice(0, 10).map(({ player: p, valueRatio }) => (
                  <div
                    key={p.element.id}
                    onClick={() => setSelectedPlayer(p)}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-white">{p.element.web_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {p.team.short_name} · {p.positionName} · £{(p.element.now_cost / 10).toFixed(1)}m · {p.element.total_points} pts
                      </div>
                    </div>
                    <div className="font-mono font-bold text-emerald-400 tabular-nums text-sm">
                      {valueRatio.toFixed(1)} pts/£m
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'price_watch' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400">
            <span className="font-bold text-slate-300">Market Note:</span> Price changes are calculated
            from live event net transfers (`transfers_in_event - transfers_out_event`). The exact official FPL
            formula is proprietary, so these projections represent data-driven estimates.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Likely Risers */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Predicted Price Rises
              </h3>
              <div className="space-y-2">
                {likelyRisings.length > 0 ? (
                  likelyRisings.map((m) => (
                    <div
                      key={m.element.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{m.element.web_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {m.team.short_name} · {m.priceStr}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-mono font-bold">
                          +{m.netTransfers.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">net in</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">
                    No significant price rises projected today.
                  </div>
                )}
              </div>
            </div>

            {/* Likely Fallers */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" /> Predicted Price Falls
              </h3>
              <div className="space-y-2">
                {likelyFallings.length > 0 ? (
                  likelyFallings.map((m) => (
                    <div
                      key={m.element.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{m.element.web_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {m.team.short_name} · {m.priceStr}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-rose-400 font-mono font-bold">
                          {m.netTransfers.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">net out</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">
                    No significant price falls projected today.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Head-to-Head Player Comparison
            </h3>
            <span className="text-xs text-slate-400">
              Select two players to evaluate metrics side-by-side
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 Picker */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Player 1:</label>
              <select
                value={comparePlayer1?.element.id || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setComparePlayer1(allPlayers.find((p) => p.element.id === id) || null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                <option value="">Select Player 1...</option>
                {allPlayers.slice(0, 100).map((p) => (
                  <option key={p.element.id} value={p.element.id}>
                    {p.element.web_name} ({p.team.short_name} - £{(p.element.now_cost / 10).toFixed(1)}m)
                  </option>
                ))}
              </select>
            </div>

            {/* Player 2 Picker */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Player 2:</label>
              <select
                value={comparePlayer2?.element.id || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setComparePlayer2(allPlayers.find((p) => p.element.id === id) || null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                <option value="">Select Player 2...</option>
                {allPlayers.slice(0, 100).map((p) => (
                  <option key={p.element.id} value={p.element.id}>
                    {p.element.web_name} ({p.team.short_name} - £{(p.element.now_cost / 10).toFixed(1)}m)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {comparePlayer1 && comparePlayer2 ? (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2 text-left w-1/3">Metric</th>
                    <th className="p-2 text-center w-1/3 font-bold text-white text-sm">
                      {comparePlayer1.element.web_name}
                    </th>
                    <th className="p-2 text-center w-1/3 font-bold text-white text-sm">
                      {comparePlayer2.element.web_name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="p-2.5 text-slate-400">Position & Team</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer1.positionName} · {comparePlayer1.team.short_name}</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer2.positionName} · {comparePlayer2.team.short_name}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400">Expected Points (Next GW)</td>
                    <td className="p-2.5 text-center font-bold text-emerald-400">{comparePlayer1.xPts.toFixed(1)}</td>
                    <td className="p-2.5 text-center font-bold text-emerald-400">{comparePlayer2.xPts.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400">Price</td>
                    <td className="p-2.5 text-center text-white">£{(comparePlayer1.element.now_cost / 10).toFixed(1)}m</td>
                    <td className="p-2.5 text-center text-white">£{(comparePlayer2.element.now_cost / 10).toFixed(1)}m</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400">Form (Last 30 Days)</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer1.element.form}</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer2.element.form}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400">Expected Goals (xG)</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer1.element.expected_goals}</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer2.element.expected_goals}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400">Expected Assists (xA)</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer1.element.expected_assists}</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer2.element.expected_assists}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400">ICT Index</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer1.element.ict_index}</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer2.element.ict_index}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400">Selected By %</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer1.element.selected_by_percent}%</td>
                    <td className="p-2.5 text-center text-white">{comparePlayer2.element.selected_by_percent}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-6 text-center">
              Please choose two players above to view their head-to-head statistical breakdown.
            </div>
          )}
        </div>
      )}

      {/* Selected Player Details Modal */}
      <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
};
