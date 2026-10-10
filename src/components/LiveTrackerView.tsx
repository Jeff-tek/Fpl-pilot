import React, { useEffect, useState } from 'react';
import { PlayerWithAnalysis, FPLLiveElement, FPLEvent } from '../types/fpl';
import { fetchEventLive } from '../lib/fpl/api';
import { getClubStyle } from '../lib/constants/teams';
import { Radio, RefreshCw, Zap, Trophy, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface LiveTrackerViewProps {
  squad: PlayerWithAnalysis[];
  currentEvent: FPLEvent;
  captainId: number;
  viceCaptainId: number;
}

export const LiveTrackerView: React.FC<LiveTrackerViewProps> = ({
  squad,
  currentEvent,
  captainId,
  viceCaptainId,
}) => {
  const [liveMap, setLiveMap] = useState<Map<number, FPLLiveElement['stats']>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const loadLiveData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchEventLive(currentEvent.id);
      const map = new Map<number, FPLLiveElement['stats']>();
      for (const item of data.elements) {
        map.set(item.id, item.stats);
      }
      setLiveMap(map);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load live gameweek stats:', err);
      setError('Live data currently unavailable or gameweek not started yet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLiveData();
    const interval = setInterval(loadLiveData, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [currentEvent.id]);

  // Starters & bench separation
  const starters = squad.filter((p) => p.isStarter);
  const bench = squad.filter((p) => !p.isStarter);

  // Captain active status: if captain played 0 minutes and finished, vice-captain takes 2x multiplier
  const captainStats = liveMap.get(captainId);
  const captainPlayed = captainStats ? captainStats.minutes > 0 : false;
  const effectiveCaptainId = captainPlayed || !captainStats ? captainId : viceCaptainId;

  // Calculate live score
  let totalLivePoints = 0;
  let totalBonusProjected = 0;

  const starterRows = starters.map((p) => {
    const stats = liveMap.get(p.element.id);
    const isCapt = p.element.id === effectiveCaptainId;
    const multiplier = isCapt ? 2 : 1;
    const rawPoints = stats ? stats.total_points : 0;
    const effectivePoints = rawPoints * multiplier;
    totalLivePoints += effectivePoints;
    totalBonusProjected += (stats?.bonus || 0) * multiplier;

    return {
      player: p,
      stats,
      isCapt,
      multiplier,
      effectivePoints,
    };
  });

  const benchRows = bench.map((p) => {
    const stats = liveMap.get(p.element.id);
    return {
      player: p,
      stats,
      points: stats ? stats.total_points : 0,
    };
  });

  const benchTotal = benchRows.reduce((s, r) => s + r.points, 0);

  return (
    <div className="space-y-4">
      {/* Live Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {currentEvent.name} Live Match Center
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
                {totalLivePoints}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Points (Inc. {totalBonusProjected} Bonus)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                · Bench: {benchTotal} pts
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={loadLiveData}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
          <Radio className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Starting XI Live Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Starting XI Live Performance</span>
              <span className="font-mono text-emerald-400 font-normal">
                {starters.filter((p) => (liveMap.get(p.element.id)?.minutes || 0) > 0).length} / 11 Playing
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Player</th>
                    <th className="p-3">Club</th>
                    <th className="p-3 text-center">Mins</th>
                    <th className="p-3 text-center">G</th>
                    <th className="p-3 text-center">A</th>
                    <th className="p-3 text-center">CS</th>
                    <th className="p-3 text-center">BPS</th>
                    <th className="p-3 text-center">Bonus</th>
                    <th className="p-3 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {starterRows.map(({ player, stats, isCapt, effectivePoints }) => {
                    const mins = stats?.minutes || 0;
                    return (
                      <tr key={player.element.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-white font-sans flex items-center gap-1.5">
                          {isCapt && (
                            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shrink-0">
                              C
                            </span>
                          )}
                          <span>{player.element.web_name}</span>
                        </td>
                        <td className="p-3 text-slate-400">{player.team.short_name}</td>
                        <td className="p-3 text-center text-slate-300">
                          {mins > 0 ? `${mins}'` : '-'}
                        </td>
                        <td className="p-3 text-center text-slate-300">{stats?.goals_scored || 0}</td>
                        <td className="p-3 text-center text-slate-300">{stats?.assists || 0}</td>
                        <td className="p-3 text-center text-slate-300">{stats?.clean_sheets || 0}</td>
                        <td className="p-3 text-center text-slate-400">{stats?.bps || 0}</td>
                        <td className="p-3 text-center text-amber-300 font-bold">{stats?.bonus || 0}</td>
                        <td className="p-3 text-right font-bold text-emerald-400 text-sm tabular-nums">
                          {effectivePoints}
                          {isCapt && <span className="text-[10px] text-amber-300 ml-1">(2x)</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bench Live Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Bench Substitutes</span>
              <span className="font-mono text-slate-400">Total: {benchTotal} pts</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Sub</th>
                    <th className="p-2.5">Player</th>
                    <th className="p-2.5">Club</th>
                    <th className="p-2.5 text-center">Mins</th>
                    <th className="p-2.5 text-center">G / A</th>
                    <th className="p-2.5 text-center">Bonus</th>
                    <th className="p-2.5 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {benchRows.map(({ player, stats, points }, idx) => (
                    <tr key={player.element.id} className="hover:bg-slate-800/40 text-slate-300">
                      <td className="p-2.5 text-slate-400">
                        {idx === 0 ? 'GK' : `Sub ${idx}`}
                      </td>
                      <td className="p-2.5 font-bold text-white font-sans">{player.element.web_name}</td>
                      <td className="p-2.5 text-slate-400">{player.team.short_name}</td>
                      <td className="p-2.5 text-center">
                        {stats && stats.minutes > 0 ? `${stats.minutes}'` : '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        {stats ? `${stats.goals_scored}/${stats.assists}` : '0/0'}
                      </td>
                      <td className="p-2.5 text-center text-amber-300">{stats?.bonus || 0}</td>
                      <td className="p-2.5 text-right font-bold text-slate-200 tabular-nums">
                        {points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
