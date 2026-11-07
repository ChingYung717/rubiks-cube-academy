import React, { useEffect, useRef } from 'react';
import { LAYER_BY_LAYER_STEPS, LESSONS, Lesson, YELLOW_CROSS_CASES, YellowCrossCase } from '../data/curriculum';
import { getMoveDefinition, invertMove, parseAlgorithm } from '../engine/cubeEngine';
import { SolveRecord, computeAo5, formatTimeMs } from '../utils/storage';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Dices,
  Hand,
  Lightbulb,
  MessageSquareText,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Timer,
  Trash2,
  Trophy,
  Undo2,
  Volume2,
  Wand2,
} from 'lucide-react';

interface RightWorkbenchPanelProps {
  workspaceMode: 'course' | 'sandbox';
  lesson: Lesson;
  lessonTab: 'demo' | 'practice';
  onChangeLessonTab: (tab: 'demo' | 'practice') => void;
  yellowCrossCase: YellowCrossCase;
  onChangeYellowCrossCase: (example: YellowCrossCase) => void;
  fullPracticeProgress: number | null;
  onStartFullPractice: () => void;
  canStartTimer: boolean;
  isLessonCompleted: boolean;
  demoStep: number;
  practiceStep: number;
  practiceTotalSteps: number;
  practiceHalfTurnPending: boolean;
  practiceHalfTurnToken?: string | null;
  practiceErrors: string[];
  practiceJustSucceeded: boolean;
  onUndoPracticeError: () => void;
  onResetPractice: () => void;
  onMarkLessonComplete: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onJumpToDemoStep: (stepIdx: number, customSpeechText?: string) => void;
  // Narration props
  isSpeaking: boolean;
  onSpeakText: (text: string) => void;
  onStopSpeaking: () => void;
  // Sandbox props
  scrambleTokens: string[];
  isCubeCurrentlySolved: boolean;
  timerRunning: boolean;
  timerElapsedMs: number;
  sandboxMoveHistory: string[];
  solveRecords: SolveRecord[];
  onGenerateNewScramble: () => void;
  onResetSandboxCube: () => void;
  onToggleTimer: () => void;
  onAutoSolveSandbox: () => void;
  onClearSolveRecords: () => void;
  isAnimating: boolean;
  isAutoSolving?: boolean;
}

export const RightWorkbenchPanel: React.FC<RightWorkbenchPanelProps> = ({
  workspaceMode,
  lesson,
  lessonTab,
  onChangeLessonTab,
  yellowCrossCase,
  onChangeYellowCrossCase,
  fullPracticeProgress,
  onStartFullPractice,
  canStartTimer,
  isLessonCompleted,
  demoStep,
  practiceStep,
  practiceTotalSteps,
  practiceHalfTurnPending,
  practiceHalfTurnToken = null,
  practiceErrors,
  practiceJustSucceeded,
  onUndoPracticeError,
  onResetPractice,
  onMarkLessonComplete,
  onSelectLesson,
  onJumpToDemoStep,
  isSpeaking,
  onSpeakText,
  onStopSpeaking,
  scrambleTokens,
  isCubeCurrentlySolved,
  timerRunning,
  timerElapsedMs,
  sandboxMoveHistory,
  solveRecords,
  onGenerateNewScramble,
  onResetSandboxCube,
  onToggleTimer,
  onAutoSolveSandbox,
  onClearSolveRecords,
  isAnimating,
  isAutoSolving = false,
}) => {
  const currentLessonIndex = LESSONS.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentLessonIndex > 0 ? LESSONS[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < LESSONS.length - 1
      ? LESSONS[currentLessonIndex + 1]
      : null;

  const countableRecords = solveRecords.filter((record) => record.moveCount > 0);
  const bestRecord =
    countableRecords.length > 0
      ? Math.min(...countableRecords.map((record) => record.timeMs))
      : null;
  const ao5Ms = computeAo5(countableRecords);

  const asideRef = useRef<HTMLElement | null>(null);
  const stepListContainerRef = useRef<HTMLDivElement | null>(null);
  const activeStepItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (asideRef.current) {
      asideRef.current.scrollTop = 0;
    }
    if (stepListContainerRef.current) {
      stepListContainerRef.current.scrollTop = 0;
    }
  }, [lesson.id, workspaceMode]);

  useEffect(() => {
    const container = stepListContainerRef.current;
    if (!container || workspaceMode !== 'course') return;
    if (lessonTab === 'demo' && demoStep === 0) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const item = activeStepItemRef.current;
    if (item) {
      const itemTop = item.offsetTop - container.offsetTop;
      const itemBottom = itemTop + item.offsetHeight;
      if (itemTop < container.scrollTop) {
        container.scrollTo({ top: Math.max(0, itemTop - 6), behavior: 'smooth' });
      } else if (itemBottom > container.scrollTop + container.clientHeight) {
        container.scrollTo({
          top: itemBottom - container.clientHeight + 6,
          behavior: 'smooth',
        });
      }
    }
  }, [workspaceMode, lesson.id, lessonTab, demoStep, practiceStep]);

  if (workspaceMode === 'sandbox') {
    return (
      <aside className="w-full lg:w-84 xl:w-92 shrink-0 h-full bg-[#0b101d] border-l border-slate-800/90 flex flex-col select-none overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Sandbox Header */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-slate-900 border border-indigo-500/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 font-semibold flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-indigo-400" />
              自由练习与速拧计时
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                isCubeCurrentlySolved
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isCubeCurrentlySolved ? '六面已还原' : '魔方未还原'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            用 20 步随机转动生成练习残局。可以计时还原，也可以做七步实战，按盘面检验每个阶段的目标。
          </p>
          <button
            type="button"
            onClick={onStartFullPractice}
            data-testid="btn-full-practice"
            className="mt-3 w-full rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200"
          >
            {fullPracticeProgress === null ? '开始七步实战' : '换一个七步实战残局'}
          </button>
          {fullPracticeProgress !== null && (
            <ol className="mt-3 space-y-1 text-xs" aria-label="七步实战进度">
              {LAYER_BY_LAYER_STEPS.map((step, index) => (
                <li
                  key={step}
                  aria-current={index === fullPracticeProgress ? 'step' : undefined}
                  className={index < fullPracticeProgress ? 'text-emerald-300' : 'text-slate-300'}
                >
                  {index < fullPracticeProgress ? '✓' : index + 1} {step}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Digital Timer Box */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col items-center text-center shadow-inner">
          <div className="text-[11px] text-slate-400 mb-1">
            {timerRunning
              ? '⏱️ 正在速拧计时中（还原六面将自动停表）'
              : canStartTimer
                ? '可按空格键、点击开始，或直接拨动魔方'
                : '生成新的计时打乱后可开始计时'}
          </div>
          <div
            data-testid="sandbox-timer-display"
            className={`font-mono text-4xl font-extrabold tracking-tight my-1.5 transition-colors ${
              timerRunning
                ? 'text-cyan-300'
                : timerElapsedMs > 0 && isCubeCurrentlySolved
                  ? 'text-emerald-400'
                  : 'text-slate-100'
            }`}
          >
            {formatTimeMs(timerElapsedMs)}
          </div>

          <div className="flex items-center gap-2 w-full mt-2">
            <button
              onClick={onToggleTimer}
              disabled={isAnimating || (!timerRunning && !canStartTimer)}
              data-testid="btn-sandbox-timer-toggle"
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 ${
                timerRunning
                  ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/20'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>{timerRunning ? '取消本轮 (Space)' : '开始速拧计时 (Space)'}</span>
            </button>
          </div>
        </div>

        {/* Scramble & Auto-Solve Actions */}
        <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/90 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Dices className="w-4 h-4 text-cyan-400" />
              <span>当前练习打乱（20 步）</span>
            </span>
          </div>

          <div
            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-xs text-cyan-200 leading-relaxed tracking-wide break-words"
            data-testid="sandbox-scramble-text"
          >
            {scrambleTokens.length > 0
              ? scrambleTokens.join('  ')
              : '点击「随机打乱魔方」生成一组随机练习打乱'}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onGenerateNewScramble}
              disabled={isAnimating}
              data-testid="btn-sandbox-scramble"
              className="py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-500/25 to-blue-600/25 hover:from-cyan-500/35 hover:to-blue-600/35 border border-cyan-400/50 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>随机打乱魔方</span>
            </button>

            <button
              onClick={onResetSandboxCube}
              disabled={isAnimating}
              data-testid="btn-sandbox-reset"
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置六面还原</span>
            </button>
          </div>

          {fullPracticeProgress === null && !isCubeCurrentlySolved && sandboxMoveHistory.length > 0 && (
            <button
              onClick={onAutoSolveSandbox}
              disabled={isAnimating || isAutoSolving}
              data-testid="btn-sandbox-autosolve"
              className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>
                {isAutoSolving
                  ? `正在自动还原演示中（剩余 ${sandboxMoveHistory.length} 步）...`
                  : `一键教学回放还原 (${sandboxMoveHistory.length} 步逆序复原)`}
              </span>
            </button>
          )}
        </div>

        {/* Statistics & Solve Records */}
        <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/90 space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>个人速拧战绩榜 (本地存储)</span>
            </span>
            {solveRecords.length > 0 && (
              <button
                onClick={onClearSolveRecords}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>清空</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400">PB 最佳单次</div>
              <div className="font-mono text-sm font-bold text-amber-300 mt-0.5">
                {bestRecord !== null ? formatTimeMs(bestRecord) : '--'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400">Ao5 五次平均</div>
              <div className="font-mono text-sm font-bold text-cyan-300 mt-0.5">
                {ao5Ms !== null ? formatTimeMs(ao5Ms) : '--'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400">累计还原</div>
              <div className="font-mono text-sm font-bold text-emerald-300 mt-0.5">
                {countableRecords.length} 次
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 pr-1">
            {solveRecords.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                暂无计时还原记录。点击「随机打乱魔方」后开始计时挑战吧！
              </div>
            ) : (
              solveRecords.map((rec, idx) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/75 border border-slate-800/80 text-xs"
                >
                  <span className="font-mono text-slate-400">#{solveRecords.length - idx}</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {formatTimeMs(rec.timeMs)}
                  </span>
                  <span className="text-[10px] text-slate-400">{rec.moveCount > 0 ? `${rec.moveCount} 步` : '旧记录 · 步数不详'}</span>
                  <span className="text-[10px] text-slate-500">{rec.createdAt}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    );
  }

  // ==================== COURSE WORKBENCH MODE ====================
  const formulaTokens = parseAlgorithm(lesson.formula);
  const nextExpectedToken =
    practiceStep < formulaTokens.length ? formulaTokens[practiceStep] : null;
  const nextExpectedDef = nextExpectedToken ? getMoveDefinition(nextExpectedToken) : null;

  const fullLessonNarrationText = `${lesson.title}。${lesson.summary} 持握基准：${lesson.holdingTip} 速记口诀：${lesson.mnemonic}。${lesson.introCommentary}`;

  return (
    <aside
      ref={asideRef}
      className="w-full lg:w-84 xl:w-96 shrink-0 h-full bg-[#0b101d] border-l border-slate-800/90 flex flex-col select-none overflow-y-auto custom-scrollbar p-4 space-y-3.5"
    >
      {/* Lesson Header Card */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-cyan-950/30 border border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300">
            {lesson.badge}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                isSpeaking ? onStopSpeaking() : onSpeakText(fullLessonNarrationText)
              }
              data-testid="btn-read-full-lesson"
              title="语音朗读本课核心原理与持握要领"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-[11px] font-semibold text-cyan-200 cursor-pointer transition-colors"
            >
              {isSpeaking ? (
                <>
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>停止解说</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3" />
                  <span>语音导读</span>
                </>
              )}
            </button>
            {isLessonCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                已通关
              </span>
            )}
          </div>
        </div>

        <h2 className="text-base font-bold text-white leading-snug">{lesson.title}</h2>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{lesson.subtitle}</p>
      </div>

      {/* Mode Switch Tabs: 看演示 vs 动手练 */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
        <button
          onClick={() => onChangeLessonTab('demo')}
          data-testid="tab-watch-demo"
          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            lessonTab === 'demo'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>看动画演示</span>
        </button>
        <button
          onClick={() => onChangeLessonTab('practice')}
          data-testid="tab-interactive-practice"
          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            lessonTab === 'practice'
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
          <span>动手跟练闯关</span>
        </button>
      </div>

      {lesson.id === 'lbl-step4-yellow-cross' && (
        <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="黄十字起手盘面">
          <span className="text-slate-300">起手盘面</span>
          {YELLOW_CROSS_CASES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChangeYellowCrossCase(id)}
              aria-pressed={yellowCrossCase === id}
              className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 aria-pressed:border-cyan-400 aria-pressed:bg-cyan-500/20"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {lesson.stageId === 'lbl' && (
        <button
          type="button"
          onClick={onStartFullPractice}
          data-testid="btn-full-practice"
          className="w-full rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200"
        >
          随机残局 · 开始七步实战
        </button>
      )}

      {/* Interactive Practice Live Guidance Box (shown when in Practice mode) */}
      {lessonTab === 'practice' && (
        <div
          className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
            practiceJustSucceeded
              ? 'bg-emerald-950/50 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : practiceErrors.length > 0
                ? 'bg-rose-950/50 border-rose-400/60'
                : 'bg-cyan-950/35 border-cyan-500/40'
          }`}
          data-testid="practice-status-card"
        >
          {practiceJustSucceeded ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>🎉 太棒了！你已成功还原完成本课目标！</span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                {lesson.completionCommentary}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onResetPractice}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  再练一次
                </button>
                {nextLesson && (
                  <button
                    onClick={() => onSelectLesson(nextLesson)}
                    data-testid="btn-next-lesson-after-win"
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>进入下一课：{nextLesson.badge}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : practiceErrors.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>检测到偏离步骤（误操作了 {practiceErrors.join(' → ')}）</span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                不用担心！点击下方「一键撤销错步」或反向转动{' '}
                <code className="px-1.5 py-0.5 rounded bg-rose-900/80 font-mono font-bold text-white">
                  {invertMove(practiceErrors[practiceErrors.length - 1])}
                </code>{' '}
                即可回到正确轨道。
              </p>
              <button
                onClick={onUndoPracticeError}
                data-testid="btn-undo-practice-error"
                className="w-full py-1.5 px-3 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>一键撤销错步（回到第 {practiceStep + 1} 步）</span>
              </button>
            </div>
          ) : nextExpectedDef ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Hand className="w-3.5 h-3.5" />
                  <span>
                    跟拧指引（第 {practiceStep + 1} / {practiceTotalSteps} 步）
                  </span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  支持拖拽魔方 / 键盘 / 底部按钮
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/90 border border-cyan-500/30 flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-cyan-500/25 border border-cyan-400 font-mono text-lg font-extrabold text-cyan-200">
                  {nextExpectedDef.token}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white">
                    {nextExpectedDef.nameZh}
                    {practiceHalfTurnPending && (
                      <span className="ml-1.5 text-amber-300">
                        （已完成 90° {practiceHalfTurnToken ?? ''}，请再沿同方向转一次{' '}
                        {practiceHalfTurnToken ?? ''}！）
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-cyan-300/90 mt-0.5">
                    手法：{nextExpectedDef.fingerTrickZh}
                  </div>
                </div>
              </div>
              {lesson.stepCommentaries[practiceStep] && (
                <div className="text-xs text-slate-200 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                  <strong className="text-cyan-300">🎙️ 本步解说：</strong>
                  {lesson.stepCommentaries[practiceStep]}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Step-by-Step Synchronized Chinese Commentary Script */}
      <div
        className="p-3.5 rounded-xl bg-slate-900/85 border border-cyan-500/25 space-y-2.5"
        data-testid="step-commentary-script"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-200">
            <MessageSquareText className="w-4 h-4 text-cyan-400" />
            <span>分步中文解说台本 (点击步骤可跳转/听讲)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            共 {formulaTokens.length} 步
          </span>
        </div>

        {/* Step 0 Intro Commentary Item */}
        <button
          onClick={() => onJumpToDemoStep(0, lesson.introCommentary)}
          data-testid="commentary-step-intro"
          className={`w-full text-left p-2.5 rounded-lg border text-xs leading-relaxed transition-all cursor-pointer ${
            lessonTab === 'demo' && demoStep === 0
              ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.12)]'
              : 'bg-slate-950/75 hover:bg-slate-950 border-slate-800/80 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-cyan-300 text-[11px]">
              🎙️ 观察起始状态 (Step 0)
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-cyan-400" />
              点击朗读
            </span>
          </div>
          <p>{lesson.introCommentary}</p>
        </button>

        {/* Per-Move Step Commentary Items */}
        <div
          ref={stepListContainerRef}
          className="relative space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar"
        >
          {formulaTokens.map((tok, idx) => {
            const stepNum = idx + 1;
            const text = lesson.stepCommentaries[idx] ?? '';
            const isCurrent =
              lessonTab === 'demo' ? demoStep === stepNum : practiceStep === idx;
            const isPassed =
              lessonTab === 'demo' ? demoStep > stepNum : practiceStep > idx;

            return (
              <button
                key={`${idx}_${tok}`}
                ref={isCurrent ? activeStepItemRef : null}
                onClick={() => onJumpToDemoStep(stepNum, text)}
                data-testid={`commentary-step-${stepNum}`}
                className={`w-full text-left p-2 rounded-lg border text-xs leading-relaxed transition-all flex items-start gap-2 cursor-pointer ${
                  isCurrent
                    ? 'bg-cyan-500/20 border-cyan-400/70 text-white shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                    : isPassed
                      ? 'bg-emerald-950/25 border-emerald-500/30 text-slate-300'
                      : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/70 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold shrink-0 mt-0.5 ${
                    isCurrent
                      ? 'bg-cyan-400 text-slate-950'
                      : isPassed
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {stepNum}.{tok}
                </span>
                <span className="flex-1">{text}</span>
              </button>
            );
          })}

          {/* Completion Summary Commentary Item */}
          <button
            onClick={() =>
              onJumpToDemoStep(formulaTokens.length, lesson.completionCommentary)
            }
            data-testid="commentary-step-completion"
            className={`w-full text-left p-2.5 rounded-lg border text-xs leading-relaxed transition-all cursor-pointer ${
              (lessonTab === 'demo' && demoStep >= formulaTokens.length) ||
              practiceJustSucceeded
                ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/70 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-300 text-[11px]">
                ✅ 通关还原总结 (Step {formulaTokens.length}/{formulaTokens.length})
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-emerald-400" />
                点击朗读
              </span>
            </div>
            <p>{lesson.completionCommentary}</p>
          </button>
        </div>
      </div>

      {/* Core Algorithm & Mnemonic Box */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">核心公式与记忆口诀</span>
          <code className="text-xs font-mono font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/30">
            {lesson.formula}
          </code>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
          <strong className="text-amber-300">💡 速记口诀：</strong>
          {lesson.mnemonic}
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
          <Compass className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-100">持握基准：</strong>
            {lesson.holdingTip}
          </div>
        </div>
      </div>

      {/* Principle Summary & Step-by-Step Key Points */}
      <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>还原原理与实操要点</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">{lesson.summary}</p>

        <ul className="space-y-1.5 pt-1">
          {lesson.keyPoints.map((pt, idx) => (
            <li
              key={idx}
              className="text-xs text-slate-300 leading-relaxed flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/70"
            >
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>

        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong className="text-slate-300">聚焦视野说明：</strong>
            {lesson.focusLabel}
          </span>
        </div>
      </div>

      {/* Bottom Prev / Next Lesson & Manual Pass Footer */}
      <div className="pt-1 mt-auto flex items-center justify-between gap-2">
        {prevLesson ? (
          <button
            onClick={() => onSelectLesson(prevLesson)}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer"
          >
            ← 上一课
          </button>
        ) : (
          <div />
        )}

        {!isLessonCompleted && (
          <button
            onClick={onMarkLessonComplete}
            className="px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-semibold text-emerald-300 cursor-pointer"
          >
            ✓ 标记已学会
          </button>
        )}

        {nextLesson && (
          <button
            onClick={() => onSelectLesson(nextLesson)}
            data-testid="btn-next-lesson"
            className="px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-xs font-bold text-cyan-200 flex items-center gap-1 cursor-pointer"
          >
            <span>下一课：{nextLesson.badge}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
};
