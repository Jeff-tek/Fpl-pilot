import React from 'react';
import { ModelWeights } from '../types/fpl';
import { DEFAULT_MODEL_WEIGHTS } from '../lib/model/xpts';
import { purgeProxyCache } from '../lib/fpl/api';
import { X, Sliders, RefreshCw, Trash2, Info } from 'lucide-react';

interface SettingsModalProps {
  weights: ModelWeights;
  onUpdateWeights: (newWeights: ModelWeights) => void;
  onResetWeights: () => void;
  onClearTeam: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  weights,
  onUpdateWeights,
  onResetWeights,
  onClearTeam,
  onClose,
}) => {
  const [purging, setPurging] = React.useState(false);
  const [purgeSuccess, setPurgeSuccess] = React.useState(false);

  const handlePurge = async () => {
    try {
      setPurging(true);
      await purgeProxyCache();
      setPurgeSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error('Failed to purge cache:', err);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Prediction Model & Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sliders Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 leading-relaxed">
            Adjust the algorithmic weights used to calculate expected points (xPts) for every player.
            All predictions update immediately.
          </div>

          {/* Form Weight */}
          <div>
            <div className="flex justify-between font-medium mb-1">
              <span className="text-slate-300">Recent Form Weight</span>
              <span className="text-emerald-400 font-mono font-bold">
                {Math.round(weights.formWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.6"
              step="0.05"
              value={weights.formWeight}
              onChange={(e) =>
                onUpdateWeights({ ...weights, formWeight: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 mt-0.5">
              Reflects the player’s actual scoring streak over the last 30 days.
            </div>
          </div>

          {/* Underlying Stats Weight */}
          <div>
            <div className="flex justify-between font-medium mb-1">
              <span className="text-slate-300">Underlying Stats Weight (xG, xA, xGI)</span>
              <span className="text-emerald-400 font-mono font-bold">
                {Math.round(weights.underlyingStatsWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.7"
              step="0.05"
              value={weights.underlyingStatsWeight}
              onChange={(e) =>
                onUpdateWeights({ ...weights, underlyingStatsWeight: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 mt-0.5">
              Long-term predictive quality based on shot quality and chance creation.
            </div>
          </div>

          {/* Home Advantage Multiplier */}
          <div>
            <div className="flex justify-between font-medium mb-1">
              <span className="text-slate-300">Home Advantage Factor</span>
              <span className="text-emerald-400 font-mono font-bold">
                {weights.homeAdvantageFactor.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="1.3"
              step="0.02"
              value={weights.homeAdvantageFactor}
              onChange={(e) =>
                onUpdateWeights({ ...weights, homeAdvantageFactor: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 mt-0.5">
              Multiplicative boost for playing at home vs away.
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onResetWeights}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Reset Model Weights to Default
            </button>
          </div>

          {/* Data Cache & Team ID Reset */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Data & Storage Actions
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <div>
                <div className="font-bold text-white">Purge Proxy Cache</div>
                <div className="text-[11px] text-slate-400">
                  Force refresh bootstrap-static and fixtures from the FPL API
                </div>
              </div>
              <button
                onClick={handlePurge}
                disabled={purging}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${purging ? 'animate-spin' : ''}`} />
                <span>{purgeSuccess ? 'Refreshed' : 'Purge'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <div>
                <div className="font-bold text-rose-300">Switch / Clear Team</div>
                <div className="text-[11px] text-slate-400">
                  Disconnect your saved team ID from localStorage
                </div>
              </div>
              <button
                onClick={() => {
                  onClearTeam();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
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
