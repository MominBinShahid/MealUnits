/**
 * §7.7.1 — the readable export's grouping, which §13.1 puts inside the tested
 * core for a stated reason: "it decides what produced what, which is the same
 * claim §7.7's row stamp exists to make truthfully... Left in the rendering
 * layer it would be the one attribution decision in the app with no tests, in
 * the document handed to a clinician."
 *
 * A flat date-sorted table would print every historical row under today's
 * ratios — the exact false claim v9 was corrected to remove. Grouping by
 * prescription period resolves it structurally, so the document CANNOT
 * misstate what produced a row.
 */

import { isInjection } from './types.js';
import type { Injection, LogRow, Reading, RoundingMode } from './types.js';

/**
 * A row of `settingsHistory` (§11.3), plus one field that store does not have.
 *
 * `imported` is LOCAL PROVENANCE. It is set when an import appends the row and
 * is never read from the file, because a file cannot say whether a prescription
 * was ever in force on THIS install — which is precisely the question §7.7.1's
 * timeline rule asks. See BUILD-NOTES.md for why the schema needed it.
 */
export interface SettingsPeriod {
  readonly revision: number;
  readonly changedAtMs: number;
  readonly target: number;
  readonly isf: number;
  readonly icr: number;
  readonly mode: RoundingMode;
  readonly imported: boolean;
}

export interface PeriodGroup {
  /** null for the group holding rows no prescription can account for. */
  readonly period: SettingsPeriod | null;
  readonly startMs: number | null;
  /** null for the open-ended final period. */
  readonly endMs: number | null;
  readonly doses: readonly Injection[];
  readonly readings: readonly Reading[];
}

/**
 * Periods are ordered by `changedAtMs`, NOT by revision key — fixed in v23
 * after both reviewers traced the same failure.
 *
 * §7.7 appends imported history at `max(local) + 1` while §11.3 keeps the other
 * install's `changedAtMs`. Run §1.2's own storage-loss flow — re-enter the
 * settings by hand (local revisions 1..k, today's timestamps), then import the
 * backup (k+1..k+n, last year's timestamps) — and the key order is
 * `1..k` (recent) then `k+1..k+n` (old). Period k then spans [recent, old),
 * which is empty, and period k+n is the open-ended one and swallows the
 * present. Every reading he records from that moment on prints under an
 * imported prescription from another install.
 */
function byChangedAt(a: SettingsPeriod, b: SettingsPeriod): number {
  if (a.changedAtMs !== b.changedAtMs) return a.changedAtMs - b.changedAtMs;
  // A stable tiebreak, so two commits in the same millisecond do not reorder
  // between renders.
  return a.revision - b.revision;
}

interface Bounded {
  readonly period: SettingsPeriod;
  readonly startMs: number;
  readonly endMs: number | null;
}

function bound(periods: readonly SettingsPeriod[]): Bounded[] {
  const ordered = periods.slice().sort(byChangedAt);
  return ordered.map((period, index) => ({
    period,
    startMs: period.changedAtMs,
    endMs: ordered[index + 1]?.changedAtMs ?? null,
  }));
}

function contains(bounded: Bounded, timestamp: number): boolean {
  if (timestamp < bounded.startMs) return false;
  return bounded.endMs === null || timestamp < bounded.endMs;
}

/**
 * §7.7.1 — doses and readings are placed by DIFFERENT rules, and v21's example
 * quietly assumed one rule for both.
 *
 * | A dose    | its STAMP (§11.3's ROW STAMP) — authoritative, never re-derived
 * |           |   from its timestamp
 * | A reading | its TIMESTAMP falling inside the period's date range
 *
 * §7.8's reading row carries no `settingsRevision`, and that is deliberate: a
 * reading enters no calculation, so no settings produced it. Stamping one with
 * the ratios in force would attach §7.7's attribution claim — *these settings
 * produced this row* — to a row nothing produced.
 */
export function groupByPrescriptionPeriod(
  history: readonly SettingsPeriod[],
  rows: readonly LogRow[],
  readings: readonly Reading[],
): PeriodGroup[] {
  const all = bound(history);
  // §7.7.1 v24 — the timeline is built from revisions that were IN FORCE ON
  // THIS INSTALL. §7.7 is explicit that import PROPOSES settings rather than
  // adopting them, so an imported revision was in force on the other phone and
  // never on this one. Without this, an imported revision whose `changedAtMs`
  // is later than the locally in-force one would capture readings recorded
  // after the import, under a prescription this install never adopted.
  const local = bound(history.filter((period) => !period.imported));

  const doses = new Map<number, Injection[]>();
  const readingsByRevision = new Map<number, Reading[]>();
  const orphanDoses: Injection[] = [];
  const orphanReadings: Reading[] = [];

  for (const row of rows) {
    // §7.3 — a tombstone is excluded from every count the user is shown, and
    // §7.7.1's per-period totals are one of the three §7.3 names.
    if (!isInjection(row)) continue;
    const known = history.some((period) => period.revision === row.settingsRevision);
    if (!known) {
      orphanDoses.push(row);
      continue;
    }
    const bucket = doses.get(row.settingsRevision) ?? [];
    bucket.push(row);
    doses.set(row.settingsRevision, bucket);
  }

  for (const reading of readings) {
    // Local periods first. A reading recorded on this install has a recent
    // timestamp and lands in the locally in-force period, whatever an imported
    // period's `changedAtMs` claims.
    const localMatch = local.find((bounded) => contains(bounded, reading.timestamp));
    // Then the imported ones, which bound only the readings that arrived with
    // the import — those carry the other install's older timestamps.
    const anyMatch = localMatch ?? all.find((bounded) => contains(bounded, reading.timestamp));
    if (!anyMatch) {
      // §7.7.1 — a reading outside every period gets its OWN LABELLED GROUP,
      // never the nearest one. It should be unreachable, since §1.2 makes
      // settings mandatory before anything is recordable, but the import path
      // remaps revisions across installs and a rendering that silently attaches
      // an unplaceable row to an adjacent prescription is back to inventing
      // attribution. Visible and odd beats invisible and wrong.
      orphanReadings.push(reading);
      continue;
    }
    const key = anyMatch.period.revision;
    const bucket = readingsByRevision.get(key) ?? [];
    bucket.push(reading);
    readingsByRevision.set(key, bucket);
  }

  const groups: PeriodGroup[] = all.map((bounded) => ({
    period: bounded.period,
    startMs: bounded.startMs,
    endMs: bounded.endMs,
    // The buckets are built here, so sorting them in place cannot reach the
    // caller's arrays — the copies were made when the rows were bucketed.
    doses: (doses.get(bounded.period.revision) ?? []).sort((a, b) => a.timestamp - b.timestamp),
    readings: (readingsByRevision.get(bounded.period.revision) ?? []).sort(
      (a, b) => a.timestamp - b.timestamp,
    ),
  }));

  if (orphanDoses.length > 0 || orphanReadings.length > 0) {
    groups.push({
      period: null,
      startMs: null,
      endMs: null,
      doses: orphanDoses.sort((a, b) => a.timestamp - b.timestamp),
      readings: orphanReadings.sort((a, b) => a.timestamp - b.timestamp),
    });
  }

  return groups;
}

/** §7.7.1's per-period counts, which exclude tombstones by construction above. */
export function countsFor(group: PeriodGroup): { doses: number; readings: number } {
  return { doses: group.doses.length, readings: group.readings.length };
}
