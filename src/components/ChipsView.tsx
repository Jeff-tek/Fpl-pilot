import React from 'react';
import {
  FPLChipRule,
  FPLHistoryChip,
  FPLEvent,
  FPLFixture,
  PlayerWithAnalysis,
  FPLHistory,
  FPLEntry,
} from '../types/fpl';
import { evaluateChips, ChipAdvice } from '../lib/chips/advisor';
import { evaluateSquadHealth, SquadHealthReport } from '../lib/analytics/healthAndMarket';
import {
  ShieldAlert,
  Zap,
  Activity,
  History,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  BarChart2,
} from 'lucide-react';

interface ChipsViewProps {
  chipRules: FPLChipRule[];
  history: FPLHistory | null;
  entry: FPLEntry | null;
  currentGW: number;
  events: FPLEvent[];
  fixtures: FPLFixture[];
  squad: PlayerWithAnalysis[];
  bank: number;
}

export const ChipsView: React.FC<ChipsViewProps> = ({
  chipRules,
  history,
  entry,
  currentGW,
  events,
  fixtures,
  squad,
  bank,
}) => {
  const usedChips = history?.chips || [];
  const chipAdvices = evaluateChips(chipRules, usedChips, currentGW, events, fixtures, squad);
  const healthReport = evaluateSquadHealth(squad, bank);

  return (
    <div className="space-y-6">
      {/* 1. Squad Health Check */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div>
            <div className="text-xs text-slate-400 font-medium">Squad Health & Balance Assessment</div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Squad Rating: {healthReport.score}/100</span>
              <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-mono font-extrabold border border-indigo-500/30">
                Grade {healthReport.grade}
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">Injuries:</span>{' '}
              <span className={healthReport.injuredCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {healthReport.injuredCount}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Bench Buffer:</span>{' '}
              <span className="text-white font-bold">{healthReport.benchStrengthXPts} xPts</span>
            </div>
          </div>
        </div>

        {/* Health Notes */}
        <div className="space-y-2 mb-4">
          {healthReport.summaryNotes.map((note, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-emerald-400 font-bold">·</span>
              <span>{note}</span>
            </div>
          ))}
        </div>

        {/* Club Stacking Exposure */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Club Concentration Exposure
          </div>
          <div className="flex flex-wrap gap-2">
            {healthReport.clubConcentration.map((c) => (
              <span
                key={c.teamName}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border ${
                  c.count >= 3
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                {c.teamName}: {c.count}/3
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Chip Advisor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Chip Advisor & Deployment Strategy</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strategic recommendations derived from blank/double gameweeks and squad needs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chipAdvices.map((advice) => {
            const isPlayed = advice.recommendation === 'ALREADY_PLAYED';
            const isNow = advice.recommendation === 'USE_THIS_GW';
            const isConsider = advice.recommendation === 'CONSIDER_NOW';

            return (
              <div
                key={advice.chipName}
                className={`p-4 rounded-2xl border transition-all ${
                  isNow
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                    : isConsider
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : isPlayed
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      {advice.chipLabel}
                      {isNow && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] tracking-wide animate-pulse">
                          RECOMMENDED NOW
                        </span>
                      )}
                    </h4>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Status: {advice.statusText}
                    </div>
                  </div>

                  {advice.bestSuggestedGW && !isPlayed && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">Suggested Timing</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        GW {advice.bestSuggestedGW}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mt-2 pt-2 border-t border-slate-800/80">
                  {advice.reasoning}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Season History & Review */}
      {history && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" /> Season Performance Track Record
            </h3>
            {entry && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-400">
                  Overall Points:{' '}
                  <span className="text-white font-bold">{entry.summary_overall_points}</span>
                </span>
                <span className="text-slate-400">
                  Overall Rank:{' '}
                  <span className="text-emerald-400 font-bold">
                    #{entry.summary_overall_rank?.toLocaleString()}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2">GW</th>
                  <th className="p-2 text-right">Points</th>
                  <th className="p-2 text-right">Total Pts</th>
                  <th className="p-2 text-right">GW Rank</th>
                  <th className="p-2 text-right">Overall Rank</th>
                  <th className="p-2 text-right">Transfers (Hit)</th>
                  <th className="p-2 text-right">Bench Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.current.map((gw) => (
                  <tr key={gw.event} className="hover:bg-slate-800/40">
                    <td className="p-2 font-bold text-white">GW {gw.event}</td>
                    <td className="p-2 text-right font-bold text-emerald-400">{gw.points}</td>
                    <td className="p-2 text-right text-white">{gw.total_points}</td>
                    <td className="p-2 text-right text-slate-300">#{gw.rank?.toLocaleString()}</td>
                    <td className="p-2 text-right text-slate-300">#{gw.overall_rank?.toLocaleString()}</td>
                    <td className="p-2 text-right text-slate-400">
                      {gw.event_transfers} ({gw.event_transfers_cost > 0 ? `-${gw.event_transfers_cost}` : '0'})
                    </td>
                    <td className="p-2 text-right text-slate-400">{gw.points_on_bench}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
