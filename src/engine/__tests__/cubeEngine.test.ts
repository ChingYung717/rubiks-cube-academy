import { describe, expect, it } from 'vitest';
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
  computeAo5,
  formatTimeMs,
  loadCompletedLessons,
  loadSettings,
  loadSolveRecords,
} from '../../utils/storage';
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

    // With 2 DNFs -> Ao5 is null (DNF)
    const recordsTwoDnf = [
      { id: '1', timeMs: 10000, penalty: 'DNF' as const, scramble: '', createdAt: '', moveCount: 20 },
      { id: '2', timeMs: 12000, penalty: 'DNF' as const, scramble: '', createdAt: '', moveCount: 20 },
      { id: '3', timeMs: 8000, scramble: '', createdAt: '', moveCount: 20 },
      { id: '4', timeMs: 11000, scramble: '', createdAt: '', moveCount: 20 },
      { id: '5', timeMs: 15000, scramble: '', createdAt: '', moveCount: 20 },
    ];
    expect(computeAo5(recordsTwoDnf)).toBeNull();
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
});
