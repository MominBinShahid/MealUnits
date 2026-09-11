/**
 * §11.3's schema, as declarations rather than as a comment.
 *
 * v1 and v2 chose localStorage. v3 tried to patch its concurrency. v4 abandoned
 * it, and the reasoning is worth keeping because the premises moved underneath
 * the decision: at three settings numbers localStorage was right — ~200 bytes,
 * written on a settings edit, read once at boot, and the SYNCHRONOUS boot read
 * is a genuine correctness win. Then the log arrived. Written 4-6 times daily,
 * read by a safety gate, with two independent writers.
 *
 * v3's fix — "re-read and compare immediately before every write" — is a
 * time-of-check-to-time-of-use race, and §11.3 traces it step by step: two tabs
 * both read counter 40, both re-read 40, both write 41, both verify success, and
 * the injection is gone with no mismatch seen anywhere. "Immediately before"
 * does not make read and write atomic.
 *
 * IndexedDB serialises overlapping read-write transactions in the store itself:
 * correctness by construction rather than by discipline, in the one place a lost
 * row means a blind safety gate.
 */

import { SCHEMA_VERSION } from '../config.js';
import type { RoundingMode } from '../core/types.js';

export const DATABASE_NAME = 'MealUnits';
export const DATABASE_VERSION = SCHEMA_VERSION;

export const STORE = {
  meta: 'meta',
  settings: 'settings',
  acks: 'acks',
  log: 'log',
  readings: 'readings',
  settingsHistory: 'settingsHistory',
} as const;

export type StoreName = (typeof STORE)[keyof typeof STORE];

/** Every store, discovered from the table above rather than hand-listed. */
export const ALL_STORES: readonly StoreName[] = Object.values(STORE);

/**
 * §11.3, §7.8 — every revision-bumping mutation uses this scope, and it is
 * THREE stores rather than two. v10 added the readings store and left the
 * cross-tab table at the two-store scope; v11 widened it and left one sentence
 * behind saying "both stores". A readings write bumps the same `logRevision` in
 * the same transaction, so band E's two-store derivation cannot race.
 */
export const HISTORY_SCOPE: readonly StoreName[] = [STORE.meta, STORE.log, STORE.readings];

/**
 * §11.3 — settings, their recovery copy, the `settingsHistory` append AND THE
 * MAX-KEY ALLOCATION READ, and any affected acknowledgements commit in ONE
 * transaction. v12 left this bullet naming neither the store nor the read.
 */
export const SETTINGS_SCOPE: readonly StoreName[] = [
  STORE.meta,
  STORE.settings,
  STORE.settingsHistory,
  STORE.acks,
];

// ─── meta rows ──────────────────────────────────────────────────────────────

export const META_KEY = {
  envelope: 'envelope',
  dosingHistory: 'dosingHistory',
  backup: 'backup',
  logRevision: 'logRevision',
  install: 'install',
} as const;

/**
 * §11.3 — ONE store discovers the schema, and `schemaVersion` is validated as a
 * finite integer. String ordering and `NaN` never decide compatibility.
 *
 * The recovery block is IMMUTABLE IN FORMAT [R2]: fixed field names, explicit
 * units, versioned independently of the evolving payload, kept synchronised with
 * committed settings. "Plain text prevents injection but does not establish
 * meaning" — a parsed integer does not reveal whether `150` means units,
 * hundredths or mg/dL — so an older build must never present unknown-schema
 * numbers as verified prescription settings.
 */
export interface RecoveryBlock {
  readonly recoveryFormat: 1;
  readonly targetMgDl: number;
  readonly oneUnitLowersMgDl: number;
  readonly oneUnitCoversGramsCarbohydrate: number;
  readonly basalInsulinName: string;
  readonly basalUnitsPerDay: number;
  readonly basalTiming: string;
  /** Optional; '' means not given. See `Settings.personName`. */
  readonly personName: string;
}

export interface EnvelopeRow {
  readonly k: typeof META_KEY.envelope;
  readonly schemaVersion: number;
  readonly recovery: RecoveryBlock | null;
}

/**
 * §6.7 v18 — three states, because a boolean cannot tell "never asked" from
 * "asked and declined". A MISSING ROW READS AS `unanswered`, and the row is not
 * seeded at database creation: an install predating this feature, or a partial
 * restore, must ask rather than assume.
 */
export interface DosingHistoryRow {
  readonly k: typeof META_KEY.dosingHistory;
  readonly state: 'unanswered' | 'declined' | 'answered';
  readonly text: string;
  readonly answeredAtMs: number | null;
}

/**
 * §7.7.1 v22 — the backup counter finally gets a home. §12 has asked for the
 * prompt since v1 and no revision gave the timestamp a store; v21 then wrote a
 * rule about what it may count against a schema with no field to count into.
 *
 * It counts the JSON export ONLY. If it counted any export, saving the readable
 * file weekly would report a recent backup while nothing restorable existed —
 * a false safety claim, which is the class §7.5 condemns.
 */
export interface BackupRow {
  readonly k: typeof META_KEY.backup;
  readonly lastJsonExportAtMs: number | null;
}

/**
 * §11.3 v23 — the counter the entire cross-tab correctness stack keys on had no
 * declared home for twenty-two revisions. Every implementer would have put it in
 * `meta`, which is exactly why it survived: a missing declaration that everyone
 * guesses correctly reads as a decision.
 *
 * `lastImportAtMs` and `lastLocalWriteAtMs` ride alongside because §7.5's
 * provenance rule needs both and neither belongs to a single row.
 */
export interface LogRevisionRow {
  readonly k: typeof META_KEY.logRevision;
  readonly n: number;
  readonly lastImportAtMs: number | null;
  /**
   * THE PERSISTED KEY, deliberately not renamed. The domain calls this
   * `lastLocalInjectionAtMs` (`StoredState`, `HistoryContext`) because after
   * note 7's fix only an injection append stamps it — `appendReading` used to
   * and must not, per §7.8. Renaming the stored key would mean the app's
   * first data migration for a cosmetic gain, so the translation lives at
   * `readAll` instead and is commented there.
   */
  readonly lastLocalWriteAtMs: number | null;
}

/** When this install first ran. §7.5: a log predating it is suspect. */
export interface InstallRow {
  readonly k: typeof META_KEY.install;
  readonly installedAtMs: number;
}

export type MetaRow = EnvelopeRow | DosingHistoryRow | BackupRow | LogRevisionRow | InstallRow;

// ─── settings ───────────────────────────────────────────────────────────────

export const SETTINGS_KEY = 'current';

/**
 * §11.3's IDENTITY rule: `settings.revision` means the revision of the settings
 * CURRENTLY IN FORCE, and nothing else. Only a settings commit or an adoption
 * writes it. **An import never touches it.**
 *
 * v12's final sentence said both import paths leave the counter at the largest
 * history key, and both reviewers traced the same failure from different
 * directions: the row stamp then attributes every dose to the last IMPORTED
 * entry — settings that never produced it, at a ratio that would have given a
 * different number — for the months until the next settings change.
 */
export interface SettingsRow {
  readonly k: typeof SETTINGS_KEY;
  readonly revision: number;
  readonly target: number;
  readonly isf: number;
  readonly icr: number;
  readonly mode: RoundingMode;
  readonly threshold: number;
  readonly basalName: string;
  readonly basalUnits: number;
  readonly basalTiming: string;
  /** Optional; '' means not given. See `Settings.personName`. */
  readonly personName: string;
}

/**
 * §11.3 v11 — `settingsHistory` gets its own store. v10 legislated the entries
 * in §7.7, granted the settings store a `revision`, and specified an import that
 * APPENDS to them, against a schema block naming neither.
 *
 * `threshold` is deliberately absent [R1]: it never changes a dose value, so no
 * consumer needs its historical setting, and an identical-values row would be
 * noise. Stated so it does not read as an oversight.
 *
 * `imported` is not in §11.3's list. See BUILD-NOTES.md — §7.7.1's timeline rule
 * asks whether a revision was ever in force ON THIS INSTALL, and nothing else in
 * the schema can answer that.
 */
export interface SettingsHistoryRow {
  readonly revision: number;
  readonly changedAtMs: number;
  readonly target: number;
  readonly isf: number;
  readonly icr: number;
  readonly mode: RoundingMode;
  readonly imported: boolean;
}

// ─── acknowledgements ───────────────────────────────────────────────────────

/**
 * §11.3 — `acks` holds persisted state BOUND TO THE VALUE IT ACKNOWLEDGED, and
 * §7.9 v23 turns that into the clearing rule: `acks` is bound to settings and to
 * the app, NEVER to the record. So "clear the record" drops nothing from it and
 * "start over" drops all of it, which removes the "acknowledgement dropped,
 * value kept" state rather than defining when the gate re-fires.
 *
 * The key encodes the binding, so an acknowledgement cannot outlive its value:
 * change the target from 150 to 160 and the old key is simply never asked for
 * again.
 *
 * §4.6's blank-reading acknowledgement is NOT among these — it is
 * per-calculation, and a one-time persisted version of it would be near-zero
 * protection.
 */
export const ACK_KEY = {
  disclaimer: 'disclaimer',
} as const;

export function ackKeyForMode(mode: RoundingMode): string {
  return `mode:${mode}`;
}

/** §4.5's confirm-once, bound to the exact value confirmed. */
export function ackKeyForSetting(field: string, value: number): string {
  return `setting:${field}:${String(value)}`;
}

export interface AckRow {
  readonly k: string;
  readonly acknowledgedAtMs: number;
}

// ─── stored rows ────────────────────────────────────────────────────────────

export const TIMESTAMP_INDEX = 'by_timestamp';

export interface StoredEnvelope {
  readonly schemaVersion: number;
  readonly settings: Omit<SettingsRow, 'k'> | Record<string, never>;
  readonly dosingHistoryBeforeApp?: { readonly answeredAtMs: number; readonly text: string };
  readonly settingsHistory: readonly Omit<SettingsHistoryRow, 'imported'>[];
  readonly readings: readonly unknown[];
  readonly log: readonly unknown[];
}
