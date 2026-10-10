import React, { useState } from 'react';
import { PlayerWithAnalysis, FPLPick } from '../types/fpl';
import { Jersey } from './Jersey';
import { X, Search, ArrowRightLeft, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';

interface EditSquadModalProps {
  currentSquad: PlayerWithAnalysis[];
  allPlayers: PlayerWithAnalysis[];
  onApplyCustomPicks: (updatedPicks: FPLPick[]) => void;
  onResetToOfficial: () => void;
  hasCustomSquad: boolean;
  onClose: () => void;
}

export const EditSquadModal: React.FC<EditSquadModalProps> = ({
  currentSquad,
  allPlayers,
  onApplyCustomPicks,
  onResetToOfficial,
  hasCustomSquad,
  onClose,
}) => {
  const [swappingPlayerId, setSwappingPlayerId] = useState<number | null>(null);
  const [candidateSearch, setCandidateSearch] = useState<string>('');
  const [localSquad, setLocalSquad] = useState<PlayerWithAnalysis[]>([...currentSquad]);

  const targetOutPlayer = localSquad.find((p) => p.element.id === swappingPlayerId);

  const handleSwap = (inPlayer: PlayerWithAnalysis) => {
    if (!targetOutPlayer) return;

    const updated = localSquad.map((p) => {
      if (p.element.id === targetOutPlayer.element.id) {
        return {
          ...inPlayer,
          isStarter: p.isStarter,
          isCaptain: p.isCaptain,
          isViceCaptain: p.isViceCaptain,
          pickPosition: p.pickPosition,
        };
      }
      return p;
    });

    setLocalSquad(updated);
    setSwappingPlayerId(null);
    setCandidateSearch('');

    // Generate FPLPick array to persist
    const newPicks: FPLPick[] = updated.map((p, idx) => ({
      element: p.element.id,
      position: p.pickPosition || idx + 1,
      multiplier: p.isCaptain ? 2 : p.isStarter ? 1 : 0,
      is_captain: p.isCaptain,
      is_vice_captain: p.isViceCaptain,
      element_type: p.element.element_type,
    }));

    onApplyCustomPicks(newPicks);
  };

  const candidatePool = allPlayers.filter((p) => {
    if (!targetOutPlayer) return false;
    if (p.positionName !== targetOutPlayer.positionName) return false;
    if (localSquad.some((member) => member.element.id === p.element.id)) return false;
    if (candidateSearch) {
      const q = candidateSearch.toLowerCase();
      return (
        p.element.web_name.toLowerCase().includes(q) ||
        p.element.first_name.toLowerCase().includes(q) ||
        p.element.second_name.toLowerCase().includes(q) ||
        p.team.name.toLowerCase().includes(q) ||
        p.team.short_name.toLowerCase().includes(q)
      );
    }
    return p.xPts >= 3.5;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">Update / Align Active Squad</h3>
              <p className="text-[11px] text-slate-400">
                Easily reflect transfers you recently made on the FPL site or app
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative FPL API Notice Banner */}
        <div className="p-4 bg-indigo-950/25 border-b border-indigo-900/40 text-xs text-indigo-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white">Why FPL keeps new transfers private: </span>
            The Premier League locks public visibility of all upcoming gameweek transfers until the
            official deadline (to prevent mini-league rivals from copying or scouting moves). If you made transfers
            yesterday, click <strong className="text-white">Swap</strong> next to any player below to align your lineup instantly.
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {swappingPlayerId && targetOutPlayer ? (
            /* Candidate Selection View */
            <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Swapping Out:</span>
                  <Jersey
                    teamShortName={targetOutPlayer.team.short_name}
                    isGkp={targetOutPlayer.positionName === 'GKP'}
                    size={28}
                  />
                  <span className="font-bold text-rose-400 text-sm">
                    {targetOutPlayer.element.web_name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({targetOutPlayer.positionName} · £{(targetOutPlayer.element.now_cost / 10).toFixed(1)}m)
                  </span>
                </div>
                <button
                  onClick={() => setSwappingPlayerId(null)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Search Player You Transferred In:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${targetOutPlayer.positionName} (e.g. name or team)...`}
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pt-1">
                {candidatePool.slice(0, 15).map((cand) => (
                  <button
                    key={cand.element.id}
                    onClick={() => handleSwap(cand)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 flex items-center justify-between text-xs transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Jersey
                        teamShortName={cand.team.short_name}
                        isGkp={cand.positionName === 'GKP'}
                        size={28}
                      />
                      <div>
                        <div className="font-bold text-white group-hover:text-indigo-300">
                          {cand.element.web_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {cand.team.name} · £{(cand.element.now_cost / 10).toFixed(1)}m
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {cand.xPts.toFixed(1)} xPts
                      </span>
                      <span className="px-2 py-1 rounded bg-indigo-600 text-white font-bold text-[10px] group-hover:bg-indigo-500">
                        Select
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Squad List */
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Current 15-Player Squad ({localSquad.length})</span>
                {hasCustomSquad && (
                  <button
                    onClick={() => {
                      onResetToOfficial();
                      onClose();
                    }}
                    className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-normal font-sans"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Official FPL Picks</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {localSquad.map((player) => (
                  <div
                    key={player.element.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Jersey
                        teamShortName={player.team.short_name}
                        isGkp={player.positionName === 'GKP'}
                        size={28}
                      />
                      <div className="truncate">
                        <div className="font-bold text-white truncate">
                          {player.element.web_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {player.positionName} · {player.team.short_name} · £{(player.element.now_cost / 10).toFixed(1)}m
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSwappingPlayerId(player.element.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-semibold text-[11px] transition-colors shrink-0 flex items-center gap-1"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Swap</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            {hasCustomSquad ? '✓ Custom Squad active in Pilot' : 'Syncing official FPL baseline'}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
