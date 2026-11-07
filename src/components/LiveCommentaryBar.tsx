import React from 'react';
import { ActiveCommentaryInfo } from '../data/curriculum';
import { Mic, Radio, Square, Volume2 } from 'lucide-react';

interface LiveCommentaryBarProps {
  commentary: ActiveCommentaryInfo;
  narrationEnabled: boolean;
  isSpeaking: boolean;
  isNarratedWalkthrough: boolean;
  showWalkthroughButton: boolean;
  onSpeakCurrent: () => void;
  onStopSpeaking: () => void;
  onToggleNarratedWalkthrough: () => void;
  onToggleNarrationEnabled: () => void;
}

export const LiveCommentaryBar: React.FC<LiveCommentaryBarProps> = ({
  commentary,
  narrationEnabled,
  isSpeaking,
  isNarratedWalkthrough,
  showWalkthroughButton,
  onSpeakCurrent,
  onStopSpeaking,
  onToggleNarratedWalkthrough,
  onToggleNarrationEnabled,
}) => {
  const borderAndBgByPhase: Record<ActiveCommentaryInfo['phase'], string> = {
    intro: 'bg-slate-900/95 border-cyan-500/35',
    step: 'bg-slate-900/95 border-cyan-400/45',
    'practice-guide': 'bg-slate-900/95 border-emerald-500/40',
    'practice-half': 'bg-amber-950/40 border-amber-400/50',
    'practice-error': 'bg-rose-950/45 border-rose-400/55',
    completed: 'bg-emerald-950/45 border-emerald-400/55',
    sandbox: 'bg-indigo-950/35 border-indigo-400/40',
  };

  const badgeStyleByPhase: Record<ActiveCommentaryInfo['phase'], string> = {
    intro: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    step: 'bg-cyan-500/25 text-cyan-100 border-cyan-400/50',
    'practice-guide': 'bg-emerald-500/20 text-emerald-200 border-emerald-400/45',
    'practice-half': 'bg-amber-500/25 text-amber-200 border-amber-400/50',
    'practice-error': 'bg-rose-500/25 text-rose-200 border-rose-400/50',
    completed: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50',
    sandbox: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/45',
  };

  return (
    <div
      data-testid="live-commentary-banner"
      className={`w-full border-t px-4 py-2 transition-colors select-none z-20 ${
        borderAndBgByPhase[commentary.phase]
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left & Center: Coach Badge + Live Synchronized Chinese Commentary Subtitle */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="live-commentary-badge"
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                badgeStyleByPhase[commentary.phase]
              }`}
            >
              <Radio
                className={`w-3 h-3 ${
                  isSpeaking ? 'text-cyan-300 animate-ping' : 'text-current'
                }`}
              />
              <span>{commentary.badgeText}</span>
            </span>

            {isSpeaking && (
              <span
                data-testid="narration-speaking-indicator"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-semibold text-cyan-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                <span>语音播报中...</span>
              </span>
            )}
          </div>

          <p
            data-testid="live-commentary-headline"
            className="text-xs sm:text-[13px] font-semibold text-slate-100 leading-relaxed"
          >
            {commentary.headline}
          </p>

          {commentary.detail && (
            <p
              data-testid="live-commentary-detail"
              className="text-[11px] text-slate-300/90 leading-snug"
            >
              {commentary.detail}
            </p>
          )}
        </div>

        {/* Right: Voice Narration Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showWalkthroughButton && (
            <button
              onClick={onToggleNarratedWalkthrough}
              data-testid="btn-narrated-walkthrough"
              title="从头开始由中文语音教练逐句讲解并自动同步演示每一步动作"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                isNarratedWalkthrough
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/20'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-400/45'
              }`}
            >
              {isNarratedWalkthrough ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>停止带读</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>教练全程带读</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onSpeakCurrent}
            data-testid="btn-speak-commentary"
            title="朗读当前步骤中文解说"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isSpeaking
                ? 'bg-cyan-500/25 text-cyan-100 border-cyan-400'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>朗读本步</span>
          </button>

          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              data-testid="btn-stop-commentary"
              title="停止当前语音播报"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/50 text-xs font-semibold transition-all cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>停止</span>
            </button>
          )}

          <button
            onClick={onToggleNarrationEnabled}
            data-testid="btn-commentary-auto-voice"
            title="开启或关闭步骤切换时的自动中文语音播报"
            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
              narrationEnabled
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            {narrationEnabled ? '自动配音: 开' : '自动配音: 关'}
          </button>
        </div>
      </div>
    </div>
  );
};
