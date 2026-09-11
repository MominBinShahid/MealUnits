/**
 * Every read and write the app performs, each one a single transaction.
 *
 * §11.3: "Every write is ONE transaction. The 'I injected' row is a single `add`
 * on `log`, so it cannot clobber settings and settings cannot clobber it."
 */

import { DELETE_CONFIRM_WINDOW_HOURS, SCHEMA_VERSION } from '../config.js';
import { isInjection } from '../core/types.js';
import type { Injection, LogRow, Reading, RoundingMode, Settings, Tombstone } from '../core/types.js';
import type { SettingsPeriod } from '../core/periods.js';
import { hasRowInsideWindow } from '../core/history.js';
import {
  ACK_KEY,
  HISTORY_SCOPE,
  META_KEY,
  SETTINGS_KEY,
  SETTINGS_SCOPE,
  STORE,
  ackKeyForMode,
  ackKeyForSetting,
} from './schema.js';
import type {
  AckRow,
  BackupRow,
  DosingHistoryRow,
  EnvelopeRow,
  InstallRow,
  LogRevisionRow,
  RecoveryBlock,
  SettingsHistoryRow,
  SettingsRow,
} from './schema.js';
import { readLogRow } from './envelope.js';
import { add, clear, get, getAll, maxKey, put, remove, runTransaction } from './tx.js';

const NO_REVISION = 0;

/** §11.3 v23 — the counter, plus the two provenance stamps §7.5 needs. */
async function readLogRevisionRow(tx: IDBTransaction): Promise<LogRevisionRow> {
  const row = await get<LogRevisionRow>(tx, STORE.meta, META_KEY.logRevision);
  return (
    row ?? {
      k: META_KEY.logRevision,
      n: NO_REVISION,
      lastImportAtMs: null,
      lastLocalWriteAtMs: null,
    }
  );
}

/**
 * Bumps the counter every consumer polls. §7.9 v22: without it "a second tab
 * goes on rendering a result whose §7.4 stacking line cites an injection that no
 * longer exists, and whose §10.5 band E form was chosen by reading two stores
 * that are now empty".
 */
async function bumpLogRevision(
  tx: IDBTransaction,
  patch: Partial<Omit<LogRevisionRow, 'k' | 'n'>> = {},
): Promise<number> {
  const current = await readLogRevisionRow(tx);
  const next = current.n + 1;
  await put(tx, STORE.meta, { ...current, ...patch, k: META_KEY.logRevision, n: next });
  return next;
}

export interface StoredState {
  readonly settings: Settings | null;
  readonly settingsHistory: readonly SettingsPeriod[];
  readonly log: readonly LogRow[];
  readonly readings: readonly Reading[];
  readonly logRevision: number;
  readonly installedAtMs: number;
  readonly lastImportAtMs: number | null;
  readonly lastLocalInjectionAtMs: number | null;
  /**
   * §11.3 — stored rows that failed re-validation ON LOAD and were dropped.
   * Counted rather than merely discarded, because §7.5's doctrine is that a log
   * the app had to prune must never silently read as "no recent insulin".
   */
  readonly droppedStoredRows: number;
  readonly acks: ReadonlySet<string>;
  readonly dosingHistory: DosingHistoryRow;
  readonly lastJsonExportAtMs: number | null;
}

/** One read of everything the reducer needs, in one transaction. */
export async function readAll(db: IDBDatabase, nowMs: number): Promise<StoredState> {
  return runTransaction(
    db,
    [STORE.meta, STORE.settings, STORE.acks, STORE.log, STORE.readings, STORE.settingsHistory],
    'readonly',
    async (tx) => {
      const [settingsRow, history, log, readings, acks, revision, install, dosing, backup] =
        await Promise.all([
          get<SettingsRow>(tx, STORE.settings, SETTINGS_KEY),
          getAll<SettingsHistoryRow>(tx, STORE.settingsHistory),
          getAll<LogRow>(tx, STORE.log),
          getAll<Reading>(tx, STORE.readings),
          getAll<AckRow>(tx, STORE.acks),
          readLogRevisionRow(tx),
          get<InstallRow>(tx, STORE.meta, META_KEY.install),
          get<DosingHistoryRow>(tx, STORE.meta, META_KEY.dosingHistory),
          get<BackupRow>(tx, STORE.meta, META_KEY.backup),
        ]);

      const settings: Settings | null =
        settingsRow === undefined
          ? null
          : {
              revision: settingsRow.revision,
              target: settingsRow.target,
              isf: settingsRow.isf,
              icr: settingsRow.icr,
              mode: settingsRow.mode,
              threshold: settingsRow.threshold,
              basalName: settingsRow.basalName,
              basalUnits: settingsRow.basalUnits,
              basalTiming: settingsRow.basalTiming,
              // §11.3 re-validates on every load, and a row written before this
              // field existed has no name on it. `?? ''` is the SAME empty
              // state the field already models, not a fallback inventing data.
              personName: settingsRow.personName ?? '',
            };

      // §11.3 — "Re-validate on every LOAD and import." The import half was
      // implemented; this is the load half. A row that fails is DROPPED rather
      // than repaired, because repairing it would invent a dose — and counted,
      // so §7.5 can refuse to call the remaining log trustworthy.
      const validated: LogRow[] = [];
      for (const row of log) {
        const checked = readLogRow(row);
        if (checked !== null) validated.push(checked);
      }

      return {
        settings,
        settingsHistory: history,
        log: validated,
        droppedStoredRows: log.length - validated.length,
        readings,
        logRevision: revision.n,
        installedAtMs: install?.installedAtMs ?? nowMs,
        lastImportAtMs: revision.lastImportAtMs,
        // THE BOUNDARY. The stored key is `lastLocalWriteAtMs` and stays that
        // way — renaming it would need a schema migration for a cosmetic gain.
        // The DOMAIN name says what the value means after note 7's fix: only
        // an injection append stamps it, so "write" was false the moment
        // `appendReading` stopped.
        lastLocalInjectionAtMs: revision.lastLocalWriteAtMs,
        acks: new Set(acks.map((row) => row.k)),
        // §6.7 v19 — A MISSING ROW READS AS `unanswered`. The row is not seeded
        // at database creation: an install predating the feature, or a partial
        // restore, must ask rather than assume.
        dosingHistory: dosing ?? {
          k: META_KEY.dosingHistory,
          state: 'unanswered',
          text: '',
          answeredAtMs: null,
        },
        lastJsonExportAtMs: backup?.lastJsonExportAtMs ?? null,
      } satisfies StoredState;
    },
  );
}

// ─── settings ───────────────────────────────────────────────────────────────

export interface SettingsCommit {
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
  /** Acknowledgement keys this commit earns — §4.5's confirm-once and §5.1's gate. */
  readonly acknowledged: readonly string[];
  readonly nowMs: number;
}

function recoveryFor(commit: SettingsCommit): RecoveryBlock {
  // §11.3 — fixed field names and EXPLICIT UNITS, versioned independently of the
  // evolving payload. "A parsed integer does not reveal whether 150 means units,
  // hundredths or mg/dL."
  return {
    recoveryFormat: 1,
    // §11.3 — the recovery block is what he copies down off the fail-closed
    // screen, so whose record it is belongs on it.
    personName: commit.personName,
    targetMgDl: commit.target,
    oneUnitLowersMgDl: commit.isf,
    oneUnitCoversGramsCarbohydrate: commit.icr,
    basalInsulinName: commit.basalName,
    basalUnitsPerDay: commit.basalUnits,
    basalTiming: commit.basalTiming,
  };
}

/**
 * §11.3's ALLOCATION rule, which v11 lacked and which produced two deterministic
 * collisions on paths this document legislates:
 *
 * > The next `revision` is `max(settingsHistory keys) + 1`, read inside the same
 * > transaction — **never** by incrementing the value stored on the settings
 * > record. On a virgin install the store is empty and the base case is
 * > explicit: `(max ?? 0) + 1`, so the first commit takes 1.
 *
 * ADOPTION ALLOCATES: adopting an imported setting is a settings commit and
 * takes a fresh revision, because the imported entry carries another install's
 * `changedAtMs` and `settingsHistory` is never adopted.
 */
export function commitSettings(db: IDBDatabase, commit: SettingsCommit): Promise<number> {
  return runTransaction(db, SETTINGS_SCOPE, 'readwrite', async (tx) => {
    const highest = await maxKey(tx, STORE.settingsHistory);
    const revision = (highest ?? NO_REVISION) + 1;

    const settings: SettingsRow = {
      k: SETTINGS_KEY,
      revision,
      personName: commit.personName,
      target: commit.target,
      isf: commit.isf,
      icr: commit.icr,
      mode: commit.mode,
      threshold: commit.threshold,
      basalName: commit.basalName,
      basalUnits: commit.basalUnits,
      basalTiming: commit.basalTiming,
    };
    await put(tx, STORE.settings, settings);

    // `add`, never `put`, so an allocation bug fails loud instead of silently
    // rewriting provenance.
    await add(tx, STORE.settingsHistory, {
      revision,
      changedAtMs: commit.nowMs,
      target: commit.target,
      isf: commit.isf,
      icr: commit.icr,
      mode: commit.mode,
      imported: false,
    } satisfies SettingsHistoryRow);

    // The recovery block is kept synchronised with committed settings, in the
    // same transaction, so the fail-closed screen can never show a stale
    // prescription.
    const envelope = await get<EnvelopeRow>(tx, STORE.meta, META_KEY.envelope);
    await put(tx, STORE.meta, {
      k: META_KEY.envelope,
      schemaVersion: envelope?.schemaVersion ?? SCHEMA_VERSION,
      recovery: recoveryFor(commit),
    } satisfies EnvelopeRow);

    for (const key of commit.acknowledged) {
      await put(tx, STORE.acks, { k: key, acknowledgedAtMs: commit.nowMs } satisfies AckRow);
    }
    return revision;
  });
}

export function acknowledge(db: IDBDatabase, key: string, nowMs: number): Promise<IDBValidKey> {
  return runTransaction(db, [STORE.acks], 'readwrite', (tx) =>
    put(tx, STORE.acks, { k: key, acknowledgedAtMs: nowMs } satisfies AckRow),
  );
}

export const ackKeys = { ...ACK_KEY, forMode: ackKeyForMode, forSetting: ackKeyForSetting };

// ─── the log ────────────────────────────────────────────────────────────────

export type LogWriteOutcome =
  | { readonly kind: 'written'; readonly logRevision: number }
  /** §7.2 — a retry never creates a second row and never moves the timestamp. */
  | { readonly kind: 'already_written'; readonly logRevision: number };

/**
 * §7.2's commit, and §11.3's mismatch policy at this exact point.
 *
 * v5 applied one rule to both commit points — "mismatch → abort, invalidate,
 * recompute" — which is right at a reveal and UNIMPLEMENTABLE here in either
 * reading: abort and discard the tap and a PHYSICAL INJECTION GOES UNRECORDED,
 * leaving the gate blind; or treat the abort as a write failure and the retry
 * loops forever, because a revision mismatch is permanent.
 *
 * So: **always commit the append.** A keyed single `add` cannot clobber
 * anything, and the revision bump rides in the same transaction. The displayed
 * result is invalidated afterwards, by the caller.
 *
 * "The injection is never discarded and its units are never replaced. The event
 * is frozen at the tap (§7.2); only the RESULT is invalidated."
 */
export async function appendInjection(
  db: IDBDatabase,
  row: Injection,
  nowMs: number,
): Promise<LogWriteOutcome> {
  return runTransaction(db, HISTORY_SCOPE, 'readwrite', async (tx) => {
    const existing = await get<LogRow>(tx, STORE.log, row.id);
    if (existing !== undefined) {
      // Idempotent on `id`. Two taps cannot log 52 units.
      const revision = await readLogRevisionRow(tx);
      return { kind: 'already_written', logRevision: revision.n } satisfies LogWriteOutcome;
    }
    await add(tx, STORE.log, row);
    const logRevision = await bumpLogRevision(tx, { lastLocalWriteAtMs: nowMs });
    return { kind: 'written', logRevision } satisfies LogWriteOutcome;
  });
}

/**
 * §7.8 — a reading is its own event, and it bumps the SAME counter.
 *
 * **It does NOT stamp `lastLocalInjectionAtMs`, and the omission is the point.**
 * It used to, which made a reading an input to §7.5's provenance and therefore
 * to a §11.2 snapshot field — forbidden by §7.8 in as many words: *"Not an
 * input to anything. Readings are absent from §11.2's dosing snapshot, from
 * §6.5's carbohydrate baseline, and from §7.4's stacking gate — a reading is
 * not an injection. The one exception is §10.5's band E derivation."*
 *
 * The effect was that recording a blood sugar after an import flipped
 * provenance from suspect to trusted, suppressing §7.5's *"No recent dose
 * recorded"* caveat on an install that had never once watched him inject. The
 * commonest reading is the one offered after a band C/D block — a session in
 * which dosing is structurally impossible — so the rows that bought the trust
 * were the least entitled to.
 *
 * The stamp rode along because §7.8 says a reading bumps the same counter, and
 * the shared `bumpLogRevision` call carried the patch with it. The bump stays;
 * §11.2 requires it. Only the stamp goes.
 */
export function appendReading(db: IDBDatabase, reading: Reading): Promise<number> {
  return runTransaction(db, HISTORY_SCOPE, 'readwrite', async (tx) => {
    const existing = await get<Reading>(tx, STORE.readings, reading.id);
    if (existing === undefined) await add(tx, STORE.readings, reading);
    return bumpLogRevision(tx);
  });
}

export type DeleteResult =
  | { readonly kind: 'tombstoned'; readonly logRevision: number }
  | { readonly kind: 'removed'; readonly logRevision: number }
  | { readonly kind: 'not_found' };

/**
 * §7.3 — delete only, with consequence.
 *
 * **Only deletions inside `DELETE_CONFIRM_WINDOW_HOURS` leave a tombstone.**
 * Outside the window there is no gate to bypass, and a tombstone for every tidied
 * old row would bury the signal it exists to show.
 *
 * The tombstone stands where the dose stood — same `id`, same `timestamp` — and
 * carries nothing else. **The dose values do not survive, and that is the point
 * rather than an economy**: §7.3 exists because deleting legitimately means "I
 * never injected this", and keeping the amount would re-create the ambiguity the
 * deletion resolved.
 */
export function deleteLogRow(db: IDBDatabase, id: string, nowMs: number): Promise<DeleteResult> {
  return runTransaction(db, HISTORY_SCOPE, 'readwrite', async (tx) => {
    const row = await get<LogRow>(tx, STORE.log, id);
    if (row === undefined || !isInjection(row)) return { kind: 'not_found' } satisfies DeleteResult;

    const insideWindow = hasRowInsideWindow([row], nowMs, DELETE_CONFIRM_WINDOW_HOURS);
    if (insideWindow) {
      const tombstone: Tombstone = {
        id: row.id,
        timestamp: row.timestamp,
        deleted: true,
        deletedAtMs: nowMs,
      };
      await put(tx, STORE.log, tombstone);
      return { kind: 'tombstoned', logRevision: await bumpLogRevision(tx) } satisfies DeleteResult;
    }
    await remove(tx, STORE.log, id);
    return { kind: 'removed', logRevision: await bumpLogRevision(tx) } satisfies DeleteResult;
  });
}

/** §7.8 — reading rows are deletable, with a plain confirmation and no tombstone. */
export function deleteReading(db: IDBDatabase, id: string): Promise<number> {
  return runTransaction(db, HISTORY_SCOPE, 'readwrite', async (tx) => {
    await remove(tx, STORE.readings, id);
    return bumpLogRevision(tx);
  });
}

// ─── §7.9's two clearing operations ─────────────────────────────────────────

/**
 * §7.9 — "clear the record".
 *
 * Its list is a list of **what to remove**, so a store added later is KEPT by
 * default — the conservative direction for a control whose promise is that the
 * prescription survives.
 *
 * `settingsHistory` survives, and that is load-bearing rather than tidy: §11.3
 * allocates the next revision as `max(settingsHistory keys) + 1`, so dropping the
 * store would restart the counter and the next settings change would issue a
 * revision earlier rows had already used.
 *
 * `acks` survives ENTIRELY. Every row in it is bound to something this operation
 * keeps — §10.6's disclaimer to the app, §5.1's ceil gate and §4.5's confirm-once
 * to values still sitting in `settings`. Dropping them would re-gate a man who
 * changed nothing.
 *
 * `meta.backup` is the one exception to "keeps meta", called out here rather than
 * left to §7.7.1, because an implementer reading this alone would keep it — and a
 * timestamp claiming a recent backup would outlive the record it described.
 */
export function clearTheRecord(db: IDBDatabase): Promise<number> {
  return runTransaction(db, HISTORY_SCOPE, 'readwrite', async (tx) => {
    await clear(tx, STORE.log);
    await clear(tx, STORE.readings);
    await put(tx, STORE.meta, {
      k: META_KEY.backup,
      lastJsonExportAtMs: null,
    } satisfies BackupRow);
    // The provenance stamps go with the rows they described.
    return bumpLogRevision(tx, { lastImportAtMs: null, lastLocalWriteAtMs: null });
  });
}

// ─── §7.7.1's backup counter ────────────────────────────────────────────────

/**
 * §7.7.1 — set on the DOWNLOAD ROUTE ONLY.
 *
 * The browser offers two delivery routes and neither reports what this counter
 * claims. A download resolving proves the download STARTED — the strongest
 * signal the platform offers, and still not completion. Web Share resolving
 * proves only that the sheet was dismissed without error: it does not report
 * which application received the file, or that anything saved it.
 *
 * "A share that resolves is not evidence of a stored copy, and treating it as one
 * is the same false safety claim as counting the readable export — arrived at
 * from the other direction, and less obvious, because the promise really did
 * resolve."
 */
export function recordJsonExport(db: IDBDatabase, nowMs: number): Promise<IDBValidKey> {
  return runTransaction(db, [STORE.meta], 'readwrite', (tx) =>
    put(tx, STORE.meta, { k: META_KEY.backup, lastJsonExportAtMs: nowMs } satisfies BackupRow),
  );
}

// ─── §6.7's dosing note ─────────────────────────────────────────────────────

export function writeDosingHistory(
  db: IDBDatabase,
  row: Omit<DosingHistoryRow, 'k'>,
): Promise<IDBValidKey> {
  return runTransaction(db, [STORE.meta], 'readwrite', (tx) =>
    put(tx, STORE.meta, { ...row, k: META_KEY.dosingHistory } satisfies DosingHistoryRow),
  );
}
