/**
 * §7.7's import, as one transaction.
 *
 * **Import is a MERGE, not a replacement** (§7.5), and it PROPOSES settings
 * rather than adopting them (§7.7). Adopting any of them runs §4.5's hard range
 * checks and §10.1.6's delta confirmation exactly as typing would — which is why
 * this module returns the proposed settings rather than writing them.
 */

import { META_KEY, SETTINGS_SCOPE, STORE } from './schema.js';
import type { DosingHistoryRow, SettingsHistoryRow } from './schema.js';
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
        mode: entry.mode,
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
        k: META_KEY.dosingHistory,
        state: 'answered',
        text: incoming.text,
        answeredAtMs: incoming.answeredAtMs,
      } satisfies DosingHistoryRow);
    }

    // §7.5 — the import makes provenance suspect until this install writes a row
    // of its own. `lastLocalWriteAtMs` is deliberately left alone.
    const revision = await get<{ n: number; lastLocalWriteAtMs: number | null }>(
      tx,
      STORE.meta,
      META_KEY.logRevision,
    );
    const nextRevision = (revision?.n ?? 0) + 1;
    await put(tx, STORE.meta, {
      k: META_KEY.logRevision,
      n: nextRevision,
      lastImportAtMs: nowMs,
      lastLocalWriteAtMs: revision?.lastLocalWriteAtMs ?? null,
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
