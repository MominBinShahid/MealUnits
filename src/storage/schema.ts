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

import { SCHEMA_VERSION, STRUCTURE_VERSION } from '../config.js';
import type { Language, RoundingMode, UrduFace } from '../core/types.js';

export const DATABASE_NAME = 'MealUnits';
/**
 * The IndexedDB version, under the name IndexedDB itself uses for it. It was an
 * alias of `SCHEMA_VERSION` until 2026-09-21, and that alias is the defect:
 * "the version" read as one idea when it is two, so a keyPath rename shipped
 * without the bump that would have made it reach a single existing install.
 * `config.ts` carries the whole account.
 */
export const DATABASE_VERSION = STRUCTURE_VERSION;
/** Re-exported so `open.ts` reads both numbers from one place. */
export { SCHEMA_VERSION };

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
  language: 'language',
  calibration: 'calibration',
  display: 'display',
  vessel: 'vessel',
} as const;

/**
 * §11.3 — ONE store discovers the schema, and `schemaVersion` is validated as a
 * finite integer. String ordering and `NaN` never decide compatibility.
 *
 * The recovery block is IMMUTABLE IN FORMAT [R2]: fixed field names, explicit
 * units, kept synchronised with committed settings. "Plain text prevents
 * injection but does not establish meaning" — a parsed integer does not reveal
 * whether `150` means units, hundredths or mg/dL.
 *
 * **What keeps that true is a rule, not a runtime check**, and it is the only
 * thing standing behind these numbers: A FIELD NAME IS NEVER REUSED WITH A
 * DIFFERENT MEANING. Change the meaning and you rename the field, so an older
 * build does not find it rather than misreading it.
 *
 * A `recoveryFormat` integer sat here until 2026-09-21 claiming to enforce
 * exactly that. Nothing ever compared it — it was written as a constant and
 * overwritten on read — so the comment describing a refusal described a
 * mechanism nobody had written. It was deleted rather than implemented:
 * enforcing it means this screen sometimes shows nothing on purpose, and
 * showing numbers when everything else has broken is the only reason it exists.
 */
export interface RecoveryBlock {
  readonly targetMgDl: number;
  readonly oneUnitLowersMgDl: number;
  readonly oneUnitCoversGramsCarbohydrate: number;
  readonly basalName: string;
  readonly basalUnitsPerDay: number;
  readonly basalTiming: string;
  /**
   * §8.5's brand, in WORDS rather than as a row id — this block is copied down
   * off a screen by hand, and `novorapid` is not what the vial says.
   */
  readonly bolusName: string;
  /** Optional; '' means not given. See `Settings.personName`. */
  readonly personName: string;
}

export interface EnvelopeRow {
  readonly key: typeof META_KEY.envelope;
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
  readonly key: typeof META_KEY.dosingHistory;
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
  readonly key: typeof META_KEY.backup;
  readonly lastJsonExportAtMs: number | null;
}

/**
 * §11.3 v23 — the counter the entire cross-tab correctness stack keys on had no
 * declared home for twenty-two revisions. Every implementer would have put it in
 * `meta`, which is exactly why it survived: a missing declaration that everyone
 * guesses correctly reads as a decision.
 *
 * `lastImportAtMs` and `lastLocalInjectionAtMs` ride alongside because §7.5's
 * provenance rule needs both and neither belongs to a single row.
 */
export interface LogRevisionRow {
  readonly key: typeof META_KEY.logRevision;
  /**
   * The counter the whole cross-tab correctness stack keys on. **Was `n`**
   * until 2026-09-21 — one letter for the most load-bearing integer in the
   * storage layer, which the domain had been calling `logRevision` all along
   * and translating at `readAll`. Renamed with everything else on the ruling
   * that nobody holds data yet.
   */
  readonly logRevision: number;
  readonly lastImportAtMs: number | null;
  /**
   * When this install last appended an INJECTION — not a reading. After note
   * 7's fix only `appendInjection` stamps it; `appendReading` used to and must
   * not, per §7.8, because §7.5 asks whether a DOSE is missing.
   *
   * Was `lastLocalWriteAtMs` until 2026-09-21, and the domain had been
   * translating around it at `readAll` purely to avoid a migration. Renamed
   * with everything else on Momin's ruling that nobody holds data yet — the
   * name now says what note 7 established, rather than what the field meant
   * before it.
   */
  readonly lastLocalInjectionAtMs: number | null;
}

/** When this install first ran. §7.5: a log predating it is suspect. */
export interface InstallRow {
  readonly key: typeof META_KEY.install;
  readonly installedAtMs: number;
}

/**
 * `10a` — which language the interface is in, and which Urdu face while that
 * choice is still open.
 *
 * In `meta` rather than in `settings`, and the distinction is not filing. The
 * settings row is a PRESCRIPTION: §11.3 gives it a revision, §7.7 gives every
 * revision a period, and §7.7.1's export prints those periods as the clinical
 * record of what produced which dose. A language is not a dosing input and must
 * not open a period — putting it there would either bump the revision (a new
 * prescription period identical to the last, which is the noise `BACKLOG` T18
 * was fixed to stop) or sit in the one store whose every other field does.
 *
 * A MISSING ROW READS AS ENGLISH, and the row is not seeded at database
 * creation. The same three-state reasoning as `DosingHistoryRow`: an install
 * predating this feature, or a partial restore, has not chosen a language, and
 * "has not chosen" and "chose English" are the same thing to render and a
 * different thing to reason about.
 *
 * `urduFace` is kept even while the language is English, so switching back and
 * forth does not lose the face she was in the middle of comparing.
 */
/**
 * HOW LARGE THE READER WANTS THE TYPE — a display preference, not a dosing one.
 *
 * Its OWN meta key rather than a field on `LanguageRow`, because it is not a
 * language fact: English can be enlarged too, and filing it under language
 * would make that read like an oversight. `meta` is a keyed table, so a new key
 * costs no migration — the same route `language` and `calibration` took.
 *
 * A row that predates this feature simply has none, and the reader gets
 * `TEXT_SCALE_DEFAULT`. There is no "has not chosen" to distinguish here the
 * way there is for language: not choosing a size and choosing the normal size
 * are the same thing to a reader and to the renderer.
 */
export interface DisplayRow {
  readonly key: typeof META_KEY.display;
  /** A multiplier from `TEXT_SCALES`. Multiplies with the per-script correction. */
  readonly textScale: number;
}

export interface LanguageRow {
  readonly key: typeof META_KEY.language;
  readonly language: Language;
  readonly urduFace: UrduFace;
}

/**
 * PHASE 2 (BACKLOG 18) — what HIS roti weighs, rather than what a reference
 * table says an average one weighs.
 *
 * In `meta` and not in a store of its own, which is what keeps this change from
 * needing a schema migration: `meta` is already a keyed table and a new key
 * costs nothing. `language` arrived the same way.
 *
 * `setAt` is not decoration. BACKLOG 18's second constraint: "a calibrated row
 * must still show the reference figure it replaced and the date it was set. A
 * number whose provenance is gone is the class §7.7 exists to prevent." So the
 * row shows both figures and when the reader chose one — a calibration from
 * two years ago is a different claim from one set last week.
 *
 * Keyed by `Food.id` rather than by name, because the id is the stable one.
 * `Food.id`'s own docstring in `src/data/carbs.ts` calls it "used for the
 * 'always use this one' choice later" — this is that later. (The citation said
 * BACKLOG 18, which does not contain those words. Corrected 2026-09-23.)
 */
export interface CalibrationRow {
  readonly key: typeof META_KEY.calibration;
  /** `Food.id` to the reader's own grams of carbohydrate, and when they set it. */
  readonly foods: Readonly<Record<string, { readonly grams: number; readonly setAt: number }>>;
}

/**
 * T31 — what the reader's own vessel holds, as a RATIO of what the table
 * assumes, plus the two weighings that produced it.
 *
 * A ratio and not a weight, and that is the whole design. Fill weight belongs
 * to vessel × food, not to the vessel: T31's adversarial pass calibrated a cup
 * at 220 g from curry and applied it to the popcorn row, which gives **128 g
 * of carbohydrate against a true 14 — an over-dose of 11.4 units**. In this
 * table one "cup" spans 24 g to 355 g. Stored as *your fill ÷ the row's own
 * stated weight for that same food*, the same feature is sound.
 *
 * It arrives by the same route as `language`, `calibration` and `display`:
 * `meta` is a keyed table, so a new key costs no migration and neither
 * `SCHEMA_VERSION` nor `STRUCTURE_VERSION` moves. That matters more than
 * convenience here — #63's keyPath rename bricked every install that existed,
 * and #70 shipped a repair engine whose general case would have answered "this
 * store has a missing index" with `deleteObjectStore` on the dose log. A new
 * store would drag both hazards in for a feature that needs neither.
 *
 * **`emptyGrams` is not bookkeeping, it is the tare detector.** An un-tared
 * plate is +5.1 to +10.2 units, and un-tared during CALIBRATION doubles every
 * dose in that vessel permanently. No threshold can catch it — un-tared katori
 * entries of 180–270 g sit inside the genuine 100–250 g serving range — so the
 * structure catches it instead: the reader weighs empty, then serves what they
 * would actually eat, and the stored empty weight is shown back to them
 * afterwards as a number they can re-read against the plate in their hand.
 *
 * `sourceFoodId` and `referenceGrams` record which row's stated weight the
 * fill was divided by, so the arithmetic can be audited rather than inferred.
 *
 * The ratio is stored UNROUNDED. 450 ÷ 300 is exactly 1.5, but 445 ÷ 300 is
 * 1.48333…, and feeding a displayed 1.5 back into the arithmetic is the second
 * rounding engine §5.3 forbids. Rounding happens at the formatter.
 */
export interface VesselRow {
  readonly key: typeof META_KEY.vessel;
  readonly vessels: Readonly<Record<string, {
    /** Fill ÷ reference. What the arithmetic multiplies by. */
    readonly ratio: number;
    /** The vessel empty. Zero ONLY when `tared` is `'scale'`. */
    readonly emptyGrams: number;
    /** Vessel plus food, as the scale showed it. */
    readonly fullGrams: number;
    /** Whether the app subtracted the tare or the scale had already zeroed. */
    readonly tared: 'subtracted' | 'scale';
    /** Which row's stated weight the fill was divided by. */
    readonly sourceFoodId: string;
    /** That row's `vessel.grams` at the time, so the working survives. */
    readonly referenceGrams: number;
    readonly setAt: number;
  }>>;
}

export type MetaRow =
  | EnvelopeRow
  | DosingHistoryRow
  | BackupRow
  | LogRevisionRow
  | InstallRow
  | LanguageRow
  | CalibrationRow;

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
  readonly key: typeof SETTINGS_KEY;
  readonly revision: number;
  readonly target: number;
  readonly isf: number;
  readonly icr: number;
  /**
   * §5's rounding mode. **Renamed from `mode` on 2026-09-21 [Momin]**, stored
   * key included — *"nobody is using this right now"*, and a name nobody can
   * read from is worth more than compatibility with rows that do not exist.
   * `readAll` accepted a row written as `mode` for one day; that fallback went
   * with every other older-version read on 2026-09-21.
   */
  readonly roundingMode: RoundingMode;
  readonly threshold: number;
  readonly basalName: string;
  readonly basalUnits: number;
  readonly basalTiming: string;
  /**
   * §8.5 — the mealtime insulin, as a row id from `src/data/insulins.ts`.
   *
   * `''` is `UNANSWERED_INSULIN`, and under this build it cannot get here:
   * §8.5's question is asked before the first commit, and "I don't know" is
   * `UNKNOWN_INSULIN` rather than this. A settings row carrying `''` has been
   * hand-edited, and the gate that reads it asks the question rather than
   * guessing. Nothing maps a MISSING field to it any more — that read was
   * §8.5's whole migration and went on 2026-09-21 with the rest.
   */
  readonly bolusId: string;
  /** §8.5 — the reader's own pre-meal wait in minutes, or null for the class range. */
  readonly eatDelayMinutes: number | null;
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
 * `imported` joined §11.3's list on 2026-09-21, when the schema block was
 * rewritten against this file. See BUILD-NOTES.md for why it exists — §7.7.1's
 * timeline rule asks whether a revision was ever in force ON THIS INSTALL, and
 * nothing else in the schema can answer that.
 */
export interface SettingsHistoryRow {
  readonly revision: number;
  readonly changedAtMs: number;
  readonly target: number;
  readonly isf: number;
  readonly icr: number;
  /** See `SettingsRow.roundingMode`. */
  readonly roundingMode: RoundingMode;
  /**
   * §8.5 — present for the same reason the ratios are and `threshold` is not:
   * it changes what a dose came out as, through §7.4's gate. `eatDelayMinutes`
   * is absent on that same test — it changes what the reader was told to do,
   * never what the app calculated.
   *
   * `''` reaches a history row by ONE route: an import whose stored id matched
   * no brand this build knows, which `readInsulinId` sanitises to `''`. It
   * prints as "not recorded" rather than as a guess.
   */
  readonly bolusId: string;
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
  /**
   * §12 — "stop warning me that this browser can delete my record".
   *
   * NOT bound to a value, unlike the mode and setting acks: what it
   * acknowledges is a fact about the browser, and that fact does not change
   * when a number does.
   *
   * It lives in the storage the warning is ABOUT, and that is correct rather
   * than ironic. If the eviction actually fires, the record goes and this goes
   * with it — and someone who has just lost their log is exactly the person who
   * should be told it can happen again.
   */
  storageEviction: 'storage-eviction',
} as const;

export function ackKeyForMode(roundingMode: RoundingMode): string {
  // A PERSISTED ACK KEY, and it was renamed from `mode:` on 2026-09-21 knowing
  // exactly what that costs: every reader who had accepted §5.1's ceiling gate
  // is asked once more. That is the safe direction for a safety gate and one
  // tap, which is why this is the one rename that took no fallback even on the
  // day the others had them.
  return `roundingMode:${roundingMode}`;
}

/** §4.5's confirm-once, bound to the exact value confirmed. */
export function ackKeyForSetting(field: string, value: number): string {
  return `setting:${field}:${String(value)}`;
}

export interface AckRow {
  readonly key: string;
  readonly acknowledgedAtMs: number;
}

// ─── stored rows ────────────────────────────────────────────────────────────

export const TIMESTAMP_INDEX = 'by_timestamp';
