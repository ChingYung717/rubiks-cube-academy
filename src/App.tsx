import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Cubie,
  applyAlgorithm,
  applyMove,
  combineMoveWithStack,
  computeTimelineStates,
  createSolvedCube,
  evaluatePracticeMoveStep,
  generatePracticeScramble,
  getMoveDefinition,
  invertAlgorithm,
  invertMove,
  isCubeSolved,
  parseAlgorithm,
} from './engine/cubeEngine';
import {
  LAYER_BY_LAYER_STEPS,
  LESSONS,
  Lesson,
  YellowCrossCase,
  getActiveCommentary,
  getLayerByLayerProgress,
  getLessonInitialCube,
  getYellowCrossExample,
} from './data/curriculum';
import { ActiveAnimation, Cube3DStage } from './components/Cube3DStage';
import { Cube2DNet } from './components/Cube2DNet';
import { FormulaTimelinePlayer } from './components/FormulaTimelinePlayer';
import { LiveCommentaryBar } from './components/LiveCommentaryBar';
import { CurriculumSidebar } from './components/CurriculumSidebar';
import { RightWorkbenchPanel } from './components/RightWorkbenchPanel';
import { TopNavbar } from './components/TopNavbar';
import { NotationGuideModal } from './components/NotationGuideModal';
import { soundEngine } from './utils/soundEngine';
import { narrationEngine } from './utils/narrationEngine';
import {
  SolveRecord,
  loadCompletedLessons,
  loadSettings,
  loadSolveRecords,
  saveCompletedLessons,
  saveSettings,
  saveSolveRecords,
} from './utils/storage';

export const App: React.FC = () => {
  // Persisted settings & records
  const initialSettings = useMemo(() => loadSettings(), []);
  const [soundEnabled, setSoundEnabled] = useState(initialSettings.soundEnabled);
  const [narrationEnabled, setNarrationEnabled] = useState(
    initialSettings.narrationEnabled ?? true
  );
  const [focusMode, setFocusMode] = useState(initialSettings.focusMode);
  const [show3DArrows, setShow3DArrows] = useState(initialSettings.show3DArrows);
  const [show2DNet, setShow2DNet] = useState(initialSettings.show2DNet);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialSettings.playbackSpeed);
  const playbackSpeedRef = useRef(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;

  // Voice narration speaking indicator
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isNarratedWalkthrough, setIsNarratedWalkthrough] = useState(false);
  const walkthroughSessionRef = useRef(0);

  const [completedLessons, setCompletedLessons] = useState<string[]>(() =>
    loadCompletedLessons()
  );
  const [solveRecords, setSolveRecords] = useState<SolveRecord[]>(() =>
    loadSolveRecords()
  );

  // Workspace & Lesson state
  const [workspaceMode, setWorkspaceMode] = useState<'course' | 'sandbox'>('course');
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(LESSONS[0]);
  const [yellowCrossCase, setYellowCrossCase] = useState<YellowCrossCase>('line');
  const activeLesson = useMemo(
    () => selectedLesson.id === 'lbl-step4-yellow-cross'
      ? getYellowCrossExample(selectedLesson, yellowCrossCase)
      : selectedLesson,
    [selectedLesson, yellowCrossCase]
  );
  const [lessonTab, setLessonTab] = useState<'demo' | 'practice'>('demo');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [webGLUnavailable, setWebGLUnavailable] = useState(false);
  const handleWebGLUnavailable = useCallback(() => setWebGLUnavailable(true), []);
  // Mobile/Tablet (<1024px) active pane switcher
  const [mobilePane, setMobilePane] = useState<'curriculum' | 'stage' | 'guide'>('stage');
  const stageRef = useRef<HTMLElement>(null);

  // Course Timeline & Cube State
  const lessonMoves = useMemo(
    () => parseAlgorithm(activeLesson.formula),
    [activeLesson]
  );
  const timelineStates = useMemo(
    () => computeTimelineStates(getLessonInitialCube(activeLesson), lessonMoves),
    [activeLesson, lessonMoves]
  );

  const [demoStep, setDemoStep] = useState(0);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  // Interactive Practice State
  const [practiceCube, setPracticeCube] = useState<Cubie[]>(() =>
    getLessonInitialCube(LESSONS[0])
  );
  const [practiceStep, setPracticeStep] = useState(0);
  const [practiceHalfTurnToken, setPracticeHalfTurnToken] = useState<string | null>(null);
  const [practiceErrors, setPracticeErrors] = useState<string[]>([]);
  const [practiceJustSucceeded, setPracticeJustSucceeded] = useState(false);
  const practiceHalfTurnPending = practiceHalfTurnToken !== null;

  // Sandbox & Speedcubing Timer State
  const [sandboxCube, setSandboxCube] = useState<Cubie[]>(() => createSolvedCube());
  const [scrambleTokens, setScrambleTokens] = useState<string[]>([]);
  const [isFullPractice, setIsFullPractice] = useState(false);
  const [sandboxMoveHistory, setSandboxMoveHistory] = useState<string[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsedMs, setTimerElapsedMs] = useState(0);
  const [timerArmedAfterScramble, setTimerArmedAfterScramble] = useState(false);
  const timerStartRef = useRef<number>(0);
  const timedMovesRef = useRef(0);
  const [autoSolveQueue, setAutoSolveQueue] = useState<string[]>([]);

  // Active 3D layer rotation animation & FIFO user move buffer
  const [activeAnimation, setActiveAnimation] = useState<ActiveAnimation | null>(null);
  const isAnimatingRef = useRef(false);
  const [pendingUserMoves, setPendingUserMoves] = useState<string[]>([]);
  const animIdCounterRef = useRef(1);

  // Subscribe to narrationEngine speaking state
  useEffect(() => {
    return narrationEngine.subscribe((speaking) => {
      setIsSpeaking(speaking);
    });
  }, []);

  const stopNarratedWalkthrough = useCallback(() => {
    walkthroughSessionRef.current++;
    setIsNarratedWalkthrough(false);
    narrationEngine.stop();
  }, []);

  const cancelAllAnimationsAndQueues = useCallback(() => {
    walkthroughSessionRef.current++;
    setIsNarratedWalkthrough(false);
    isAnimatingRef.current = false;
    setActiveAnimation(null);
    setPendingUserMoves([]);
  }, []);

  // Sync settings to localStorage, soundEngine & narrationEngine
  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
    narrationEngine.setEnabled(narrationEnabled);
    saveSettings({
      soundEnabled,
      narrationEnabled,
      focusMode,
      show3DArrows,
      show2DNet,
      playbackSpeed,
    });
  }, [
    soundEnabled,
    narrationEnabled,
    focusMode,
    show3DArrows,
    show2DNet,
    playbackSpeed,
  ]);

  // Compute current synchronized Chinese commentary
  const isSandboxSolved = useMemo(() => isCubeSolved(sandboxCube), [sandboxCube]);
  const fullPracticeProgress = useMemo(
    () => isFullPractice ? getLayerByLayerProgress(sandboxCube) : null,
    [isFullPractice, sandboxCube]
  );
  const activeCommentary = useMemo(
    () =>
      getActiveCommentary({
        workspaceMode,
        lesson: activeLesson,
        lessonTab,
        demoStep,
        practiceStep,
        practiceHalfTurnPending,
        practiceHalfTurnToken,
        practiceErrors,
        practiceJustSucceeded,
        autoSolveQueue,
        timerRunning,
        isSandboxSolved,
        fullPracticeProgress,
        timerArmedAfterScramble,
      }),
    [
      workspaceMode,
      activeLesson,
      lessonTab,
      demoStep,
      practiceStep,
      practiceHalfTurnPending,
      practiceHalfTurnToken,
      practiceErrors,
      practiceJustSucceeded,
      autoSolveQueue,
      timerRunning,
      isSandboxSolved,
      fullPracticeProgress,
      timerArmedAfterScramble,
    ]
  );

  // Mark lesson complete helper
  const markLessonCompleted = useCallback((lessonId: string) => {
    setCompletedLessons((prev) => {
      if (prev.includes(lessonId)) return prev;
      const next = [...prev, lessonId];
      saveCompletedLessons(next);
      return next;
    });
  }, []);

  const triggerVictoryCelebration = useCallback(() => {
    soundEngine.playVictoryFanfare();
    try {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
        disableForReducedMotion: true,
      });
    } catch {
      // ignore in headless environments without canvas support
    }
  }, []);

  // Switch between Course and Sandbox workspace modes cleanly
  const handleSwitchWorkspaceMode = useCallback(
    (mode: 'course' | 'sandbox') => {
      if (mode === workspaceMode) return;
      setIsPlayingDemo(false);
      cancelAllAnimationsAndQueues();
      narrationEngine.stop();
      setAutoSolveQueue([]);
      if (mode !== 'sandbox') {
        setTimerRunning(false);
        setTimerArmedAfterScramble(false);
      }
      setWorkspaceMode(mode);
      if (mode === 'sandbox') {
        setMobilePane('guide');
        narrationEngine.speak('进入自由练习场。可以开始七步实战，也可以随机打乱后计时。');
      } else {
        setMobilePane('stage');
        setLessonTab('demo');
        setDemoStep(0);
        narrationEngine.speak(`${activeLesson.title}。${activeLesson.introCommentary}`);
      }
    },
    [workspaceMode, cancelAllAnimationsAndQueues, activeLesson]
  );

  // Select a lesson
  const handleSelectLesson = useCallback(
    (lesson: Lesson, example: YellowCrossCase = 'line') => {
      setIsPlayingDemo(false);
      cancelAllAnimationsAndQueues();
      setAutoSolveQueue([]);
      setTimerRunning(false);
      setTimerArmedAfterScramble(false);
      setWorkspaceMode('course');
      setSelectedLesson(lesson);
      setYellowCrossCase(example);
      setLessonTab('demo');
      setDemoStep(0);
      const activeExample = lesson.id === 'lbl-step4-yellow-cross' ? getYellowCrossExample(lesson, example) : lesson;
      const initCube = getLessonInitialCube(activeExample);
      setPracticeCube(initCube);
      setPracticeStep(0);
      setPracticeHalfTurnToken(null);
      setPracticeErrors([]);
      setPracticeJustSucceeded(false);
      setMobilePane('stage');
      narrationEngine.speak(`${activeExample.title}。${activeExample.introCommentary}`);
    },
    [cancelAllAnimationsAndQueues]
  );

  // Switch between Demo and Practice tab
  const handleChangeLessonTab = useCallback(
    (tab: 'demo' | 'practice') => {
      setIsPlayingDemo(false);
      cancelAllAnimationsAndQueues();
      setLessonTab(tab);
      setMobilePane('stage');
      if (tab === 'demo') {
        setDemoStep(0);
        narrationEngine.speak(activeLesson.introCommentary);
      } else {
        setPracticeCube(getLessonInitialCube(activeLesson));
        setPracticeStep(0);
        setPracticeHalfTurnToken(null);
        setPracticeErrors([]);
        setPracticeJustSucceeded(false);
        const firstStepGuide = activeLesson.stepCommentaries[0] ?? '';
        narrationEngine.speak(`进入动手跟练闯关。${firstStepGuide}`);
      }
    },
    [activeLesson, cancelAllAnimationsAndQueues]
  );

  // Reset current lesson practice
  const handleResetPractice = useCallback(() => {
    cancelAllAnimationsAndQueues();
    setPracticeCube(getLessonInitialCube(activeLesson));
    setPracticeStep(0);
    setPracticeHalfTurnToken(null);
    setPracticeErrors([]);
    setPracticeJustSucceeded(false);
    const firstStepGuide = activeLesson.stepCommentaries[0] ?? '';
    narrationEngine.speak(`已重置本课练习。${firstStepGuide}`);
  }, [activeLesson, cancelAllAnimationsAndQueues]);

  // Helper to run a single animated move
  const runAnimatedMove = useCallback(
    (
      fromCube: Cubie[],
      moveToken: string,
      onDone: () => void,
      customDurationMs?: number
    ) => {
      const def = getMoveDefinition(moveToken);
      const isDouble = Math.abs(def.quarterTurns) === 2;
      soundEngine.playMoveSound(isDouble);
      const baseDur = isDouble ? 260 : 180;
      const durationMs = customDurationMs ?? Math.round(baseDur / playbackSpeed);
      const nextId = animIdCounterRef.current++;

      isAnimatingRef.current = true;
      setActiveAnimation({
        id: nextId,
        fromCube,
        moveToken,
        durationMs,
        onFinish: () => {
          if (nextId !== animIdCounterRef.current - 1) return;
          isAnimatingRef.current = false;
          setActiveAnimation(null);
          onDone();
        },
      });
    },
    [playbackSpeed]
  );

  // Demo Timeline Controls
  const handleStepForward = useCallback(() => {
    if (isAnimatingRef.current || demoStep >= lessonMoves.length) return;
    stopNarratedWalkthrough();
    setIsPlayingDemo(false);
    const moveIdx = demoStep;
    const moveToken = lessonMoves[moveIdx];
    const fromCube = timelineStates[moveIdx];
    const isLast = moveIdx + 1 >= lessonMoves.length;
    const stepCommentary = activeLesson.stepCommentaries[moveIdx] ?? '';
    const speech = isLast
      ? `${stepCommentary} ${activeLesson.completionCommentary}`
      : stepCommentary;

    setDemoStep(Math.min(lessonMoves.length, moveIdx + 1));
    narrationEngine.speak(speech);
    runAnimatedMove(fromCube, moveToken, () => {});
  }, [
    demoStep,
    lessonMoves,
    timelineStates,
    activeLesson,
    stopNarratedWalkthrough,
    runAnimatedMove,
  ]);

  const handleStepBackward = useCallback(() => {
    if (isAnimatingRef.current || demoStep <= 0) return;
    stopNarratedWalkthrough();
    setIsPlayingDemo(false);
    const targetStep = demoStep - 1;
    const prevMoveToken = lessonMoves[targetStep];
    const invToken = invertMove(prevMoveToken);
    const fromCube = timelineStates[demoStep];
    const speech =
      targetStep === 0
        ? activeLesson.introCommentary
        : activeLesson.stepCommentaries[targetStep - 1] ?? '';

    setDemoStep(Math.max(0, targetStep));
    narrationEngine.speak(speech);
    runAnimatedMove(fromCube, invToken, () => {});
  }, [
    demoStep,
    lessonMoves,
    timelineStates,
    activeLesson,
    stopNarratedWalkthrough,
    runAnimatedMove,
  ]);

  const handleJumpToStep = useCallback(
    (stepIdx: number, customSpeechText?: string) => {
      setIsPlayingDemo(false);
      cancelAllAnimationsAndQueues();
      setLessonTab('demo');
      setMobilePane('stage');
      const clamped = Math.max(0, Math.min(lessonMoves.length, stepIdx));
      setDemoStep(clamped);
      if (customSpeechText !== undefined) {
        narrationEngine.speak(customSpeechText, { force: true });
      } else if (clamped === 0) {
        narrationEngine.speak(activeLesson.introCommentary);
      } else if (clamped >= lessonMoves.length) {
        const lastText = activeLesson.stepCommentaries[lessonMoves.length - 1] ?? '';
        narrationEngine.speak(`${lastText} ${activeLesson.completionCommentary}`);
      } else {
        narrationEngine.speak(activeLesson.stepCommentaries[clamped - 1] ?? '');
      }
    },
    [lessonMoves.length, activeLesson, cancelAllAnimationsAndQueues]
  );

  const handlePlayPauseDemo = useCallback(() => {
    stopNarratedWalkthrough();
    if (isPlayingDemo) {
      setIsPlayingDemo(false);
      return;
    }
    if (demoStep >= lessonMoves.length) {
      setDemoStep(0);
    }
    setIsPlayingDemo(true);
  }, [isPlayingDemo, demoStep, lessonMoves.length, stopNarratedWalkthrough]);

  // Full Narrated Coach Walkthrough ("教练全程带读")
  const handleToggleNarratedWalkthrough = useCallback(() => {
    if (isNarratedWalkthrough) {
      stopNarratedWalkthrough();
      return;
    }

    setIsPlayingDemo(false);
    cancelAllAnimationsAndQueues();
    setLessonTab('demo');
    setDemoStep(0);
    setIsNarratedWalkthrough(true);
    const sessionId = ++walkthroughSessionRef.current;

    const runWalkthroughStep = (stepIdx: number) => {
      if (walkthroughSessionRef.current !== sessionId) return;
      if (stepIdx >= lessonMoves.length) {
        setIsNarratedWalkthrough(false);
        return;
      }

      const spd = playbackSpeedRef.current;
      const moveToken = lessonMoves[stepIdx];
      const fromCube = timelineStates[stepIdx];
      const isLast = stepIdx === lessonMoves.length - 1;
      const stepCommentary = activeLesson.stepCommentaries[stepIdx] ?? '';
      const speechText = isLast
        ? `${stepCommentary} ${activeLesson.completionCommentary}`
        : stepCommentary;

      let animFinished = false;
      let speechFinished = false;

      const proceedIfReady = () => {
        if (walkthroughSessionRef.current !== sessionId) return;
        if (animFinished && speechFinished) {
          window.setTimeout(() => {
            if (walkthroughSessionRef.current === sessionId) {
              runWalkthroughStep(stepIdx + 1);
            }
          }, Math.round(140 / spd));
        }
      };

      // Update demoStep immediately as the step begins so subtitle & script highlight in sync
      setDemoStep(stepIdx + 1);

      runAnimatedMove(
        fromCube,
        moveToken,
        () => {
          if (walkthroughSessionRef.current !== sessionId) return;
          animFinished = true;
          proceedIfReady();
        },
        Math.round(280 / spd)
      );

      const speechRate = Math.max(0.85, Math.min(1.5, 1.08 * Math.pow(spd, 0.35)));
      const holdMs = Math.max(420, Math.round(820 / Math.pow(spd, 0.55)));

      narrationEngine.speak(speechText, {
        force: true,
        rate: speechRate,
        minHoldMs: holdMs,
        onEnd: () => {
          speechFinished = true;
          proceedIfReady();
        },
      });
    };

    const initSpd = playbackSpeedRef.current;
    const introRate = Math.max(0.85, Math.min(1.5, 1.08 * Math.pow(initSpd, 0.35)));
    const introHoldMs = Math.max(360, Math.round(550 / Math.pow(initSpd, 0.55)));

    // First read the lesson intro commentary at Step 0, then step through 1..N
    narrationEngine.speak(`${activeLesson.title}。${activeLesson.introCommentary}`, {
      force: true,
      rate: introRate,
      minHoldMs: introHoldMs,
      onEnd: () => {
        if (walkthroughSessionRef.current !== sessionId) return;
        window.setTimeout(() => {
          if (walkthroughSessionRef.current === sessionId) {
            runWalkthroughStep(0);
          }
        }, Math.round(110 / initSpd));
      },
    });
  }, [
    isNarratedWalkthrough,
    stopNarratedWalkthrough,
    cancelAllAnimationsAndQueues,
    lessonMoves,
    timelineStates,
    activeLesson,
    runAnimatedMove,
  ]);

  // Automatic playback effect in Demo mode
  useEffect(() => {
    if (workspaceMode !== 'course' || lessonTab !== 'demo' || !isPlayingDemo) {
      return;
    }
    if (activeAnimation) return;

    if (demoStep >= lessonMoves.length) {
      setIsPlayingDemo(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const moveIdx = demoStep;
      const moveToken = lessonMoves[moveIdx];
      const fromCube = timelineStates[moveIdx];
      const isLast = moveIdx + 1 >= lessonMoves.length;
      const stepText = activeLesson.stepCommentaries[moveIdx] ?? '';
      setDemoStep(moveIdx + 1);
      narrationEngine.speak(
        isLast ? `${stepText} ${activeLesson.completionCommentary}` : stepText
      );
      runAnimatedMove(fromCube, moveToken, () => {});
    }, Math.round(140 / playbackSpeed));

    return () => window.clearTimeout(timer);
  }, [
    workspaceMode,
    lessonTab,
    isPlayingDemo,
    activeAnimation,
    demoStep,
    lessonMoves,
    timelineStates,
    activeLesson,
    playbackSpeed,
    runAnimatedMove,
  ]);

  // Shared helper to execute a practice move from any specified starting practice state
  const applyPracticeMoveFromState = useCallback(
    (
      fromCube: Cubie[],
      baseProgress: { step: number; halfTurnToken: string | null; errors: string[] },
      moveToken: string,
      customDurationMs?: number
    ) => {
      const nextCube = applyMove(fromCube, moveToken);
      const transition = evaluatePracticeMoveStep(baseProgress, moveToken, lessonMoves);

      const goalReached =
        activeLesson.checkGoal(nextCube) &&
        transition.errors.length === 0 &&
        transition.halfTurnToken === null &&
        transition.step >= lessonMoves.length;

      // Update step & error indicators immediately for zero-latency UI feedback
      setPracticeStep(transition.step);
      setPracticeHalfTurnToken(transition.halfTurnToken);
      setPracticeErrors(transition.errors);
      if (!goalReached) {
        setPracticeJustSucceeded(false);
      }

      runAnimatedMove(
        fromCube,
        moveToken,
        () => {
          setPracticeCube(nextCube);

          if (goalReached) {
            setPracticeJustSucceeded(true);
            markLessonCompleted(activeLesson.id);
            triggerVictoryCelebration();
            narrationEngine.speak(`恭喜通关！${activeLesson.completionCommentary}`);
          } else if (transition.madeMistake) {
            soundEngine.playErrorAlert();
            const lastErr = transition.errors[transition.errors.length - 1] ?? moveToken;
            narrationEngine.speak(
              `误操作了 ${lastErr}，请点击撤销错步或反向转动 ${invertMove(lastErr)}。`
            );
          } else if (transition.errors.length > 0) {
            soundEngine.playPracticeStepCorrect();
            const remErr = transition.errors[transition.errors.length - 1];
            narrationEngine.speak(
              `已撤销一步，请继续点击撤销错步或反向转动 ${invertMove(remErr)} 退回正轨。`
            );
          } else if (transition.halfTurnToken) {
            soundEngine.playPracticeStepCorrect();
            narrationEngine.speak(
              `已完成 90 度，请再沿同方向拨一次 ${transition.halfTurnToken} 完成半圈。`
            );
          } else if (transition.stepAdvanced) {
            soundEngine.playPracticeStepCorrect();
            const nextStepCommentary = activeLesson.stepCommentaries[transition.step];
            if (nextStepCommentary) {
              narrationEngine.speak(nextStepCommentary);
            }
          } else {
            const curMove = lessonMoves[transition.step] ?? '';
            narrationEngine.speak(
              `已退回第 ${transition.step + 1} 步起点，请重新执行 ${curMove}。`
            );
          }
        },
        customDurationMs
      );
    },
    [
      lessonMoves,
      activeLesson,
      runAnimatedMove,
      markLessonCompleted,
      triggerVictoryCelebration,
    ]
  );

  // Execute a move in Interactive Practice mode
  const executePracticeMove = useCallback(
    (moveToken: string, customDurationMs?: number) => {
      if (isAnimatingRef.current) return;
      applyPracticeMoveFromState(
        practiceCube,
        {
          step: practiceStep,
          halfTurnToken: practiceHalfTurnToken,
          errors: practiceErrors,
        },
        moveToken,
        customDurationMs
      );
    },
    [
      practiceCube,
      practiceStep,
      practiceHalfTurnToken,
      practiceErrors,
      applyPracticeMoveFromState,
    ]
  );

  const handleUndoPracticeError = useCallback(() => {
    if (isAnimatingRef.current || practiceErrors.length === 0) return;
    setPendingUserMoves([]);
    const lastError = practiceErrors[practiceErrors.length - 1];
    const undoToken = invertMove(lastError);
    executePracticeMove(undoToken);
  }, [practiceErrors, executePracticeMove]);

  useEffect(() => {
    if (scrambleTokens.length > 0) stageRef.current?.focus({ preventScroll: true });
  }, [scrambleTokens]);

  // Sandbox Timer Interval
  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setTimerElapsedMs(performance.now() - timerStartRef.current);
    }, 31);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  // Sandbox Auto-Solve Queue Effect
  useEffect(() => {
    if (workspaceMode !== 'sandbox' || autoSolveQueue.length === 0 || activeAnimation) {
      return;
    }
    const [nextToken, ...rest] = autoSolveQueue;
    const fromCube = sandboxCube;
    const nextCube = applyMove(fromCube, nextToken);
    runAnimatedMove(
      fromCube,
      nextToken,
      () => {
        setSandboxCube(nextCube);
        setAutoSolveQueue(rest);
        setSandboxMoveHistory((prev) =>
          rest.length === 0 && isCubeSolved(nextCube)
            ? []
            : combineMoveWithStack(prev, nextToken)
        );
        if (rest.length === 0 && isCubeSolved(nextCube)) {
          soundEngine.playVictoryFanfare();
          narrationEngine.speak('逆序教学回放完成，魔方已六面复原！');
        }
      },
      130
    );
  }, [workspaceMode, autoSolveQueue, activeAnimation, sandboxCube, runAnimatedMove]);

  // Execute a move in Sandbox mode
  const executeSandboxMove = useCallback(
    (moveToken: string, customDurationMs?: number) => {
      if (isAnimatingRef.current || autoSolveQueue.length > 0) return;
      const fromCube = sandboxCube;
      const nextCube = applyMove(fromCube, moveToken);

      // Start timer automatically if armed after scramble
      const movedAt = performance.now();
      const isCubeRotation = /^[xyz]/.test(moveToken);
      const startedNow = timerArmedAfterScramble && !timerRunning && !isCubeRotation;
      if (startedNow) {
        timerStartRef.current = movedAt;
        timedMovesRef.current = 0;
        setTimerRunning(true);
        setTimerArmedAfterScramble(false);
      }
      const isTimedMove = timerRunning || startedNow;
      if (isTimedMove && !isCubeRotation) timedMovesRef.current++;

      const nextHistory = combineMoveWithStack(sandboxMoveHistory, moveToken);
      setSandboxMoveHistory(nextHistory);

      runAnimatedMove(
        fromCube,
        moveToken,
        () => {
          setSandboxCube(nextCube);

          if (isCubeSolved(nextCube)) {
            setSandboxMoveHistory([]);
            if (isTimedMove) {
              const finalTimeMs = Math.max(1, Math.round(movedAt - timerStartRef.current));
              setTimerRunning(false);
              setTimerElapsedMs(finalTimeMs);
              const newRecord: SolveRecord = {
                id: `solve_${Date.now()}`,
                timeMs: finalTimeMs,
                scramble: scrambleTokens.join(' '),
                createdAt: new Date().toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
                moveCount: timedMovesRef.current,
              };
              setSolveRecords((prev) => {
                const updated = [newRecord, ...prev];
                saveSolveRecords(updated);
                return updated;
              });
              triggerVictoryCelebration();
              narrationEngine.speak(
                `太棒了！六面还原成功，用时 ${(finalTimeMs / 1000).toFixed(2)} 秒！`
              );
            }
          }
        },
        customDurationMs
      );
    },
    [
      autoSolveQueue.length,
      sandboxCube,
      timerArmedAfterScramble,
      timerRunning,
      sandboxMoveHistory,
      scrambleTokens,
      runAnimatedMove,
      triggerVictoryCelebration,
    ]
  );

  // Execute a single user move immediately (called when no animation is active)
  const executeImmediateUserMove = useCallback(
    (moveToken: string, isFromRapidQueue = false) => {
      stopNarratedWalkthrough();
      const fastDuration = isFromRapidQueue ? 115 : undefined;
      if (workspaceMode === 'sandbox') {
        executeSandboxMove(moveToken, fastDuration);
      } else if (lessonTab === 'practice') {
        executePracticeMove(moveToken, fastDuration);
      } else {
        // In Demo mode:
        const normalized = getMoveDefinition(moveToken).token;
        if (demoStep < lessonMoves.length && lessonMoves[demoStep] === normalized) {
          handleStepForward();
        } else if (
          demoStep > 0 &&
          invertMove(lessonMoves[demoStep - 1]) === normalized
        ) {
          handleStepBackward();
        } else {
          // Smoothly transition into Practice mode starting from the current demo step (or step 0 if demo was finished)
          setIsPlayingDemo(false);
          const startStep = demoStep < lessonMoves.length ? demoStep : 0;
          const initCube = timelineStates[startStep];
          setLessonTab('practice');
          setPracticeCube(initCube);
          setPracticeJustSucceeded(false);
          applyPracticeMoveFromState(
            initCube,
            { step: startStep, halfTurnToken: null, errors: [] },
            normalized,
            fastDuration
          );
        }
      }
    },
    [
      stopNarratedWalkthrough,
      workspaceMode,
      lessonTab,
      demoStep,
      lessonMoves,
      timelineStates,
      executeSandboxMove,
      executePracticeMove,
      handleStepForward,
      handleStepBackward,
      applyPracticeMoveFromState,
    ]
  );

  // Drain FIFO pendingUserMoves queue as soon as activeAnimation finishes
  useEffect(() => {
    if (activeAnimation || isAnimatingRef.current || pendingUserMoves.length === 0) {
      return;
    }
    const [nextMove, ...rest] = pendingUserMoves;
    setPendingUserMoves(rest);
    executeImmediateUserMove(nextMove, true);
  }, [activeAnimation, pendingUserMoves, executeImmediateUserMove]);

  // Unified handler when user twists a layer via 3D drag, keyboard, or quick-move button
  const handleUserMove = useCallback(
    (moveToken: string) => {
      if (workspaceMode === 'sandbox' && autoSolveQueue.length > 0) {
        return;
      }
      if (isNarratedWalkthrough || isPlayingDemo) {
        stopNarratedWalkthrough();
        setIsPlayingDemo(false);
        if (isAnimatingRef.current || activeAnimation) {
          return;
        }
      }
      if (isAnimatingRef.current || activeAnimation) {
        setPendingUserMoves((prev) => (prev.length < 16 ? [...prev, moveToken] : prev));
        return;
      }
      executeImmediateUserMove(moveToken, false);
    },
    [
      workspaceMode,
      autoSolveQueue.length,
      isNarratedWalkthrough,
      isPlayingDemo,
      stopNarratedWalkthrough,
      activeAnimation,
      executeImmediateUserMove,
    ]
  );

  // Sandbox Actions
  const startScrambledCube = useCallback((fullPractice: boolean) => {
    setIsPlayingDemo(false);
    cancelAllAnimationsAndQueues();
    setWorkspaceMode('sandbox');
    setMobilePane('stage');
    setIsFullPractice(fullPractice);
    setAutoSolveQueue([]);
    setTimerRunning(false);
    setTimerElapsedMs(0);
    let newScramble: string[];
    let scrambled: Cubie[];
    do {
      newScramble = generatePracticeScramble(20);
      scrambled = applyAlgorithm(createSolvedCube(), newScramble);
    } while (isCubeSolved(scrambled));
    setScrambleTokens(newScramble);
    setSandboxCube(scrambled);
    setSandboxMoveHistory(newScramble);
    setTimerArmedAfterScramble(!fullPractice);
    soundEngine.playMoveSound(true);
    narrationEngine.speak(fullPractice
      ? '开始七步实战。保持白色在底面，从白十字开始。'
      : '已随机打乱。拨动魔方或按空格键即可开始计时。');
  }, [cancelAllAnimationsAndQueues]);

  const handleGenerateNewScramble = () => startScrambledCube(false);
  const handleStartFullPractice = () => startScrambledCube(true);

  const handleResetSandboxCube = useCallback(() => {
    cancelAllAnimationsAndQueues();
    setAutoSolveQueue([]);
    setTimerRunning(false);
    setTimerElapsedMs(0);
    setTimerArmedAfterScramble(false);
    setSandboxCube(createSolvedCube());
    setSandboxMoveHistory([]);
    setScrambleTokens([]);
    setIsFullPractice(false);
    soundEngine.playMoveSound(false);
    narrationEngine.speak('已重置为六面还原状态。');
  }, [cancelAllAnimationsAndQueues]);

  const handleToggleTimer = useCallback(() => {
    if (isAnimatingRef.current || autoSolveQueue.length > 0) return;
    if (timerRunning) {
      setTimerRunning(false);
      setTimerElapsedMs(0);
      narrationEngine.speak('已取消本轮计时。');
    } else if (timerArmedAfterScramble) {
      timerStartRef.current = performance.now();
      timedMovesRef.current = 0;
      setTimerElapsedMs(0);
      setTimerRunning(true);
      setTimerArmedAfterScramble(false);
    }
  }, [timerRunning, timerArmedAfterScramble, autoSolveQueue.length]);

  const handleAutoSolveSandbox = useCallback(() => {
    if (
      isAnimatingRef.current ||
      isFullPractice ||
      autoSolveQueue.length > 0 ||
      sandboxMoveHistory.length === 0
    ) {
      return;
    }
    setPendingUserMoves([]);
    setTimerRunning(false);
    setTimerArmedAfterScramble(false);
    let simplified: string[] = [];
    for (const tok of sandboxMoveHistory) {
      simplified = combineMoveWithStack(simplified, tok);
    }
    const solveSeq = invertAlgorithm(simplified);
    setSandboxMoveHistory(simplified);
    setAutoSolveQueue(solveSeq);
    narrationEngine.speak(`开始一键逆序复原演示，共 ${solveSeq.length} 步。`);
  }, [autoSolveQueue.length, isFullPractice, sandboxMoveHistory]);

  // Toggle Narration setting & provide immediate feedback when enabled
  const handleToggleNarration = useCallback(() => {
    walkthroughSessionRef.current++;
    setIsNarratedWalkthrough(false);
    setNarrationEnabled((prev) => {
      const next = !prev;
      narrationEngine.setEnabled(next);
      if (next) {
        narrationEngine.speak(activeCommentary.speechText, { force: true });
      }
      return next;
    });
  }, [activeCommentary.speechText]);

  // Global Keyboard Shortcuts (R, L, U, D, F, B, M, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isGuideOpen
      ) {
        return;
      }

      if (e.code === 'Space') {
        if (
          e.metaKey || e.ctrlKey || e.altKey || e.shiftKey ||
          (e.target instanceof Element && e.target.closest('button, a, [role="button"], [contenteditable]'))
        ) {
          return;
        }
        e.preventDefault();
        if (workspaceMode === 'course' && lessonTab !== 'demo') return;
        if (e.repeat) return;
        if (workspaceMode === 'sandbox') {
          handleToggleTimer();
        } else if (lessonTab === 'demo') {
          handlePlayPauseDemo();
        }
        return;
      }

      const keyUpper = e.key.toUpperCase();
      const validBases = ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'X', 'Y', 'Z'];
      if (validBases.includes(keyUpper) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (e.repeat) return;
        const base =
          keyUpper === 'X' || keyUpper === 'Y' || keyUpper === 'Z'
            ? keyUpper.toLowerCase()
            : keyUpper;
        const token = e.shiftKey ? `${base}'` : base;
        handleUserMove(token);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    workspaceMode,
    lessonTab,
    isGuideOpen,
    handleToggleTimer,
    handlePlayPauseDemo,
    handleUserMove,
  ]);

  // Determine currently displayed Cube state and 3D Hint Arrow token
  const displayedCube: Cubie[] =
    workspaceMode === 'sandbox'
      ? sandboxCube
      : lessonTab === 'demo'
        ? timelineStates[demoStep] ?? timelineStates[0]
        : practiceCube;

  const currentHintToken: string | null = useMemo(() => {
    if (workspaceMode === 'sandbox') {
      return autoSolveQueue[0] ?? null;
    }
    if (lessonTab === 'demo') {
      return demoStep < lessonMoves.length ? lessonMoves[demoStep] : null;
    }
    // Practice mode
    if (practiceJustSucceeded) return null;
    if (practiceErrors.length > 0) {
      return invertMove(practiceErrors[practiceErrors.length - 1]);
    }
    if (practiceHalfTurnToken) {
      return practiceHalfTurnToken;
    }
    return practiceStep < lessonMoves.length ? lessonMoves[practiceStep] : null;
  }, [
    workspaceMode,
    autoSolveQueue,
    lessonTab,
    demoStep,
    lessonMoves,
    practiceJustSucceeded,
    practiceErrors,
    practiceHalfTurnToken,
    practiceStep,
  ]);

  const effectiveFocusMode = workspaceMode === 'course' && focusMode;

  const modeBadgeText =
    workspaceMode === 'sandbox'
      ? autoSolveQueue.length > 0
        ? `⚡ 正在自动逆序求解演示（剩余 ${autoSolveQueue.length} 步）`
        : fullPracticeProgress !== null
          ? fullPracticeProgress === LAYER_BY_LAYER_STEPS.length
            ? '✓ 七步实战完成'
            : `七步实战 · 第 ${fullPracticeProgress + 1} 步：${LAYER_BY_LAYER_STEPS[fullPracticeProgress]}`
          : timerRunning
            ? '⏱️ 速拧计时进行中'
            : '🎲 自由练习场'
      : lessonTab === 'demo'
        ? `🎬 演示模式 · ${activeLesson.badge} ${activeLesson.title}`
        : `🎮 动手跟练闯关 · 第 ${Math.min(practiceStep + 1, lessonMoves.length)}/${lessonMoves.length} 步`;

  const cubeNet = (
    <Cube2DNet
      cube={displayedCube}
      focusMode={effectiveFocusMode}
      isCubieFocused={activeLesson.isCubieFocused}
      onFaceClick={handleUserMove}
    />
  );

  return (
    <div className="w-full h-screen h-dvh flex flex-col bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <TopNavbar
        workspaceMode={workspaceMode}
        onSwitchWorkspaceMode={handleSwitchWorkspaceMode}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((v) => !v)}
        show3DArrows={show3DArrows}
        onToggle3DArrows={() => setShow3DArrows((v) => !v)}
        show2DNet={show2DNet}
        onToggle2DNet={() => setShow2DNet((v) => !v)}
        narrationEnabled={narrationEnabled}
        onToggleNarration={handleToggleNarration}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
        onOpenGuideModal={() => setIsGuideOpen(true)}
      />

      {/* Compact Mobile/Tablet Pane Switcher (<1024px) */}
      <div className="flex lg:hidden items-center justify-around bg-[#0b101d] border-b border-slate-800 px-2 py-1.5 shrink-0 z-20">
        <button
          onClick={() => setMobilePane('curriculum')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mobilePane === 'curriculum'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          课程目录 ({completedLessons.length}/{LESSONS.length})
        </button>
        <button
          onClick={() => setMobilePane('stage')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mobilePane === 'stage'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          魔方舞台
        </button>
        <button
          onClick={() => setMobilePane('guide')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mobilePane === 'guide'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {workspaceMode === 'sandbox' ? '练习与计时' : '解说与跟练'}
        </button>
      </div>

      {/* Main 3-Column Workbench */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
        {/* Left Sidebar: 3-Stage Curriculum Tree */}
        <div
          className={`${
            mobilePane === 'curriculum' ? 'flex w-full' : 'hidden'
          } lg:flex lg:w-auto h-full shrink-0`}
        >
          <CurriculumSidebar
            activeLessonId={activeLesson.id}
            completedLessons={completedLessons}
            onSelectLesson={handleSelectLesson}
            workspaceMode={workspaceMode}
          />
        </div>

        {/* Center Column: 3D Stage + Floating 2D Net + Live Chinese Commentary Bar + Bottom Formula Timeline Player */}
        <main
          ref={stageRef}
          tabIndex={-1}
          aria-label="魔方舞台"
          className={`${
            mobilePane === 'stage' ? 'flex' : 'hidden'
          } lg:flex flex-1 min-w-0 h-full flex-col relative overflow-y-auto custom-scrollbar`}
        >
          <div className="contents lg:block lg:flex-1 lg:min-h-[16rem] lg:relative">
            <div className="h-[clamp(18rem,49dvh,30rem)] shrink-0 lg:h-full">
              <Cube3DStage
                cube={displayedCube}
                activeAnimation={activeAnimation}
                hintMoveToken={currentHintToken}
                focusMode={effectiveFocusMode}
                show3DArrows={show3DArrows}
                isCubieFocused={activeLesson.isCubieFocused}
                onUserMove={handleUserMove}
                modeBadgeText={modeBadgeText}
                fallback={cubeNet}
                onWebGLUnavailable={handleWebGLUnavailable}
              />
            </div>
            {show2DNet && !webGLUnavailable && (
              <div className="order-last flex justify-center p-2 lg:absolute lg:bottom-2 lg:right-2 lg:z-20 lg:p-0">
                {cubeNet}
              </div>
            )}
          </div>

          {/* Live Synchronized Chinese Commentary Subtitle & Voice Narration Bar */}
          <LiveCommentaryBar
            commentary={activeCommentary}
            narrationEnabled={narrationEnabled}
            isSpeaking={isSpeaking}
            isNarratedWalkthrough={isNarratedWalkthrough}
            showWalkthroughButton={workspaceMode === 'course'}
            onSpeakCurrent={() => {
              walkthroughSessionRef.current++;
              setIsNarratedWalkthrough(false);
              narrationEngine.speak(activeCommentary.speechText, { force: true });
            }}
            onStopSpeaking={stopNarratedWalkthrough}
            onToggleNarratedWalkthrough={handleToggleNarratedWalkthrough}
            onToggleNarrationEnabled={handleToggleNarration}
          />

          {/* Bottom Formula Step-by-Step Timeline Player */}
          <FormulaTimelinePlayer
            mode={workspaceMode === 'sandbox' ? 'sandbox' : lessonTab}
            moves={lessonMoves}
            currentStep={lessonTab === 'demo' ? demoStep : practiceStep}
            isPlaying={isPlayingDemo}
            playbackSpeed={playbackSpeed}
            isAnimating={Boolean(activeAnimation)}
            practiceHalfTurnPending={practiceHalfTurnPending}
            practiceHalfTurnToken={practiceHalfTurnToken}
            practiceErrors={practiceErrors}
            onPlayPause={handlePlayPauseDemo}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onJumpToStep={handleJumpToStep}
            onChangeSpeed={setPlaybackSpeed}
            onQuickMove={handleUserMove}
            onUndoError={handleUndoPracticeError}
            onResetPractice={handleResetPractice}
          />
        </main>

        {/* Right Panel: Lesson Interactive Guide OR Sandbox Speedcubing Timer */}
        <div
          className={`${
            mobilePane === 'guide' ? 'flex w-full' : 'hidden'
          } lg:flex lg:w-auto h-full shrink-0`}
        >
          <RightWorkbenchPanel
            workspaceMode={workspaceMode}
            lesson={activeLesson}
            lessonTab={lessonTab}
            onChangeLessonTab={handleChangeLessonTab}
            yellowCrossCase={yellowCrossCase}
            onChangeYellowCrossCase={(example) => handleSelectLesson(selectedLesson, example)}
            fullPracticeProgress={fullPracticeProgress}
            onStartFullPractice={handleStartFullPractice}
            canStartTimer={timerArmedAfterScramble}
            isLessonCompleted={completedLessons.includes(activeLesson.id)}
            demoStep={demoStep}
            practiceStep={practiceStep}
            practiceTotalSteps={lessonMoves.length}
            practiceHalfTurnPending={practiceHalfTurnPending}
            practiceHalfTurnToken={practiceHalfTurnToken}
            practiceErrors={practiceErrors}
            practiceJustSucceeded={practiceJustSucceeded}
            onUndoPracticeError={handleUndoPracticeError}
            onResetPractice={handleResetPractice}
            onMarkLessonComplete={() => {
              walkthroughSessionRef.current++;
              setIsNarratedWalkthrough(false);
              markLessonCompleted(activeLesson.id);
              triggerVictoryCelebration();
              narrationEngine.speak(`已标记本课学会！${activeLesson.completionCommentary}`);
            }}
            onSelectLesson={handleSelectLesson}
            onJumpToDemoStep={handleJumpToStep}
            isSpeaking={isSpeaking}
            onSpeakText={(txt) => {
              walkthroughSessionRef.current++;
              setIsNarratedWalkthrough(false);
              narrationEngine.speak(txt, { force: true });
            }}
            onStopSpeaking={stopNarratedWalkthrough}
            scrambleTokens={scrambleTokens}
            isCubeCurrentlySolved={isSandboxSolved}
            timerRunning={timerRunning}
            timerElapsedMs={timerElapsedMs}
            sandboxMoveHistory={sandboxMoveHistory}
            solveRecords={solveRecords}
            onGenerateNewScramble={handleGenerateNewScramble}
            onResetSandboxCube={handleResetSandboxCube}
            onToggleTimer={handleToggleTimer}
            onAutoSolveSandbox={handleAutoSolveSandbox}
            onClearSolveRecords={() => {
              setSolveRecords([]);
              saveSolveRecords([]);
            }}
            isAnimating={Boolean(activeAnimation)}
            isAutoSolving={autoSolveQueue.length > 0}
          />
        </div>
      </div>

      {/* WCA Notation & Control Guide Modal */}
      <NotationGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};

export default App;
