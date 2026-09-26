/**
 * §7.7's import, as one transaction.
 *
 * **Import is a MERGE, not a replacement** (§7.5), and it PROPOSES settings
 * rather than adopting them (§7.7). Adopting any of them runs §4.5's hard range
 * checks and §10.1.6's delta confirmation exactly as typing would — which is why
 * this module returns the proposed settings rather than writing them.
 */

import { META_KEY, SETTINGS_SCOPE, STORE } from './schema.js';
import type { CalibrationRow, DosingHistoryRow, SettingsHistoryRow } from './schema.js';
import { add, get, getAll, maxKey, put, runTransaction } from './tx.js';
import { planMerge } from './envelope.js';
import type { Envelope } from './envelope.js';
import type { LogRow, Reading } from '../core/types.js';

const IMPORT_SCOPE = [...SETTINGS_SCOPE, STORE.log, STORE.readings];

export interface ImportResult {
  /**
   * §7.7 — the settings the file carries, for the interface to PROPOSE. Never
   * written here. Adopting one is a settings commit and allocates a fresh
   * revision, because the imported entry carries another install's
   * `changedAtMs` and `settingsHistory` is never adopted.
   */
  readonly proposedSettings: Envelope['settings'];
  readonly rowsMerged: number;
  readonly readingsMerged: number;
  readonly historyAppended: number;
  readonly logRevision: number;
}

export function importEnvelope(
  db: IDBDatabase,
  envelope: Envelope,
  nowMs: number,
): Promise<ImportResult> {
  return runTransaction(db, [...IMPORT_SCOPE, STORE.meta], 'readwrite', async (tx) => {
    const [localLog, localReadings, highest] = await Promise.all([
      getAll<LogRow>(tx, STORE.log),
      getAll<Reading>(tx, STORE.readings),
      maxKey(tx, STORE.settingsHistory),
    ]);

    const plan = planMerge(envelope, {
      log: localLog,
      readings: localReadings,
      maxHistoryRevision: highest,
    });

    // The remap and the rewrite happen in ONE transaction, which is the whole
    // point of §7.7's rule: "every imported log row's `settingsRevision` is
    // rewritten to its new local id IN THE SAME TRANSACTION. Identity is
    // preserved by REMAPPING, not by hoping the integers agree."
    for (const entry of plan.historyToAppend) {
      await add(tx, STORE.settingsHistory, {
        revision: entry.revision,
        changedAtMs: entry.changedAtMs,
        target: entry.target,
        isf: entry.isf,
        icr: entry.icr,
        roundingMode: entry.roundingMode,
        // §8.5 — travels with the rest of the prescription, and §7.7's reason
        // covers it: the imported period is a record of what was in force on
        // the other install, and an insulin switch is one of the things that
        // makes a historical row mean something different.
        bolusId: entry.bolusId,
        imported: true,
      } satisfies SettingsHistoryRow);
    }
    for (const row of plan.log) await put(tx, STORE.log, row);
    for (const reading of plan.readings) await put(tx, STORE.readings, reading);

    // §6.7 — `dosingHistory` is KEPT LOCAL, NEVER OVERWRITTEN. An imported note
    // is adopted only into an `unanswered` state; where both exist the local one
    // wins and the imported one is discarded, "because it describes a different
    // install's history".
    const local = await get<DosingHistoryRow>(tx, STORE.meta, META_KEY.dosingHistory);
    const localState = local?.state ?? 'unanswered';
    const incoming = envelope.dosingHistoryBeforeApp;
    if (localState === 'unanswered' && incoming !== undefined) {
      await put(tx, STORE.meta, {
        key: META_KEY.dosingHistory,
        state: 'answered',
        text: incoming.text,
        answeredAtMs: incoming.answeredAtMs,
      } satisfies DosingHistoryRow);
    }

    // T34 — the reader's own measured grams. MERGED, with a LOCAL entry
    // winning any collision.
    //
    // The rule is deliberately not the one above it. `dosingHistory` keeps the
    // local answer "because it describes a different install's history" — but a
    // calibration describes the reader's own kitchen, their roti and their
    // plate, and that travels with the person rather than the install. So the
    // imported entries are as legitimate as the local ones.
    //
    // Merge rather than replace, and local rather than incoming, because that
    // is the only combination that cannot destroy a figure somebody weighed:
    // restoring onto a fresh install has nothing local to collide with and
    // recovers everything, while restoring onto a device already in use keeps
    // the work done there. Neither direction loses a measurement, which is what
    // `readCalibrationEntry` refuses to invent one for.
    if (envelope.calibration !== undefined) {
      const existing = await get<CalibrationRow>(tx, STORE.meta, META_KEY.calibration);
      const merged = { ...envelope.calibration, ...(existing?.foods ?? {}) };
      await put(tx, STORE.meta, {
        key: META_KEY.calibration,
        foods: merged,
      } satisfies CalibrationRow);
    }

    // §7.5 — the import makes provenance suspect until this install logs an
    // INJECTION of its own. Corrected from "writes a row" with note 7's fix:
    // §7.8 forbids a reading being an input to anything in §11.2's snapshot, and
    // provenance is one, so `appendReading` no longer stamps. The stored key is
    // still `lastLocalInjectionAtMs` (see `schema.ts`); it is deliberately left
    // alone here, which is what keeps a prior injection's stamp from being
    // erased by a restore.
    const revision = await get<{ logRevision: number; lastLocalInjectionAtMs: number | null }>(
      tx,
      STORE.meta,
      META_KEY.logRevision,
    );
    const nextRevision = (revision?.logRevision ?? 0) + 1;
    await put(tx, STORE.meta, {
      key: META_KEY.logRevision,
      logRevision: nextRevision,
      lastImportAtMs: nowMs,
      lastLocalInjectionAtMs: revision?.lastLocalInjectionAtMs ?? null,
    });

    return {
      proposedSettings: envelope.settings,
      rowsMerged: plan.log.length,
      readingsMerged: plan.readings.length,
      historyAppended: plan.historyToAppend.length,
      logRevision: nextRevision,
    } satisfies ImportResult;
  });
}
