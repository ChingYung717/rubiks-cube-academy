import React from 'react';
import { getMoveDefinition } from '../engine/cubeEngine';
import { PLAYBACK_SPEEDS, PlaybackSpeed } from '../utils/storage';
import {
  CheckCircle2,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Undo2,
} from 'lucide-react';

interface FormulaTimelinePlayerProps {
  mode: 'demo' | 'practice' | 'sandbox';
  moves: string[];
  currentStep: number; // 0 .. moves.length
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  isAnimating: boolean;
  practiceHalfTurnPending?: boolean;
  practiceHalfTurnToken?: string | null;
  practiceErrors?: string[];
  onPlayPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onJumpToStep: (stepIdx: number) => void;
  onChangeSpeed: (speed: PlaybackSpeed) => void;
  onQuickMove: (token: string) => void;
  onUndoError?: () => void;
  onResetPractice?: () => void;
}

const SPEEDS = PLAYBACK_SPEEDS;

const QUICK_MOVE_GROUPS = [
  { label: '右/顶高频', tokens: ['R', "R'", 'R2', 'U', "U'", 'U2'] },
  { label: '前/左常用', tokens: ['F', "F'", 'F2', 'L', "L'", 'L2'] },
  { label: '底/后/中层', tokens: ['D', "D'", 'D2', 'B', "B'", 'B2', 'M', "M'", 'M2'] },
];

export const FormulaTimelinePlayer: React.FC<FormulaTimelinePlayerProps> = React.memo(({
  mode,
  moves,
  currentStep,
  isPlaying,
  playbackSpeed,
  isAnimating,
  practiceHalfTurnPending = false,
  practiceHalfTurnToken = null,
  practiceErrors = [],
  onPlayPause,
  onStepForward,
  onStepBackward,
  onJumpToStep,
  onChangeSpeed,
  onQuickMove,
  onUndoError,
  onResetPractice,
}) => {
  const activeMoveIdx = currentStep < moves.length ? currentStep : moves.length - 1;
  const activeMoveToken = moves[activeMoveIdx] ?? null;
  const activeMoveDef = activeMoveToken
    ? (() => {
        try {
          return getMoveDefinition(activeMoveToken);
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <div className="w-full bg-[#0c1220]/95 border-t border-slate-800/90 px-4 py-2.5 flex flex-col gap-2 select-none z-20">
      {mode !== 'sandbox' ? (
        <>
          {/* Top Row: Formula Step Sequence Track */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full no-scrollbar">
              {/* Step 0 Initial State Pill */}
              <button
                onClick={() => mode === 'demo' && onJumpToStep(0)}
                disabled={mode !== 'demo' || isAnimating}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all shrink-0 cursor-pointer ${
                  currentStep === 0
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                    : 'bg-slate-900/90 text-slate-400 border-slate-700/70 hover:text-slate-200'
                }`}
              >
                起始状态 (0)
              </button>

              {moves.map((token, idx) => {
                const stepNumber = idx + 1;
                const isDone = currentStep >= stepNumber;
                const isNext = currentStep === idx;
                const def = getMoveDefinition(token);

                let btnClass =
                  'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-600';
                if (mode === 'demo') {
                  if (currentStep === stepNumber) {
                    btnClass =
                      'bg-cyan-500/30 text-cyan-100 border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.3)] scale-105';
                  } else if (isDone) {
                    btnClass = 'bg-slate-800/90 text-cyan-300/90 border-cyan-500/30';
                  } else if (isNext) {
                    btnClass =
                      'bg-amber-500/15 text-amber-200 border-amber-400/50 ring-1 ring-amber-400/30';
                  }
                } else if (mode === 'practice') {
                  if (isDone) {
                    btnClass =
                      'bg-emerald-500/25 text-emerald-200 border-emerald-500/50';
                  } else if (isNext) {
                    btnClass =
                      practiceErrors.length > 0
                        ? 'bg-rose-500/20 text-rose-200 border-rose-400/60'
                        : 'bg-cyan-500/25 text-cyan-100 border-cyan-400 ring-2 ring-cyan-400/30 animate-pulse';
                  }
                }

                return (
                  <button
                    key={`${idx}_${token}`}
                    onClick={() => mode === 'demo' && onJumpToStep(stepNumber)}
                    disabled={mode !== 'demo' || isAnimating}
                    title={`第 ${stepNumber} 步: ${def.nameZh}`}
                    data-testid={`timeline-token-${idx}`}
                    className={`group relative px-3 py-1 rounded-lg font-mono text-sm font-bold border transition-all shrink-0 flex items-center gap-1 cursor-pointer ${btnClass}`}
                  >
                    <span className="text-[10px] font-sans font-normal opacity-60">
                      {stepNumber}.
                    </span>
                    <span>{token}</span>
                    {mode === 'practice' && isDone && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />
                    )}
                    {mode === 'practice' && isNext && practiceHalfTurnPending && (
                      <span className="ml-1 px-1 py-0.2 rounded bg-amber-500/30 text-[10px] text-amber-200 font-sans">
                        1/2
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Step Counter & Current Move Description */}
            <div className="flex items-center gap-3 text-xs text-slate-300 shrink-0">
              {activeMoveDef && currentStep < moves.length ? (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">
                    {mode === 'practice' ? '下一步跟拧动作：' : '即将执行动作：'}
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {moves[currentStep]}
                  </span>
                  <span className="text-slate-200">
                    {getMoveDefinition(moves[currentStep]).nameZh}
                  </span>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>公式序列已全部执行完毕！</span>
                </div>
              )}

              <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
                进度:{' '}
                <strong className="text-cyan-300">{currentStep}</strong> / {moves.length}
              </div>
            </div>
          </div>

          {/* Bottom Row: Playback Controls (Demo) OR Quick-Turn Follow Controls (Practice) */}
          {mode === 'demo' ? (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => onJumpToStep(0)}
                  disabled={isAnimating || currentStep === 0}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 border border-slate-700/70 transition-colors cursor-pointer"
                  title="回到初始状态 (Step 0)"
                  aria-label="回到初始状态 (Step 0)"
                  data-testid="btn-timeline-first"
                >
                  <ChevronFirst className="w-4 h-4" />
                </button>
                <button
                  onClick={onStepBackward}
                  disabled={isAnimating || currentStep === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-40 border border-slate-700/70 text-xs font-medium transition-colors cursor-pointer"
                  title="退回上一步"
                  data-testid="btn-timeline-prev"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="whitespace-nowrap">上一步</span>
                </button>
                <button
                  onClick={onPlayPause}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                  data-testid="btn-timeline-play"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>暂停演示</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span className="whitespace-nowrap">{currentStep >= moves.length ? '重新播放演示' : '自动分步演示'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onStepForward}
                  disabled={isAnimating || currentStep >= moves.length}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-40 border border-slate-700/70 text-xs font-medium transition-colors cursor-pointer"
                  title="单步前进"
                  data-testid="btn-timeline-next"
                >
                  <span className="whitespace-nowrap">下一步</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onJumpToStep(moves.length)}
                  disabled={isAnimating || currentStep >= moves.length}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 border border-slate-700/70 transition-colors cursor-pointer"
                  title="跳到完成状态"
                  aria-label="跳到完成状态"
                  data-testid="btn-timeline-last"
                >
                  <ChevronLast className="w-4 h-4" />
                </button>
              </div>

              {/* Speed Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] text-slate-400 mr-1">演示倍速:</span>
                {SPEEDS.map((spd) => (
                  <button
                    key={spd}
                    onClick={() => onChangeSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Practice Mode Bottom Controls */
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-slate-400 mr-1">快捷拨层按钮:</span>
                {[
                  'R',
                  "R'",
                  'R2',
                  'U',
                  "U'",
                  'U2',
                  'F',
                  "F'",
                  'F2',
                  'L',
                  "L'",
                  'L2',
                  'D',
                  "D'",
                  'D2',
                  'B',
                  "B'",
                  'B2',
                  'M',
                  "M'",
                  'M2',
                ].map((tok) => {
                  const targetToken =
                    practiceHalfTurnPending && practiceHalfTurnToken
                      ? practiceHalfTurnToken
                      : moves[currentStep];
                  const isExpected =
                    practiceErrors.length === 0 &&
                    currentStep < moves.length &&
                    targetToken === tok;
                  return (
                    <button
                      key={tok}
                      onClick={() => onQuickMove(tok)}
                      data-testid={`practice-move-${tok}`}
                      className={`px-2 py-1 rounded font-mono text-xs font-bold border transition-all cursor-pointer ${
                        isExpected
                          ? 'bg-cyan-500/30 text-cyan-100 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.35)]'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700/80'
                      }`}
                    >
                      {tok}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {practiceErrors.length > 0 && onUndoError && (
                  <button
                    onClick={onUndoError}
                    disabled={isAnimating}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-semibold cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>撤销错步 ({practiceErrors.length})</span>
                  </button>
                )}
                {onResetPractice && (
                  <button
                    onClick={onResetPractice}
                    disabled={isAnimating}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重置本课练习</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Sandbox Mode Bottom Quick Move Deck */
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {QUICK_MOVE_GROUPS.map((grp) => (
              <div key={grp.label} className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 mr-0.5">{grp.label}:</span>
                {grp.tokens.map((tok) => (
                  <button
                    key={tok}
                    onClick={() => onQuickMove(tok)}
                    data-testid={`sandbox-move-${tok}`}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 active:bg-cyan-500/20 text-slate-200 border border-slate-700/80 font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    {tok}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-400 hidden xl:block">
            键盘快捷键：<code className="text-cyan-300">R L U D F B M</code> 顺时针 · 按住{' '}
            <code className="text-cyan-300">Shift</code> 逆时针
          </div>
        </div>
      )}
    </div>
  );
});
