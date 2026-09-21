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
 * The structure this build writes, DECLARED AS DATA so that one list both
 * builds it and checks it — ADDED 2026-09-21, after a keyPath rename bricked
 * every install that already existed.
 *
 * `#63` renamed the keyPath of `meta`, `settings` and `acks` from `k` to `key`.
 * That edit sat inside `onupgradeneeded`, which fires only when the version
 * number INCREASES, and `SCHEMA_VERSION` had been 1 since the first commit. So
 * the rename reached databases created afterwards and no others. Every existing
 * install kept three stores keyed on `k`, and every write the new code made
 * sent an object whose field is `key` — `DataError: Evaluating the object
 * store's key path did not yield a value`, on the disclaimer acknowledgement
 * and on the settings commit. The app looked dead and said nothing.
 *
 * Nothing caught it because **nothing in this project has ever opened a
 * database written by a previous build**: every vitest case gets a fresh
 * `fake-indexeddb`, and every smoke session wipes its `--user-data-dir` on
 * purpose. The one condition every real phone is always in was the one
 * condition never exercised. `tools/smoke.mjs`'s upgrade session now is.
 *
 * Two lists would have the same defect one level up, so there is one:
 * `createStores` builds from it and `mismatchedStores` checks against it.
 * `check_store_schema_pinned` in `check-plan.py` pins it a third time, so
 * changing a keyPath without saying so fails the build rather than a phone.
 */
export interface StoreSchema {
  readonly name: string;
  readonly keyPath: string;
  readonly indexes: readonly { readonly name: string; readonly keyPath: string }[];
}

export const STORE_SCHEMA: readonly StoreSchema[] = [
  { name: STORE.meta, keyPath: 'key', indexes: [] },
  { name: STORE.settings, keyPath: 'key', indexes: [] },
  { name: STORE.acks, keyPath: 'key', indexes: [] },
  { name: STORE.log, keyPath: 'id', indexes: [{ name: TIMESTAMP_INDEX, keyPath: 'timestamp' }] },
  { name: STORE.readings, keyPath: 'id', indexes: [{ name: TIMESTAMP_INDEX, keyPath: 'timestamp' }] },
  // §11.3 — the PRIMARY KEY, which is why the allocation rule exists and why
  // history entries are appended with `add` rather than `put`.
  { name: STORE.settingsHistory, keyPath: 'revision', indexes: [] },
];

/** Creates every store and index that is missing. Runs inside `onupgradeneeded`. */
function createStores(db: IDBDatabase): void {
  for (const store of STORE_SCHEMA) {
    if (db.objectStoreNames.contains(store.name)) continue;
    const created = db.createObjectStore(store.name, { keyPath: store.keyPath });
    for (const index of store.indexes) created.createIndex(index.name, index.keyPath);
  }
}

/**
 * The stores whose SHAPE does not match what this build writes — missing, wrong
 * keyPath, or missing an index.
 *
 * Reads metadata only. No row is fetched and no field is inspected, which is
 * what keeps this from being the backwards-compatibility code deleted on
 * 2026-09-21: it does not know what an old row looks like and never will. A
 * container is not data.
 *
 * Takes the `versionchange` transaction rather than opening its own, because it
 * runs inside `onupgradeneeded`, where no other transaction can exist.
 *
 * `keyPath` is compared through `String` because the DOM type admits a string,
 * an array of strings, or null. Every store here uses a plain string, and an
 * array arriving would mean the structure is wrong anyway — which is the answer
 * this function exists to give.
 */
function mismatchedStores(db: IDBDatabase, transaction: IDBTransaction): string[] {
  const wrong: string[] = [];
  for (const store of STORE_SCHEMA) {
    // Absent is handled by `createStores`, not here: there is nothing to delete
    // and deleting a store that does not exist throws.
    if (!db.objectStoreNames.contains(store.name)) continue;
    const found = transaction.objectStore(store.name);
    if (String(found.keyPath) !== store.keyPath) {
      wrong.push(store.name);
      continue;
    }
    if (store.indexes.some((index) => !found.indexNames.contains(index.name))) {
      wrong.push(store.name);
    }
  }
  return wrong;
}

/**
 * Drops the stores that do not match, so `createStores` can put them back.
 *
 * **Delete and recreate, because IndexedDB has no `ALTER`.** A keyPath cannot
 * be changed in place. The rows in a dropped store are therefore GONE: not
 * read, not renamed, not copied. That is deliberate, and it is the difference
 * between this and the compatibility reads deleted on 2026-09-21 — there is no
 * old shape to understand here, only a container to replace.
 *
 * Stores that already match are not touched, which is the whole point. On a
 * database broken by `#63` that is `log` and `readings` — every dose and every
 * reading survives, because `#63` changed neither their keyPath nor their row
 * shape. The prescription is three numbers on a piece of paper; the log is
 * months nobody can reconstruct.
 *
 * It runs inside one `versionchange` transaction, so a repair that throws rolls
 * back entirely and leaves the old structure intact rather than half-converted.
 */
function repairStores(db: IDBDatabase, transaction: IDBTransaction): void {
  for (const name of mismatchedStores(db, transaction)) db.deleteObjectStore(name);
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

    request.onupgradeneeded = (): void => {
      const db = request.result;
      const transaction = request.transaction;
      // REPAIR, THEN CREATE, THEN SEED, and the order is the whole of it: the
      // repair drops what is wrong, the create puts it back along with anything
      // missing, and the seed replaces the meta rows the repair may have taken.
      if (transaction) repairStores(db, transaction);
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
