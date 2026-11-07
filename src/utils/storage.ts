export interface SolveRecord {
  id: string;
  timeMs: number;
  scramble: string;
  createdAt: string;
  moveCount: number;
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

export function loadCompletedLessons(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.COMPLETED_LESSONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
    return Array.isArray(parsed) ? parsed : [];
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
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
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
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  const csStr = centiseconds.toString().padStart(2, '0');
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${csStr}`;
  }
  return `${seconds}.${csStr}s`;
}

/**
 * Calculates WCA Average of 5 (Ao5) from the most recent 5 solves:
 * drops the fastest and slowest, averages the middle 3.
 */
export function computeAo5(records: SolveRecord[]): number | null {
  if (records.length < 5) return null;
  const recent5 = records.slice(0, 5).map((r) => r.timeMs).sort((a, b) => a - b);
  const middle3Sum = recent5[1] + recent5[2] + recent5[3];
  return Math.round(middle3Sum / 3);
}
