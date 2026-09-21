/**
 * §11.3's connection handling, including the two things it says are easy to get
 * wrong and hard to notice:
 *
 *   - **`VersionError` is an ASYNCHRONOUS REQUEST ERROR, not a synchronous throw
 *     from `open()`.** Handle it on the request, not in a try/catch around the
 *     call. A try/catch here compiles, reads correctly, and never fires.
 *   - **Upgrades block on open connections.** Without `versionchange` and
 *     `blocked` handlers an upgrade hangs behind a stale tab, silently.
 *
 * And §7.9's correction, which v22 got wrong in its own headline fix: a failed
 * downgrade yields no VERSIONED connection, but §11.3 mandates a separate
 * VERSIONLESS `open()` for the recovery read — so at the moment the user taps
 * "start over" there IS a connection open, and `deleteDatabase` blocks on it.
 * The natural build hangs and shows "close this app's other tabs" when no other
 * tab is the blocker.
 */

import {
  DATABASE_NAME,
  DATABASE_VERSION,
  META_KEY,
  SCHEMA_VERSION,
  STORE,
  TIMESTAMP_INDEX,
} from './schema.js';
import type { EnvelopeRow, RecoveryBlock } from './schema.js';

export type OpenOutcome =
  | { readonly kind: 'open'; readonly db: IDBDatabase }
  /**
   * §11.3 — a downgrade fails closed. The calculator refuses, and the screen
   * still renders his settings from the frozen recovery block so he is not
   * stranded without his numbers.
   */
  | { readonly kind: 'fail_closed'; readonly reason: 'version' | 'schema'; readonly found: number | null }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'error'; readonly message: string };

export interface OpenOptions {
  /** Called when another tab starts an upgrade or a delete. Close and stand down. */
  readonly onVersionChange: (newVersion: number | null) => void;
  /** Called when THIS open is held up by another tab's connection. */
  readonly onBlocked?: () => void;
  readonly indexedDB?: IDBFactory | undefined;
  readonly nowMs: number;
}

function factory(options: { readonly indexedDB?: IDBFactory | undefined }): IDBFactory {
  const idb = options.indexedDB ?? globalThis.indexedDB;
  if (!idb) throw new Error('This browser has no IndexedDB, so nothing can be stored.');
  return idb;
}

/**
 * Creates every store and index that is missing. Runs inside `onupgradeneeded`.
 *
 * Explicit rather than driven off a declaration, and that is a correction made
 * on 2026-09-21 after two independent reviews said the same thing. The version
 * that shipped a few hours earlier declared the structure as data and rebuilt
 * whatever did not match it — which answered "this store has a missing index"
 * with `deleteObjectStore`, destroying every row in it. Unreachable that day,
 * because no build had ever made `log` without its index. **But the next
 * ordinary change that adds an index to `log` would have deleted every
 * install's dose history, silently, with the checker's own message telling the
 * author to go ahead.** The one piece of generality was the piece whose
 * general case was wrong, in the exact direction the repair exists to avoid.
 *
 * So: no engine. A structural change writes its own step in `upgradeFrom`
 * below, which forces whoever writes it to decide, per store, whether the rows
 * migrate, survive, or go.
 */
function createStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(STORE.meta)) db.createObjectStore(STORE.meta, { keyPath: 'key' });
  if (!db.objectStoreNames.contains(STORE.settings)) {
    db.createObjectStore(STORE.settings, { keyPath: 'key' });
  }
  if (!db.objectStoreNames.contains(STORE.acks)) db.createObjectStore(STORE.acks, { keyPath: 'key' });
  if (!db.objectStoreNames.contains(STORE.log)) {
    const log = db.createObjectStore(STORE.log, { keyPath: 'id' });
    log.createIndex(TIMESTAMP_INDEX, 'timestamp');
  }
  if (!db.objectStoreNames.contains(STORE.readings)) {
    const readings = db.createObjectStore(STORE.readings, { keyPath: 'id' });
    readings.createIndex(TIMESTAMP_INDEX, 'timestamp');
  }
  if (!db.objectStoreNames.contains(STORE.settingsHistory)) {
    // §11.3 — the PRIMARY KEY, which is why the allocation rule exists and why
    // history entries are appended with `add` rather than `put`.
    db.createObjectStore(STORE.settingsHistory, { keyPath: 'revision' });
  }
}

/**
 * The version ladder: one step per structural change, each naming what it does
 * to the rows it touches.
 *
 * **1 -> 2, and so far the only step.** `#63` renamed the keyPath of `meta`,
 * `settings` and `acks` from `k` to `key`. That line lives in
 * `onupgradeneeded`, which fires only when the IndexedDB version increases, and
 * the version was an alias of `SCHEMA_VERSION` — 1 since the first commit, and
 * not moved, because no ROW had changed shape. So the rename reached databases
 * created afterwards and no others: every install that already existed kept
 * three stores keyed on `k`, every write sent an object keyed `key`, and
 * IndexedDB refused all of them.
 *
 * A keyPath cannot be changed in place — IndexedDB has no `ALTER` — so these
 * three are dropped and remade. **Their rows go: not read, not renamed, not
 * copied.** That is what keeps this from being the backwards-compatibility
 * reads deleted the same day; there is no old shape to understand, only a
 * container to replace. `log`, `readings` and `settingsHistory` are not named
 * here and are therefore untouched, which is the whole point: `#63` changed
 * neither their keyPath nor their row shape, so a fix for it must not cost
 * them. The prescription is three numbers on a piece of paper; the log is
 * months nobody can reconstruct.
 *
 * The keyPath is still checked before dropping, because a database created at
 * version 1 AFTER `#63` is already correct and there is no reason to empty it.
 */
function upgradeFrom(oldVersion: number, db: IDBDatabase, transaction: IDBTransaction): void {
  // `oldVersion === 0` is a brand-new database: nothing to repair, and
  // `createStores` builds it correctly on the way out.
  //
  // `< DATABASE_VERSION` rather than `=== 1`, and §11.8 forced the question by
  // rejecting the literal. It is the better guard: it means "this database
  // predates the structure this build writes", so a phone that has been shut in
  // a drawer across two bumps is still mended in one pass. What keeps it exact
  // is the per-store keyPath test below — a store that is already right is
  // skipped, so re-running this step costs nothing and destroys nothing.
  if (oldVersion > 0 && oldVersion < DATABASE_VERSION) {
    for (const name of [STORE.meta, STORE.settings, STORE.acks]) {
      if (!db.objectStoreNames.contains(name)) continue;
      if (String(transaction.objectStore(name).keyPath) === 'key') continue;
      db.deleteObjectStore(name);
    }
  }
}

/**
 * The envelope and the install stamp, written only when absent.
 *
 * A database can never exist without the row the next boot reads to decide
 * whether it may run — §7.9 names that as a way to brick the app, and a repair
 * that rebuilt `meta` would walk straight into it, having just deleted the row
 * the next step looks for.
 *
 * **Only when absent, and that is not a detail.** Writing unconditionally would
 * overwrite the frozen recovery block on any upgrade, on every install that was
 * already healthy — turning a no-op structural bump into silent data loss of
 * the one thing §7.9 exists to preserve.
 */
function seedMeta(transaction: IDBTransaction, nowMs: number): void {
  const meta = transaction.objectStore(STORE.meta);
  const envelope = meta.get(META_KEY.envelope);
  envelope.onsuccess = (): void => {
    if (envelope.result === undefined) {
      meta.put({
        key: META_KEY.envelope,
        schemaVersion: SCHEMA_VERSION,
        recovery: null,
      } satisfies EnvelopeRow);
    }
  };
  const install = meta.get(META_KEY.install);
  install.onsuccess = (): void => {
    if (install.result === undefined) {
      // §7.5 — a repair that rebuilt `meta` loses the original stamp, so every
      // surviving log entry now predates the install and is marked `suspect`.
      // That is the truthful answer: the rows that recorded where those entries
      // came from are exactly the ones that just went. `repo.ts` makes the same
      // call for the same reason.
      meta.put({ key: META_KEY.install, installedAtMs: nowMs });
    }
  };
}

export function openDatabase(options: OpenOptions): Promise<OpenOutcome> {
  return new Promise<OpenOutcome>((resolve) => {
    const request = factory(options).open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (event): void => {
      const db = request.result;
      const transaction = request.transaction;
      // LADDER, THEN CREATE, THEN SEED, and the order is the whole of it: the
      // ladder drops what this version has to drop, the create puts it back
      // along with anything missing, and the seed replaces the meta rows the
      // ladder may have taken.
      if (transaction) upgradeFrom(event.oldVersion, db, transaction);
      createStores(db);
      if (transaction) seedMeta(transaction, options.nowMs);
    };

    // §11.3 — this fires when another tab is HOLDING a connection open at the
    // old version. Without it the open hangs with no error and no timeout.
    request.onblocked = (): void => {
      options.onBlocked?.();
      resolve({ kind: 'blocked' });
    };

    request.onerror = (): void => {
      const error = request.error;
      // The whole reason this is a handler and not a try/catch.
      if (error?.name === 'VersionError') {
        resolve({ kind: 'fail_closed', reason: 'version', found: null });
        return;
      }
      resolve({ kind: 'error', message: error?.message ?? 'The record could not be opened.' });
    };

    request.onsuccess = (): void => {
      const db = request.result;
      // Another tab wants to upgrade or delete. Close, or block it forever.
      db.onversionchange = (event): void => {
        db.close();
        options.onVersionChange(event.newVersion);
      };

      // §11.3 — one store discovers the schema, and the version is validated as
      // a FINITE INTEGER. String ordering and NaN never decide compatibility.
      //
      // Compared against SCHEMA_VERSION and NOT against DATABASE_VERSION, which
      // is the separation this file learned on 2026-09-21. The structural number
      // moves when the STORES change; this one moves when the ROWS do. Conflating
      // them is what let a keyPath rename ship as though it were free.
      const read = db.transaction(STORE.meta, 'readonly').objectStore(STORE.meta).get(META_KEY.envelope);
      read.onsuccess = (): void => {
        const envelope = read.result as EnvelopeRow | undefined;
        const found = envelope?.schemaVersion;
        if (found === undefined) {
          // A database with stores but no envelope was cleared badly or
          // partially restored. Treat it as unreadable rather than assuming.
          db.close();
          resolve({ kind: 'fail_closed', reason: 'schema', found: null });
          return;
        }
        if (!Number.isInteger(found) || found > SCHEMA_VERSION) {
          db.close();
          resolve({ kind: 'fail_closed', reason: 'schema', found: Number.isFinite(found) ? found : null });
          return;
        }
        resolve({ kind: 'open', db });
      };
      read.onerror = (): void => {
        db.close();
        resolve({ kind: 'error', message: 'The record could not be read.' });
      };
    };
  });
}

/**
 * §11.3 — recovery uses a SEPARATE VERSIONLESS `open()`, restricted by
 * application logic to reading the frozen recovery block and nothing else.
 *
 * "The log and the readings are unreadable BY RULE, not by accident" (§7.9 v23):
 * an older build must never present unknown-schema numbers as verified
 * prescription settings, and that restriction — not the absence of a connection
 * — is why the fail-closed screen cannot offer an export.
 *
 * The connection is CLOSED before this resolves. §7.9 v23's blocking defect was
 * a build that kept the handle, called `deleteDatabase`, fired `blocked`, and
 * told the user to close tabs that were not the blocker.
 */
export function readRecoveryBlock(options: {
  readonly indexedDB?: IDBFactory | undefined;
}): Promise<RecoveryBlock | null> {
  return new Promise<RecoveryBlock | null>((resolve) => {
    // No version argument: this open never triggers an upgrade and never fails
    // on a downgrade.
    const request = factory(options).open(DATABASE_NAME);
    request.onerror = (): void => {
      resolve(null);
    };
    request.onblocked = (): void => {
      resolve(null);
    };
    request.onsuccess = (): void => {
      const db = request.result;
      // §7.9 v23 — this connection carries a `versionchange` handler too, so a
      // delete started in another tab is not blocked by this one either.
      db.onversionchange = (): void => {
        db.close();
      };
      if (!db.objectStoreNames.contains(STORE.meta)) {
        db.close();
        resolve(null);
        return;
      }
      const read = db.transaction(STORE.meta, 'readonly').objectStore(STORE.meta).get(META_KEY.envelope);
      read.onsuccess = (): void => {
        const envelope = read.result as EnvelopeRow | undefined;
        // Read the block, render the numbers, CLOSE, then delete.
        db.close();
        resolve(envelope?.recovery ?? null);
      };
      read.onerror = (): void => {
        db.close();
        resolve(null);
      };
    };
  });
}

export type DeleteOutcome =
  | { readonly kind: 'deleted' }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'error'; readonly message: string };

/**
 * §7.9 — "start over" is `deleteDatabase` on BOTH paths, and that is one
 * mechanism rather than two.
 *
 * The alternative — clearing an enumerated list of stores — works on the running
 * path only and carries two defects this call does not have. **A hand-enumerated
 * store list rots on the edit that changes it, silently and in the unsafe
 * direction**: the day a seventh store is added, a reset naming six leaves its
 * rows behind, so "start over" quietly does not start over and every screen it
 * touches still looks correct. And it can leave the database WITHOUT AN
 * ENVELOPE, turning the recovery control into a second way to brick the app.
 *
 * `deleteDatabase` takes no version and needs no connection, so the downgrade
 * that blocks everything else does not block it. It is scoped by database name,
 * so §11.7 is satisfied by construction — unlike `caches.keys()` and
 * `getRegistrations()`, which are origin-wide and must be filtered. The blog has
 * no rows in `MealUnits` and is untouched.
 */
export function deleteDatabase(options: {
  readonly indexedDB?: IDBFactory | undefined;
  readonly onBlocked?: (() => void) | undefined;
}): Promise<DeleteOutcome> {
  return new Promise<DeleteOutcome>((resolve) => {
    const request = factory(options).deleteDatabase(DATABASE_NAME);
    // §7.9 — it blocks on open connections exactly as an upgrade does, and the
    // app must close its OWN connection first or it blocks on itself.
    request.onblocked = (): void => {
      options.onBlocked?.();
      resolve({ kind: 'blocked' });
    };
    request.onerror = (): void => {
      resolve({ kind: 'error', message: request.error?.message ?? 'The record could not be cleared.' });
    };
    request.onsuccess = (): void => {
      resolve({ kind: 'deleted' });
    };
  });
}

/** Every store this build knows about, for callers that need to name them. */
