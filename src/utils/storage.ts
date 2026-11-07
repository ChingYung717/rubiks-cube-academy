export const MAX_SOLVE_RECORDS = 50;
export const MAX_SOLVE_ID_LENGTH = 128;
export const MAX_SCRAMBLE_LENGTH = 512;
export const MAX_SCRAMBLE_TOKENS = 100;
export const MAX_CREATED_AT_LENGTH = 64;
export const MAX_SOLVE_TIME_MS = 86_400_000;
export const MAX_SOLVE_MOVE_COUNT = 10_000;
export const MAX_COMPLETED_LESSONS = 100;
export const STORAGE_SCHEMA_VERSION = 1;

export const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export type SolvePenalty = 'none' | '+2' | 'DNF';

export interface SolveRecord {
  id: string;
  timeMs: number;
  scramble: string;
  createdAt: string;
  moveCount: number;
  penalty?: SolvePenalty;
}

export interface SolveStats {
  totalSolves: number;
  bestTimeMs: number | null;
}

export interface SolveSaveResult {
  ok: boolean;
  records: SolveRecord[];
  stats: SolveStats;
  error: string | null;
}

interface PersistedWindowEntry {
  id: string;
  timeMs: number;
  effectiveTimeMs: number | null;
  countable: boolean;
}

interface PersistedSolveStats extends SolveStats {
  version: number;
  archivedCount: number;
  archivedBestTimeMs: number | null;
  recentIds?: string[];
  recentEntries?: PersistedWindowEntry[];
  lastEvictedSig?: string;
}

export interface PersistedSettings {
  soundEnabled: boolean;
  narrationEnabled: boolean;
  focusMode: boolean;
  show3DArrows: boolean;
  show2DNet: boolean;
  playbackSpeed: PlaybackSpeed;
}

const KEYS = {
  COMPLETED_LESSONS: 'cubelab_completed_lessons_v1',
  SOLVE_RECORDS: 'cubelab_solve_records_v1',
  SOLVE_STATS: 'cubelab_solve_stats_v1',
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

let lastStorageSaveError: string | null = null;

export function getLastStorageSaveError(): string | null {
  return lastStorageSaveError;
}

export function clearLastStorageSaveError(): void {
  lastStorageSaveError = null;
}

export function isValidPlaybackSpeed(val: unknown): val is PlaybackSpeed {
  return typeof val === 'number' && (PLAYBACK_SPEEDS as readonly number[]).includes(val);
}

const TIME_STRING_RE =
  /^(?:(?:上午|下午|凌晨|早上|清晨|中午|傍晚|晚上|AM|PM|am|pm)\s*)?(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*(?:AM|PM|am|pm))?$/;
const ISO_DATE_PREFIX_RE =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const SCRAMBLE_TOKEN_RE = /^(?:[RLUDFBMESxyz]|[RLUDFB]w|[rludfb])(?:2['’′]?|['’′]2|['’′])?$/;

export function isValidCreatedAt(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || value.length > MAX_CREATED_AT_LENGTH) return false;
  if (/[\u0000-\u001f]/.test(value)) return false;
  if (TIME_STRING_RE.test(trimmed)) return true;
  if (ISO_DATE_PREFIX_RE.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed);
  }
  return false;
}

export function isValidScramble(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length > MAX_SCRAMBLE_LENGTH) return false;
  if (/[\u0000-\u001f]/.test(value)) return false;
  const trimmed = value.trim();
  if (!trimmed) return true;
  const tokens = trimmed.split(/\s+/);
  if (tokens.length > MAX_SCRAMBLE_TOKENS) return false;
  return tokens.every((tok) => SCRAMBLE_TOKEN_RE.test(tok));
}

export function isValidSolveRecord(item: unknown): item is SolveRecord {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
  const r = item as Record<string, unknown>;
  if (r.version !== undefined && r.version !== STORAGE_SCHEMA_VERSION) return false;
  if (
    typeof r.id !== 'string' ||
    !r.id.trim() ||
    r.id.length > MAX_SOLVE_ID_LENGTH ||
    /[\u0000-\u001f]/.test(r.id)
  ) {
    return false;
  }
  if (
    typeof r.timeMs !== 'number' ||
    !Number.isFinite(r.timeMs) ||
    r.timeMs <= 0 ||
    r.timeMs > MAX_SOLVE_TIME_MS
  ) {
    return false;
  }
  if (!isValidScramble(r.scramble)) return false;
  if (!isValidCreatedAt(r.createdAt)) return false;
  if (
    typeof r.moveCount !== 'number' ||
    !Number.isInteger(r.moveCount) ||
    r.moveCount < 0 ||
    r.moveCount > MAX_SOLVE_MOVE_COUNT
  ) {
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

export function getEffectiveSolveTimeMs(record: SolveRecord): number | null {
  if (record.moveCount <= 0 || record.penalty === 'DNF') return null;
  if (!Number.isFinite(record.timeMs) || !(record.timeMs >= 0)) return null;
  return record.timeMs + (record.penalty === '+2' ? 2000 : 0);
}

function minNonNull(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function computeWindowStats(records: SolveRecord[]): {
  countableSolves: number;
  bestTimeMs: number | null;
} {
  let countableSolves = 0;
  let bestTimeMs: number | null = null;
  for (const r of records) {
    if (r.moveCount > 0) {
      countableSolves += 1;
      const eff = getEffectiveSolveTimeMs(r);
      if (eff !== null) {
        bestTimeMs = minNonNull(bestTimeMs, eff);
      }
    }
  }
  return { countableSolves, bestTimeMs };
}

function isValidPersistedWindowEntry(item: unknown): item is PersistedWindowEntry {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
  const e = item as Record<string, unknown>;
  if (typeof e.id !== 'string' || !e.id.trim() || e.id.length > MAX_SOLVE_ID_LENGTH) return false;
  if (typeof e.timeMs !== 'number' || !Number.isFinite(e.timeMs) || e.timeMs < 0) return false;
  if (
    e.effectiveTimeMs !== null &&
    (typeof e.effectiveTimeMs !== 'number' ||
      !Number.isFinite(e.effectiveTimeMs) ||
      e.effectiveTimeMs < 0)
  ) {
    return false;
  }
  if (typeof e.countable !== 'boolean') return false;
  return true;
}

function readRawSolveRecords(): SolveRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.SOLVE_RECORDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 1000).filter(isValidSolveRecord);
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const env = parsed as Record<string, unknown>;
      if (
        (env.version === undefined || env.version === STORAGE_SCHEMA_VERSION) &&
        Array.isArray(env.records)
      ) {
        return env.records.slice(0, 1000).filter(isValidSolveRecord);
      }
    }
    return [];
  } catch {
    return [];
  }
}

function readRawPersistedStats(recentRecords: SolveRecord[]): PersistedSolveStats {
  const windowStats = computeWindowStats(recentRecords);
  const fallbackStats = (): PersistedSolveStats => ({
    version: STORAGE_SCHEMA_VERSION,
    totalSolves: windowStats.countableSolves,
    bestTimeMs: windowStats.bestTimeMs,
    archivedCount: 0,
    archivedBestTimeMs: null,
  });

  try {
    const raw = localStorage.getItem(KEYS.SOLVE_STATS);
    if (!raw) {
      return fallbackStats();
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return fallbackStats();
    }
    const obj = parsed as Record<string, unknown>;
    if (obj.version !== undefined && obj.version !== STORAGE_SCHEMA_VERSION) {
      return fallbackStats();
    }

    const recentIds = Array.isArray(obj.recentIds)
      ? obj.recentIds.filter(
          (id): id is string =>
            typeof id === 'string' && id.trim().length > 0 && id.length <= MAX_SOLVE_ID_LENGTH
        )
      : undefined;
    const recentEntries = Array.isArray(obj.recentEntries)
      ? obj.recentEntries.filter(isValidPersistedWindowEntry)
      : undefined;
    const lastEvictedSig =
      typeof obj.lastEvictedSig === 'string' && obj.lastEvictedSig.length <= 2048
        ? obj.lastEvictedSig
        : undefined;

    const rawTotal =
      typeof obj.totalSolves === 'number' &&
      Number.isFinite(obj.totalSolves) &&
      obj.totalSolves >= 0
        ? Math.floor(obj.totalSolves)
        : windowStats.countableSolves;
    const rawBest =
      typeof obj.bestTimeMs === 'number' &&
      Number.isFinite(obj.bestTimeMs) &&
      obj.bestTimeMs >= 0
        ? obj.bestTimeMs
        : null;
    const hasExplicitArchive =
      typeof obj.archivedCount === 'number' &&
      Number.isFinite(obj.archivedCount) &&
      obj.archivedCount >= 0;
    let archivedCount = hasExplicitArchive
      ? Math.floor(obj.archivedCount as number)
      : Math.max(0, rawTotal - windowStats.countableSolves);
    let archivedBestTimeMs =
      typeof obj.archivedBestTimeMs === 'number' &&
      Number.isFinite(obj.archivedBestTimeMs) &&
      obj.archivedBestTimeMs >= 0
        ? obj.archivedBestTimeMs
        : !hasExplicitArchive
          ? rawBest
          : null;

    if (recentEntries !== undefined && recentEntries.length === MAX_SOLVE_RECORDS) {
      const exactMatch =
        recentRecords.length === MAX_SOLVE_RECORDS &&
        recentRecords.every(
          (r, idx) => r.id === recentEntries[idx].id && r.timeMs === recentEntries[idx].timeMs
        );
      if (!exactMatch) {
        // Check if recentRecords is a k-step forward window shift where SOLVE_STATS write failed
        let shiftK = -1;
        if (recentRecords.length === MAX_SOLVE_RECORDS) {
          for (let k = 1; k < MAX_SOLVE_RECORDS; k++) {
            const overlapMatches = recentRecords
              .slice(k)
              .every(
                (r, idx) =>
                  r.id === recentEntries[idx].id && r.timeMs === recentEntries[idx].timeMs
              );
            if (overlapMatches) {
              shiftK = k;
              break;
            }
          }
        }
        if (shiftK > 0) {
          const shiftedEntries = recentEntries.slice(MAX_SOLVE_RECORDS - shiftK);
          for (const ev of shiftedEntries) {
            if (ev.countable) {
              archivedCount += 1;
              if (ev.effectiveTimeMs !== null) {
                archivedBestTimeMs = minNonNull(archivedBestTimeMs, ev.effectiveTimeMs);
              }
            }
          }
          const reconciledIds = recentRecords.map((r) => r.id);
          const reconciledEntries: PersistedWindowEntry[] = recentRecords.map((r) => ({
            id: r.id,
            timeMs: r.timeMs,
            effectiveTimeMs: getEffectiveSolveTimeMs(r),
            countable: r.moveCount > 0,
          }));
          const reconciledSig = shiftedEntries.map((ev) => `${ev.id}:${ev.timeMs}`).join('|');
          return {
            version: STORAGE_SCHEMA_VERSION,
            totalSolves: archivedCount + windowStats.countableSolves,
            bestTimeMs: minNonNull(archivedBestTimeMs, windowStats.bestTimeMs),
            archivedCount,
            archivedBestTimeMs,
            recentIds: reconciledIds,
            recentEntries: reconciledEntries,
            lastEvictedSig: reconciledSig,
          };
        } else {
          return {
            ...fallbackStats(),
            recentIds,
            recentEntries,
          };
        }
      }
    } else if (recentIds !== undefined) {
      const matchesWindow =
        recentRecords.length === MAX_SOLVE_RECORDS &&
        recentIds.length === recentRecords.length &&
        recentRecords.every((r, idx) => r.id === recentIds[idx]);
      if (!matchesWindow) {
        return {
          ...fallbackStats(),
          recentIds,
        };
      }
    } else if (recentRecords.length < MAX_SOLVE_RECORDS) {
      return fallbackStats();
    }

    return {
      version: STORAGE_SCHEMA_VERSION,
      totalSolves: archivedCount + windowStats.countableSolves,
      bestTimeMs: minNonNull(archivedBestTimeMs, windowStats.bestTimeMs),
      archivedCount,
      archivedBestTimeMs,
      recentIds,
      recentEntries,
      lastEvictedSig,
    };
  } catch {
    return fallbackStats();
  }
}

export function loadCompletedLessons(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.COMPLETED_LESSONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (id): id is string =>
              typeof id === 'string' &&
              id.trim().length > 0 &&
              id.length <= MAX_SOLVE_ID_LENGTH &&
              !/[\u0000-\u001f]/.test(id)
          )
          .slice(0, MAX_COMPLETED_LESSONS)
      : [];
  } catch {
    return [];
  }
}

export function saveCompletedLessons(lessonIds: string[]): boolean {
  try {
    const validIds = Array.from(
      new Set(
        lessonIds.filter(
          (id) =>
            typeof id === 'string' &&
            id.trim().length > 0 &&
            id.length <= MAX_SOLVE_ID_LENGTH &&
            !/[\u0000-\u001f]/.test(id)
        )
      )
    ).slice(0, MAX_COMPLETED_LESSONS);
    localStorage.setItem(KEYS.COMPLETED_LESSONS, JSON.stringify(validIds));
    lastStorageSaveError = null;
    return true;
  } catch (err) {
    lastStorageSaveError =
      err instanceof Error && err.message
        ? `未保存：课程进度写入失败（${err.message}）`
        : '未保存：课程进度写入失败';
    return false;
  }
}

export function loadSolveRecords(): SolveRecord[] {
  const rawRecords = readRawSolveRecords();
  if (rawRecords.length > MAX_SOLVE_RECORDS) {
    return saveSolveRecords(rawRecords);
  }
  return rawRecords;
}

function isSameSolveIdentity(a: SolveRecord, b: SolveRecord): boolean {
  return (
    a.id === b.id &&
    a.timeMs === b.timeMs &&
    a.scramble === b.scramble &&
    a.moveCount === b.moveCount
  );
}

export function saveSolveRecordsWithStatus(records: SolveRecord[]): SolveSaveResult {
  const valid = Array.isArray(records) ? records.filter(isValidSolveRecord) : [];

  let prevRawRecords: string | null = null;
  try {
    prevRawRecords = localStorage.getItem(KEYS.SOLVE_RECORDS);
  } catch {
    prevRawRecords = null;
  }

  const prevStored = readRawSolveRecords();
  const prevStats = readRawPersistedStats(prevStored);

  let recent: SolveRecord[] = valid.slice(0, MAX_SOLVE_RECORDS);
  let newlyEvicted: SolveRecord[] = valid.slice(MAX_SOLVE_RECORDS);
  const directEvictedSig = newlyEvicted.map((r) => `${r.id}:${r.timeMs}`).join('|');

  const topMatchesPrevWindow =
    prevStored.length === MAX_SOLVE_RECORDS &&
    valid.length >= MAX_SOLVE_RECORDS &&
    prevStored.every((p, idx) => isSameSolveIdentity(valid[idx], p));

  const isSameWindowUpdate = topMatchesPrevWindow && newlyEvicted.length === 0;
  const isIdempotentRepeat =
    topMatchesPrevWindow &&
    newlyEvicted.length > 0 &&
    prevStats.lastEvictedSig !== undefined &&
    prevStats.lastEvictedSig === directEvictedSig;

  let alignedShiftK = -1;
  if (
    !isSameWindowUpdate &&
    !isIdempotentRepeat &&
    valid.length > 0 &&
    prevStored.length > 0 &&
    prevStored.length <= MAX_SOLVE_RECORDS
  ) {
    for (let k = 0; k < valid.length; k++) {
      const overlapLen = Math.min(valid.length - k, prevStored.length);
      if (overlapLen <= 0) break;
      let matches = true;
      for (let idx = 0; idx < overlapLen; idx++) {
        if (!isSameSolveIdentity(valid[k + idx], prevStored[idx])) {
          matches = false;
          break;
        }
      }
      if (matches) {
        alignedShiftK = k;
        break;
      }
    }
  }

  if (alignedShiftK >= 0) {
    const mergedPrev = prevStored.map((p, idx) =>
      alignedShiftK + idx < valid.length ? valid[alignedShiftK + idx] : p
    );
    const trailingFromValid =
      alignedShiftK + prevStored.length < valid.length
        ? valid.slice(alignedShiftK + prevStored.length)
        : [];
    const combined = [...valid.slice(0, alignedShiftK), ...mergedPrev, ...trailingFromValid];
    recent = combined.slice(0, MAX_SOLVE_RECORDS);
    newlyEvicted = combined.slice(MAX_SOLVE_RECORDS);
  }

  const sharesHistoryWithPrev =
    isSameWindowUpdate || isIdempotentRepeat || alignedShiftK >= 0;

  let archivedCount = sharesHistoryWithPrev ? prevStats.archivedCount : 0;
  let archivedBestTimeMs = sharesHistoryWithPrev ? prevStats.archivedBestTimeMs : null;

  if (!isIdempotentRepeat) {
    for (const r of newlyEvicted) {
      if (r.moveCount > 0) {
        archivedCount += 1;
        const eff = getEffectiveSolveTimeMs(r);
        if (eff !== null) {
          archivedBestTimeMs = minNonNull(archivedBestTimeMs, eff);
        }
      }
    }
  }

  const evictedSig = newlyEvicted.map((r) => `${r.id}:${r.timeMs}`).join('|');
  const windowStats = computeWindowStats(recent);
  const nextLastEvictedSig =
    newlyEvicted.length > 0
      ? evictedSig
      : isIdempotentRepeat
        ? directEvictedSig
        : isSameWindowUpdate || alignedShiftK === 0
          ? prevStats.lastEvictedSig
          : undefined;

  const nextStats: PersistedSolveStats = {
    version: STORAGE_SCHEMA_VERSION,
    totalSolves: archivedCount + windowStats.countableSolves,
    bestTimeMs: minNonNull(archivedBestTimeMs, windowStats.bestTimeMs),
    archivedCount,
    archivedBestTimeMs,
    recentIds: recent.map((r) => r.id),
    recentEntries: recent.map((r) => ({
      id: r.id,
      timeMs: r.timeMs,
      effectiveTimeMs: getEffectiveSolveTimeMs(r),
      countable: r.moveCount > 0,
    })),
    ...(nextLastEvictedSig !== undefined ? { lastEvictedSig: nextLastEvictedSig } : {}),
  };

  const serializedRecent = JSON.stringify(recent);
  const serializedStats = JSON.stringify(nextStats);
  let firstWriteDone = false;

  try {
    localStorage.setItem(KEYS.SOLVE_RECORDS, serializedRecent);
    firstWriteDone = true;
    localStorage.setItem(KEYS.SOLVE_STATS, serializedStats);
    lastStorageSaveError = null;
    return {
      ok: true,
      records: recent,
      stats: {
        totalSolves: nextStats.totalSolves,
        bestTimeMs: nextStats.bestTimeMs,
      },
      error: null,
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error && err.message
        ? `未保存：本地存储写入失败（${err.message}）`
        : '未保存：本地存储空间不足或受限';
    lastStorageSaveError = errorMsg;
    if (firstWriteDone) {
      try {
        if (prevRawRecords === null) {
          localStorage.removeItem?.(KEYS.SOLVE_RECORDS);
        } else {
          localStorage.setItem(KEYS.SOLVE_RECORDS, prevRawRecords);
        }
      } catch {
        // If rollback also fails, readRawPersistedStats reconciles the forward shift via recentEntries
      }
    }
    return {
      ok: false,
      records: recent,
      stats: {
        totalSolves: nextStats.totalSolves,
        bestTimeMs: nextStats.bestTimeMs,
      },
      error: errorMsg,
    };
  }
}

export function saveSolveRecords(records: SolveRecord[]): SolveRecord[] {
  return saveSolveRecordsWithStatus(records).records;
}

export function loadSolveStats(): SolveStats {
  const rawRecords = readRawSolveRecords();
  if (rawRecords.length > MAX_SOLVE_RECORDS) {
    const res = saveSolveRecordsWithStatus(rawRecords);
    if (res.ok) {
      const stats = readRawPersistedStats(res.records);
      return {
        totalSolves: stats.totalSolves,
        bestTimeMs: stats.bestTimeMs,
      };
    }
    return res.stats;
  }
  const stats = readRawPersistedStats(rawRecords);
  return {
    totalSolves: stats.totalSolves,
    bestTimeMs: stats.bestTimeMs,
  };
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
    if (obj.version !== undefined && obj.version !== STORAGE_SCHEMA_VERSION) {
      return { ...DEFAULT_SETTINGS };
    }
    const validSpeed: PlaybackSpeed = isValidPlaybackSpeed(obj.playbackSpeed)
      ? obj.playbackSpeed
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

export function saveSettings(settings: PersistedSettings): boolean {
  try {
    const normalized: PersistedSettings & { version: number } = {
      version: STORAGE_SCHEMA_VERSION,
      soundEnabled: Boolean(settings.soundEnabled),
      narrationEnabled: Boolean(settings.narrationEnabled),
      focusMode: Boolean(settings.focusMode),
      show3DArrows: Boolean(settings.show3DArrows),
      show2DNet: Boolean(settings.show2DNet),
      playbackSpeed: isValidPlaybackSpeed(settings.playbackSpeed)
        ? settings.playbackSpeed
        : DEFAULT_SETTINGS.playbackSpeed,
    };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(normalized));
    lastStorageSaveError = null;
    return true;
  } catch (err) {
    lastStorageSaveError =
      err instanceof Error && err.message
        ? `未保存：设置写入失败（${err.message}）`
        : '未保存：设置写入失败';
    return false;
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
