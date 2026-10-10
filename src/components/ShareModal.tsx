import React, { useState } from 'react';
import { OptimizedSquad, FPLEvent, TransferSuggestion } from '../types/fpl';
import { X, Copy, Check, Share2, MessageCircle } from 'lucide-react';

interface ShareModalProps {
  optimizedSquad: OptimizedSquad;
  currentEvent: FPLEvent;
  teamName: string;
  topTransfer?: TransferSuggestion;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  optimizedSquad,
  currentEvent,
  teamName,
  topTransfer,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const { starters, bench, captain, viceCaptain, formation, totalXPts } = optimizedSquad;

  const defs = starters.filter((p) => p.positionName === 'DEF');
  const mids = starters.filter((p) => p.positionName === 'MID');
  const fwds = starters.filter((p) => p.positionName === 'FWD');
  const gkps = starters.filter((p) => p.positionName === 'GKP');

  const shareText = `🚀 FPL Pilot — ${currentEvent.name} Recommended XI
🏆 Team: ${teamName}
📐 Formation: ${formation} (${totalXPts.toFixed(1)} xPts)
👑 Captain: ${captain.element.web_name} (${captain.team.short_name}) [${(captain.xPts * 2).toFixed(1)} xPts]
🛡️ Vice: ${viceCaptain.element.web_name} (${viceCaptain.team.short_name}) [${viceCaptain.xPts.toFixed(1)} xPts]

🧤 GK: ${gkps.map((p) => `${p.element.web_name} (${p.xPts.toFixed(1)})`).join(', ')}
🛡️ DEF: ${defs.map((p) => `${p.element.web_name} (${p.xPts.toFixed(1)})`).join(', ')}
⚡ MID: ${mids.map((p) => `${p.element.web_name} (${p.xPts.toFixed(1)})`).join(', ')}
🎯 FWD: ${fwds.map((p) => `${p.element.web_name} (${p.xPts.toFixed(1)})`).join(', ')}

🪑 Bench: ${bench.map((p) => p.element.web_name).join(', ')}
${
  topTransfer
    ? `🔄 Recommended Move: ${topTransfer.outPlayer.element.web_name} ➔ ${topTransfer.inPlayer.element.web_name} (+${topTransfer.immediateNetGain} xPts)`
    : ''
}

Generated with FPL Pilot — Free & Unofficial`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Share Lineup & Strategy</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {shareText}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/25"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
