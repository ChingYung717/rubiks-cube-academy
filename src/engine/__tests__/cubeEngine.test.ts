import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  applyAlgorithm,
  applyMove,
  combineMoveWithStack,
  computeTimelineStates,
  createSolvedCube,
  evaluatePracticeMoveStep,
  extract2DNet,
  generatePracticeScramble,
  getMoveDefinition,
  invertAlgorithm,
  isCubeSolved,
  isHalfOfDoubleMove,
  parseAlgorithm,
} from '../cubeEngine';
import {
  LESSONS,
  getActiveCommentary,
  getLayerByLayerProgress,
  getYellowCrossExample,
  YELLOW_CROSS_CASES,
  getLessonInitialCube,
} from '../../data/curriculum';
import {
  MAX_SOLVE_RECORDS,
  PLAYBACK_SPEEDS,
  SolveRecord,
  computeAo5,
  formatTimeMs,
  getLastStorageSaveError,
  isValidPlaybackSpeed,
  isValidSolveRecord,
  loadCompletedLessons,
  loadSettings,
  loadSolveRecords,
  loadSolveStats,
  saveCompletedLessons,
  saveSettings,
  saveSolveRecords,
  saveSolveRecordsWithStatus,
} from '../../utils/storage';
import {
  createOnDemandFrameScheduler,
  createStagePointerHandlers,
  createWebGLRecoveryController,
} from '../../components/Cube3DStage';
import { NOTATION_ITEMS } from '../../components/NotationGuideModal';
import { isInteractiveOrEditableTarget } from '../../App';
import {
  formatCubeCommentaryForSpeech,
  narrationEngine,
} from '../../utils/narrationEngine';

describe('Rubik Cube 3x3 Engine & Curriculum Suite', () => {
  it('creates a solved 27-cubie 3x3 cube with correct piece types', () => {
    const cube = createSolvedCube();
    expect(cube).toHaveLength(27);
    expect(cube.filter((c) => c.type === 'core')).toHaveLength(1);
    expect(cube.filter((c) => c.type === 'center')).toHaveLength(6);
    expect(cube.filter((c) => c.type === 'edge')).toHaveLength(12);
    expect(cube.filter((c) => c.type === 'corner')).toHaveLength(8);
    expect(isCubeSolved(cube)).toBe(true);
  });

  it('satisfies R followed by R\' returns to solved state for all base moves', () => {
    const bases = [
      'R',
      'L',
      'U',
      'D',
      'F',
      'B',
      'M',
      'E',
      'S',
      'r',
      'l',
      'u',
      'f',
      'd',
      'b',
      'x',
      'y',
      'z',
    ];
    for (const b of bases) {
      const solved = createSolvedCube();
      const moved = applyMove(solved, b);
      const restored = applyMove(moved, `${b}'`);
      expect(isCubeSolved(restored)).toBe(true);
      expect(restored).toEqual(solved);

      const doubleMoved = applyMove(solved, `${b}2`);
      const doubleRestored = applyMove(doubleMoved, `${b}2`);
      expect(doubleRestored).toEqual(solved);
    }
  });

  it('verifies exact WCA sticker-level move directions for R, L, U, D, F, B, M, E, S, and wide moves', () => {
    const solved = createSolvedCube();

    // Standard orientation: U=Y, D=W, F=B, B=G, L=O, R=R
    // R (clockwise looking at R): brings F (Blue) right column up to U right column
    const afterR = extract2DNet(applyMove(solved, 'R'));
    expect(afterR.U.map((row) => row[2].color)).toEqual(['B', 'B', 'B']);
    expect(afterR.F.map((row) => row[2].color)).toEqual(['W', 'W', 'W']);

    // L (clockwise looking at L): brings U (Yellow) left column down to F left column
    const afterL = extract2DNet(applyMove(solved, 'L'));
    expect(afterL.F.map((row) => row[0].color)).toEqual(['Y', 'Y', 'Y']);
    expect(afterL.U.map((row) => row[0].color)).toEqual(['G', 'G', 'G']);

    // U (clockwise looking at U): brings R (Red) top row to F top row
    const afterU = extract2DNet(applyMove(solved, 'U'));
    expect(afterU.F[0].map((s) => s.color)).toEqual(['R', 'R', 'R']);
    expect(afterU.L[0].map((s) => s.color)).toEqual(['B', 'B', 'B']);

    // D (clockwise looking at D): brings L (Orange) bottom row to F bottom row
    const afterD = extract2DNet(applyMove(solved, 'D'));
    expect(afterD.F[2].map((s) => s.color)).toEqual(['O', 'O', 'O']);
    expect(afterD.R[2].map((s) => s.color)).toEqual(['B', 'B', 'B']);

    // F (clockwise looking at F): brings U (Yellow) bottom row to R left column
    const afterF = extract2DNet(applyMove(solved, 'F'));
    expect(afterF.R.map((row) => row[0].color)).toEqual(['Y', 'Y', 'Y']);
    expect(afterF.U[2].map((s) => s.color)).toEqual(['O', 'O', 'O']);

    // B (clockwise looking at B): brings R (Red) right column to U top row
    const afterB = extract2DNet(applyMove(solved, 'B'));
    expect(afterB.U[0].map((s) => s.color)).toEqual(['R', 'R', 'R']);

    // M (follows L): brings U middle column down to F middle column
    const afterM = extract2DNet(applyMove(solved, 'M'));
    expect(afterM.F.map((row) => row[1].color)).toEqual(['Y', 'Y', 'Y']);

    // E (follows D): brings L middle row to F middle row
    const afterE = extract2DNet(applyMove(solved, 'E'));
    expect(afterE.F[1].map((s) => s.color)).toEqual(['O', 'O', 'O']);

    // S (follows F): brings U middle row to R middle column
    const afterS = extract2DNet(applyMove(solved, 'S'));
    expect(afterS.R.map((row) => row[1].color)).toEqual(['Y', 'Y', 'Y']);

    // Wide move Rw === r (rotates both middle and right layers like R)
    expect(applyMove(solved, 'Rw')).toEqual(applyMove(solved, 'r'));
    expect(applyMove(solved, "Lw'")).toEqual(applyMove(solved, "l'"));
  });

  it('preserves solved state under whole-cube rotations x, y, z', () => {
    const solved = createSolvedCube();
    const rotated = applyAlgorithm(solved, "x y2 z' x'");
    expect(isCubeSolved(rotated)).toBe(true);
  });

  it('satisfies (R U R\' U\')^6 === Identity (order 6 of Sexy Move)', () => {
    let cube = createSolvedCube();
    for (let i = 0; i < 6; i++) {
      cube = applyAlgorithm(cube, "R U R' U'");
      if (i < 5) {
        expect(isCubeSolved(cube)).toBe(false);
      }
    }
    expect(isCubeSolved(cube)).toBe(true);
  });

  it('satisfies T-Perm and H-Perm order 2 (self-inverse)', () => {
    const solved = createSolvedCube();
    const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";
    const afterOneT = applyAlgorithm(solved, tPerm);
    expect(isCubeSolved(afterOneT)).toBe(false);
    const afterTwoT = applyAlgorithm(afterOneT, tPerm);
    expect(isCubeSolved(afterTwoT)).toBe(true);

    const hPerm = 'M2 U M2 U2 M2 U M2';
    const afterOneH = applyAlgorithm(solved, hPerm);
    expect(isCubeSolved(afterOneH)).toBe(false);
    const afterTwoH = applyAlgorithm(afterOneH, hPerm);
    expect(isCubeSolved(afterTwoH)).toBe(true);
  });

  it('verifies all 16 lessons reach their own goal after the formula', () => {
    expect(LESSONS).toHaveLength(16);
    for (const lesson of LESSONS) {
      const initial = getLessonInitialCube(lesson);
      expect(
        lesson.checkGoal(initial),
        `Lesson ${lesson.id} should start at the intended goal state`
      ).toBe(lesson.id === 'basics-structure');

      const moves = parseAlgorithm(lesson.formula);
      const states = computeTimelineStates(initial, moves);
      expect(states).toHaveLength(moves.length + 1);

      const finalState = states[states.length - 1];
      expect(
        lesson.checkGoal(finalState),
        `Lesson ${lesson.id} should satisfy goal after executing ${lesson.formula}`
      ).toBe(true);
      expect(isCubeSolved(finalState)).toBe(!lesson.exampleEndSetup);
    }
  });

  it('rewinds the first lesson one move at a time from its midpoint', () => {
    const lesson = LESSONS[0];
    const states = computeTimelineStates(getLessonInitialCube(lesson), parseAlgorithm(lesson.formula));
    expect(states[0]).toEqual(createSolvedCube());
    expect(states.slice(4)).toEqual(states.slice(0, 3).reverse());
  });

  it('stops each layer-by-layer example at its own milestone and recognizes rotated positions', () => {
    const lessons = LESSONS.filter((lesson) => lesson.stageId === 'lbl');
    for (const [index, lesson] of lessons.entries()) {
      const start = getLessonInitialCube(lesson);
      const end = applyAlgorithm(start, lesson.formula);
      expect(getLayerByLayerProgress(start)).toBe(index);
      expect(getLayerByLayerProgress(end)).toBe(index + 1);
      expect(getLayerByLayerProgress(applyAlgorithm(end, "x y'"))).toBe(index + 1);
    }
  });

  it('demonstrates all three yellow cross shapes while leaving the corner orientation for the next lesson', () => {
    const lesson = LESSONS.find((item) => item.id === 'lbl-step4-yellow-cross')!;
    const topEdges = (cube: ReturnType<typeof createSolvedCube>) =>
      cube.filter((cubie) => cubie.type === 'edge' && cubie.faces.U === 'Y')
        .map((cubie) => cubie.pos.join(',')).sort();
    const line = ['-1,1,0', '1,1,0'];
    const corner = ['0,1,1', '1,1,0'];
    const vertical = ['0,1,-1', '0,1,1'];
    const expectedShapes = [
      [[0, line]],
      [[0, corner], [6, vertical], [7, line]],
      [[0, []], [6, corner], [12, vertical], [13, line]],
    ] as const;

    for (const [index, { id }] of YELLOW_CROSS_CASES.entries()) {
      const example = getYellowCrossExample(lesson, id);
      const states = computeTimelineStates(getLessonInitialCube(example), parseAlgorithm(example.formula));
      for (const [step, shape] of expectedShapes[index]) {
        expect(topEdges(states[step])).toEqual(shape);
      }
      expect(example.stepCommentaries).toHaveLength(states.length - 1);
      expect(getLayerByLayerProgress(states[states.length - 1])).toBe(4);
    }
  });

  it('verifies all 16 lessons have complete Chinese intro, step-by-step, and completion commentaries matching formula length', () => {
    for (const lesson of LESSONS) {
      const moves = parseAlgorithm(lesson.formula);
      expect(lesson.introCommentary.trim().length).toBeGreaterThan(15);
      expect(lesson.completionCommentary.trim().length).toBeGreaterThan(15);
      expect(
        lesson.stepCommentaries,
        `Lesson ${lesson.id} stepCommentaries length must equal move count`
      ).toHaveLength(moves.length);

      lesson.stepCommentaries.forEach((commentary, idx) => {
        expect(commentary.trim().length).toBeGreaterThan(10);
        expect(commentary).toContain(`第 ${idx + 1} 步`);
      });
    }
  });

  it('computes accurate synchronized Chinese commentary across demo, practice, half-turn, error, and sandbox states', () => {
    const lesson = LESSONS.find((l) => l.id === 'lbl-step5-sune')!;
    const moves = parseAlgorithm(lesson.formula); // 7 steps

    // 1. Demo Step 0 (Intro)
    const demoIntro = getActiveCommentary({
      workspaceMode: 'course',
      lesson,
      lessonTab: 'demo',
      demoStep: 0,
      practiceStep: 0,
      practiceHalfTurnPending: false,
      practiceHalfTurnToken: null,
      practiceErrors: [],
      practiceJustSucceeded: false,
      autoSolveQueue: [],
      timerRunning: false,
      isSandboxSolved: true,
      fullPracticeProgress: null,
      timerArmedAfterScramble: false,
    });
    expect(demoIntro.phase).toBe('intro');
    expect(demoIntro.headline).toBe(lesson.introCommentary);
    expect(demoIntro.stepIndex).toBeNull();

    // 2. Demo Step 3 (Intermediate step)
    const demoStep3 = getActiveCommentary({
      workspaceMode: 'course',
      lesson,
      lessonTab: 'demo',
      demoStep: 3,
      practiceStep: 0,
      practiceHalfTurnPending: false,
      practiceHalfTurnToken: null,
      practiceErrors: [],
      practiceJustSucceeded: false,
      autoSolveQueue: [],
      timerRunning: false,
      isSandboxSolved: true,
      fullPracticeProgress: null,
      timerArmedAfterScramble: false,
    });
    expect(demoStep3.phase).toBe('step');
    expect(demoStep3.headline).toBe(lesson.stepCommentaries[2]);
    expect(demoStep3.stepIndex).toBe(2);

    // 3. Demo Final Step (Completed)
    const demoDone = getActiveCommentary({
      workspaceMode: 'course',
      lesson,
      lessonTab: 'demo',
      demoStep: moves.length,
      practiceStep: 0,
      practiceHalfTurnPending: false,
      practiceHalfTurnToken: null,
      practiceErrors: [],
      practiceJustSucceeded: false,
      autoSolveQueue: [],
      timerRunning: false,
      isSandboxSolved: true,
      fullPracticeProgress: null,
      timerArmedAfterScramble: false,
    });
    expect(demoDone.phase).toBe('completed');
    expect(demoDone.detail).toContain(lesson.completionCommentary);

    // 4. Practice 180-degree half-turn pending
    const pracHalf = getActiveCommentary({
      workspaceMode: 'course',
      lesson,
      lessonTab: 'practice',
      demoStep: 0,
      practiceStep: 5,
      practiceHalfTurnPending: true,
      practiceHalfTurnToken: 'U',
      practiceErrors: [],
      practiceJustSucceeded: false,
      autoSolveQueue: [],
      timerRunning: false,
      isSandboxSolved: true,
      fullPracticeProgress: null,
      timerArmedAfterScramble: false,
    });
    expect(pracHalf.phase).toBe('practice-half');
    expect(pracHalf.headline).toContain('U2');

    // 5. Practice Error state
    const pracErr = getActiveCommentary({
      workspaceMode: 'course',
      lesson,
      lessonTab: 'practice',
      demoStep: 0,
      practiceStep: 2,
      practiceHalfTurnPending: false,
      practiceHalfTurnToken: null,
      practiceErrors: ['F'],
      practiceJustSucceeded: false,
      autoSolveQueue: [],
      timerRunning: false,
      isSandboxSolved: true,
      fullPracticeProgress: null,
      timerArmedAfterScramble: false,
    });
    expect(pracErr.phase).toBe('practice-error');
    expect(pracErr.headline).toContain("F'");

    // 6. Sandbox Auto-Solving state
    const sandboxAuto = getActiveCommentary({
      workspaceMode: 'sandbox',
      lesson,
      lessonTab: 'demo',
      demoStep: 0,
      practiceStep: 0,
      practiceHalfTurnPending: false,
      practiceHalfTurnToken: null,
      practiceErrors: [],
      practiceJustSucceeded: false,
      autoSolveQueue: ['R', "U'"],
      timerRunning: false,
      isSandboxSolved: false,
      fullPracticeProgress: null,
      timerArmedAfterScramble: false,
    });
    expect(sandboxAuto.phase).toBe('sandbox');
    expect(sandboxAuto.badgeText).toContain('剩余 2 步');
  });

  it('formats Rubik notation tokens and symbols into natural Chinese TTS speech', () => {
    const raw =
      "🎉 第 3 步 R'（下）：将 U2、R2' 与 r'、u2 旋转 180° → 回到 90°！【白-蓝-红角块】T-Perm 执行 1~3 次";
    const formatted = formatCubeCommentaryForSpeech(raw);
    expect(formatted).not.toContain('🎉');
    expect(formatted).toContain('R撇');
    expect(formatted).toContain('U二');
    expect(formatted).toContain('R二');
    expect(formatted).not.toContain("R二'");
    expect(formatted).toContain('r撇');
    expect(formatted).toContain('u二');
    expect(formatted).toContain('180度');
    expect(formatted).toContain('90度');
    expect(formatted).toContain('白、蓝、红角块');
    expect(formatted).toContain('T Perm');
    expect(formatted).toContain('1到3 次');

    // Verify narrationEngine enable/disable & subscription lifecycle
    const events: boolean[] = [];
    const unsub = narrationEngine.subscribe((speaking) => events.push(speaking));
    narrationEngine.setEnabled(false);
    expect(narrationEngine.isEnabled()).toBe(false);
    let ended = false;
    narrationEngine.speak('测试关闭状态不播报', {
      onEnd: () => {
        ended = true;
      },
    });
    expect(ended).toBe(true);
    narrationEngine.setEnabled(true);
    unsub();
  });

  it('generates practice scrambles without consecutive redundant moves and inverts them cleanly', () => {
    const scramble = generatePracticeScramble(20);
    expect(scramble).toHaveLength(20);
    for (let i = 1; i < scramble.length; i++) {
      expect(scramble[i][0]).not.toBe(scramble[i - 1][0]);
    }
    const solved = createSolvedCube();
    const scrambled = applyAlgorithm(solved, scramble);
    expect(isCubeSolved(scrambled)).toBe(false);
    const unscrambled = applyAlgorithm(scrambled, invertAlgorithm(scramble));
    expect(isCubeSolved(unscrambled)).toBe(true);
  });

  it('extracts a 54-sticker 2D net that accurately reflects face colors', () => {
    const solved = createSolvedCube();
    const net = extract2DNet(solved);
    expect(net.U.flat().every((s) => s.color === 'Y')).toBe(true);
    expect(net.D.flat().every((s) => s.color === 'W')).toBe(true);
    expect(net.F.flat().every((s) => s.color === 'B')).toBe(true);
    expect(net.B.flat().every((s) => s.color === 'G')).toBe(true);
    expect(net.L.flat().every((s) => s.color === 'O')).toBe(true);
    expect(net.R.flat().every((s) => s.color === 'R')).toBe(true);
  });

  it('handles edge cases: empty algorithm, parentheses, curly apostrophes, and invalid move tokens', () => {
    const solved = createSolvedCube();
    expect(parseAlgorithm('')).toEqual([]);
    expect(parseAlgorithm("  (R U R’ U') [F2] ")).toEqual(['R', 'U', "R’", "U'", 'F2']);
    expect(applyAlgorithm(solved, '')).toEqual(solved);
    expect(getMoveDefinition('R’').token).toBe("R'");
    expect(getMoveDefinition('R′').token).toBe("R'");
    expect(getMoveDefinition("R'2").token).toBe('R2');
    expect(getMoveDefinition('R2’').token).toBe('R2');
    expect(getMoveDefinition('Rw').token).toBe('r');
    expect(getMoveDefinition("Uw'").token).toBe("u'");
    expect(() => getMoveDefinition('Z_INVALID')).toThrow(/Unknown move token/);
    expect(() => getMoveDefinition('R3')).toThrow(/Unknown move token/);
    expect(() => getMoveDefinition('R,')).toThrow(/Unknown move token/);
    expect(() => getMoveDefinition('RU')).toThrow(/Unknown move token/);
    expect(() => getMoveDefinition("RUR'U'")).toThrow(/Unknown move token/);
  });

  it('recognizes half-turn moves toward a 180-degree double turn', () => {
    expect(isHalfOfDoubleMove('R', 'R2')).toBe(true);
    expect(isHalfOfDoubleMove("R'", 'R2')).toBe(true);
    expect(isHalfOfDoubleMove('U', 'R2')).toBe(false);
    expect(isHalfOfDoubleMove('R2', 'R2')).toBe(false);
  });

  it('combines and cancels consecutive same-layer moves on a move stack', () => {
    expect(combineMoveWithStack([], 'R')).toEqual(['R']);
    expect(combineMoveWithStack(['R'], 'R')).toEqual(['R2']);
    expect(combineMoveWithStack(['R2'], 'R')).toEqual(["R'"]);
    expect(combineMoveWithStack(["R'"], 'R')).toEqual([]);
    expect(combineMoveWithStack(['R'], "R'")).toEqual([]);
    expect(combineMoveWithStack(['R2'], 'R2')).toEqual([]);
    expect(combineMoveWithStack(['R2'], "R'")).toEqual(['R']);
    expect(combineMoveWithStack(['R', 'U'], "U'")).toEqual(['R']);
    // Commuting parallel layers on the same axis (e.g. R + L + R' -> L)
    expect(combineMoveWithStack(['R', 'L'], "R'")).toEqual(['L']);
    expect(combineMoveWithStack(['U', 'D'], 'U')).toEqual(['U2', 'D']);
  });

  it('maintains exact practice progression under double-turn half-steps, opposite cancellation, and error recovery', () => {
    const suneLesson = LESSONS.find((l) => l.id === 'lbl-step5-sune')!;
    const lessonMoves = parseAlgorithm(suneLesson.formula); // ['R', 'U', "R'", 'U', 'R', 'U2', "R'"]
    const timeline = computeTimelineStates(getLessonInitialCube(suneLesson), lessonMoves);

    // Start at step 5 (expecting 'U2')
    let state = { step: 5, halfTurnToken: null as string | null, errors: [] as string[] };
    let cube = timeline[5];

    // 1. User executes 'U' (first 90 deg) -> halfTurnToken = 'U'
    state = evaluatePracticeMoveStep(state, 'U', lessonMoves);
    cube = applyMove(cube, 'U');
    expect(state.step).toBe(5);
    expect(state.halfTurnToken).toBe('U');
    expect(state.errors).toEqual([]);

    // 2. User executes opposite "U'" -> cancels halfTurnToken back to null at step 5 (does NOT falsely advance to step 6!)
    state = evaluatePracticeMoveStep(state, "U'", lessonMoves);
    cube = applyMove(cube, "U'");
    expect(state.step).toBe(5);
    expect(state.halfTurnToken).toBeNull();
    expect(state.errors).toEqual([]);
    expect(cube).toEqual(timeline[5]);

    // 3. User executes 'U' again, then makes an unrelated error 'F'
    state = evaluatePracticeMoveStep(state, 'U', lessonMoves);
    cube = applyMove(cube, 'U');
    state = evaluatePracticeMoveStep(state, 'F', lessonMoves);
    cube = applyMove(cube, 'F');
    expect(state.step).toBe(5);
    expect(state.halfTurnToken).toBe('U');
    expect(state.errors).toEqual(['F']);

    // 4. User undoes error with "F'" -> restores halfTurnToken 'U' with empty errors
    state = evaluatePracticeMoveStep(state, "F'", lessonMoves);
    cube = applyMove(cube, "F'");
    expect(state.step).toBe(5);
    expect(state.halfTurnToken).toBe('U');
    expect(state.errors).toEqual([]);

    // 5. User executes second 'U' -> completes 'U2' and advances to step 6
    state = evaluatePracticeMoveStep(state, 'U', lessonMoves);
    cube = applyMove(cube, 'U');
    expect(state.step).toBe(6);
    expect(state.halfTurnToken).toBeNull();
    expect(state.errors).toEqual([]);
    expect(cube).toEqual(timeline[6]);

    // 6. User executes final move "R'" -> solves lesson
    state = evaluatePracticeMoveStep(state, "R'", lessonMoves);
    cube = applyMove(cube, "R'");
    expect(state.step).toBe(7);
    expect(suneLesson.checkGoal(cube)).toBe(true);
    expect(isCubeSolved(cube)).toBe(false);

    // 7. Reducing a 180° error move ['F2'] by 90° ('F') is recognized as progress (not a new mistake)
    let errState = evaluatePracticeMoveStep(
      { step: 0, halfTurnToken: null, errors: [] },
      'F2',
      lessonMoves
    );
    expect(errState.errors).toEqual(['F2']);
    expect(errState.madeMistake).toBe(true);
    errState = evaluatePracticeMoveStep(errState, "F'", lessonMoves);
    expect(errState.errors).toEqual(['F']);
    expect(errState.stepAdvanced).toBe(true);
    expect(errState.madeMistake).toBe(false);

    // 8. Overshoot recovery: expecting 'R' at step 0, user plays "R'" then 'R2' -> net is 'R', so advances to step 1!
    let overshoot = evaluatePracticeMoveStep(
      { step: 0, halfTurnToken: null, errors: [] },
      "R'",
      lessonMoves
    );
    expect(overshoot.errors).toEqual(["R'"]);
    overshoot = evaluatePracticeMoveStep(overshoot, 'R2', lessonMoves);
    expect(overshoot.step).toBe(1);
    expect(overshoot.halfTurnToken).toBeNull();
    expect(overshoot.errors).toEqual([]);
    expect(overshoot.stepAdvanced).toBe(true);
    expect(overshoot.madeMistake).toBe(false);

    // 9. Double-turn overshoot recovery: expecting 'U2' at step 5, user plays 'U', 'U2', "U'" -> net is 'U2', advances to step 6!
    let u2Overshoot = evaluatePracticeMoveStep(
      { step: 5, halfTurnToken: null, errors: [] },
      'U',
      lessonMoves
    );
    u2Overshoot = evaluatePracticeMoveStep(u2Overshoot, 'U2', lessonMoves);
    expect(u2Overshoot.errors).toEqual(['U2']);
    u2Overshoot = evaluatePracticeMoveStep(u2Overshoot, "U'", lessonMoves);
    expect(u2Overshoot.step).toBe(6);
    expect(u2Overshoot.halfTurnToken).toBeNull();
    expect(u2Overshoot.errors).toEqual([]);
  });

  it('computes WCA Ao5 and formats timer milliseconds accurately', () => {
    expect(formatTimeMs(0)).toBe('0.00s');
    expect(formatTimeMs(-50)).toBe('0.00s');
    expect(formatTimeMs(Number.NaN)).toBe('DNF');
    expect(formatTimeMs(Number.POSITIVE_INFINITY)).toBe('DNF');
    expect(formatTimeMs(9450)).toBe('9.45s');
    expect(formatTimeMs(65230)).toBe('1:05.23');

    expect(computeAo5([])).toBeNull();
    const records = [
      { id: '1', timeMs: 10000, scramble: '', createdAt: '', moveCount: 20 },
      { id: '2', timeMs: 12000, scramble: '', createdAt: '', moveCount: 20 },
      { id: '3', timeMs: 8000, scramble: '', createdAt: '', moveCount: 20 }, // fastest dropped
      { id: '4', timeMs: 20000, scramble: '', createdAt: '', moveCount: 20 }, // slowest dropped
      { id: '5', timeMs: 14000, scramble: '', createdAt: '', moveCount: 20 },
    ];
    // Middle 3: 10000, 12000, 14000 -> avg = 12000
    expect(computeAo5(records)).toBe(12000);

    // With 1 DNF (dropped as slowest) and +2 penalty on id 1 (10000 + 2000 = 12000):
    const recordsWithPenalty = [
      { id: '1', timeMs: 10000, penalty: '+2' as const, scramble: '', createdAt: '', moveCount: 20 },
      { id: '2', timeMs: 12000, scramble: '', createdAt: '', moveCount: 20 },
      { id: '3', timeMs: 8000, scramble: '', createdAt: '', moveCount: 20 }, // fastest dropped
      { id: '4', timeMs: 11000, penalty: 'DNF' as const, scramble: '', createdAt: '', moveCount: 20 }, // slowest dropped
      { id: '5', timeMs: 15000, scramble: '', createdAt: '', moveCount: 20 },
    ];
    // Middle 3: 12000, 12000, 15000 -> avg = 13000
    expect(computeAo5(recordsWithPenalty)).toBe(13000);

    // With 2 DNFs -> Ao5 is 'DNF' (distinct from null when < 5 solves)
    const recordsTwoDnf = [
      { id: '1', timeMs: 10000, penalty: 'DNF' as const, scramble: '', createdAt: '', moveCount: 20 },
      { id: '2', timeMs: 12000, penalty: 'DNF' as const, scramble: '', createdAt: '', moveCount: 20 },
      { id: '3', timeMs: 8000, scramble: '', createdAt: '', moveCount: 20 },
      { id: '4', timeMs: 11000, scramble: '', createdAt: '', moveCount: 20 },
      { id: '5', timeMs: 15000, scramble: '', createdAt: '', moveCount: 20 },
    ];
    expect(computeAo5(recordsTwoDnf)).toBe('DNF');
    expect(computeAo5(recordsTwoDnf.slice(0, 4))).toBeNull();
  });

  it('validates and sanitizes persisted localStorage settings and records safely', () => {
    const store: Record<string, string> = {};
    const origStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      },
      configurable: true,
    });

    try {
      // 1. Default settings returned as fresh copy
      const s1 = loadSettings();
      const s2 = loadSettings();
      expect(s1).toEqual(s2);
      expect(s1).not.toBe(s2);

      // 2. Malformed settings (playbackSpeed: 0 or string, non-object JSON) fall back safely
      store['cubelab_settings_v1'] = JSON.stringify({ playbackSpeed: 0, soundEnabled: 'yes' });
      const s3 = loadSettings();
      expect(s3.playbackSpeed).toBe(1);
      expect(s3.soundEnabled).toBe(true);

      store['cubelab_settings_v1'] = JSON.stringify('invalid_string_payload');
      expect(loadSettings().playbackSpeed).toBe(1);

      // 3. Malformed solve records are filtered out
      store['cubelab_solve_records_v1'] = JSON.stringify([
        { id: 'ok', timeMs: 9500, scramble: 'R U', createdAt: '12:00', moveCount: 15, penalty: '+2' },
        { id: 'bad_nan', timeMs: 'not_a_number', scramble: 'R', createdAt: '12:00', moveCount: 10 },
        { id: 'bad_penalty', timeMs: 8000, scramble: 'R', createdAt: '12:00', moveCount: 10, penalty: 'INVALID' },
        null,
      ]);
      const loadedRecords = loadSolveRecords();
      expect(loadedRecords).toHaveLength(1);
      expect(loadedRecords[0].id).toBe('ok');

      // 4. Malformed completed lessons are filtered
      store['cubelab_completed_lessons_v1'] = JSON.stringify(['basics-structure', 123, '', null]);
      expect(loadCompletedLessons()).toEqual(['basics-structure']);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: origStorage,
        configurable: true,
      });
    }
  });

  it('preserves cumulative solve count and personal best (PB) across >50 records and simulated page reloads', () => {
    const store: Record<string, string> = {};
    const origStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      },
      configurable: true,
    });

    try {
      // Simulate 51 incremental solves where solve #1 is a 1.00s (1000ms) PB and solves #2..#51 are 10.00s (10000ms)
      let inMemoryRecords: SolveRecord[] = [];
      for (let i = 1; i <= 51; i++) {
        const rec: SolveRecord = {
          id: `solve_${i}`,
          timeMs: i === 1 ? 1000 : 10000,
          scramble: 'R U R\' U\'',
          createdAt: '12:00:00',
          moveCount: 20,
        };
        inMemoryRecords = saveSolveRecords([rec, ...inMemoryRecords]);
      }

      // In-memory and persisted records are unified at MAX_SOLVE_RECORDS (50)
      expect(inMemoryRecords).toHaveLength(MAX_SOLVE_RECORDS);
      expect(inMemoryRecords[0].id).toBe('solve_51');
      expect(inMemoryRecords[inMemoryRecords.length - 1].id).toBe('solve_2');

      const statsBeforeReload = loadSolveStats();
      expect(statsBeforeReload.totalSolves).toBe(51);
      expect(statsBeforeReload.bestTimeMs).toBe(1000);

      // Simulate page refresh: re-read from localStorage
      const reloadedRecords = loadSolveRecords();
      const statsAfterReload = loadSolveStats();
      expect(reloadedRecords).toEqual(inMemoryRecords);
      expect(statsAfterReload).toEqual({
        totalSolves: 51,
        bestTimeMs: 1000,
      });

      // Add a 52nd solve with a faster 0.80s (800ms) PB
      const solve52: SolveRecord = {
        id: 'solve_52',
        timeMs: 800,
        scramble: 'F R U R\' U\' F\'',
        createdAt: '12:01:00',
        moveCount: 18,
      };
      inMemoryRecords = saveSolveRecords([solve52, ...reloadedRecords]);
      expect(loadSolveStats()).toEqual({
        totalSolves: 52,
        bestTimeMs: 800,
      });

      // Toggle +2 penalty on solve_52 (800ms + 2000ms = 2800ms) -> PB falls back to archived 1000ms from solve_1!
      inMemoryRecords = saveSolveRecords(
        inMemoryRecords.map((r) => (r.id === 'solve_52' ? { ...r, penalty: '+2' as const } : r))
      );
      expect(loadSolveStats()).toEqual({
        totalSolves: 52,
        bestTimeMs: 1000,
      });

      // Direct 51-record payload seeded into localStorage is normalized on load while keeping PB & total count
      const seeded51: SolveRecord[] = Array.from({ length: 51 }, (_, idx) => ({
        id: `seeded_${51 - idx}`,
        timeMs: idx === 50 ? 1000 : 10000,
        scramble: 'U',
        createdAt: '12:02:00',
        moveCount: 12,
      }));
      store['cubelab_solve_records_v1'] = JSON.stringify(seeded51);
      const loadedFromSeed = loadSolveRecords();
      expect(loadedFromSeed).toHaveLength(50);
      expect(loadSolveStats()).toEqual({
        totalSolves: 51,
        bestTimeMs: 1000,
      });
      // Second reload remains identical
      expect(loadSolveRecords()).toHaveLength(50);
      expect(loadSolveStats()).toEqual({
        totalSolves: 51,
        bestTimeMs: 1000,
      });

      // Re-seeding localStorage with 51 records that reuse the exact same IDs ('solve_51'..'solve_1')
      // but have a different oldest PB (2500ms instead of 1000ms) must NOT leak stale archived PB/count
      const reseededSameIds51: SolveRecord[] = Array.from({ length: 51 }, (_, idx) => ({
        id: `solve_${51 - idx}`,
        timeMs: idx === 50 ? 2500 : 10000,
        scramble: 'U',
        createdAt: '12:03:00',
        moveCount: 14,
      }));
      store['cubelab_solve_records_v1'] = JSON.stringify(reseededSameIds51);
      expect(loadSolveRecords()).toHaveLength(50);
      expect(loadSolveStats()).toEqual({
        totalSolves: 51,
        bestTimeMs: 2500,
      });

      // Calling saveSolveRecords twice with the same 51-record payload is idempotent
      saveSolveRecords(reseededSameIds51);
      saveSolveRecords(reseededSameIds51);
      expect(loadSolveStats()).toEqual({
        totalSolves: 51,
        bestTimeMs: 2500,
      });

      // Calling saveSolveRecords directly (without overwriting localStorage first) with a 51-record
      // array whose top 50 match prevStored ('solve_51'..'solve_2') but whose 51st record ('solve_1')
      // has a different timeMs (3200ms) replaces the dataset cleanly instead of double-counting to 52
      const directReseed51: SolveRecord[] = reseededSameIds51.map((r, idx) =>
        idx === 50 ? { ...r, timeMs: 3200 } : r
      );
      saveSolveRecords(directReseed51);
      expect(loadSolveStats()).toEqual({
        totalSolves: 51,
        bestTimeMs: 3200,
      });

      // Replacing SOLVE_RECORDS externally with 50 records ('solve_50'..'solve_1', all 10000ms)
      // invalidates the previous window's archived stats rather than leaking stale PB/count
      const replaced50: SolveRecord[] = Array.from({ length: 50 }, (_, idx) => ({
        id: `solve_${50 - idx}`,
        timeMs: 10000,
        scramble: 'R',
        createdAt: '12:04:00',
        moveCount: 15,
      }));
      store['cubelab_solve_records_v1'] = JSON.stringify(replaced50);
      expect(loadSolveRecords()).toHaveLength(50);
      expect(loadSolveStats()).toEqual({
        totalSolves: 50,
        bestTimeMs: 10000,
      });

      // Clearing records resets both recent records and historical stats
      expect(saveSolveRecords([])).toEqual([]);
      expect(loadSolveRecords()).toEqual([]);
      expect(loadSolveStats()).toEqual({
        totalSolves: 0,
        bestTimeMs: null,
      });
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: origStorage,
        configurable: true,
      });
    }
  });

  it('isolates single active pointer and rejects multi-touch pointer interference in Cube3DStage', () => {
    const capturedPointers = new Set<number>();
    const domElement = {
      clientWidth: 600,
      clientHeight: 600,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 }),
      setPointerCapture: (id: number) => {
        capturedPointers.add(id);
      },
      hasPointerCapture: (id: number) => capturedPointers.has(id),
      releasePointerCapture: (id: number) => {
        capturedPointers.delete(id);
      },
    };

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(4, 4, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const rootGroup = new THREE.Group();
    const cameraSpherical = {
      radius: 7.4,
      theta: 0.75,
      phi: 1.0,
      targetTheta: 0.75,
      targetPhi: 1.0,
    };
    const triggeredMoves: string[] = [];
    let renderRequests = 0;

    const handlers = createStagePointerHandlers({
      domElement,
      camera,
      rootGroup,
      cameraSpherical,
      isAnimating: () => false,
      onRequestRender: () => {
        renderRequests += 1;
      },
      onUserMove: (token) => {
        triggeredMoves.push(token);
      },
    });

    const makePointerEvent = (
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
      overrides?: Partial<PointerEvent>
    ): PointerEvent =>
      ({
        type,
        pointerId,
        button: 0,
        buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
        pointerType: 'touch',
        isTrusted: false,
        clientX,
        clientY,
        ...overrides,
      }) as unknown as PointerEvent;

    // 1. First finger presses down at (100, 100)
    handlers.handlePointerDown(makePointerEvent('pointerdown', 1, 100, 100));
    expect(handlers.getActivePointerId()).toBe(1);
    expect(capturedPointers.has(1)).toBe(true);

    // 2. Second finger presses down at (300, 300) -> must NOT overwrite active pointer 1
    handlers.handlePointerDown(makePointerEvent('pointerdown', 2, 300, 300));
    expect(handlers.getActivePointerId()).toBe(1);
    expect(capturedPointers.has(2)).toBe(false);

    // 3. Second finger moves -> must be ignored without jumping camera
    handlers.handlePointerMove(makePointerEvent('pointermove', 2, 380, 380));
    expect(cameraSpherical.targetTheta).toBeCloseTo(0.75, 6);
    expect(cameraSpherical.targetPhi).toBeCloseTo(1.0, 6);
    expect(renderRequests).toBe(0);

    // 4. First finger moves to (140, 120) -> smoothly rotates camera using finger 1's own delta (40, 20)
    handlers.handlePointerMove(makePointerEvent('pointermove', 1, 140, 120));
    expect(cameraSpherical.targetTheta).toBeCloseTo(0.75 - 40 * 0.0075, 6);
    expect(cameraSpherical.targetPhi).toBeCloseTo(1.0 - 20 * 0.0075, 6);
    expect(renderRequests).toBe(1);

    // Duplicate bubbled move at same coordinates (140, 120) does not re-trigger render
    handlers.handlePointerMove(makePointerEvent('pointermove', 1, 140, 120));
    expect(renderRequests).toBe(1);

    // 5. Second finger lifts up / cancels -> must NOT interrupt finger 1
    handlers.handlePointerUp(makePointerEvent('pointerup', 2, 380, 380));
    handlers.handlePointerUp(makePointerEvent('pointercancel', 2, 380, 380));
    expect(handlers.getActivePointerId()).toBe(1);
    expect(capturedPointers.has(1)).toBe(true);

    // 6. First finger continues moving to (160, 130) (even with untrusted mouse buttons=0) -> still responds normally
    handlers.handlePointerMove(
      makePointerEvent('pointermove', 1, 160, 130, { pointerType: 'mouse', buttons: 0 })
    );
    expect(cameraSpherical.targetTheta).toBeCloseTo(0.75 - 60 * 0.0075, 6);
    expect(cameraSpherical.targetPhi).toBeCloseTo(1.0 - 30 * 0.0075, 6);

    // 7. First finger lifts up -> releases capture and clears active pointer
    handlers.handlePointerUp(makePointerEvent('pointerup', 1, 160, 130));
    expect(handlers.getActivePointerId()).toBeNull();
    expect(capturedPointers.has(1)).toBe(false);

    // 8. Second finger moving after finger 1 lifted up does nothing
    handlers.handlePointerMove(makePointerEvent('pointermove', 2, 400, 400));
    expect(cameraSpherical.targetTheta).toBeCloseTo(0.75 - 60 * 0.0075, 6);
    expect(triggeredMoves).toHaveLength(0);

    // 9. Sticker drag mode: add a front-face sticker at cubie (1, 0, 1) facing +Z
    const cubieGroup = new THREE.Group();
    cubieGroup.position.set(1, 0, 1);
    cubieGroup.userData = { cubieId: '1,0,1', pos: [1, 0, 1] };
    const stickerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshBasicMaterial()
    );
    stickerMesh.position.set(0, 0, 0.472);
    stickerMesh.userData = { faceDir: 'F', cubieId: '1,0,1' };
    cubieGroup.add(stickerMesh);
    rootGroup.add(cubieGroup);
    rootGroup.updateMatrixWorld(true);

    // Project sticker center to screen coordinates
    const worldCenter = new THREE.Vector3(1, 0, 1.472).project(camera);
    const sx = ((worldCenter.x + 1) * 0.5) * 600;
    const sy = ((-worldCenter.y + 1) * 0.5) * 600;

    // Finger 1 presses on the sticker (even when synthetic event omits button property)
    handlers.handlePointerDown(
      makePointerEvent('pointerdown', 10, sx, sy, { button: undefined as unknown as number })
    );
    expect(handlers.getActivePointerId()).toBe(10);

    // Finger 2 presses and drags violently -> must not trigger a sticker move or cancel finger 1
    handlers.handlePointerDown(makePointerEvent('pointerdown', 20, sx, sy));
    handlers.handlePointerMove(makePointerEvent('pointermove', 20, sx, sy - 80));
    handlers.handlePointerUp(makePointerEvent('pointerup', 20, sx, sy - 80));
    expect(triggeredMoves).toHaveLength(0);
    expect(handlers.getActivePointerId()).toBe(10);

    // Finger 1 drags upward on the sticker -> triggers layer move on right column ('R')
    handlers.handlePointerMove(makePointerEvent('pointermove', 10, sx, sy - 60));
    expect(triggeredMoves).toEqual(['R']);

    // Finger 1 cancels/releases -> clears active pointer
    handlers.handlePointerUp(makePointerEvent('pointercancel', 10, sx, sy - 60));
    expect(handlers.getActivePointerId()).toBeNull();
  });

  it('RC-04: handles multi-window rotation (120 solves), legacy storage migration, and localStorage quota failures on 1st or 2nd write without losing PB or totalSolves', () => {
    const store: Record<string, string> = {};
    let failMode: 'none' | 'first-write' | 'second-write-with-rollback' | 'second-write-rollback-blocked' =
      'none';
    const origStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          if (failMode === 'first-write' && k === 'cubelab_solve_records_v1') {
            throw new Error('QuotaExceededError: first write failed');
          }
          if (failMode === 'second-write-with-rollback' && k === 'cubelab_solve_stats_v1') {
            throw new Error('QuotaExceededError: second write failed');
          }
          if (failMode === 'second-write-rollback-blocked') {
            if (k === 'cubelab_solve_stats_v1') {
              throw new Error('QuotaExceededError: second write failed');
            }
            // Allow first write to cubelab_solve_records_v1, but block rollback write
            if (k === 'cubelab_solve_records_v1' && store['__first_write_done'] === '1') {
              throw new Error('QuotaExceededError: rollback write also failed');
            }
            if (k === 'cubelab_solve_records_v1') {
              store['__first_write_done'] = '1';
            }
          }
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
      configurable: true,
    });

    try {
      // 1. Legacy migration: 50 records in cubelab_solve_records_v1 with no cubelab_solve_stats_v1
      const legacy50: SolveRecord[] = Array.from({ length: 50 }, (_, idx) => ({
        id: `legacy_${50 - idx}`,
        timeMs: idx === 49 ? 1200 : 9000, // legacy_1 has 1200ms PB
        scramble: 'R U',
        createdAt: '10:00:00',
        moveCount: 18,
      }));
      store['cubelab_solve_records_v1'] = JSON.stringify(legacy50);
      delete store['cubelab_solve_stats_v1'];

      expect(loadSolveRecords()).toHaveLength(50);
      expect(loadSolveStats()).toEqual({ totalSolves: 50, bestTimeMs: 1200 });

      // Legacy stats format without recentIds / recentEntries
      store['cubelab_solve_stats_v1'] = JSON.stringify({
        archivedCount: 10,
        archivedBestTimeMs: 950,
      });
      expect(loadSolveStats()).toEqual({ totalSolves: 60, bestTimeMs: 950 });

      // Clear and test 120-solve multi-window rotation (49 -> 50 -> 51 -> 120)
      saveSolveRecords([]);
      let windowRecords: SolveRecord[] = [];
      for (let i = 1; i <= 120; i++) {
        const rec: SolveRecord = {
          id: `rot_${i}`,
          timeMs: i === 3 ? 750 : i === 74 ? 550 : 5000 + i,
          ...(i === 74 ? { penalty: '+2' as const } : {}),
          scramble: "R U R' U'",
          createdAt: '11:22:33',
          moveCount: 20,
        };
        windowRecords = saveSolveRecords([rec, ...windowRecords]);
        if (i === 49) {
          expect(windowRecords).toHaveLength(49);
          expect(loadSolveStats()).toEqual({ totalSolves: 49, bestTimeMs: 750 });
        } else if (i === 50) {
          expect(windowRecords).toHaveLength(50);
          expect(loadSolveStats()).toEqual({ totalSolves: 50, bestTimeMs: 750 });
        } else if (i === 51) {
          expect(windowRecords).toHaveLength(50);
          expect(loadSolveStats()).toEqual({ totalSolves: 51, bestTimeMs: 750 });
        }
      }
      expect(windowRecords).toHaveLength(50);
      expect(windowRecords[0].id).toBe('rot_120');
      expect(windowRecords[49].id).toBe('rot_71');
      expect(loadSolveStats()).toEqual({ totalSolves: 120, bestTimeMs: 750 });

      // Calling saveSolveRecords twice with the 51-record array at solve #121 is idempotent
      const rec121: SolveRecord = {
        id: 'rot_121',
        timeMs: 6000,
        scramble: 'F U R',
        createdAt: '11:23:00',
        moveCount: 19,
      };
      const payload121 = [rec121, ...windowRecords];
      windowRecords = saveSolveRecords(payload121);
      expect(loadSolveStats()).toEqual({ totalSolves: 121, bestTimeMs: 750 });
      saveSolveRecords(payload121);
      expect(loadSolveStats()).toEqual({ totalSolves: 121, bestTimeMs: 750 });

      // 2. Quota failure on 1st setItem (SOLVE_RECORDS)
      const rec122: SolveRecord = {
        id: 'rot_122',
        timeMs: 600,
        scramble: 'R U2',
        createdAt: '11:24:00',
        moveCount: 16,
      };
      failMode = 'first-write';
      const firstFailRes = saveSolveRecordsWithStatus([rec122, ...windowRecords]);
      expect(firstFailRes.ok).toBe(false);
      expect(firstFailRes.error).toContain('未保存');
      expect(getLastStorageSaveError()).toContain('未保存');
      failMode = 'none';
      // Reloading after 1st write failure keeps consistent state (121 solves, 750ms PB)
      expect(loadSolveRecords()[0].id).toBe('rot_121');
      expect(loadSolveStats()).toEqual({ totalSolves: 121, bestTimeMs: 750 });

      // 3. Quota failure on 2nd setItem (SOLVE_STATS) when rollback of SOLVE_RECORDS succeeds
      failMode = 'second-write-with-rollback';
      const secondFailRes = saveSolveRecordsWithStatus([rec122, ...windowRecords]);
      expect(secondFailRes.ok).toBe(false);
      expect(secondFailRes.error).toContain('未保存');
      failMode = 'none';
      // Because SOLVE_RECORDS was rolled back to prevRecordsRaw, reload does not lose PB/count or desync
      expect(loadSolveRecords()[0].id).toBe('rot_121');
      expect(loadSolveStats()).toEqual({ totalSolves: 121, bestTimeMs: 750 });

      // Retrying save after quota clears succeeds without double-counting
      const retrySuccess = saveSolveRecordsWithStatus([rec122, ...windowRecords]);
      expect(retrySuccess.ok).toBe(true);
      expect(retrySuccess.error).toBeNull();
      windowRecords = retrySuccess.records;
      expect(loadSolveStats()).toEqual({ totalSolves: 122, bestTimeMs: 600 });

      // 4. Quota failure on 2nd setItem when rollback write ALSO throws (worst-case partial write)
      // At this point windowRecords has rot_122..rot_73 (where rot_122 has 600ms, archived PB is 750ms from rot_3).
      // Put +2 penalty on rot_122 so current PB is 750ms (from archived rot_3), then test that a partial write
      // where rot_73 gets evicted into recentEntries forward-shift recovery preserves archivedCount + 1 (total 123) and PB (750ms)!
      windowRecords = saveSolveRecords(
        windowRecords.map((r) => (r.id === 'rot_122' ? { ...r, penalty: '+2' as const } : r))
      );
      expect(loadSolveStats()).toEqual({ totalSolves: 122, bestTimeMs: 750 });

      const rec123: SolveRecord = {
        id: 'rot_123',
        timeMs: 4500,
        scramble: 'U R',
        createdAt: '11:25:00',
        moveCount: 15,
      };
      delete store['__first_write_done'];
      failMode = 'second-write-rollback-blocked';
      const partialFailRes = saveSolveRecordsWithStatus([rec123, ...windowRecords]);
      expect(partialFailRes.ok).toBe(false);
      expect(partialFailRes.error).toContain('未保存');
      failMode = 'none';

      // Now SOLVE_RECORDS in localStorage has rot_123..rot_74 (rot_73 was evicted from SOLVE_RECORDS!)
      // while SOLVE_STATS still has the state from solve #122.
      // Reloading must recover the forward-shifted window via recentEntries (totalSolves = 123, bestTimeMs = 750)!
      const recoveredRecords = loadSolveRecords();
      const recoveredStats = loadSolveStats();
      expect(recoveredRecords[0].id).toBe('rot_123');
      expect(recoveredStats).toEqual({
        totalSolves: 123,
        bestTimeMs: 750,
      });

      // Retrying saveSolveRecordsWithStatus with the exact same 51-record payload after partial write is idempotent
      const retryAfterPartial = saveSolveRecordsWithStatus([rec123, ...windowRecords]);
      expect(retryAfterPartial.ok).toBe(true);
      expect(retryAfterPartial.stats).toEqual({
        totalSolves: 123,
        bestTimeMs: 750,
      });
      windowRecords = retryAfterPartial.records;

      // 5. Failed 50->51 window transition followed by in-memory penalty toggle
      // Clear the +2 penalty on the oldest record in the current window (rot_74 at index 49, timeMs = 550)
      windowRecords = saveSolveRecords(
        windowRecords.map((r) => (r.id === 'rot_74' ? { ...r, penalty: 'none' as const } : r))
      );
      expect(loadSolveStats()).toEqual({ totalSolves: 123, bestTimeMs: 550 });

      const rec124: SolveRecord = {
        id: 'rot_124',
        timeMs: 4200,
        scramble: 'R U',
        createdAt: '11:26:00',
        moveCount: 18,
      };
      failMode = 'first-write';
      const failed124 = saveSolveRecordsWithStatus([rec124, ...windowRecords]);
      expect(failed124.ok).toBe(false);
      // In-memory state in App.tsx holds failed124.records (rot_124..rot_75, length 50), while localStorage still holds rot_123..rot_74!
      expect(failed124.records).toHaveLength(50);
      expect(failed124.records[0].id).toBe('rot_124');
      expect(failed124.records[49].id).toBe('rot_75');
      failMode = 'none';

      // User toggles +2 penalty on rot_124 using the 50-record in-memory array after quota clears:
      // Must merge with localStorage prevStored so rot_74 (with 550ms PB!) is archived rather than lost!
      const afterPenaltyOn124 = saveSolveRecordsWithStatus(
        failed124.records.map((r) => (r.id === 'rot_124' ? { ...r, penalty: '+2' as const } : r))
      );
      expect(afterPenaltyOn124.ok).toBe(true);
      expect(afterPenaltyOn124.stats).toEqual({
        totalSolves: 124,
        bestTimeMs: 550,
      });
      expect(loadSolveStats()).toEqual({
        totalSolves: 124,
        bestTimeMs: 550,
      });

      // 6. Two consecutive partial writes (shiftK = 2) followed by idempotent retry of the 51-record payload
      windowRecords = afterPenaltyOn124.records;
      const rec125: SolveRecord = {
        id: 'rot_125',
        timeMs: 4100,
        scramble: 'U2',
        createdAt: '11:27:00',
        moveCount: 14,
      };
      const rec126: SolveRecord = {
        id: 'rot_126',
        timeMs: 4050,
        scramble: 'R2',
        createdAt: '11:28:00',
        moveCount: 16,
      };
      delete store['__first_write_done'];
      failMode = 'second-write-rollback-blocked';
      const partial125 = saveSolveRecordsWithStatus([rec125, ...windowRecords]);
      expect(partial125.ok).toBe(false);
      delete store['__first_write_done'];
      const partial126 = saveSolveRecordsWithStatus([rec126, ...partial125.records]);
      expect(partial126.ok).toBe(false);
      failMode = 'none';

      // SOLVE_RECORDS on disk is 2 steps ahead of SOLVE_STATS (rot_126..rot_77 vs rot_124..rot_75)
      expect(loadSolveStats()).toEqual({
        totalSolves: 126,
        bestTimeMs: 550,
      });
      // Retrying the last 51-record payload ([rec126, ...partial125.records]) is idempotent and heals SOLVE_STATS
      const healed126 = saveSolveRecordsWithStatus([rec126, ...partial125.records]);
      expect(healed126.ok).toBe(true);
      expect(healed126.stats).toEqual({
        totalSolves: 126,
        bestTimeMs: 550,
      });

      // 7. 49 -> 50 -> 51 partial writes across the initial 50-record window boundary
      saveSolveRecords([]);
      let subWindow: SolveRecord[] = [];
      for (let i = 1; i <= 49; i++) {
        subWindow = saveSolveRecords([
          {
            id: `sub_${i}`,
            timeMs: i === 1 ? 680 : 5000 + i,
            scramble: 'R U',
            createdAt: '11:30:00',
            moveCount: 15,
          },
          ...subWindow,
        ]);
      }
      expect(loadSolveStats()).toEqual({ totalSolves: 49, bestTimeMs: 680 });

      delete store['__first_write_done'];
      failMode = 'second-write-rollback-blocked';
      const sub50Res = saveSolveRecordsWithStatus([
        { id: 'sub_50', timeMs: 5100, scramble: 'F', createdAt: '11:31:00', moveCount: 15 },
        ...subWindow,
      ]);
      expect(sub50Res.ok).toBe(false);
      delete store['__first_write_done'];
      const sub51Res = saveSolveRecordsWithStatus([
        { id: 'sub_51', timeMs: 5200, scramble: 'B', createdAt: '11:32:00', moveCount: 15 },
        ...sub50Res.records,
      ]);
      expect(sub51Res.ok).toBe(false);
      failMode = 'none';

      // Even though SOLVE_STATS on disk still had recentEntries of length 49 (sub_49..sub_1),
      // loadSolveStats() reconciles the 2-step shift into the 50-record window and preserves sub_1's 680ms PB!
      expect(loadSolveStats()).toEqual({
        totalSolves: 51,
        bestTimeMs: 680,
      });

      // Also verify saveSettings and saveCompletedLessons error tracking & recovery
      const origSetItem = globalThis.localStorage.setItem;
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          ...globalThis.localStorage,
          setItem: () => {
            throw new Error('QuotaExceededError: settings/lessons blocked');
          },
        },
        configurable: true,
      });
      expect(
        saveSettings({
          soundEnabled: true,
          narrationEnabled: true,
          focusMode: true,
          show3DArrows: true,
          show2DNet: true,
          playbackSpeed: 1,
        })
      ).toBe(false);
      expect(getLastStorageSaveError()).toContain('未保存：设置写入失败');
      expect(saveCompletedLessons(['basics-structure'])).toBe(false);
      expect(getLastStorageSaveError()).toContain('未保存：课程进度写入失败');

      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          ...globalThis.localStorage,
          setItem: origSetItem,
        },
        configurable: true,
      });
      expect(
        saveSettings({
          soundEnabled: true,
          narrationEnabled: true,
          focusMode: true,
          show3DArrows: true,
          show2DNet: true,
          playbackSpeed: 1,
        })
      ).toBe(true);
      expect(getLastStorageSaveError()).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: origStorage,
        configurable: true,
      });
    }
  });

  it('RC-05: enforces shared PLAYBACK_SPEEDS enum and strict SolveRecord schema/field validation', () => {
    expect(PLAYBACK_SPEEDS).toEqual([0.5, 1, 1.5, 2]);
    for (const spd of PLAYBACK_SPEEDS) {
      expect(isValidPlaybackSpeed(spd)).toBe(true);
    }
    for (const invalidSpd of [0, 0.75, 1.25, 3, -1, Number.NaN, Number.POSITIVE_INFINITY, '1']) {
      expect(isValidPlaybackSpeed(invalidSpd)).toBe(false);
    }

    const store: Record<string, string> = {};
    const origStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      },
      configurable: true,
    });

    try {
      // Unsupported speed 0.75 in localStorage falls back to 1
      store['cubelab_settings_v1'] = JSON.stringify({ playbackSpeed: 0.75 });
      expect(loadSettings().playbackSpeed).toBe(1);

      store['cubelab_settings_v1'] = JSON.stringify({ playbackSpeed: 1.5 });
      expect(loadSettings().playbackSpeed).toBe(1.5);

      const baseValid: SolveRecord = {
        id: 'solve_valid_1',
        timeMs: 8500,
        scramble: "R U R' U'",
        createdAt: '14:30:05',
        moveCount: 22,
      };
      expect(isValidSolveRecord(baseValid)).toBe(true);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '下午02:30:05' })).toBe(true);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '晚上09:15:30' })).toBe(true);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '凌晨01:05:00' })).toBe(true);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '02:30:05 PM' })).toBe(true);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '2026-11-07T10:12:27Z' })).toBe(true);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '2024-02-29' })).toBe(true);
      expect(isValidSolveRecord({ ...baseValid, version: 1 })).toBe(true);

      // Invalid records rejected (including calendar rollover dates & out-of-range ISO times)
      expect(isValidSolveRecord({ ...baseValid, id: '' })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, id: 'x'.repeat(129) })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, scramble: 'R '.repeat(300) })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, scramble: 'R INVALID_MOVE U' })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '99:99:99' })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, createdAt: 'not-a-valid-date' })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '2026-13-45' })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '2026-02-29' })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '2026-02-31' })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '2026-04-31' })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, createdAt: '2026-11-07 25:00:00' })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, timeMs: 0 })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, moveCount: -1 })).toBe(false);
      expect(isValidSolveRecord({ ...baseValid, version: 99 })).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: origStorage,
        configurable: true,
      });
    }
  });

  it('RC-06: isInteractiveOrEditableTarget guards buttons, links, form controls, ARIA roles, dialogs, and nested contenteditable children', () => {
    expect(isInteractiveOrEditableTarget(null)).toBe(false);

    // Non-interactive stage / canvas / body targets return false
    expect(isInteractiveOrEditableTarget({ tagName: 'MAIN' } as unknown as EventTarget)).toBe(false);
    expect(isInteractiveOrEditableTarget({ tagName: 'CANVAS' } as unknown as EventTarget)).toBe(false);
    expect(isInteractiveOrEditableTarget({ tagName: 'DIV' } as unknown as EventTarget)).toBe(false);

    // Direct interactive tags return true
    for (const tag of ['BUTTON', 'A', 'SELECT', 'INPUT', 'TEXTAREA', 'SUMMARY', 'OPTION', 'DIALOG']) {
      expect(isInteractiveOrEditableTarget({ tagName: tag } as unknown as EventTarget)).toBe(true);
    }

    // Document / Window target with activeElement pointing to an interactive control returns true
    expect(
      isInteractiveOrEditableTarget({
        activeElement: { tagName: 'BUTTON' },
      } as unknown as EventTarget)
    ).toBe(true);
    expect(
      isInteractiveOrEditableTarget({
        activeElement: { tagName: 'MAIN' },
      } as unknown as EventTarget)
    ).toBe(false);

    // ARIA interactive roles return true
    for (const role of [
      'button',
      'link',
      'tab',
      'menuitem',
      'switch',
      'checkbox',
      'radio',
      'combobox',
      'slider',
      'dialog',
    ]) {
      const roleTarget = {
        tagName: 'DIV',
        getAttribute: (attr: string) => (attr === 'role' ? role : null),
      };
      expect(isInteractiveOrEditableTarget(roleTarget as unknown as EventTarget)).toBe(true);
    }

    // aria-modal="true" returns true
    expect(
      isInteractiveOrEditableTarget({
        tagName: 'DIV',
        getAttribute: (attr: string) => (attr === 'aria-modal' ? 'true' : null),
      } as unknown as EventTarget)
    ).toBe(true);

    // Nested child inside a <button> or [contenteditable="true"] (including parentNode fallback) returns true
    const nestedInButton = {
      tagName: 'SPAN',
      parentElement: {
        tagName: 'BUTTON',
      },
    };
    expect(isInteractiveOrEditableTarget(nestedInButton as unknown as EventTarget)).toBe(true);

    const textNodeInButton = {
      parentNode: {
        tagName: 'BUTTON',
      },
    };
    expect(isInteractiveOrEditableTarget(textNodeInButton as unknown as EventTarget)).toBe(true);

    const nestedInContentEditable = {
      tagName: 'SPAN',
      parentElement: {
        tagName: 'DIV',
        getAttribute: (attr: string) => (attr === 'contenteditable' ? 'true' : null),
      },
    };
    expect(isInteractiveOrEditableTarget(nestedInContentEditable as unknown as EventTarget)).toBe(
      true
    );

    // contenteditable="false" does not block shortcuts
    const nonEditableDiv = {
      tagName: 'SPAN',
      parentElement: {
        tagName: 'DIV',
        getAttribute: (attr: string) => (attr === 'contenteditable' ? 'false' : null),
      },
    };
    expect(isInteractiveOrEditableTarget(nonEditableDiv as unknown as EventTarget)).toBe(false);
  });

  it('RC-07: NOTATION_ITEMS covers E, S, wide moves, and whole-cube rotations without duplicate typos, and 3D drag dispatches M/E/S matching engine directions', () => {
    const tokensText = NOTATION_ITEMS.map((item) => item.token).join(' ');
    expect(tokensText).toContain("E / E' / E2");
    expect(tokensText).toContain("S / S' / S2");
    expect(tokensText).toContain('r l u d f b');
    expect(tokensText).toContain('Rw..Bw');
    expect(tokensText).toContain('x / y / z');

    for (const item of NOTATION_ITEMS) {
      expect(item.desc).not.toContain('90° 90°');
    }

    // Verify all engine moves covered by NOTATION_ITEMS parse cleanly and match documented base directions
    for (const tok of [
      'R', "R'", 'R2',
      'L', "L'", 'L2',
      'U', "U'", 'U2',
      'D', "D'", 'D2',
      'F', "F'", 'F2',
      'B', "B'", 'B2',
      'M', "M'", 'M2',
      'E', "E'", 'E2',
      'S', "S'", 'S2',
      'r', 'l', 'u', 'd', 'f', 'b',
      'Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw',
      'x', "x'", 'x2',
      'y', "y'", 'y2',
      'z', "z'", 'z2',
    ]) {
      expect(() => getMoveDefinition(tok)).not.toThrow();
    }

    // Verify M follows L, E follows D, S follows F in getMoveDefinition
    expect(getMoveDefinition('M').quarterTurns).toBe(getMoveDefinition('L').quarterTurns);
    expect(getMoveDefinition('E').quarterTurns).toBe(getMoveDefinition('D').quarterTurns);
    expect(getMoveDefinition('S').quarterTurns).toBe(getMoveDefinition('F').quarterTurns);

    // Verify 3D pointer drag on middle-layer stickers dispatches M, E, S matching L, D, F directions
    const domElement = {
      clientWidth: 600,
      clientHeight: 600,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 }),
    };
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(4, 4, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const rootGroup = new THREE.Group();
    const addTestSticker = (pos: [number, number, number], faceDir: 'F' | 'U') => {
      const g = new THREE.Group();
      g.position.set(...pos);
      g.userData = { cubieId: pos.join(','), pos };
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.8),
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
      );
      if (faceDir === 'F') {
        mesh.position.set(0, 0, 0.472);
      } else {
        mesh.position.set(0, 0.472, 0);
        mesh.rotation.set(-Math.PI / 2, 0, 0);
      }
      mesh.userData = { faceDir, cubieId: pos.join(',') };
      g.add(mesh);
      rootGroup.add(g);
    };

    // Front center (0, 0, 1) facing F (+Z): vertical drag tests M / M', horizontal drag tests E / E'
    addTestSticker([0, 0, 1], 'F');
    // Top center (0, 1, 0) facing U (+Y): +X/-X drag tests S / S'
    addTestSticker([0, 1, 0], 'U');
    rootGroup.updateMatrixWorld(true);

    const dispatched: string[] = [];
    const handlers = createStagePointerHandlers({
      domElement,
      camera,
      rootGroup,
      cameraSpherical: { radius: 7.4, theta: 0.75, phi: 1.0, targetTheta: 0.75, targetPhi: 1.0 },
      isAnimating: () => false,
      onRequestRender: () => {},
      onUserMove: (tok) => dispatched.push(tok),
    });

    const projectToScreen = (worldPt: THREE.Vector3) => {
      const p = worldPt.clone().project(camera);
      return { x: ((p.x + 1) * 0.5) * 600, y: ((-p.y + 1) * 0.5) * 600 };
    };

    // 1. Drag down (-Y) on Front center (0, 0, 1.472) -> M (follows L downward)
    const f0 = projectToScreen(new THREE.Vector3(0, 0, 1.472));
    const fDown = projectToScreen(new THREE.Vector3(0, -0.6, 1.472));
    handlers.handlePointerDown({ pointerId: 1, button: 0, clientX: f0.x, clientY: f0.y } as PointerEvent);
    handlers.handlePointerMove({ pointerId: 1, button: 0, buttons: 1, clientX: fDown.x, clientY: fDown.y } as PointerEvent);
    handlers.handlePointerUp({ pointerId: 1, button: 0, buttons: 0, clientX: fDown.x, clientY: fDown.y } as PointerEvent);

    // 2. Drag right (+X) on Front center (0, 0, 1.472) -> E (follows D rightward)
    const fRight = projectToScreen(new THREE.Vector3(0.6, 0, 1.472));
    handlers.handlePointerDown({ pointerId: 2, button: 0, clientX: f0.x, clientY: f0.y } as PointerEvent);
    handlers.handlePointerMove({ pointerId: 2, button: 0, buttons: 1, clientX: fRight.x, clientY: fRight.y } as PointerEvent);
    handlers.handlePointerUp({ pointerId: 2, button: 0, buttons: 0, clientX: fRight.x, clientY: fRight.y } as PointerEvent);

    // 3. Drag right (+X) on Top center (0, 1.472, 0) -> S (follows F clockwise)
    const u0 = projectToScreen(new THREE.Vector3(0, 1.472, 0));
    const uRight = projectToScreen(new THREE.Vector3(0.6, 1.472, 0));
    handlers.handlePointerDown({ pointerId: 3, button: 0, clientX: u0.x, clientY: u0.y } as PointerEvent);
    handlers.handlePointerMove({ pointerId: 3, button: 0, buttons: 1, clientX: uRight.x, clientY: uRight.y } as PointerEvent);
    handlers.handlePointerUp({ pointerId: 3, button: 0, buttons: 0, clientX: uRight.x, clientY: uRight.y } as PointerEvent);

    expect(dispatched).toEqual(['M', 'E', 'S']);
  });

  it('RC-08: createWebGLRecoveryController manages context loss, stability window, restore timeout, 2D fallback, manual retry, and disposal suppression', () => {
    const statuses: string[] = [];
    let rebuildCount = 0;

    let nextTimerId = 1;
    const timers = new Map<number, { cb: () => void; ms: number }>();

    const controller = createWebGLRecoveryController({
      maxConsecutiveLosses: 2,
      stabilityWindowMs: 1500,
      restoreTimeoutMs: 4000,
      onStatusChange: (s) => statuses.push(s),
      onRebuildScene: () => {
        rebuildCount += 1;
      },
      setTimer: (cb, ms) => {
        const id = nextTimerId++;
        timers.set(id, { cb, ms });
        return id as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer: (id) => {
        timers.delete(id as unknown as number);
      },
    });

    expect(controller.getStatus()).toBe('healthy');
    controller.markSceneHealthy();

    // 1. Single active context loss + restore + stability window
    let prevented = false;
    controller.handleContextLost({
      preventDefault: () => {
        prevented = true;
      },
    });
    expect(prevented).toBe(true);
    expect(controller.getStatus()).toBe('context-lost');
    expect(controller.getConsecutiveLosses()).toBe(1);

    controller.handleContextRestored();
    expect(controller.getStatus()).toBe('rebuilding');
    expect(rebuildCount).toBe(1);

    controller.markSceneHealthy();
    expect(controller.getStatus()).toBe('healthy');
    // Before stability window elapses, consecutiveLosses is still 1
    expect(controller.getConsecutiveLosses()).toBe(1);

    // Advance past stabilityWindowMs (1500ms) -> resets consecutiveLosses to 0!
    for (const [id, t] of [...timers.entries()]) {
      if (t.ms === 1500) {
        timers.delete(id);
        t.cb();
      }
    }
    expect(controller.getConsecutiveLosses()).toBe(0);

    // 2. Three rapid consecutive losses (without completing stability window) -> 'fallback-2d'
    controller.handleContextLost();
    expect(controller.getStatus()).toBe('context-lost');
    expect(controller.getConsecutiveLosses()).toBe(1);
    controller.handleContextRestored();
    controller.markSceneHealthy(); // did NOT flush 1500ms stability timer

    controller.handleContextLost();
    expect(controller.getStatus()).toBe('context-lost');
    expect(controller.getConsecutiveLosses()).toBe(2);
    controller.handleContextRestored();
    controller.markSceneHealthy(); // did NOT flush 1500ms stability timer

    let preventedOnThird = false;
    controller.handleContextLost({
      preventDefault: () => {
        preventedOnThird = true;
      },
    });
    expect(preventedOnThird).toBe(false);
    expect(controller.getStatus()).toBe('fallback-2d');

    // 3. Manual retry3D() resets budget and transitions to 'rebuilding'
    controller.retry3D();
    expect(controller.getStatus()).toBe('rebuilding');
    expect(controller.getConsecutiveLosses()).toBe(0);
    controller.markSceneHealthy();
    expect(controller.getStatus()).toBe('healthy');

    // 4. Context loss that times out waiting for webglcontextrestored -> 'fallback-2d'
    controller.handleContextLost();
    expect(controller.getStatus()).toBe('context-lost');
    for (const [id, t] of [...timers.entries()]) {
      if (t.ms === 4000) {
        timers.delete(id);
        t.cb();
      }
    }
    expect(controller.getStatus()).toBe('fallback-2d');

    // 5. Disposal loss suppression: context loss during unmount/dispose is ignored
    controller.retry3D();
    controller.markSceneHealthy();
    controller.setIgnoringDisposalLoss(true);
    let preventedDuringDispose = false;
    controller.handleContextLost({
      preventDefault: () => {
        preventedDuringDispose = true;
      },
    });
    expect(preventedDuringDispose).toBe(false);
    expect(controller.getStatus()).toBe('healthy');
    controller.setIgnoringDisposalLoss(false);

    // 6. StrictMode / remount lifecycle: dispose() followed by revive() keeps controller operational
    controller.dispose();
    controller.handleContextLost();
    expect(controller.getStatus()).toBe('healthy');
    controller.revive();
    controller.handleContextLost();
    expect(controller.getStatus()).toBe('context-lost');

    // 7. Rapid synchronous loss -> restore -> loss before scene effect runs markSceneHealthy:
    // markSceneHealthy must NOT overwrite 'context-lost' or 'fallback-2d' back to 'healthy'
    controller.retry3D();
    controller.markSceneHealthy();
    controller.handleContextLost();
    controller.handleContextRestored();
    expect(controller.getStatus()).toBe('rebuilding');
    controller.handleContextLost();
    expect(controller.getStatus()).toBe('context-lost');
    controller.markSceneHealthy();
    expect(controller.getStatus()).toBe('context-lost');
  });

  it('RC-09: createOnDemandFrameScheduler achieves 0 idle/hidden rAF callbacks and wakes on demand', () => {
    let nextRafId = 1;
    const rafQueue = new Map<number, (now: number) => void>();
    let hidden = false;
    let shouldKeepAlive = false;

    const scheduler = createOnDemandFrameScheduler({
      onStepFrame: () => ({ didRender: true, keepAlive: shouldKeepAlive }),
      requestFrame: (cb) => {
        const id = nextRafId++;
        rafQueue.set(id, cb);
        return id;
      },
      cancelFrame: (id) => {
        rafQueue.delete(id);
      },
      isHidden: () => hidden,
    });

    const flushNextAnimationFrame = (timestamp = 16) => {
      const entries = [...rafQueue.entries()];
      rafQueue.clear();
      for (const [, cb] of entries) {
        cb(timestamp);
      }
    };

    // 1. Initially idle: 0 callbacks scheduled or run
    expect(scheduler.isScheduled()).toBe(false);
    expect(rafQueue.size).toBe(0);
    expect(scheduler.getStats()).toEqual({ callbackCount: 0, renderCount: 0 });

    // 2. Multiple synchronous wake() calls coalesce into 1 rAF
    scheduler.wake();
    scheduler.wake();
    scheduler.wake();
    expect(scheduler.isScheduled()).toBe(true);
    expect(rafQueue.size).toBe(1);

    // Single render frame (shouldKeepAlive = false) -> renders once and stops completely
    flushNextAnimationFrame(16);
    expect(scheduler.getStats()).toEqual({ callbackCount: 1, renderCount: 1 });
    expect(scheduler.isScheduled()).toBe(false);
    expect(rafQueue.size).toBe(0);

    // Idle period: flushing frames when nothing requested produces 0 callbacks and 0 renders
    flushNextAnimationFrame(32);
    flushNextAnimationFrame(48);
    expect(scheduler.getStats()).toEqual({ callbackCount: 1, renderCount: 1 });

    // 3. Continuous animation / camera damping (shouldKeepAlive = true for 3 frames, then settles)
    let remainingActiveFrames = 3;
    shouldKeepAlive = true;
    scheduler.wake();
    while (remainingActiveFrames > 0) {
      remainingActiveFrames -= 1;
      if (remainingActiveFrames === 0) {
        shouldKeepAlive = false;
      }
      flushNextAnimationFrame(64);
    }
    expect(scheduler.getStats()).toEqual({ callbackCount: 4, renderCount: 4 });
    expect(scheduler.isScheduled()).toBe(false);
    expect(rafQueue.size).toBe(0);

    // 4. Hidden tab: wake() does not schedule rAF while document is hidden
    hidden = true;
    scheduler.wake();
    expect(scheduler.isScheduled()).toBe(false);
    expect(rafQueue.size).toBe(0);
    flushNextAnimationFrame(80);
    expect(scheduler.getStats()).toEqual({ callbackCount: 4, renderCount: 4 });

    // 5. Tab becomes visible again -> handleVisibilityChange wakes and renders 1 frame
    hidden = false;
    scheduler.handleVisibilityChange();
    expect(scheduler.isScheduled()).toBe(true);
    flushNextAnimationFrame(96);
    expect(scheduler.getStats()).toEqual({ callbackCount: 5, renderCount: 5 });
    expect(scheduler.isScheduled()).toBe(false);
  });
});
