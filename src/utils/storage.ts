export type SolvePenalty = 'none' | '+2' | 'DNF';

export interface SolveRecord {
  id: string;
  timeMs: number;
  scramble: string;
  createdAt: string;
  moveCount: number;
  penalty?: SolvePenalty;
}

export interface PersistedSettings {
  soundEnabled: boolean;
  narrationEnabled: boolean;
  focusMode: boolean;
  show3DArrows: boolean;
  show2DNet: boolean;
  playbackSpeed: number;
}

const KEYS = {
  COMPLETED_LESSONS: 'cubelab_completed_lessons_v1',
  SOLVE_RECORDS: 'cubelab_solve_records_v1',
  SETTINGS: 'cubelab_settings_v1',
};

const DEFAULT_SETTINGS: PersistedSettings = {
  soundEnabled: true,
  narrationEnabled: true,
  focusMode: true,
  show3DArrows: true,
  show2DNet: true,
  playbackSpeed: 1,
};

function isValidSolveRecord(item: unknown): item is SolveRecord {
  if (typeof item !== 'object' || item === null) return false;
  const r = item as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return false;
  if (typeof r.timeMs !== 'number' || !Number.isFinite(r.timeMs) || r.timeMs < 0) return false;
  if (typeof r.scramble !== 'string') return false;
  if (typeof r.createdAt !== 'string') return false;
  if (typeof r.moveCount !== 'number' || !Number.isFinite(r.moveCount) || r.moveCount < 0) {
    return false;
  }
  if (
    r.penalty !== undefined &&
    r.penalty !== 'none' &&
    r.penalty !== '+2' &&
    r.penalty !== 'DNF'
  ) {
    return false;
  }
  return true;
}

export function loadCompletedLessons(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.COMPLETED_LESSONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
  } catch {
    return [];
  }
}

export function saveCompletedLessons(lessonIds: string[]): void {
  try {
    localStorage.setItem(KEYS.COMPLETED_LESSONS, JSON.stringify(Array.from(new Set(lessonIds))));
  } catch {
    // ignore storage errors
  }
}

export function loadSolveRecords(): SolveRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.SOLVE_RECORDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidSolveRecord) : [];
  } catch {
    return [];
  }
}

export function saveSolveRecords(records: SolveRecord[]): void {
  try {
    localStorage.setItem(KEYS.SOLVE_RECORDS, JSON.stringify(records.slice(0, 50)));
  } catch {
    // ignore
  }
}

export function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }
    const obj = parsed as Record<string, unknown>;
    const rawSpeed = obj.playbackSpeed;
    const validSpeed =
      typeof rawSpeed === 'number' && Number.isFinite(rawSpeed) && rawSpeed >= 0.25 && rawSpeed <= 4
        ? rawSpeed
        : DEFAULT_SETTINGS.playbackSpeed;

    return {
      soundEnabled:
        typeof obj.soundEnabled === 'boolean' ? obj.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      narrationEnabled:
        typeof obj.narrationEnabled === 'boolean'
          ? obj.narrationEnabled
          : DEFAULT_SETTINGS.narrationEnabled,
      focusMode: typeof obj.focusMode === 'boolean' ? obj.focusMode : DEFAULT_SETTINGS.focusMode,
      show3DArrows:
        typeof obj.show3DArrows === 'boolean' ? obj.show3DArrows : DEFAULT_SETTINGS.show3DArrows,
      show2DNet: typeof obj.show2DNet === 'boolean' ? obj.show2DNet : DEFAULT_SETTINGS.show2DNet,
      playbackSpeed: validSpeed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function formatTimeMs(ms: number): string {
  if (!Number.isFinite(ms)) return 'DNF';
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  const csStr = centiseconds.toString().padStart(2, '0');
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${csStr}`;
  }
  return `${seconds}.${csStr}s`;
}

/**
 * Calculates WCA Average of 5 (Ao5) from the most recent 5 solves:
 * - Applies optional +2 (2000ms) or DNF penalties
 * - Truncates individual solve times to centiseconds (10ms)
 * - Drops the fastest and slowest, averages the middle 3, and rounds to nearest centisecond
 * - Returns null if fewer than 5 solves, or 'DNF' if 2+ solves in the window are DNF
 */
export function computeAo5(records: SolveRecord[]): number | 'DNF' | null {
  if (records.length < 5) return null;
  const recent5 = records.slice(0, 5).map((r) => {
    if (r.penalty === 'DNF' || !Number.isFinite(r.timeMs) || r.timeMs < 0) {
      return Number.POSITIVE_INFINITY;
    }
    const effectiveMs = r.timeMs + (r.penalty === '+2' ? 2000 : 0);
    return Math.floor(effectiveMs / 10) * 10;
  });
  recent5.sort((a, b) => a - b);
  if (!Number.isFinite(recent5[3])) {
    return 'DNF';
  }
  const middle3Mean = (recent5[1] + recent5[2] + recent5[3]) / 3;
  return Math.round(middle3Mean / 10) * 10;
}
