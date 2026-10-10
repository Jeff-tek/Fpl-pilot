import React, { useState } from 'react';
import { OptimizedSquad, PlayerWithAnalysis } from '../types/fpl';
import { getClubStyle, getFDRBadgeStyle } from '../lib/constants/teams';
import { Jersey } from './Jersey';
import { PlayerModal } from './PlayerModal';
import {
  ShieldAlert,
  LayoutGrid,
  Table as TableIcon,
  Crown,
  Sparkles,
  Info,
  ChevronRight,
  Zap,
  ArrowRightLeft,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Palette,
} from 'lucide-react';

interface PitchViewProps {
  optimizedSquad: OptimizedSquad;
  preferDifferential: boolean;
  onToggleDifferential: (val: boolean) => void;
  selectedFormation: string;
  onSelectFormation: (formation: string) => void;
  onRefreshData?: () => void;
  onOpenSquadEditor?: () => void;
  onSyncWithFPL?: () => void;
  isSyncing?: boolean;
  hasCustomTransfers?: boolean;
  onResetToOfficial?: () => void;
}

export type PitchTheme = 'slate' | 'emerald' | 'midnight';

export const PitchView: React.FC<PitchViewProps> = ({
  optimizedSquad,
  preferDifferential,
  onToggleDifferential,
  selectedFormation,
  onSelectFormation,
  onOpenSquadEditor,
  onSyncWithFPL,
  isSyncing = false,
  hasCustomTransfers = false,
  onResetToOfficial,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithAnalysis | null>(null);
  const [viewMode, setViewMode] = useState<'pitch' | 'table'>('pitch');
  const [pitchTheme, setPitchTheme] = useState<PitchTheme>(() => {
    return (localStorage.getItem('fpl_pilot_pitch_theme') as PitchTheme) || 'slate';
  });
  const [alertFilter, setAlertFilter] = useState<'all' | 'injury' | 'tough' | 'doubtful'>('all');

  const handleSetPitchTheme = (theme: PitchTheme) => {
    setPitchTheme(theme);
    localStorage.setItem('fpl_pilot_pitch_theme', theme);
  };

  const {
    starters,
    bench,
    captain,
    viceCaptain,
    totalXPts,
    benchXPts,
    formationAlternatives,
    risks,
  } = optimizedSquad;

  const activeFormation = selectedFormation || optimizedSquad.formation;

  // Split starters into tactical lines for pitch visualization
  const gkps = starters.filter((p) => p.positionName === 'GKP');
  const defs = starters.filter((p) => p.positionName === 'DEF');
  const mids = starters.filter((p) => p.positionName === 'MID');
  const fwds = starters.filter((p) => p.positionName === 'FWD');

  // Find max formation expected points for delta calculation
  const maxFormationPoints = Math.max(
    ...formationAlternatives.map((a) => a.totalXPts),
    totalXPts
  );

  // Filter alerts based on active category filter tab
  const filteredRisks = risks.filter((r) => {
    if (alertFilter === 'injury') return r.type === 'injury';
    if (alertFilter === 'tough') return r.type === 'tough_fixture';
    if (alertFilter === 'doubtful') return r.type === 'doubtful' || r.type === 'blank';
    return true;
  });

  const injuryCount = risks.filter((r) => r.type === 'injury').length;
  const toughCount = risks.filter((r) => r.type === 'tough_fixture').length;
  const doubtfulCount = risks.filter((r) => r.type === 'doubtful' || r.type === 'blank').length;

  // Modern Pitch Themes (eliminates murky green-and-black slop; uses crisp industry standard palettes)
  const pitchStyles: Record<PitchTheme, { container: string; markings: string; glow: string }> = {
    slate: {
      container: `
        radial-gradient(ellipse at 50% 15%, #1e293b 0%, #0f172a 65%, #020617 100%),
        repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 48px, transparent 48px, transparent 96px)
      `,
      markings: '#94a3b8',
      glow: 'bg-cyan-500/10',
    },
    emerald: {
      container: `
        radial-gradient(ellipse at 50% 20%, #15803d 0%, #166534 55%, #14532d 100%),
        repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 52px, transparent 52px, transparent 104px)
      `,
      markings: '#ffffff',
      glow: 'bg-emerald-400/15',
    },
    midnight: {
      container: `
        radial-gradient(ellipse at 50% 15%, #1e1b4b 0%, #0f172a 70%, #030712 100%),
        repeating-linear-gradient(0deg, rgba(99,102,241,0.02) 0px, rgba(99,102,241,0.02) 48px, transparent 48px, transparent 96px)
      `,
      markings: '#cbd5e1',
      glow: 'bg-indigo-500/15',
    },
  };

  const currentPitchStyle = pitchStyles[pitchTheme];

  const renderPlayerCard = (player: PlayerWithAnalysis, isBench: boolean = false, subIndex?: number) => {
    const nextFixture = player.upcomingFixtures[0];
    const fdrStyle = nextFixture ? getFDRBadgeStyle(nextFixture.difficulty) : null;
    const isCapt = player.element.id === captain.element.id;
    const isVice = player.element.id === viceCaptain.element.id;
    const isFlagged = player.element.status !== 'a' || Boolean(player.element.news);
    const ownership = parseFloat(player.element.selected_by_percent);
    const isDifferential = ownership < 15.0;

    return (
      <button
        key={player.element.id}
        onClick={() => setSelectedPlayer(player)}
        className="group relative flex flex-col items-center justify-center p-1 focus:outline-none transition-all duration-150 active:scale-95 hover:-translate-y-1"
        style={{ width: 'min(84px, 19vw)' }}
      >
        {/* Sub Priority Label for Bench */}
        {isBench && subIndex !== undefined && (
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 text-slate-300 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-slate-700 shadow-xs whitespace-nowrap">
            {subIndex === 0 ? 'GK' : `Sub ${subIndex}`}
          </div>
        )}

        {/* Realistic Authentic Jersey */}
        <div className="relative mt-1">
          <Jersey
            teamShortName={player.team.short_name}
            isGkp={player.positionName === 'GKP'}
            isCaptain={isCapt}
            isViceCaptain={isVice}
            size={isBench ? 38 : 44}
          />

          {/* Captain / Vice Badge */}
          {isCapt && (
            <span className="absolute -top-1 -left-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center border-2 border-slate-900 shadow-sm">
              C
            </span>
          )}
          {isVice && !isCapt && (
            <span className="absolute -top-1 -left-1.5 w-4 h-4 rounded-full bg-slate-200 text-slate-900 font-black text-[9px] flex items-center justify-center border-2 border-slate-900 shadow-sm">
              V
            </span>
          )}

          {/* Differential Highlight Pill (Shown when differential mode is active or user is low owned) */}
          {preferDifferential && isDifferential && (
            <span
              className="absolute -bottom-1 -left-1 px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] flex items-center gap-0.5 shadow-sm"
              title={`Differential: Only ${ownership}% owned`}
            >
              <Sparkles className="w-2 h-2" />
              <span>{ownership.toFixed(0)}%</span>
            </span>
          )}

          {/* Injury / Status Warning Indicator */}
          {isFlagged && (
            <span
              className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-900 flex items-center justify-center text-[9px] font-black text-white shadow-sm"
              title={player.element.news || 'Flagged'}
            >
              !
            </span>
          )}
        </div>

        {/* Player Name Banner */}
        <div className="w-full mt-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-md py-0.5 px-1 text-center truncate shadow-md group-hover:border-indigo-400/60 transition-colors">
          <div className="text-[11px] sm:text-xs font-bold text-white truncate leading-tight tracking-tight">
            {player.element.web_name}
          </div>
        </div>

        {/* Expected Points & Next Fixture Badge */}
        <div className="w-full flex items-center justify-center gap-1 mt-0.5">
          <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 px-1 py-0.2 rounded text-[10px] font-bold font-mono tabular-nums leading-tight shadow-xs">
            {player.xPts.toFixed(1)}
          </span>

          {nextFixture && fdrStyle && (
            <span
              className={`px-1 py-0.2 rounded text-[9px] font-bold font-mono leading-tight shadow-xs ${fdrStyle.bg} ${fdrStyle.text}`}
              title={`FDR ${nextFixture.difficulty} vs ${nextFixture.opponent.name}`}
            >
              {nextFixture.opponent.short_name} {nextFixture.isHome ? 'H' : 'A'}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Squad Transfer Status & Action Banner */}
      {hasCustomTransfers ? (
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/40 rounded-2xl p-3 sm:p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Custom Squad Active (Pending Transfers Applied)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Live in Optimizer
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Your Starting XI, captain, jerseys, and xPts are calculated with your newly transferred players.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenSquadEditor && (
              <button
                onClick={onOpenSquadEditor}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Adjust Transfers</span>
              </button>
            )}

            {onResetToOfficial && (
              <button
                onClick={onResetToOfficial}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5"
                title="Discard manual changes and reload official FPL picks"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset to FPL</span>
              </button>
            )}

            {onSyncWithFPL && (
              <button
                onClick={onSyncWithFPL}
                disabled={isSyncing}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Force refresh data from official FPL API"
              >
                <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Transferred players recently?</span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  (FPL keeps pre-deadline transfers private until gameweek locks)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tap <strong>Apply Pending Transfers</strong> to swap in your new signings and update your Best XI immediately!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenSquadEditor && (
              <button
                onClick={onOpenSquadEditor}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Apply Pending Transfers</span>
              </button>
            )}

            {onSyncWithFPL && (
              <button
                onClick={onSyncWithFPL}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5"
                title="Force refresh data from official FPL API"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
                <span className="hidden sm:inline">Sync FPL</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Banner: Best XI Summary, Differential Toggle & Dynamic Formation Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-400 font-medium">Recommended Gameweek Starting XI</div>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                {activeFormation}
              </span>
              <span className="text-emerald-400 font-bold text-lg font-mono tabular-nums">
                {totalXPts.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-400 uppercase">xPts</span>
              </span>
              <span className="text-slate-400 text-xs font-mono">
                (Bench: {benchXPts.toFixed(1)} xPts)
              </span>
            </div>
          </div>

          {/* Controls: Differential Toggle, Pitch Theme Switcher & View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Differential Toggle */}
            <button
              onClick={() => onToggleDifferential(!preferDifferential)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                preferDifferential
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
              title="When enabled, prioritizes low-ownership (<15%) differential captaincy & highlights differential players"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Differential Mode</span>
            </button>

            {/* Pitch Theme Switcher */}
            <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                onClick={() => handleSetPitchTheme('slate')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  pitchTheme === 'slate'
                    ? 'bg-slate-700 text-cyan-300 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tactical Slate Theme (Opta Analytics standard)"
              >
                Slate
              </button>
              <button
                onClick={() => handleSetPitchTheme('emerald')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  pitchTheme === 'emerald'
                    ? 'bg-emerald-800/80 text-emerald-200 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Stadium Turf Theme (Broadcast grass)"
              >
                Turf
              </button>
              <button
                onClick={() => handleSetPitchTheme('midnight')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  pitchTheme === 'midnight'
                    ? 'bg-indigo-900 text-indigo-200 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Midnight Theme"
              >
                Midnight
              </button>
            </div>

            {/* Pitch vs Table Toggle */}
            <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                onClick={() => setViewMode('pitch')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'pitch' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Tactical Pitch View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Squad Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Formation Switcher Strip */}
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tap Any Formation to Suggest Best XI on Pitch:</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Rearranges Starting XI live
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {formationAlternatives.map((alt) => {
              const isActive = activeFormation === alt.formation;
              const diff = alt.totalXPts - maxFormationPoints;
              const isOptimal = Math.abs(diff) < 0.05;

              return (
                <button
                  key={alt.formation}
                  onClick={() => onSelectFormation(alt.formation)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 scale-105'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span>{alt.formation}</span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-normal ${
                      isActive
                        ? 'bg-indigo-900/60 text-indigo-200'
                        : isOptimal
                        ? 'bg-emerald-950/60 text-emerald-400 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {alt.totalXPts.toFixed(1)} {isOptimal ? '★' : `${diff.toFixed(1)}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Captain & Vice Callout */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[10px] shadow-sm">
                C
              </span>
              <div>
                <span className="text-slate-400">Captain:</span>{' '}
                <span className="font-bold text-white">{captain.element.web_name}</span>
                <span className="text-[10px] text-slate-400 ml-1">({captain.team.short_name})</span>
                {preferDifferential && parseFloat(captain.element.selected_by_percent) < 15.0 && (
                  <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold">
                    Differential ({captain.element.selected_by_percent}%)
                  </span>
                )}
              </div>
            </div>
            <div className="font-mono text-emerald-400 font-bold tabular-nums">
              {(captain.xPts * 2).toFixed(1)} xPts (2x)
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-900 font-black flex items-center justify-center text-[10px] shadow-sm">
                V
              </span>
              <div>
                <span className="text-slate-400">Vice-Captain:</span>{' '}
                <span className="font-bold text-white">{viceCaptain.element.web_name}</span>
                <span className="text-[10px] text-slate-400 ml-1">({viceCaptain.team.short_name})</span>
              </div>
            </div>
            <div className="font-mono text-slate-300 font-bold tabular-nums">
              {viceCaptain.xPts.toFixed(1)} xPts
            </div>
          </div>
        </div>
      </div>

      {/* Flagged Risks Alert Bar: Displays ALL Alerts (categorized & interactive) */}
      {risks.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-xs shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Squad Health Alerts ({risks.length})</span>
            </div>

            {/* Alert Category Filter Chips */}
            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={() => setAlertFilter('all')}
                className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                  alertFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({risks.length})
              </button>
              {injuryCount > 0 && (
                <button
                  onClick={() => setAlertFilter('injury')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    alertFilter === 'injury'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
                  }`}
                >
                  Injuries ({injuryCount})
                </button>
              )}
              {toughCount > 0 && (
                <button
                  onClick={() => setAlertFilter('tough')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    alertFilter === 'tough'
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-800 text-orange-300 hover:bg-slate-700'
                  }`}
                >
                  Tough FDR ({toughCount})
                </button>
              )}
              {doubtfulCount > 0 && (
                <button
                  onClick={() => setAlertFilter('doubtful')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    alertFilter === 'doubtful'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                  }`}
                >
                  Doubtful ({doubtfulCount})
                </button>
              )}
            </div>
          </div>

          {/* List of ALL Alerts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredRisks.map((r, i) => {
              const playerObj =
                starters.find((p) => p.element.id === r.playerId) ||
                bench.find((p) => p.element.id === r.playerId);

              let badgeStyle = 'bg-slate-800/80 text-slate-200 border-slate-700';
              let icon = '⚠️';

              if (r.type === 'injury') {
                badgeStyle = 'bg-rose-950/40 text-rose-200 border-rose-800/60';
                icon = '🚨';
              } else if (r.type === 'doubtful') {
                badgeStyle = 'bg-amber-950/40 text-amber-200 border-amber-800/60';
                icon = '⏳';
              } else if (r.type === 'blank') {
                badgeStyle = 'bg-slate-950 text-slate-400 border-slate-800';
                icon = '⛔';
              } else if (r.type === 'tough_fixture') {
                badgeStyle = 'bg-orange-950/30 text-orange-200 border-orange-800/50';
                icon = '🛡️';
              }

              return (
                <button
                  key={`${r.playerId}-${i}`}
                  onClick={() => playerObj && setSelectedPlayer(playerObj)}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all hover:scale-[1.01] cursor-pointer ${badgeStyle}`}
                >
                  <span className="text-base shrink-0 mt-0.5">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white flex items-center justify-between gap-1">
                      <span className="truncate">{r.playerName}</span>
                      <span className="text-[10px] opacity-75 uppercase tracking-wider font-mono shrink-0">
                        {r.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-90 leading-snug mt-0.5 break-words">
                      {r.message}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Pitch / Table Container */}
      {viewMode === 'pitch' ? (
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
          {/* Tactical Pitch Canvas with Stadium Lighting & Real Grass Stripes */}
          <div
            className="relative w-full py-7 px-2 min-h-[560px] flex flex-col justify-between overflow-hidden"
            style={{
              background: currentPitchStyle.container,
            }}
          >
            {/* Floodlight Glow Effect from corners */}
            <div className={`absolute top-0 left-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${currentPitchStyle.glow}`} />
            <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${currentPitchStyle.glow}`} />

            {/* Stadium Pitch Markings SVG overlay with crisp contrast */}
            <div className="absolute inset-0 pointer-events-none opacity-45">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Outer touchline border */}
                <rect x="4%" y="2.5%" width="92%" height="95%" fill="none" stroke={currentPitchStyle.markings} strokeWidth="2" rx="12" />
                {/* Halfway line */}
                <line x1="4%" y1="50%" x2="96%" y2="50%" stroke={currentPitchStyle.markings} strokeWidth="2" />
                {/* Center circle */}
                <circle cx="50%" cy="50%" r="52" fill="none" stroke={currentPitchStyle.markings} strokeWidth="1.8" />
                {/* Center dot */}
                <circle cx="50%" cy="50%" r="3.5" fill={currentPitchStyle.markings} />
                {/* Top Penalty Area (18-yard box) */}
                <rect x="24%" y="2.5%" width="52%" height="16%" fill="none" stroke={currentPitchStyle.markings} strokeWidth="1.8" />
                {/* Top Goal Area (6-yard box) */}
                <rect x="37%" y="2.5%" width="26%" height="6%" fill="none" stroke={currentPitchStyle.markings} strokeWidth="1.8" />
                {/* Top Penalty Spot */}
                <circle cx="50%" cy="13.5%" r="3" fill={currentPitchStyle.markings} />
                {/* Bottom Penalty Area */}
                <rect x="24%" y="81.5%" width="52%" height="16%" fill="none" stroke={currentPitchStyle.markings} strokeWidth="1.8" />
                {/* Bottom Goal Area */}
                <rect x="37%" y="91.5%" width="26%" height="6%" fill="none" stroke={currentPitchStyle.markings} strokeWidth="1.8" />
                {/* Bottom Penalty Spot */}
                <circle cx="50%" cy="86.5%" r="3" fill={currentPitchStyle.markings} />
              </svg>
            </div>

            {/* Tier 1: Goalkeeper */}
            <div className="relative z-10 flex justify-center items-center py-1">
              {gkps.map((p) => renderPlayerCard(p))}
            </div>

            {/* Tier 2: Defenders */}
            <div className="relative z-10 flex justify-around items-center py-2 max-w-2xl mx-auto w-full">
              {defs.map((p) => renderPlayerCard(p))}
            </div>

            {/* Tier 3: Midfielders */}
            <div className="relative z-10 flex justify-around items-center py-2 max-w-2xl mx-auto w-full">
              {mids.map((p) => renderPlayerCard(p))}
            </div>

            {/* Tier 4: Forwards */}
            <div className="relative z-10 flex justify-around items-center py-2 max-w-xl mx-auto w-full">
              {fwds.map((p) => renderPlayerCard(p))}
            </div>
          </div>

          {/* Dugout / Substitutes Bench with Jerseys */}
          <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Bench Substitutes
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Order: Sub GK · 1st Sub · 2nd Sub · 3rd Sub
              </span>
            </div>
            <div className="flex justify-around items-center gap-1 sm:gap-2 max-w-xl mx-auto">
              {bench.map((p, idx) => renderPlayerCard(p, true, idx))}
            </div>
          </div>
        </div>
      ) : (
        /* Table View of 15 Players */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Role</th>
                  <th className="p-3">Player</th>
                  <th className="p-3">Club</th>
                  <th className="p-3">Pos</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Form</th>
                  <th className="p-3">Next Fixture</th>
                  <th className="p-3 text-right">xPts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[...starters, ...bench].map((p, idx) => {
                  const isStarter = idx < 11;
                  const isCapt = p.element.id === captain.element.id;
                  const isVice = p.element.id === viceCaptain.element.id;
                  const nextFixture = p.upcomingFixtures[0];
                  const fdrStyle = nextFixture ? getFDRBadgeStyle(nextFixture.difficulty) : null;

                  return (
                    <tr
                      key={p.element.id}
                      onClick={() => setSelectedPlayer(p)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        {isCapt ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                            C
                          </span>
                        ) : isVice ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-300 text-slate-900 font-black text-[10px]">
                            V
                          </span>
                        ) : isStarter ? (
                          <span className="text-emerald-400 font-medium text-[11px]">Starter</span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Bench</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <Jersey teamShortName={p.team.short_name} isGkp={p.positionName === 'GKP'} size={24} />
                        <span>{p.element.first_name} {p.element.second_name}</span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono">{p.team.short_name}</td>
                      <td className="p-3 text-slate-400 font-mono">{p.positionName}</td>
                      <td className="p-3 text-right font-mono text-slate-300">
                        £{(p.element.now_cost / 10).toFixed(1)}m
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">{p.element.form}</td>
                      <td className="p-3">
                        {nextFixture && fdrStyle ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${fdrStyle.bg} ${fdrStyle.text}`}>
                            {nextFixture.isHome ? 'vs' : '@'} {nextFixture.opponent.short_name} ({nextFixture.difficulty})
                          </span>
                        ) : (
                          <span className="text-slate-400">Blank</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400 tabular-nums">
                        {p.xPts.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Player Modal */}
      <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
};
