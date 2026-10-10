import React from 'react';
import { PlayerWithAnalysis } from '../types/fpl';
import { getClubStyle, getFDRBadgeStyle } from '../lib/constants/teams';
import { Jersey } from './Jersey';
import { X, AlertTriangle, ShieldCheck, Activity, Award, Flame, Calendar } from 'lucide-react';

interface PlayerModalProps {
  player: PlayerWithAnalysis | null;
  onClose: () => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({ player, onClose }) => {
  if (!player) return null;

  const { element, team, positionName, xPts, xPtsBreakdown, upcomingFixtures, sellingPrice } = player;
  const clubStyle = getClubStyle(team.short_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Club Colors and Jersey */}
        <div
          className="p-4 sm:p-5 flex items-start justify-between relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${clubStyle.primaryColor}22 0%, #0f172a 100%)`,
            borderBottom: `2px solid ${clubStyle.primaryColor}44`,
          }}
        >
          <div className="flex items-center gap-3">
            <Jersey
              teamShortName={team.short_name}
              isGkp={positionName === 'GKP'}
              size={50}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {positionName}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  £{(element.now_cost / 10).toFixed(1)}m (Sell: £{(sellingPrice / 10).toFixed(1)}m)
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">
                {element.first_name} {element.second_name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {/* Main xPts Highlight */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-400">Next GW Expected Points</div>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                {xPts.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-400 uppercase tracking-wider">xPts</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Model estimate based on underlying stats & fixtures
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Playing Probability</div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">
                {xPtsBreakdown.playingProbability}%
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {xPtsBreakdown.fixtureCount} {xPtsBreakdown.fixtureCount === 1 ? 'fixture' : 'fixtures'}
              </div>
            </div>
          </div>

          {/* Injury / News Alert if any */}
          {element.news && (
            <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">Fitness Update:</span> {element.news}
              </div>
            </div>
          )}

          {/* Explainable Why This Score Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Model Reasoning & Key Factors
            </h4>
            <div className="space-y-1.5 bg-slate-950/40 border border-slate-800/60 rounded-xl p-3">
              {xPtsBreakdown.reasons.length > 0 ? (
                xPtsBreakdown.reasons.map((r, idx) => (
                  <div key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">·</span>
                    <span>{r}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">Standard expected baseline performance.</div>
              )}
            </div>
          </div>

          {/* Underlying Statistical Sub-scores */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Expected Breakdown Components
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-400">Minutes</div>
                <div className="text-base font-bold text-white font-mono tabular-nums">
                  {xPtsBreakdown.baseMinutesScore}
                </div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-400">Attacking (xG/xA)</div>
                <div className="text-base font-bold text-white font-mono tabular-nums">
                  {xPtsBreakdown.attackingExpectedScore}
                </div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-400">Defensive / CS</div>
                <div className="text-base font-bold text-white font-mono tabular-nums">
                  {xPtsBreakdown.defensiveExpectedScore}
                </div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-400">Bonus Estimate</div>
                <div className="text-base font-bold text-white font-mono tabular-nums">
                  {xPtsBreakdown.bonusEstimate}
                </div>
              </div>
            </div>
          </div>

          {/* Season Underlying Metrics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Season Underlying Metrics
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-950/40 border border-slate-800/60 p-2 rounded-lg">
                <div className="text-slate-400 text-[10px]">Form / PPG</div>
                <div className="font-semibold text-white font-mono">{element.form} / {element.points_per_game}</div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/60 p-2 rounded-lg">
                <div className="text-slate-400 text-[10px]">xG / xA</div>
                <div className="font-semibold text-white font-mono">{element.expected_goals} / {element.expected_assists}</div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/60 p-2 rounded-lg">
                <div className="text-slate-400 text-[10px]">ICT Index</div>
                <div className="font-semibold text-white font-mono">{element.ict_index}</div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/60 p-2 rounded-lg">
                <div className="text-slate-400 text-[10px]">Total Points</div>
                <div className="font-semibold text-white font-mono">{element.total_points}</div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/60 p-2 rounded-lg">
                <div className="text-slate-400 text-[10px]">Minutes / Starts</div>
                <div className="font-semibold text-white font-mono">{element.minutes}m ({element.starts})</div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/60 p-2 rounded-lg">
                <div className="text-slate-400 text-[10px]">Selected By</div>
                <div className="font-semibold text-white font-mono">{element.selected_by_percent}%</div>
              </div>
            </div>
          </div>

          {/* Upcoming Fixtures */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Upcoming Fixtures
            </h4>
            <div className="space-y-1.5">
              {upcomingFixtures.length > 0 ? (
                upcomingFixtures.map((f, i) => {
                  const style = getFDRBadgeStyle(f.difficulty);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {f.isHome ? 'vs' : '@'} {f.opponent.name}
                        </span>
                        <span className="text-slate-400 font-mono">({f.isHome ? 'H' : 'A'})</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[11px] font-bold ${style.bg} ${style.text}`}>
                        FDR {f.difficulty}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400">No scheduled upcoming fixtures found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
