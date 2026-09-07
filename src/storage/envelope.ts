/**
 * §7.7 — the export envelope, and §7.7's import rules, as pure functions over
 * plain data. The transaction that commits an import lives in `importer.ts`;
 * everything decided here is decided without a database, so it can be tested
 * against the compositions §13.3 names.
 */

import { RANGE, SCHEMA_VERSION, MAX_NAME_LENGTH } from '../config.js';
import { isTombstone } from '../core/types.js';
import type { Injection, LogRow, Reading, RoundingMode, Settings, Tombstone } from '../core/types.js';
import type { SettingsPeriod } from '../core/periods.js';

export interface ExportedSettingsHistory {
  readonly revision: number;
  readonly changedAtMs: number;
  readonly target: number;
  readonly isf: number;
  readonly icr: number;
  readonly mode: RoundingMode;
}

export interface Envelope {
  readonly schemaVersion: number;
  /**
   * §7.7 v14 — present and EXPLICITLY EMPTY when no settings have ever been
   * committed. v13's composed test exports from exactly that state and §7.7
   * specified the block unconditionally without saying what it holds, leaving
   * the test to a judgement call.
   */
  readonly settings: Omit<Settings, 'revision'> | Record<string, never>;
  /**
   * §6.7 — present ONLY when the state is `answered`. Absent for `unanswered`
   * and `declined`, and the STATE ITSELF is never exported: a refusal recorded on
   * one install should not silence a fresh one, and the cost is one re-ask after
   * a storage loss.
   */
  readonly dosingHistoryBeforeApp?: { readonly answeredAtMs: number; readonly text: string };
  /** §7.7 — read-only provenance. Never adopted, and `threshold` is deliberately absent. */
  readonly settingsHistory: readonly ExportedSettingsHistory[];
  readonly readings: readonly Reading[];
  /**
   * §7.7 v24 — `Injection | Tombstone`, discriminated by the presence of
   * `deleted`. v23 specified the tombstone and not the envelope, so a valid
   * exported tombstone lacked a field the importer required, on exactly the
   * restore path tombstones exist to protect.
   */
  readonly log: readonly LogRow[];
}

export interface ExportInput {
  readonly settings: Settings | null;
  readonly settingsHistory: readonly SettingsPeriod[];
  readonly log: readonly LogRow[];
  readonly readings: readonly Reading[];
  readonly dosingHistory: { readonly state: string; readonly text: string; readonly answeredAtMs: number | null };
}

export function buildEnvelope(input: ExportInput): Envelope {
  const settings: Envelope['settings'] =
    input.settings === null
      ? {}
      : {
          target: input.settings.target,
          isf: input.settings.isf,
          icr: input.settings.icr,
          mode: input.settings.mode,
          threshold: input.settings.threshold,
          basalName: input.settings.basalName,
          basalUnits: input.settings.basalUnits,
          basalTiming: input.settings.basalTiming,
          personName: input.settings.personName,
        };

  const envelope: Envelope = {
    schemaVersion: SCHEMA_VERSION,
    settings,
    // `imported` never travels: it is LOCAL provenance, and a file cannot say
    // whether a prescription was ever in force on the install reading it.
    settingsHistory: input.settingsHistory.map((period) => ({
      revision: period.revision,
      changedAtMs: period.changedAtMs,
      target: period.target,
      isf: period.isf,
      icr: period.icr,
      mode: period.mode,
    })),
    readings: input.readings,
    log: input.log,
  };

  if (input.dosingHistory.state === 'answered' && input.dosingHistory.answeredAtMs !== null) {
    return {
      ...envelope,
      dosingHistoryBeforeApp: {
        answeredAtMs: input.dosingHistory.answeredAtMs,
        text: input.dosingHistory.text,
      },
    };
  }
  return envelope;
}

// ─── import ─────────────────────────────────────────────────────────────────

export type ImportProblem =
  | { readonly kind: 'not_an_object' }
  | { readonly kind: 'future_schema'; readonly found: unknown }
  | { readonly kind: 'bad_shape'; readonly field: string };

export type ParsedEnvelope =
  | { readonly ok: true; readonly envelope: Envelope }
  | { readonly ok: false; readonly problem: ImportProblem };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function inHardRange(value: unknown, field: keyof typeof RANGE): value is number {
  if (!finiteNumber(value)) return false;
  const [lo, hi] = RANGE[field].hard;
  return value >= lo && value <= hi;
}

const MODES: readonly RoundingMode[] = ['nearest', 'half', 'ceil', 'floor', 'off'];

function readInjection(value: Record<string, unknown>): Injection | null {
  // §11.3 — RE-VALIDATE ON EVERY LOAD AND IMPORT: type, presence, finiteness,
  // precision, range. A row that fails is dropped rather than repaired, because
  // repairing it would invent a dose.
  const { id, timestamp, bloodSugar, carbs, units, injectedUnits, settingsRevision } = value;
  if (typeof id !== 'string' || id === '') return null;
  if (!finiteNumber(timestamp)) return null;
  if (bloodSugar !== null && !inHardRange(bloodSugar, 'bloodSugar')) return null;
  if (!inHardRange(carbs, 'carbs')) return null;
  if (!finiteNumber(units) || units < 0) return null;
  if (!finiteNumber(injectedUnits) || injectedUnits <= 0) return null;
  if (!finiteNumber(settingsRevision)) return null;
  const timingAdvice = value.timingAdvice;
  if (timingAdvice !== 'before' && timingAdvice !== 'eat_first' && timingAdvice !== 'suppressed') {
    return null;
  }
  return {
    id,
    timestamp,
    bloodSugar: bloodSugar === null ? null : bloodSugar,
    carbs,
    units,
    injectedUnits,
    settingsRevision,
    overrodeStacking: value.overrodeStacking === true,
    timingAdvice,
    advisoryFlagged: value.advisoryFlagged === true,
  };
}

function readTombstone(value: Record<string, unknown>): Tombstone | null {
  // §7.7 v24 — a tombstone is NOT validated against the prescription. "It
  // asserts an absence; there is nothing to range-check."
  const { id, timestamp, deletedAtMs } = value;
  if (typeof id !== 'string' || id === '') return null;
  if (!finiteNumber(timestamp) || !finiteNumber(deletedAtMs)) return null;
  return { id, timestamp, deleted: true, deletedAtMs };
}

function readReading(value: Record<string, unknown>): Reading | null {
  const { id, timestamp, bloodSugar, note } = value;
  if (typeof id !== 'string' || id === '') return null;
  if (!finiteNumber(timestamp)) return null;
  if (!inHardRange(bloodSugar, 'bloodSugar')) return null;
  // §7.8 — the note is one line FROM A FIXED LIST, which is why §7.7.1 can say
  // it is "already safe" for the readable export. An unrecognised value is
  // dropped rather than carried: a free-text note arriving through the import
  // path would silently make that sentence false.
  const notes: readonly Reading['note'][] = ['before_bed', 'overnight', 'felt_low', 'after_exercise'];
  const known = notes.find((candidate) => candidate === note);
  return known === undefined
    ? { id, timestamp, bloodSugar }
    : { id, timestamp, bloodSugar, note: known };
}

/**
 * §11.3 — import is VALIDATE BEFORE COMMIT. It rejects future schemas and
 * preserves existing data on failure, so a half-read file can never leave the
 * store in a state neither the old data nor the new one describes.
 */
export function parseEnvelope(raw: unknown): ParsedEnvelope {
  if (!isRecord(raw)) return { ok: false, problem: { kind: 'not_an_object' } };

  const schemaVersion = raw.schemaVersion;
  if (!Number.isInteger(schemaVersion)) {
    return { ok: false, problem: { kind: 'bad_shape', field: 'schemaVersion' } };
  }
  if ((schemaVersion as number) > SCHEMA_VERSION) {
    return { ok: false, problem: { kind: 'future_schema', found: schemaVersion } };
  }

  const settingsRaw = raw.settings;
  if (!isRecord(settingsRaw)) return { ok: false, problem: { kind: 'bad_shape', field: 'settings' } };
  const settings: Envelope['settings'] =
    Object.keys(settingsRaw).length === 0
      ? {}
      : (() => {
          const mode = settingsRaw.mode;
          if (
            !inHardRange(settingsRaw.target, 'target') ||
            !inHardRange(settingsRaw.isf, 'isf') ||
            !inHardRange(settingsRaw.icr, 'icr') ||
            !inHardRange(settingsRaw.threshold, 'threshold') ||
            typeof mode !== 'string' ||
            !MODES.includes(mode as RoundingMode)
          ) {
            return {};
          }
          return {
            target: settingsRaw.target,
            isf: settingsRaw.isf,
            icr: settingsRaw.icr,
            mode: mode as RoundingMode,
            threshold: settingsRaw.threshold,
            basalName: typeof settingsRaw.basalName === 'string' ? settingsRaw.basalName : '',
            basalUnits: inHardRange(settingsRaw.basalUnits, 'basalUnits') ? settingsRaw.basalUnits : 0,
            basalTiming: typeof settingsRaw.basalTiming === 'string' ? settingsRaw.basalTiming : '',
            // Validated as a STRING and nothing more. It is untrusted text from
            // a file, it enters no calculation, and the readable export escapes
            // it — §7.7.1's escaping rule is what makes that safe. A file
            // written before this field existed simply has no name.
            personName:
              typeof settingsRaw.personName === 'string'
                ? settingsRaw.personName.slice(0, MAX_NAME_LENGTH)
                : '',
          };
        })();

  const historyRaw = Array.isArray(raw.settingsHistory) ? raw.settingsHistory : [];
  const settingsHistory: ExportedSettingsHistory[] = [];
  for (const entry of historyRaw) {
    if (!isRecord(entry)) continue;
    const mode = entry.mode;
    if (
      !Number.isInteger(entry.revision) ||
      !finiteNumber(entry.changedAtMs) ||
      !inHardRange(entry.target, 'target') ||
      !inHardRange(entry.isf, 'isf') ||
      !inHardRange(entry.icr, 'icr') ||
      typeof mode !== 'string' ||
      !MODES.includes(mode as RoundingMode)
    ) {
      continue;
    }
    settingsHistory.push({
      revision: entry.revision as number,
      changedAtMs: entry.changedAtMs,
      target: entry.target,
      isf: entry.isf,
      icr: entry.icr,
      mode: mode as RoundingMode,
    });
  }

  const log: LogRow[] = [];
  for (const entry of Array.isArray(raw.log) ? raw.log : []) {
    if (!isRecord(entry)) continue;
    const row = entry.deleted === true ? readTombstone(entry) : readInjection(entry);
    if (row !== null) log.push(row);
  }

  const readings: Reading[] = [];
  for (const entry of Array.isArray(raw.readings) ? raw.readings : []) {
    if (!isRecord(entry)) continue;
    const row = readReading(entry);
    if (row !== null) readings.push(row);
  }

  const envelope: Envelope = {
    schemaVersion: schemaVersion as number,
    settings,
    settingsHistory,
    readings,
    log,
  };

  const dosing = raw.dosingHistoryBeforeApp;
  if (isRecord(dosing) && finiteNumber(dosing.answeredAtMs) && typeof dosing.text === 'string') {
    return {
      ok: true,
      envelope: {
        ...envelope,
        dosingHistoryBeforeApp: { answeredAtMs: dosing.answeredAtMs, text: dosing.text },
      },
    };
  }
  return { ok: true, envelope };
}

export interface MergePlan {
  readonly log: readonly LogRow[];
  readonly readings: readonly Reading[];
  readonly historyToAppend: readonly (ExportedSettingsHistory & { readonly imported: true })[];
  /** old imported revision -> the local id it was rewritten to */
  readonly revisionRemap: ReadonlyMap<number, number>;
}

/**
 * §7.7 — **imported revisions are REMAPPED, never merged by number.**
 *
 * `settingsRevision` is a bare monotonic integer with no identity across
 * installs, and the plan's own recovery flow breaks it: §1.2 says storage loss
 * requires re-entering the settings, so the user re-enters them (producing local
 * revisions 1..k) and THEN imports the backup (carrying an unrelated 1..n).
 * Merging by number collides and attributes rows to settings that never produced
 * them — the exact falsity this mechanism was added to remove, now in front of
 * the prescriber. Discarding the history instead leaves imported rows pointing
 * at nothing.
 *
 * Import into an EMPTY store keeps the imported numbers — the complement of the
 * rule, stated in v11 rather than left implicit.
 */
export function planMerge(
  envelope: Envelope,
  local: {
    readonly log: readonly LogRow[];
    readonly readings: readonly Reading[];
    readonly maxHistoryRevision: number | null;
  },
): MergePlan {
  const remap = new Map<number, number>();
  const historyToAppend: (ExportedSettingsHistory & { imported: true })[] = [];

  const ordered = [...envelope.settingsHistory].sort((a, b) => a.revision - b.revision);
  if (local.maxHistoryRevision === null) {
    // Empty store: the imported numbers stand as they are.
    for (const entry of ordered) {
      remap.set(entry.revision, entry.revision);
      historyToAppend.push({ ...entry, imported: true });
    }
  } else {
    let next = local.maxHistoryRevision + 1;
    for (const entry of ordered) {
      remap.set(entry.revision, next);
      historyToAppend.push({ ...entry, revision: next, imported: true });
      next += 1;
    }
  }

  // §7.7 — merged by `id`. §7.3 — **a tombstone wins over a live row with the
  // same `id` in EITHER direction.** Deletion is the later statement of intent,
  // and without a tiebreak the outcome would depend on file order. This is also
  // the only reason a tombstone is exported at all: without it, import's merge
  // sees an `id` it does not have and adds the dose back.
  const byId = new Map<string, LogRow>();
  const consider = (row: LogRow, remapRevision: boolean): void => {
    const existing = byId.get(row.id);
    if (existing !== undefined && isTombstone(existing)) return;
    if (existing !== undefined && !isTombstone(row)) return;
    if (isTombstone(row)) {
      byId.set(row.id, row);
      return;
    }
    const mapped = remapRevision ? (remap.get(row.settingsRevision) ?? row.settingsRevision) : row.settingsRevision;
    byId.set(row.id, { ...row, settingsRevision: mapped });
  };
  for (const row of local.log) consider(row, false);
  for (const row of envelope.log) consider(row, true);

  const readingsById = new Map<string, Reading>();
  for (const reading of local.readings) readingsById.set(reading.id, reading);
  for (const reading of envelope.readings) {
    if (!readingsById.has(reading.id)) readingsById.set(reading.id, reading);
  }

  return {
    log: [...byId.values()],
    readings: [...readingsById.values()],
    historyToAppend,
    revisionRemap: remap,
  };
}
