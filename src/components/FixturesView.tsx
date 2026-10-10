import React, { useState } from 'react';
import { FPLTeam, FPLFixture, FPLEvent } from '../types/fpl';
import { buildFixtureTicker, ClubTickerRow } from '../lib/fixtures/ticker';
import { getClubStyle, getFDRBadgeStyle } from '../lib/constants/teams';
import { ArrowUpDown, Shield, Swords, Search } from 'lucide-react';

interface FixturesViewProps {
  teams: FPLTeam[];
  fixtures: FPLFixture[];
  events: FPLEvent[];
  currentEventId: number;
}

export const FixturesView: React.FC<FixturesViewProps> = ({
  teams,
  fixtures,
  events,
  currentEventId,
}) => {
  const [lookahead, setLookahead] = useState<number>(6);
  const [sortBy, setSortBy] = useState<'overall' | 'attack' | 'defence' | 'name'>('overall');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const tickerRows = buildFixtureTicker(teams, fixtures, events, currentEventId, lookahead);

  // Sorting
  const sortedRows = [...tickerRows].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'overall') {
      diff = a.averageDifficulty - b.averageDifficulty;
    } else if (sortBy === 'attack') {
      diff = a.attackDifficulty - b.attackDifficulty;
    } else if (sortBy === 'defence') {
      diff = a.defenceDifficulty - b.defenceDifficulty;
    } else {
      diff = a.team.name.localeCompare(b.team.name);
    }
    return sortAsc ? diff : -diff;
  });

  const filteredRows = sortedRows.filter((r) =>
    searchFilter ? r.team.name.toLowerCase().includes(searchFilter.toLowerCase()) || r.team.short_name.toLowerCase().includes(searchFilter.toLowerCase()) : true
  );

  const gameweekHeaders: number[] = [];
  for (let id = currentEventId; id < currentEventId + lookahead; id++) {
    if (id <= 38) gameweekHeaders.push(id);
  }

  return (
    <div className="space-y-4">
      {/* Fixture Ticker Controls Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Premier League Fixture Ticker
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Official FDR difficulty grid (1 = easiest, 5 = toughest). Colored with high contrast numerals.
            </p>
          </div>

          {/* Lookahead Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Horizon:</span>
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              {[5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  onClick={() => setLookahead(count)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                    lookahead === count ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {count} GWs
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter and Sort Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search team (e.g. Arsenal)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === 'overall') setSortAsc(!sortAsc);
                else { setSortBy('overall'); setSortAsc(true); }
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                sortBy === 'overall' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              Overall FDR
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                if (sortBy === 'attack') setSortAsc(!sortAsc);
                else { setSortBy('attack'); setSortAsc(true); }
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                sortBy === 'attack' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Swords className="w-3 h-3" />
              Attack
            </button>
            <button
              onClick={() => {
                if (sortBy === 'defence') setSortAsc(!sortAsc);
                else { setSortBy('defence'); setSortAsc(true); }
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                sortBy === 'defence' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Shield className="w-3 h-3" />
              Defence
            </button>
          </div>
        </div>
      </div>

      {/* Fixture Ticker Grid Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="p-3 sticky left-0 bg-slate-950 z-20 min-w-[140px] border-r border-slate-800">
                  Club
                </th>
                <th className="p-3 text-center min-w-[65px] border-r border-slate-800">
                  Avg FDR
                </th>
                {gameweekHeaders.map((gw) => (
                  <th key={gw} className="p-3 text-center min-w-[85px] border-r border-slate-800/80">
                    GW {gw}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRows.map((row) => {
                const clubStyle = getClubStyle(row.team.short_name);
                return (
                  <tr key={row.team.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Club Header Cell */}
                    <td className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] font-mono shrink-0"
                          style={{
                            backgroundColor: clubStyle.primaryColor,
                            color: clubStyle.textColor,
                          }}
                        >
                          {row.team.short_name}
                        </span>
                        <span className="font-bold text-white truncate max-w-[100px]">
                          {row.team.name}
                        </span>
                      </div>
                    </td>

                    {/* Avg FDR */}
                    <td className="p-3 text-center font-mono font-bold border-r border-slate-800 tabular-nums">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] ${
                          row.averageDifficulty <= 2.6
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                            : row.averageDifficulty >= 3.4
                            ? 'text-rose-400 bg-rose-950/60 border border-rose-800'
                            : 'text-slate-300 bg-slate-800'
                        }`}
                      >
                        {row.averageDifficulty.toFixed(1)}
                      </span>
                    </td>

                    {/* Gameweek Cells */}
                    {row.cells.map((cell) => {
                      if (cell.isBlank) {
                        return (
                          <td
                            key={cell.eventId}
                            className="p-2 text-center border-r border-slate-800/60 bg-slate-950/40"
                          >
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold border border-dashed border-slate-700">
                              BLANK
                            </span>
                          </td>
                        );
                      }

                      if (cell.isDouble) {
                        return (
                          <td
                            key={cell.eventId}
                            className="p-1.5 text-center border-r border-slate-800/60 bg-purple-950/20"
                          >
                            <div className="space-y-1">
                              {cell.fixtures.map((f, fi) => {
                                const fdr = getFDRBadgeStyle(f.difficulty);
                                return (
                                  <div
                                    key={fi}
                                    className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] flex items-center justify-between ${fdr.bg} ${fdr.text}`}
                                  >
                                    <span>{f.opponent.short_name} ({f.isHome ? 'H' : 'A'})</span>
                                    <span>{f.difficulty}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      }

                      const f = cell.fixtures[0];
                      if (!f) return <td key={cell.eventId} className="p-2 border-r border-slate-800/60" />;

                      const fdr = getFDRBadgeStyle(f.difficulty);

                      return (
                        <td key={cell.eventId} className="p-2 text-center border-r border-slate-800/60">
                          <div
                            className={`px-2 py-1.5 rounded-lg font-mono font-bold text-[11px] shadow-xs flex items-center justify-between ${fdr.bg} ${fdr.text}`}
                            title={`vs ${f.opponent.name} (${f.isHome ? 'Home' : 'Away'}), Difficulty ${f.difficulty}`}
                          >
                            <span>{f.opponent.short_name} ({f.isHome ? 'H' : 'A'})</span>
                            <span className="text-[10px] opacity-90">{f.difficulty}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
