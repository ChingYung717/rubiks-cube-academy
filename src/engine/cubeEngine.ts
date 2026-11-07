export type FaceDir = 'U' | 'D' | 'R' | 'L' | 'F' | 'B';
export type CubeColor = 'Y' | 'W' | 'R' | 'O' | 'B' | 'G';
export type CubiePieceType = 'center' | 'edge' | 'corner' | 'core';

export interface Cubie {
  id: string;
  homePos: [number, number, number];
  pos: [number, number, number];
  type: CubiePieceType;
  faces: Partial<Record<FaceDir, CubeColor>>;
}

export interface MoveDefinition {
  token: string;
  base: string;
  axis: 'x' | 'y' | 'z';
  layers: number[];
  quarterTurns: number; // in units of +90 deg around +axis (-1 = -90deg, 1 = +90deg, -2/2 = 180deg)
  nameZh: string;
  fingerTrickZh: string;
}

export interface NetSticker {
  color: CubeColor;
  cubieId: string;
  homePos: [number, number, number];
  pos: [number, number, number];
  type: CubiePieceType;
}

export const CUBE_COLOR_HEX: Record<CubeColor, string> = {
  Y: '#FACC15', // Top (U) - Vivid Yellow
  W: '#F8FAFC', // Bottom (D) - Crisp White
  B: '#2563EB', // Front (F) - Royal Blue
  G: '#10B981', // Back (B) - Emerald Green
  R: '#EF4444', // Right (R) - Crimson Red
  O: '#F97316', // Left (L) - Bright Orange
};

export const CUBE_COLOR_NAME_ZH: Record<CubeColor, string> = {
  Y: '黄 (顶 U)',
  W: '白 (底 D)',
  B: '蓝 (前 F)',
  G: '绿 (后 B)',
  R: '红 (右 R)',
  O: '橙 (左 L)',
};

export const FACE_DIR_NAME_ZH: Record<FaceDir, string> = {
  U: '顶面 (U - Up)',
  D: '底面 (D - Down)',
  F: '前面 (F - Front)',
  B: '后面 (B - Back)',
  L: '左面 (L - Left)',
  R: '右面 (R - Right)',
};

const BASE_MOVES: Record<
  string,
  {
    axis: 'x' | 'y' | 'z';
    layers: number[];
    cwQuarterTurn: -1 | 1;
    layerNameZh: string;
    cwActionZh: string;
    ccwActionZh: string;
    cwFingerZh: string;
    ccwFingerZh: string;
  }
> = {
  R: {
    axis: 'x',
    layers: [1],
    cwQuarterTurn: -1,
    layerNameZh: '右层 (R)',
    cwActionZh: '顺时针上推 90°',
    ccwActionZh: '逆时针下拉 90°',
    cwFingerZh: '右手握右层向上推 (上)',
    ccwFingerZh: '右手握右层向下拉 (下)',
  },
  L: {
    axis: 'x',
    layers: [-1],
    cwQuarterTurn: 1,
    layerNameZh: '左层 (L)',
    cwActionZh: '顺时针下拉 90°',
    ccwActionZh: '逆时针上推 90°',
    cwFingerZh: '左手握左层向下拉',
    ccwFingerZh: '左手握左层向上推',
  },
  U: {
    axis: 'y',
    layers: [1],
    cwQuarterTurn: -1,
    layerNameZh: '顶层 (U)',
    cwActionZh: '顺时针左拨 90°',
    ccwActionZh: '逆时针右拨 90°',
    cwFingerZh: '右手食指从右前向左拨 (左)',
    ccwFingerZh: '左手食指从左前向右拨 (右)',
  },
  D: {
    axis: 'y',
    layers: [-1],
    cwQuarterTurn: 1,
    layerNameZh: '底层 (D)',
    cwActionZh: '顺时针右拨 90°',
    ccwActionZh: '逆时针左拨 90°',
    cwFingerZh: '左手无名指从左后推底层向右',
    ccwFingerZh: '右手无名指从右后推底层向左',
  },
  F: {
    axis: 'z',
    layers: [1],
    cwQuarterTurn: -1,
    layerNameZh: '前层 (F)',
    cwActionZh: '顺时针右压 90°',
    ccwActionZh: '逆时针上挑 90°',
    cwFingerZh: '右手食指从顶前向下压前层',
    ccwFingerZh: '右手拇指从右下向上挑前层',
  },
  B: {
    axis: 'z',
    layers: [-1],
    cwQuarterTurn: 1,
    layerNameZh: '后层 (B)',
    cwActionZh: '顺时针左拨 90°',
    ccwActionZh: '逆时针右拨 90°',
    cwFingerZh: '右手无名指拨动后层向左',
    ccwFingerZh: '左手无名指拨动后层向右',
  },
  M: {
    axis: 'x',
    layers: [0],
    cwQuarterTurn: 1, // follows L
    layerNameZh: '中层 (M)',
    cwActionZh: '随左层方向下拨 90°',
    ccwActionZh: '向上挑动中层 90°',
    cwFingerZh: '无名指从后下推中层',
    ccwFingerZh: '左手无名指从底后向上弹中层',
  },
  E: {
    axis: 'y',
    layers: [0],
    cwQuarterTurn: 1, // follows D
    layerNameZh: '赤道层 (E)',
    cwActionZh: '随底层方向右拨 90°',
    ccwActionZh: '随底层反方向左拨 90°',
    cwFingerZh: '中层水平向右拨',
    ccwFingerZh: '中层水平向左拨',
  },
  S: {
    axis: 'z',
    layers: [0],
    cwQuarterTurn: -1, // follows F
    layerNameZh: '中立层 (S)',
    cwActionZh: '随前层方向顺转 90°',
    ccwActionZh: '随前层反方向逆转 90°',
    cwFingerZh: '食指拨动前后夹层顺转',
    ccwFingerZh: '食指拨动前后夹层逆转',
  },
  r: {
    axis: 'x',
    layers: [0, 1],
    cwQuarterTurn: -1,
    layerNameZh: '右两层 (r/Rw)',
    cwActionZh: '双层顺时针上推 90°',
    ccwActionZh: '双层逆时针下拉 90°',
    cwFingerZh: '右手同时带动右层与中层上推',
    ccwFingerZh: '右手同时带动右层与中层下拉',
  },
  l: {
    axis: 'x',
    layers: [-1, 0],
    cwQuarterTurn: 1,
    layerNameZh: '左两层 (l/Lw)',
    cwActionZh: '双层顺时针下拉 90°',
    ccwActionZh: '双层逆时针上推 90°',
    cwFingerZh: '左手同时带动左两层下拉',
    ccwFingerZh: '左手同时带动左两层上推',
  },
  u: {
    axis: 'y',
    layers: [0, 1],
    cwQuarterTurn: -1,
    layerNameZh: '顶两层 (u/Uw)',
    cwActionZh: '双层顺时针左拨 90°',
    ccwActionZh: '双层逆时针右拨 90°',
    cwFingerZh: '同时拨动顶两层向左',
    ccwFingerZh: '同时拨动顶两层向右',
  },
  f: {
    axis: 'z',
    layers: [0, 1],
    cwQuarterTurn: -1,
    layerNameZh: '前两层 (f/Fw)',
    cwActionZh: '双层顺时针右压 90°',
    ccwActionZh: '双层逆时针回挑 90°',
    cwFingerZh: '同时压动前两层顺时针旋转',
    ccwFingerZh: '同时挑动前两层逆时针旋转',
  },
  d: {
    axis: 'y',
    layers: [-1, 0],
    cwQuarterTurn: 1,
    layerNameZh: '底两层 (d/Dw)',
    cwActionZh: '双层顺时针右拨 90°',
    ccwActionZh: '双层逆时针左拨 90°',
    cwFingerZh: '同时推动底两层向右',
    ccwFingerZh: '同时推动底两层向左',
  },
  b: {
    axis: 'z',
    layers: [-1, 0],
    cwQuarterTurn: 1,
    layerNameZh: '后两层 (b/Bw)',
    cwActionZh: '双层顺时针左拨 90°',
    ccwActionZh: '双层逆时针右拨 90°',
    cwFingerZh: '同时拨动后两层向左',
    ccwFingerZh: '同时拨动后两层向右',
  },
  x: {
    axis: 'x',
    layers: [-1, 0, 1],
    cwQuarterTurn: -1, // follows R
    layerNameZh: '整体翻转 (x)',
    cwActionZh: '整颗魔方随 R 向上翻 90°',
    ccwActionZh: '整颗魔方随 R\' 向下翻 90°',
    cwFingerZh: '双手将魔方整体向前上方翻转',
    ccwFingerZh: '双手将魔方整体向后下方翻转',
  },
  y: {
    axis: 'y',
    layers: [-1, 0, 1],
    cwQuarterTurn: -1, // follows U
    layerNameZh: '整体水平转 (y)',
    cwActionZh: '整颗魔方随 U 向左转 90°',
    ccwActionZh: '整颗魔方随 U\' 向右转 90°',
    cwFingerZh: '双手将魔方整体水平向左转',
    ccwFingerZh: '双手将魔方整体水平向右转',
  },
  z: {
    axis: 'z',
    layers: [-1, 0, 1],
    cwQuarterTurn: -1, // follows F
    layerNameZh: '整体侧翻 (z)',
    cwActionZh: '整颗魔方随 F 顺时针倾倒 90°',
    ccwActionZh: '整颗魔方随 F\' 逆时针倾倒 90°',
    cwFingerZh: '双手将魔方整体向右倾倒',
    ccwFingerZh: '双手将魔方整体向左倾倒',
  },
};

export function createSolvedCube(): Cubie[] {
  const cubies: Cubie[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const nonZero = (x !== 0 ? 1 : 0) + (y !== 0 ? 1 : 0) + (z !== 0 ? 1 : 0);
        const type: CubiePieceType =
          nonZero === 0 ? 'core' : nonZero === 1 ? 'center' : nonZero === 2 ? 'edge' : 'corner';
        const faces: Partial<Record<FaceDir, CubeColor>> = {};
        if (y === 1) faces.U = 'Y';
        if (y === -1) faces.D = 'W';
        if (x === 1) faces.R = 'R';
        if (x === -1) faces.L = 'O';
        if (z === 1) faces.F = 'B';
        if (z === -1) faces.B = 'G';

        cubies.push({
          id: `c_${x}_${y}_${z}`,
          homePos: [x, y, z],
          pos: [x, y, z],
          type,
          faces,
        });
      }
    }
  }
  return cubies;
}

export function cloneCube(cube: Cubie[]): Cubie[] {
  return cube.map((c) => ({
    id: c.id,
    homePos: [c.homePos[0], c.homePos[1], c.homePos[2]],
    pos: [c.pos[0], c.pos[1], c.pos[2]],
    type: c.type,
    faces: { ...c.faces },
  }));
}

export function getMoveDefinition(rawToken: string): MoveDefinition {
  const token = rawToken.trim();
  const match = token.match(/^([RLUDFBMESxyz]|[RLUDFB]w|[rludfb])(2['’′]?|['’′]2|['’′])?$/);
  if (!match) {
    throw new Error(`Unknown move token: ${rawToken}`);
  }

  const rawBase = match[1];
  const base = rawBase.endsWith('w') ? rawBase[0].toLowerCase() : rawBase;
  const rawMod = (match[2] ?? '').replace(/[’′]/g, "'");
  const spec = BASE_MOVES[base];
  if (!spec) {
    throw new Error(`Unknown move token: ${rawToken}`);
  }

  let quarterTurns: number = spec.cwQuarterTurn;
  let nameZh = `${spec.layerNameZh}${spec.cwActionZh}`;
  let fingerTrickZh = spec.cwFingerZh;
  let normalizedToken = base;

  if (rawMod === "'") {
    quarterTurns = -spec.cwQuarterTurn;
    nameZh = `${spec.layerNameZh}${spec.ccwActionZh}`;
    fingerTrickZh = spec.ccwFingerZh;
    normalizedToken = `${base}'`;
  } else if (rawMod === '2' || rawMod === "2'" || rawMod === "'2") {
    quarterTurns = spec.cwQuarterTurn * 2;
    nameZh = `${spec.layerNameZh}旋转 180° (连转两次)`;
    fingerTrickZh = `${spec.cwFingerZh}，连续拨动两次 180°`;
    normalizedToken = `${base}2`;
  }

  return {
    token: normalizedToken,
    base,
    axis: spec.axis,
    layers: spec.layers,
    quarterTurns,
    nameZh,
    fingerTrickZh,
  };
}

/**
 * Rotates a single cubie by -90 degrees around the specified positive axis (+X, +Y, or +Z).
 * Applying this 1 time = -90 deg, 2 times = 180 deg, 3 times = +90 deg.
 */
function rotateCubieNeg90(cubie: Cubie, axis: 'x' | 'y' | 'z'): void {
  const [x, y, z] = cubie.pos;
  const f = cubie.faces;
  if (axis === 'x') {
    // Around +X by -90 deg: +Z (F) -> +Y (U) -> -Z (B) -> -Y (D) -> +Z (F)
    cubie.pos = [x, z || 0, -y || 0];
    const nextFaces: Partial<Record<FaceDir, CubeColor>> = {};
    if (f.R) nextFaces.R = f.R;
    if (f.L) nextFaces.L = f.L;
    if (f.F) nextFaces.U = f.F;
    if (f.U) nextFaces.B = f.U;
    if (f.B) nextFaces.D = f.B;
    if (f.D) nextFaces.F = f.D;
    cubie.faces = nextFaces;
  } else if (axis === 'y') {
    // Around +Y by -90 deg: +Z (F) -> -X (L) -> -Z (B) -> +X (R) -> +Z (F)
    cubie.pos = [-z || 0, y, x];
    const nextFaces: Partial<Record<FaceDir, CubeColor>> = {};
    if (f.U) nextFaces.U = f.U;
    if (f.D) nextFaces.D = f.D;
    if (f.F) nextFaces.L = f.F;
    if (f.L) nextFaces.B = f.L;
    if (f.B) nextFaces.R = f.B;
    if (f.R) nextFaces.F = f.R;
    cubie.faces = nextFaces;
  } else {
    // Around +Z by -90 deg: +Y (U) -> +X (R) -> -Y (D) -> -X (L) -> +Y (U)
    cubie.pos = [y, -x || 0, z];
    const nextFaces: Partial<Record<FaceDir, CubeColor>> = {};
    if (f.F) nextFaces.F = f.F;
    if (f.B) nextFaces.B = f.B;
    if (f.U) nextFaces.R = f.U;
    if (f.R) nextFaces.D = f.R;
    if (f.D) nextFaces.L = f.D;
    if (f.L) nextFaces.U = f.L;
    cubie.faces = nextFaces;
  }
}

export function applyMove(cube: Cubie[], token: string): Cubie[] {
  const def = getMoveDefinition(token);
  const next = cloneCube(cube);
  const axisIdx = def.axis === 'x' ? 0 : def.axis === 'y' ? 1 : 2;

  // Map quarterTurns (-1, +1, -2, +2) to number of -90 deg steps in {1, 2, 3}
  let neg90Steps = 0;
  if (def.quarterTurns === -1) neg90Steps = 1;
  else if (Math.abs(def.quarterTurns) === 2) neg90Steps = 2;
  else if (def.quarterTurns === 1) neg90Steps = 3;

  for (const cubie of next) {
    if (def.layers.includes(cubie.pos[axisIdx])) {
      for (let i = 0; i < neg90Steps; i++) {
        rotateCubieNeg90(cubie, def.axis);
      }
    }
  }
  return next;
}

export function parseAlgorithm(alg: string | string[]): string[] {
  if (Array.isArray(alg)) {
    return alg.map((t) => t.trim()).filter(Boolean);
  }
  return alg
    .replace(/[()[\]]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function invertMove(token: string): string {
  const def = getMoveDefinition(token);
  if (Math.abs(def.quarterTurns) === 2) {
    return `${def.base}2`;
  }
  if (def.token.endsWith("'")) {
    return def.base;
  }
  return `${def.base}'`;
}

export function invertAlgorithm(alg: string | string[]): string[] {
  const tokens = parseAlgorithm(alg);
  return [...tokens].reverse().map(invertMove);
}

export function applyAlgorithm(cube: Cubie[], alg: string | string[]): Cubie[] {
  const tokens = parseAlgorithm(alg);
  let state = cloneCube(cube);
  for (const token of tokens) {
    state = applyMove(state, token);
  }
  return state;
}

export function computeTimelineStates(initialCube: Cubie[], moves: string[]): Cubie[][] {
  const states: Cubie[][] = [cloneCube(initialCube)];
  let curr = cloneCube(initialCube);
  for (const move of moves) {
    curr = applyMove(curr, move);
    states.push(cloneCube(curr));
  }
  return states;
}

export function getCubieAt(cube: Cubie[], x: number, y: number, z: number): Cubie | undefined {
  return cube.find((c) => c.pos[0] === x && c.pos[1] === y && c.pos[2] === z);
}

export function extract2DNet(cube: Cubie[]): Record<FaceDir, NetSticker[][]> {
  const makeGrid = (
    coordsFn: (row: number, col: number) => [number, number, number],
    dir: FaceDir
  ): NetSticker[][] => {
    const grid: NetSticker[][] = [];
    for (let r = 0; r < 3; r++) {
      const rowArr: NetSticker[] = [];
      for (let c = 0; c < 3; c++) {
        const [x, y, z] = coordsFn(r, c);
        const cubie = getCubieAt(cube, x, y, z);
        rowArr.push({
          color: cubie?.faces[dir] ?? 'W',
          cubieId: cubie?.id ?? '',
          homePos: cubie?.homePos ?? [x, y, z],
          pos: [x, y, z],
          type: cubie?.type ?? 'core',
        });
      }
      grid.push(rowArr);
    }
    return grid;
  };

  return {
    U: makeGrid((r, c) => [c - 1, 1, r - 1], 'U'),
    D: makeGrid((r, c) => [c - 1, -1, 1 - r], 'D'),
    F: makeGrid((r, c) => [c - 1, 1 - r, 1], 'F'),
    B: makeGrid((r, c) => [1 - c, 1 - r, -1], 'B'),
    L: makeGrid((r, c) => [-1, 1 - r, c - 1], 'L'),
    R: makeGrid((r, c) => [1, 1 - r, 1 - c], 'R'),
  };
}

export function isCubeSolved(cube: Cubie[]): boolean {
  const net = extract2DNet(cube);
  const dirs: FaceDir[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  for (const dir of dirs) {
    const grid = net[dir];
    const centerColor = grid[1][1].color;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[r][c].color !== centerColor) {
          return false;
        }
      }
    }
  }
  return true;
}

export function generatePracticeScramble(length = 20): string[] {
  const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
  const axisGroup: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
  const modifiers = ['', "'", '2'];
  const scramble: string[] = [];
  let prevFace = '';
  let prevPrevFace = '';

  while (scramble.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    if (face === prevFace) continue;
    if (
      prevFace &&
      prevPrevFace &&
      axisGroup[face] === axisGroup[prevFace] &&
      face === prevPrevFace
    ) {
      continue;
    }
    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    scramble.push(`${face}${mod}`);
    prevPrevFace = prevFace;
    prevFace = face;
  }

  return scramble;
}

/**
 * Checks if expectedMove is a 180° move (e.g. R2) and userMove is a 90° move on the same base layer (R or R').
 */
export function isHalfOfDoubleMove(userMove: string, expectedMove: string): boolean {
  const uDef = getMoveDefinition(userMove);
  const eDef = getMoveDefinition(expectedMove);
  return (
    uDef.base === eDef.base &&
    Math.abs(eDef.quarterTurns) === 2 &&
    Math.abs(uDef.quarterTurns) === 1
  );
}

function getClockwiseQuarterTurnsMod4(token: string): number {
  const def = getMoveDefinition(token);
  if (Math.abs(def.quarterTurns) === 2) return 2;
  return def.token.endsWith("'") ? 3 : 1;
}

function tokenFromClockwiseQuarterTurns(base: string, cwMod4: number): string | null {
  const norm = ((cwMod4 % 4) + 4) % 4;
  if (norm === 0) return null;
  if (norm === 1) return base;
  if (norm === 2) return `${base}2`;
  return `${base}'`;
}

/**
 * Appends moveToken to a move stack, combining or cancelling with the top of the stack
 * if both operate on the same base layer (e.g. R + R -> R2, R + R' -> pop, R2 + R -> R').
 */
export function combineMoveWithStack(stack: string[], moveToken: string): string[] {
  const def = getMoveDefinition(moveToken);
  if (stack.length === 0) {
    return [def.token];
  }
  const lastToken = stack[stack.length - 1];
  const lastDef = getMoveDefinition(lastToken);
  if (lastDef.base !== def.base) {
    return [...stack, def.token];
  }
  const combinedMod4 =
    (getClockwiseQuarterTurnsMod4(lastDef.token) + getClockwiseQuarterTurnsMod4(def.token)) % 4;
  const mergedToken = tokenFromClockwiseQuarterTurns(def.base, combinedMod4);
  if (!mergedToken) {
    return stack.slice(0, -1);
  }
  return [...stack.slice(0, -1), mergedToken];
}

export interface PracticeProgressState {
  step: number;
  halfTurnToken: string | null;
  errors: string[];
}

export interface PracticeMoveTransition extends PracticeProgressState {
  stepAdvanced: boolean;
  madeMistake: boolean;
}

/**
 * Pure state machine transition for interactive lesson practice.
 * Preserves the exact invariant:
 *   practiceCube === applyAlgorithm(timelineStates[step], [...(halfTurnToken ? [halfTurnToken] : []), ...errors])
 */
export function evaluatePracticeMoveStep(
  current: PracticeProgressState,
  rawMoveToken: string,
  lessonMoves: string[]
): PracticeMoveTransition {
  const moveToken = getMoveDefinition(rawMoveToken).token;

  // 1. If there are active error moves, combine with the error stack
  if (current.errors.length > 0) {
    const countQuarterTurns = (arr: string[]) =>
      arr.reduce((sum, tok) => sum + Math.abs(getMoveDefinition(tok).quarterTurns), 0);
    const prevTurns = countQuarterTurns(current.errors);
    const nextErrors = combineMoveWithStack(current.errors, moveToken);

    // Check if the combined net moves from the current step now match the expected move or a valid half-turn
    if (current.step < lessonMoves.length) {
      const expected = getMoveDefinition(lessonMoves[current.step]).token;
      const fullStack = current.halfTurnToken
        ? nextErrors.reduce((s, tok) => combineMoveWithStack(s, tok), [current.halfTurnToken])
        : nextErrors;

      if (fullStack.length === 0) {
        return {
          step: current.step,
          halfTurnToken: null,
          errors: [],
          stepAdvanced: true,
          madeMistake: false,
        };
      }
      if (fullStack.length === 1 && fullStack[0] === expected) {
        return {
          step: current.step + 1,
          halfTurnToken: null,
          errors: [],
          stepAdvanced: true,
          madeMistake: false,
        };
      }
      if (fullStack.length === 1 && isHalfOfDoubleMove(fullStack[0], expected)) {
        return {
          step: current.step,
          halfTurnToken: fullStack[0],
          errors: [],
          stepAdvanced: true,
          madeMistake: false,
        };
      }
    }

    const nextTurns = countQuarterTurns(nextErrors);
    const reduced = nextTurns < prevTurns || nextErrors.length < current.errors.length;
    return {
      step: current.step,
      halfTurnToken: current.halfTurnToken,
      errors: nextErrors,
      stepAdvanced: reduced,
      madeMistake: !reduced,
    };
  }

  // 2. If user is at a valid formula step with no active errors
  if (current.step < lessonMoves.length) {
    const expected = getMoveDefinition(lessonMoves[current.step]).token;

    // 2a. A 90-degree half-turn is already pending toward a 180-degree double move
    if (current.halfTurnToken !== null) {
      if (moveToken === current.halfTurnToken) {
        // Second 90-degree turn in the same direction completes the 180-degree move
        return {
          step: current.step + 1,
          halfTurnToken: null,
          errors: [],
          stepAdvanced: true,
          madeMistake: false,
        };
      }
      if (moveToken === invertMove(current.halfTurnToken)) {
        // Opposite 90-degree turn cancels the first half-turn back to the step start
        return {
          step: current.step,
          halfTurnToken: null,
          errors: [],
          stepAdvanced: false,
          madeMistake: false,
        };
      }
      // Any other move (including a 180° turn on top of the 90° turn, or a different face) is recorded as an error
      return {
        step: current.step,
        halfTurnToken: current.halfTurnToken,
        errors: [moveToken],
        stepAdvanced: false,
        madeMistake: true,
      };
    }

    // 2b. No half-turn pending
    if (moveToken === expected) {
      return {
        step: current.step + 1,
        halfTurnToken: null,
        errors: [],
        stepAdvanced: true,
        madeMistake: false,
      };
    }

    if (isHalfOfDoubleMove(moveToken, expected)) {
      return {
        step: current.step,
        halfTurnToken: moveToken,
        errors: [],
        stepAdvanced: true,
        madeMistake: false,
      };
    }

    return {
      step: current.step,
      halfTurnToken: null,
      errors: [moveToken],
      stepAdvanced: false,
      madeMistake: true,
    };
  }

  // 3. Past the end of the formula
  return {
    step: current.step,
    halfTurnToken: null,
    errors: [moveToken],
    stepAdvanced: false,
    madeMistake: true,
  };
}

