/**
 * Turns stored rows into the §11.2 snapshot fields that describe history.
 *
 * §11.2's warning is the reason this file exists: the danger in leaving these
 * derivations out of the core "is not a wrong dose but the repair an
 * implementer reaches for — computing provenance in the shell at render time,
 * which puts safety-display logic outside the tested core."
 *
 * Every function is pure and takes `nowMs` as data (§7.6).
 */

import {
  CLOCK_SKEW_TOLERANCE_HOURS,
  KETONE_ADVISORY,
  MS_PER_HOUR,
} from '../config.js';
import { localDayKey } from './calendar.js';
import { deriveCarbBaseline } from './baseline.js';
import { isInjection } from './types.js';
import type { HistoryProvenance, Injection, LastDose, LogRow, Reading } from './types.js';

const SKEW_TOLERANCE_MS = CLOCK_SKEW_TOLERANCE_HOURS * MS_PER_HOUR;

/** §7.6 — below -1 h elapsed is implausibly future-dated. */
export function isImplausiblyFutureDated(timestamp: number, nowMs: number): boolean {
  return nowMs - timestamp < -SKEW_TOLERANCE_MS;
}

/**
 * §10.5, and it reads BOTH STORES — the contradiction resolved in v10.
 *
 * v9 specified this twice and incompatibly: §10.5's formula said log-only,
 * while §7.8, §4.3 step 1 and two §13.3 cases said both stores. That is
 * contradictory oracles for the same required test — a standalone 280 reading
 * at breakfast followed by the day's first calculated result at lunch demands
 * FULL under one and COMPACT under the other — in the one warning this plan
 * calls capable of catching ketoacidosis.
 *
 * @param excludeId §10.5 v11 — `firstToday` is evaluated EXCLUDING the row
 *   being committed, or the breakfast 280 renders compact for itself.
 */
export function deriveBandEFullCardShownToday(
  rows: readonly LogRow[],
  readings: readonly Reading[],
  nowMs: number,
  timeZone: string,
  excludeId?: string,
): boolean {
  const today = localDayKey(nowMs, timeZone);

  // Stryker disable all: the null check below changes no RESULT, because
  // `null >= 250` coerces to `0 >= 250`. It stays because that coercion is the
  // one §4.1 exists to refuse — a rule that holds only where it happens to be
  // observable is not a rule.
  const qualifyingInLog = rows.filter(isInjection).some(
    (row) =>
      row.id !== excludeId &&
      row.bloodSugar !== null &&
      row.bloodSugar >= KETONE_ADVISORY &&
      localDayKey(row.timestamp, timeZone) === today,
  );
  // Stryker restore all
  if (qualifyingInLog) return true;

  // §10.5's second ruling, forced by "both stores": recording a reading at or
  // above 250 shows the band E advisory ITSELF. Otherwise the day's first
  // calculated result could render compact on a day when no full card was ever
  // shown, and this flag would assert something false.
  return readings.some(
    (reading) =>
      reading.id !== excludeId &&
      reading.bloodSugar >= KETONE_ADVISORY &&
      localDayKey(reading.timestamp, timeZone) === today,
  );
}

export interface DerivedHistory {
  readonly lastDose: LastDose | null;
  readonly historyProvenance: HistoryProvenance;
  readonly excludedTimeRecords: number;
  readonly carbBaseline: number | null;
  readonly eligibleEntryCount: number;
}

export interface HistoryContext {
  readonly nowMs: number;
  /** When this install first ran. A log whose newest row predates it is suspect. */
  readonly installedAtMs: number;
  /** When history was last imported, or null if it never was. */
  readonly lastImportAtMs: number | null;
  /** When this install last wrote a row itself, or null. */
  readonly lastLocalWriteAtMs: number | null;
}

function mostRecentUsableInjection(
  rows: readonly LogRow[],
  nowMs: number,
): Injection | null {
  let best: Injection | null = null;
  for (const row of rows) {
    if (!isInjection(row)) continue;
    if (isImplausiblyFutureDated(row.timestamp, nowMs)) continue;
    if (best === null || row.timestamp > best.timestamp) best = row;
  }
  return best;
}

/**
 * §7.5 — "no usable recent record" must never silently assert "no recent
 * insulin". A backup from yesterday passes every schema, type and range check
 * while omitting an injection from an hour ago.
 *
 * The four suspect conditions §7.5 names: an empty log, a log predating the
 * app's own install, history just imported, or a row excluded by §7.6.
 */
export function deriveHistory(
  rows: readonly LogRow[],
  context: HistoryContext,
): DerivedHistory {
  const injections = rows.filter(isInjection);
  const excludedTimeRecords = injections.filter((row) =>
    isImplausiblyFutureDated(row.timestamp, context.nowMs),
  ).length;

  const newest = mostRecentUsableInjection(rows, context.nowMs);
  const lastDose: LastDose | null =
    newest === null ? null : { injectedHundredths: newest.injectedUnits, atMs: newest.timestamp };

  const logIsEmpty = injections.length === 0;
  const predatesInstall = newest !== null && newest.timestamp < context.installedAtMs;
  // Stryker disable all: the `=== null` half is not separately observable —
  // `null < someTimestamp` coerces to `0 < timestamp`, true for every real clock
  // value, so the comparison alone gives the same answer. Written out because
  // §4.1 forbids relying on that coercion.
  const justImported =
    context.lastImportAtMs !== null &&
    (context.lastLocalWriteAtMs === null || context.lastLocalWriteAtMs < context.lastImportAtMs);
  // Stryker restore all

  const historyProvenance: HistoryProvenance =
    logIsEmpty || predatesInstall || justImported || excludedTimeRecords > 0
      ? 'suspect'
      : 'trusted';

  const { carbBaseline, eligibleEntryCount } = deriveCarbBaseline(rows);

  return { lastDose, historyProvenance, excludedTimeRecords, carbBaseline, eligibleEntryCount };
}

/**
 * §7.3 — every count the user is shown excludes tombstones. He deleted those
 * rows already, and §7.9's "delete 67 entries" must not count them.
 */
export function countDisplayableRows(rows: readonly LogRow[]): number {
  return rows.filter(isInjection).length;
}

/** §7.9 — is there a row inside the delete-confirmation window? */
export function hasRowInsideWindow(
  rows: readonly LogRow[],
  nowMs: number,
  windowHours: number,
): boolean {
  const cutoff = nowMs - windowHours * MS_PER_HOUR;
  return rows
    .filter(isInjection)
    .some((row) => row.timestamp >= cutoff && !isImplausiblyFutureDated(row.timestamp, nowMs));
}
